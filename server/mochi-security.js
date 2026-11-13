import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export class SafeError extends Error {
  constructor(code, status = 503, retryAfter = 0) {
    super(code);
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
export function configuration(env = process.env) {
  const origins = (env.MOCHI_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const local = env.VERCEL_ENV !== 'production' && env.MOCHI_LOCAL_HTTP === 'true';
  const model = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const validOrigins =
    origins.length &&
    origins.every((s) => {
      try {
        const u = new URL(s);
        return (
          u.origin === s &&
          (u.protocol === 'https:' ||
            (local && ['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol === 'http:'))
        );
      } catch {
        return false;
      }
    });
  const ready =
    env.AI_ENABLED === 'true' &&
    !!env.GEMINI_API_KEY &&
    /^[A-Za-z0-9_-]{32,}$/.test(env.MOCHI_SESSION_SECRET || '') &&
    /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(env.MOCHI_GROUP_ACCESS_HASH || '') &&
    /^https:\/\/[a-z0-9.-]+\.upstash\.io$/.test(env.UPSTASH_REDIS_REST_URL || '') &&
    !!env.UPSTASH_REDIS_REST_TOKEN &&
    !!validOrigins &&
    /^gemini-[\d.]+-flash(?:-lite)?(?:-\d+)?$/.test(model);
  return {
    ready: !!ready,
    origins,
    local,
    model,
    key: env.GEMINI_API_KEY,
    secret: env.MOCHI_SESSION_SECRET,
    groupHash: env.MOCHI_GROUP_ACCESS_HASH,
    redisUrl: env.UPSTASH_REDIS_REST_URL,
    redisToken: env.UPSTASH_REDIS_REST_TOKEN,
    cookie: local ? 'mochi_session' : '__Host-mochi_session',
    timeoutMs: 20000,
  };
}
const hmac = (config, value) =>
  createHmac('sha256', config.secret).update(value).digest('base64url');
function equal(a, b) {
  const x = Buffer.from(a || ''),
    y = Buffer.from(b || '');
  return x.length === y.length && timingSafeEqual(x, y);
}
export function issueSession(config, now = Date.now()) {
  const session = {
    id: randomBytes(24).toString('base64url'),
    exp: now + 8 * 3600e3,
    version: hmac(config, config.groupHash),
  };
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return { session, token: payload + '.' + hmac(config, payload) };
}
export function readSession(req, config, now = Date.now()) {
  try {
    const token = (req.headers.cookie || '')
      .split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(config.cookie + '='))
      ?.slice(config.cookie.length + 1);
    if (!token || token.length > 1000) return null;
    const [payload, signature, ...rest] = token.split('.');
    if (rest.length || !equal(signature, hmac(config, payload))) return null;
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return /^[\w-]{32}$/.test(s.id) &&
      Number.isFinite(s.exp) &&
      s.exp > now &&
      s.exp <= now + 8 * 3600e3 &&
      equal(s.version, hmac(config, config.groupHash))
      ? s
      : null;
  } catch {
    return null;
  }
}
export const csrfToken = (config, session) => hmac(config, 'csrf:' + session.id);
export function requireSession(req, config) {
  const s = readSession(req, config);
  if (!s) throw new SafeError('access_required', 401);
  if (!equal(req.headers['x-mochi-csrf'], csrfToken(config, s)))
    throw new SafeError('access_required', 403);
  return s;
}
export async function verifyCode(code, config) {
  const [, salt, hash] = config.groupHash.split(':');
  const result = await scrypt(code, salt, 64);
  return equal(result.toString('hex'), hash);
}
export function sessionCookie(config, token = '', clear = false) {
  return `${config.cookie}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear ? 0 : 28800}${config.local ? '' : '; Secure'}`;
}
export function checkOrigin(req, config) {
  let origin = req.headers.origin;
  // Same-origin GET fetches omit Origin. Status is read-only; use its referrer.
  if (!origin && req.method === 'GET') {
    try {
      origin = new URL(req.headers.referer).origin;
    } catch {}
  }
  if (!config.origins.includes(origin)) throw new SafeError('origin_rejected', 403);
}
export const privateId = (config, value) => hmac(config, value).slice(0, 32);

// One atomic script across all instances: request budgets AND expiring concurrency leases.
export const RESERVE_SCRIPT = `
local now=tonumber(ARGV[1])
redis.call('ZREMRANGEBYSCORE',KEYS[4],'-inf',now)
redis.call('ZREMRANGEBYSCORE',KEYS[5],'-inf',now)
for i=1,3 do if tonumber(redis.call('GET',KEYS[i]) or '0') >= tonumber(ARGV[i+3]) then return 0 end end
if redis.call('ZCARD',KEYS[4]) >= 2 or redis.call('ZCARD',KEYS[5]) >= 1 then return -1 end
for i=1,3 do redis.call('INCR',KEYS[i]); redis.call('EXPIRE',KEYS[i],tonumber(ARGV[i+6])) end
redis.call('ZADD',KEYS[4],now+60000,ARGV[2]); redis.call('EXPIRE',KEYS[4],70)
redis.call('ZADD',KEYS[5],now+60000,ARGV[2]); redis.call('EXPIRE',KEYS[5],70)
return 1`;
export const LOGIN_SCRIPT = `
for i=1,2 do if tonumber(redis.call('GET',KEYS[i]) or '0') >= tonumber(ARGV[i]) then return 0 end end
for i=1,2 do redis.call('INCR',KEYS[i]); redis.call('EXPIRE',KEYS[i],3600) end
return 1`;
export function redisStore(config, fetcher = fetch) {
  async function command(args) {
    try {
      const r = await fetcher(config.redisUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(2500),
      });
      if (!r.ok) throw Error();
      const json = await r.json();
      if (json.error || !Object.hasOwn(json, 'result')) throw Error();
      return json.result;
    } catch {
      throw new SafeError('protection_unavailable');
    }
  }
  const prefix = 'mochi:{group}:v1:';
  return {
    async login(ip, now) {
      const hour = Math.floor(now / 3600e3);
      if (
        (await command([
          'EVAL',
          LOGIN_SCRIPT,
          2,
          prefix + 'login:' + hour,
          prefix + 'login:' + ip + ':' + hour,
          30,
          5,
        ])) !== 1
      )
        throw new SafeError('rate_limited', 429, 3600);
    },
    async reserve(session, ip, id, now) {
      const day = Math.floor(now / 86400e3),
        hour = Math.floor(now / 3600e3);
      const keys = [
        prefix + 'day:' + day,
        prefix + 'session:' + session + ':' + hour,
        prefix + 'ip:' + ip + ':' + hour,
        prefix + 'active',
        prefix + 'active:' + session,
      ];
      const result = await command([
        'EVAL',
        RESERVE_SCRIPT,
        5,
        ...keys,
        now,
        id,
        0,
        40,
        8,
        12,
        172800,
        7200,
        7200,
      ]);
      if (result !== 1)
        throw new SafeError(
          result === -1 ? 'busy' : 'rate_limited',
          429,
          result === -1 ? 60 : 3600,
        );
      return keys.slice(3);
    },
    async release(keys, id) {
      await command([
        'EVAL',
        "for i=1,#KEYS do redis.call('ZREM',KEYS[i],ARGV[1]) end return 1",
        keys.length,
        ...keys,
        id,
      ]);
    },
    async metrics(operation, status, usage, now) {
      const key = prefix + 'metrics:' + Math.floor(now / 86400e3);
      const fields = {
        [operation + ':' + status]: 1,
        ...(usage
          ? { inputTokens: usage.input, outputTokens: usage.output, totalTokens: usage.total }
          : { usageUnavailable: 1 }),
      };
      const args = Object.entries(fields)
        .filter(([, value]) => Number.isSafeInteger(value) && value >= 0)
        .flat();
      await command([
        'EVAL',
        "for i=1,#ARGV,2 do redis.call('HINCRBY',KEYS[1],ARGV[i],ARGV[i+1]) end redis.call('EXPIRE',KEYS[1],2592000) return 1",
        1,
        key,
        ...args,
      ]);
    },
  };
}
