import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { RESTING, requestSchemas, deterministicReview } from '../src/js/mochi-contracts.js';
import {
  configuration,
  SafeError,
  checkOrigin,
  requireSession,
  readSession,
  issueSession,
  csrfToken,
  sessionCookie,
  verifyCode,
  privateId,
  redisStore,
} from './mochi-security.js';
import { generate, guardedAnswer } from './mochi-provider.js';
export const MAX_BODY = 64000;
async function body(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || ''))
    throw new SafeError('invalid_input', 400);
  if (Number(req.headers['content-length']) > MAX_BODY) throw new SafeError('too_large', 413);
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > MAX_BODY) throw new SafeError('too_large', 413);
    try {
      return JSON.parse(raw);
    } catch {
      throw new SafeError('invalid_input', 400);
    }
  }
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY) throw new SafeError('too_large', 413);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new SafeError('invalid_input', 400);
  }
}
function send(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(value));
}
export function createHandler(operation, deps = {}) {
  return async (req, res) => {
    const config = configuration(deps.env || process.env),
      id = randomUUID(),
      now = Date.now();
    let store,
      lease,
      usage = null,
      code = 'ok',
      outgoing;
    const reply = (status, value) => {
      outgoing = { status, value };
    };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (!config.ready) throw new SafeError('disabled');
      checkOrigin(req, config);
      if (operation === 'session' && req.method === 'GET') {
        const session = readSession(req, config);
        return reply(200, {
          enabled: true,
          authenticated: !!session,
          csrf: session ? csrfToken(config, session) : null,
        });
      }
      if (operation === 'session' && req.method === 'DELETE') {
        requireSession(req, config);
        res.setHeader('Set-Cookie', sessionCookie(config, '', true));
        return reply(200, { ok: true });
      }
      if (req.method !== 'POST') {
        res.setHeader('Allow', operation === 'session' ? 'GET, POST, DELETE' : 'POST');
        throw new SafeError('method_not_allowed', 405);
      }
      const input = await body(req);
      store = deps.store || redisStore(config);
      // Never trust an IP alone: group-wide budgets also apply to all sessions.
      const ip = privateId(
        config,
        String(
          req.headers['x-vercel-forwarded-for'] ||
            req.headers['x-forwarded-for'] ||
            req.socket?.remoteAddress ||
            'unknown',
        ).split(',')[0],
      );
      if (operation === 'session') {
        const parsed = z.strictObject({ code: z.string().min(12).max(128) }).safeParse(input);
        if (!parsed.success) throw new SafeError('invalid_input', 400);
        await store.login(ip, now);
        if (!(await verifyCode(parsed.data.code, config)))
          throw new SafeError('access_required', 401);
        const { token, session } = issueSession(config);
        res.setHeader('Set-Cookie', sessionCookie(config, token));
        return reply(200, {
          enabled: true,
          authenticated: true,
          csrf: csrfToken(config, session),
        });
      }
      const session = requireSession(req, config),
        parsed = requestSchemas[operation].safeParse(input);
      if (!parsed.success) throw new SafeError('invalid_input', 400);
      if (req.aborted || res.destroyed) throw new SafeError('cancelled', 499);
      lease = await store.reserve(session.id, ip, id, now);
      const controller = new AbortController();
      let timedOut = false;
      const abort = () => controller.abort();
      req.once?.('aborted', abort);
      res.once?.('close', abort);
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, deps.timeoutMs ?? config.timeoutMs);
      let result;
      try {
        const guarded = operation === 'chat' && guardedAnswer(parsed.data);
        result = guarded
          ? { data: guarded, usage: null }
          : await Promise.race([
              (deps.generate || generate)(operation, parsed.data, config, controller.signal),
              new Promise((_, reject) =>
                controller.signal.addEventListener(
                  'abort',
                  () =>
                    reject(new SafeError(timedOut ? 'timeout' : 'cancelled', timedOut ? 504 : 499)),
                  { once: true },
                ),
              ),
            ]);
        if (controller.signal.aborted)
          throw new SafeError(timedOut ? 'timeout' : 'cancelled', timedOut ? 504 : 499);
      } finally {
        clearTimeout(timer);
        req.off?.('aborted', abort);
        res.off?.('close', abort);
      }
      usage = result.usage;
      reply(200, {
        data: result.data,
        meta: {
          requestId: id,
          mode: operation === 'chat' && guardedAnswer(parsed.data) ? 'local' : 'gemini',
          ...(operation === 'analyze'
            ? { checks: deterministicReview(parsed.data.route, parsed.data.profile) }
            : {}),
        },
      });
    } catch (error) {
      const safe =
        error instanceof SafeError
          ? error
          : new SafeError(
              Number(error?.status) === 429
                ? 'provider_limited'
                : Number(error?.status) === 401 ||
                    Number(error?.status) === 403 ||
                    Number(error?.status) === 404
                  ? 'provider_unavailable'
                  : 'unavailable',
              Number(error?.status) === 429 ? 429 : 503,
              Number(error?.status) === 429 ? 60 : 0,
            );
      code = safe.code;
      if (safe.retryAfter) res.setHeader('Retry-After', String(safe.retryAfter));
      if (!res.writableEnded && !res.destroyed)
        reply(safe.status, { error: { code: safe.code, message: RESTING, requestId: id } });
    } finally {
      if (lease) {
        try {
          await store.release(lease, id);
        } catch {
          code = 'release_failed';
        }
      }
      if (lease && operation !== 'session') {
        try {
          await store.metrics(operation, code, usage, now);
        } catch {
          /* No prompt, credentials or raw errors in logs. */
        }
      }
      (deps.log || console.info)(
        JSON.stringify({
          event: 'mochi_request',
          requestId: id,
          operation,
          status: code,
          durationMs: Date.now() - now,
          usage,
        }),
      );
      // Finish persistent cleanup before ending the serverless response.
      if (outgoing && !res.writableEnded && !res.destroyed)
        send(res, outgoing.status, outgoing.value);
    }
  };
}
