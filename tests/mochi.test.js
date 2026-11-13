import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { scryptSync } from 'node:crypto';
import { createHandler } from '../server/mochi-handler.js';
import {
  configuration,
  issueSession,
  csrfToken,
  readSession,
  redisStore,
  SafeError,
  RESERVE_SCRIPT,
} from '../server/mochi-security.js';
import { generate, guardedAnswer, providerSchema } from '../server/mochi-provider.js';
import { requestSchemas, validateOutput, deterministicReview } from '../src/js/mochi-contracts.js';
import { applyMochiProposal, sharedProfile } from '../src/js/mochi-state.js';
import { restorePlannerArchive } from '../src/js/planner-actions.js';
import { initialState, parseBackup } from '../src/js/storage.js';
import { createAIClient } from '../src/js/ai-client.js';
import { mochiChat } from '../src/js/mochi-components.js';
import { input, proposal, chat, review } from './fixtures/mochi.js';
// Synthetic test-only credentials. No real provider or Redis is used.
const salt = '0'.repeat(32),
  access = 'test-only-group-access';
const env = {
  AI_ENABLED: 'true',
  GEMINI_API_KEY: 'test-only-placeholder',
  GEMINI_MODEL: 'gemini-3.5-flash-lite',
  MOCHI_GROUP_ACCESS_HASH: `scrypt:${salt}:${scryptSync(access, salt, 64).toString('hex')}`,
  MOCHI_SESSION_SECRET: 'synthetic_test_only_session_secret_0000000000',
  MOCHI_ALLOWED_ORIGINS: 'https://planner.example',
  UPSTASH_REDIS_REST_URL: 'https://test-only.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'test-only-placeholder',
};
const config = configuration(env),
  auth = issueSession(config);
function request(body = input(), method = 'POST', authenticated = true) {
  const req = new EventEmitter();
  Object.assign(req, {
    method,
    body,
    headers: {
      origin: 'https://planner.example',
      'content-type': 'application/json',
      ...(authenticated
        ? {
            cookie: `${config.cookie}=${auth.token}`,
            'x-mochi-csrf': csrfToken(config, auth.session),
          }
        : {}),
    },
  });
  return req;
}
function response() {
  const res = new EventEmitter();
  Object.assign(res, {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end(value) {
      this.body = JSON.parse(value);
      this.writableEnded = true;
    },
  });
  return res;
}
function harness(options = {}) {
  const calls = { provider: 0, reserved: 0, released: 0, metrics: [], logs: [] };
  const store = {
    async login() {},
    async reserve() {
      calls.reserved++;
      return ['a', 'b'];
    },
    async release() {
      calls.released++;
    },
    async metrics(...args) {
      calls.metrics.push(args);
    },
    ...options.store,
  };
  const handler = createHandler(options.operation || 'itinerary', {
    env,
    store,
    log: (v) => calls.logs.push(v),
    generate: async (op, data) => {
      calls.provider++;
      if (options.fail) throw options.fail;
      return {
        data: op === 'chat' ? chat : op === 'analyze' ? review : proposal(data.profile),
        usage: { input: 100, output: 200, total: 300 },
      };
    },
    ...options,
  });
  return { handler, calls };
}
test('fail closed sem chave, autenticação, Redis, origem ou flag', async () => {
  for (const field of [
    'GEMINI_API_KEY',
    'MOCHI_GROUP_ACCESS_HASH',
    'MOCHI_SESSION_SECRET',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'MOCHI_ALLOWED_ORIGINS',
    'AI_ENABLED',
  ]) {
    const { handler, calls } = harness({ env: { ...env, [field]: '' } }),
      res = response();
    await handler(request(), res);
    assert.equal(res.statusCode, 503, field);
    assert.equal(calls.provider, 0);
    assert.equal(calls.reserved, 0);
  }
});
test('sessão, assinatura, origem e CSRF são conferidos no servidor', async () => {
  for (const change of [
    (r) => delete r.headers.cookie,
    (r) => (r.headers.cookie += 'x'),
    (r) => delete r.headers['x-mochi-csrf'],
    (r) => (r.headers.origin = 'https://attacker.example'),
  ]) {
    const { handler, calls } = harness(),
      req = request(),
      res = response();
    change(req);
    await handler(req, res);
    assert.ok([401, 403].includes(res.statusCode));
    assert.equal(calls.provider, 0);
  }
  assert.equal(readSession(request(), config, auth.session.exp + 1), null);
  assert.equal(readSession(request(), { ...config, groupHash: config.groupHash + 'a' }), null);
});
test('login exige código verificado, limita tentativas e emite cookie HttpOnly Secure', async () => {
  let attempts = 0;
  const { handler } = harness({
    operation: 'session',
    store: {
      async login() {
        attempts++;
      },
    },
  });
  const bad = response();
  await handler(request({ code: 'wrong-test-only-code' }, 'POST', false), bad);
  assert.equal(bad.statusCode, 401);
  const good = response();
  await handler(request({ code: access }, 'POST', false), good);
  assert.equal(good.statusCode, 200);
  assert.match(
    good.headers['Set-Cookie'],
    /HttpOnly; SameSite=Strict; Path=\/; Max-Age=28800; Secure/,
  );
  assert.ok(good.body.csrf);
  assert.equal(attempts, 2);
  const { handler: limited } = harness({
    operation: 'session',
    store: {
      async login() {
        throw new SafeError('rate_limited', 429);
      },
    },
  });
  const res = response();
  await limited(request({ code: access }, 'POST', false), res);
  assert.equal(res.statusCode, 429);
});
test('status same-origin funciona sem Origin e logout exige CSRF', async () => {
  const { handler } = harness({ operation: 'session' }),
    req = request(undefined, 'GET');
  delete req.headers.origin;
  req.headers.referer = 'https://planner.example/';
  const res = response();
  await handler(req, res);
  assert.equal(res.body.authenticated, true);
  const out = response();
  await handler(request(undefined, 'DELETE'), out);
  assert.equal(out.statusCode, 200);
  assert.match(out.headers['Set-Cookie'], /Max-Age=0/);
});
test('rejeita campos extras, tamanho, histórico e dias inconsistentes antes do provedor', async () => {
  const invalid = [
    { ...input(), backup: {} },
    { ...input(), profile: { ...input().profile, nights: 1 } },
    { ...input(), additionalPreferences: 'x'.repeat(64001) },
  ];
  for (const data of invalid) {
    const { handler, calls } = harness(),
      res = response();
    await handler(request(data), res);
    assert.ok([400, 413].includes(res.statusCode));
    assert.equal(calls.provider, 0);
  }
  assert.equal(
    requestSchemas.chat.safeParse({
      ...input('chat'),
      history: Array(7).fill({ role: 'user', text: 'a' }),
    }).success,
    false,
  );
});
test('quatro operações conectam DTO validado, reserva persistente e métricas sem dados pessoais', async () => {
  for (const operation of ['itinerary', 'refine', 'chat', 'analyze']) {
    const { handler, calls } = harness({ operation }),
      res = response();
    await handler(request(input(operation)), res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.provider, 1);
    assert.equal(calls.reserved, 1);
    assert.equal(calls.released, 1);
    assert.equal(calls.metrics.length, 1);
    assert.doesNotMatch(calls.logs.join(''), /Brasília|test-only-placeholder|group-access/);
    if (operation === 'analyze') assert.ok(res.body.meta.checks.length);
  }
});
test('limites compartilhados e indisponibilidade Redis impedem consumo', async () => {
  for (const error of [
    new SafeError('rate_limited', 429, 3600),
    new SafeError('busy', 429, 60),
    new SafeError('protection_unavailable'),
  ]) {
    const { handler, calls } = harness({
        store: {
          async reserve() {
            throw error;
          },
        },
      }),
      res = response();
    await handler(request(), res);
    assert.equal(res.statusCode, error.status);
    assert.equal(calls.provider, 0);
  }
});
test('adaptador REST usa Lua atômico, limites globais e leases expirantes, sem fallback em memória', async () => {
  const commands = [];
  const store = redisStore(config, async (url, options) => {
    assert.equal(url, config.redisUrl);
    commands.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ result: 1 }) };
  });
  await store.login('ip', 0);
  const keys = await store.reserve('sid', 'ip', 'request', 0);
  await store.release(keys, 'request');
  await store.metrics('chat', 'ok', { input: 1, output: 2, total: 3 }, 0);
  const reserve = commands.find((c) => c[1] === RESERVE_SCRIPT);
  assert.equal(reserve[2], 5);
  assert.deepEqual(reserve.slice(-6), [40, 8, 12, 172800, 7200, 7200]);
  assert.match(RESERVE_SCRIPT, /ZREMRANGEBYSCORE/);
  assert.match(RESERVE_SCRIPT, /EXPIRE/);
  await assert.rejects(
    redisStore(config, async () => {
      throw Error('private detail');
    }).reserve('s', 'i', 'id', 0),
    (e) => e.code === 'protection_unavailable',
  );
});
test('timeout e cancelamento liberam lease e não retornam proposta tardia', async () => {
  for (const cancelled of [false, true]) {
    let started;
    const start = new Promise((resolve) => (started = resolve));
    const { handler, calls } = harness({
        timeoutMs: 10,
        generate: async () => {
          started();
          return new Promise(() => {});
        },
      }),
      req = request(),
      res = response();
    const running = handler(req, res);
    await start;
    if (cancelled) req.emit('aborted');
    await running;
    assert.equal(res.statusCode, cancelled ? 499 : 504);
    assert.equal(calls.released, 1);
    assert.equal(res.body.data, undefined);
  }
});
test('429, falta de acesso ao modelo e rede são erros seguros sem repetir chamada', async () => {
  for (const status of [429, 403, 404, 500]) {
    const { handler, calls } = harness({
        fail: Object.assign(Error('private-provider-detail'), { status }),
      }),
      res = response();
    await handler(request(), res);
    assert.equal(res.statusCode, status === 429 ? 429 : 503);
    assert.equal(calls.provider, 1);
    assert.equal(calls.released, 1);
    assert.doesNotMatch(JSON.stringify(res.body), /private-provider-detail|test-only-placeholder/);
  }
});
test('SDK recebe schema, timeout, tokens limitados e tentativa única; valida JSON e saída', async () => {
  let args;
  const client = {
    models: {
      async generateContent(value) {
        args = value;
        return {
          text: JSON.stringify(proposal()),
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
        };
      },
    },
  };
  const result = await generate('itinerary', input(), config, new AbortController().signal, client);
  assert.equal(result.usage.total, 30);
  assert.equal(args.model, 'gemini-3.5-flash-lite');
  assert.equal(args.config.httpOptions.retryOptions.attempts, 1);
  assert.ok(args.config.maxOutputTokens <= 16000);
  assert.ok(args.config.responseJsonSchema);
  assert.equal(args.config.responseSchema, undefined);
  assert.doesNotMatch(JSON.stringify(providerSchema('itinerary')), /maxLength|pattern/);
  for (const text of [
    '{',
    JSON.stringify({
      ...proposal(),
      bases: [{ destinationId: 'nonexistent', nights: 24, reason: 'a' }],
    }),
  ])
    await assert.rejects(
      generate('itinerary', input(), config, new AbortController().signal, {
        models: {
          async generateContent() {
            return { text };
          },
        },
      }),
      (e) => e.code === 'invalid_response',
    );
});
test('validação rejeita noites, dias, destinos, sequências, custos e texto executável', () => {
  const invalid = [
    (p) => p.bases[0].nights++,
    (p) => (p.days[0].day = 90),
    (p) => (p.days[0].destinationId = 'neverland'),
    (p) => (p.days[0].destinationId = 'osaka'),
    (p) => (p.days[0].activities[0].estimatedCost = 100),
    (p) => (p.title = '<img src=x onerror=alert(1)>'),
    (p) => (p.logistics = ['O trem leva 2 horas.']),
  ];
  for (const change of invalid) {
    const value = proposal();
    change(value);
    assert.throws(() => validateOutput('itinerary', value, input()));
  }
  const html = mochiChat([{ role: 'model', text: '<img src=x onerror=alert(1)>' }]);
  assert.ok(html.includes('&lt;img'));
  assert.doesNotMatch(html, /<img/);
  for (const days of [1, 2, 90]) {
    const req = input();
    req.profile.days = days;
    req.profile.nights = days - 1;
    assert.doesNotThrow(() => validateOutput('itinerary', proposal(req.profile), req));
  }
});
test('proposta exige confirmação, arquiva e desfaz sem alterar orçamento ou backup antigo', () => {
  const state = initialState(),
    original = structuredClone(state);
  assert.throws(() => applyMochiProposal(state, proposal(), input()));
  assert.deepEqual(state, original);
  const applied = applyMochiProposal(
    state,
    proposal(),
    input(),
    true,
    '2026-11-13',
    'test-proposal',
  );
  assert.equal(applied.state.selectedRoute, 'personalized');
  assert.deepEqual(applied.state.budget, original.budget);
  assert.deepEqual(applied.state.planner.history[0].route, original.routes.winter);
  assert.deepEqual(state, original);
  assert.doesNotThrow(() => parseBackup(JSON.stringify(applied.state)));
  const undone = restorePlannerArchive(applied.state, applied.archiveId);
  assert.deepEqual(undone.routes.personalized, original.routes.winter);
  const old = structuredClone(original);
  old.version = 1;
  delete old.planner;
  delete old.routeChosen;
  assert.equal(parseBackup(JSON.stringify(old)).version, 2);
  assert.equal(sharedProfile(state, 'itinerary').budget, undefined);
});
test('análise determinística e perguntas sensíveis não dependem de afirmações do modelo', () => {
  const req = input('analyze');
  req.route.bases[0].nights++;
  req.route.days[0].activities = Array(4).fill({ title: 'a', free: false });
  const checks = deterministicReview(req.route, req.profile);
  assert.ok(checks.some((s) => s.includes('25 noites')));
  assert.ok(checks.some((s) => s.includes('três atividades')));
  assert.match(
    guardedAnswer({ ...input('chat'), message: 'JESTA já está confirmado?' }).answer,
    /Não tenho uma verificação atual/,
  );
  assert.match(
    guardedAnswer({ ...input('chat'), message: 'Quanto juntar por mês?' }).answer,
    /autorizar/,
  );
});
test('alterações preservam estimativas e favoritos das atividades mantidas', () => {
  const state = initialState();
  state.routes.winter.days[0].activities[0] = {
    id: 'kept',
    title: 'Pausa livre e lavanderia',
    cost: 125,
    favorite: true,
    free: true,
  };
  const applied = applyMochiProposal(state, proposal(), input(), true);
  const kept = applied.state.routes.personalized.days[0].activities[0];
  assert.equal(kept.cost, 125);
  assert.equal(kept.favorite, true);
  assert.equal(applied.state.routes.personalized.days[1].activities[0].cost, 0);
});
test('cliente valida entrada, trata falha de rede e cancela sem aplicar', async () => {
  const client = createAIClient(async () => {
    throw Error('network');
  });
  await assert.rejects(client.request('itinerary', input()), (e) => e.code === 'network');
  await assert.rejects(client.request('itinerary', {}), (e) => e.code === 'invalid_input');
  const abortClient = createAIClient(async () => {
    throw new DOMException('aborted', 'AbortError');
  });
  await assert.rejects(abortClient.request('itinerary', input()), (e) => e.code === 'cancelled');
});
