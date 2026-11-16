import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
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
const env = {
  AI_ENABLED: 'true',
  GEMINI_API_KEY: 'test-only-placeholder',
  GEMINI_MODEL: 'gemini-3.5-flash-lite',
  MOCHI_ALLOWED_ORIGINS: 'https://planner.example',
  UPSTASH_REDIS_REST_URL: 'https://test-only.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'test-only-placeholder',
};
const config = configuration(env),
  auth = issueSession(config);
function request(body = input(), method = 'POST', withSession = true) {
  const req = new EventEmitter();
  Object.assign(req, {
    method,
    body,
    headers: {
      origin: 'https://planner.example',
      'content-type': 'application/json',
      ...(withSession
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
test('fail closed sem chave, Redis, origem ou flag', async () => {
  for (const field of [
    'GEMINI_API_KEY',
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
  assert.equal(
    readSession(request(), configuration({ ...env, GEMINI_API_KEY: 'rotated-test-key' })),
    null,
  );
});
test('Mochi abre sem código de grupo e cria cookie técnico automaticamente', async () => {
  const { handler, calls } = harness({ operation: 'session' }),
    res = response();
  assert.equal(config.ready, true);
  await handler(request(undefined, 'GET', false), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.enabled, true);
  assert.equal(res.body.authenticated, undefined);
  assert.ok(res.body.csrf);
  assert.match(
    res.headers['Set-Cookie'],
    /HttpOnly; SameSite=Strict; Path=\/; Max-Age=28800; Secure/,
  );
  assert.equal(calls.provider, 0);
  assert.equal(calls.reserved, 0);
  const cookie = res.headers['Set-Cookie'].split(';')[0];
  const session = readSession({ headers: { cookie } }, config);
  assert.ok(session);
  assert.equal(res.body.csrf, csrfToken(config, session));
  const api = harness(),
    answer = response(),
    req = request();
  req.headers.cookie = cookie;
  req.headers['x-mochi-csrf'] = res.body.csrf;
  await api.handler(req, answer);
  assert.equal(answer.statusCode, 200);
  assert.equal(api.calls.provider, 1);
});
test('status same-origin reutiliza cookie; login e logout antigos não são aceitos', async () => {
  const { handler } = harness({ operation: 'session' }),
    req = request(undefined, 'GET'),
    res = response();
  delete req.headers.origin;
  req.headers.referer = 'https://planner.example/';
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.csrf);
  assert.equal(res.headers['Set-Cookie'], undefined);
  for (const method of ['POST', 'DELETE']) {
    const out = response();
    await handler(request(undefined, method), out);
    assert.equal(out.statusCode, 405);
    assert.equal(out.headers.Allow, 'GET');
  }
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
test('rejeição do pedido, limites, acesso e rede têm diagnóstico seguro sem repetir chamada', async () => {
  for (const status of [400, 429, 403, 404, 500, 503]) {
    const { handler, calls } = harness({
        fail: Object.assign(Error('private-provider-detail'), { status }),
      }),
      res = response();
    await handler(request(), res);
    assert.equal(res.statusCode, status === 429 ? 429 : status === 400 ? 502 : 503);
    assert.equal(JSON.parse(calls.logs[0]).providerStatus, status);
    if (status === 400) assert.equal(res.body.error.code, 'provider_rejected');
    if (status === 503) assert.equal(res.body.error.code, 'provider_busy');
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
  assert.doesNotMatch(
    JSON.stringify(providerSchema('itinerary')),
    /maxLength|pattern|minItems|maxItems/,
  );
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

test('acompanhamento atravessa handler e provider com contrato próprio e perfil mínimo', async () => {
  const context = {
    ...input(),
    step: 3,
    question: 'Como organizar as pausas?',
    budgetChoice: 'balanced',
  };
  context.profile.travelNotes = 'Jardins e cafés';
  const advice = {
    summary: 'Reserve espaço para descansar entre os passeios.',
    suggestions: [
      { reason: 'Dá espaço para explorar com calma.', change: { field: 'pace', value: 'calm' } },
    ],
    cautions: [],
  };
  let captured;
  const provider = {
    models: {
      async generateContent(args) {
        captured = args;
        return {
          text: JSON.stringify(advice),
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 80, totalTokenCount: 180 },
        };
      },
    },
  };
  const { handler, calls } = harness({
    operation: 'coach',
    generate: (op, body, cfg, signal) => generate(op, body, cfg, signal, provider),
  });
  const res = response();
  await handler(request(context), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data, advice);
  assert.equal(calls.reserved, 1);
  assert.equal(calls.released, 1);
  assert.match(captured.config.systemInstruction, /seis etapas/);
  assert.equal(captured.config.maxOutputTokens, 1200);
  assert.equal(JSON.parse(captured.contents).request.profile.travelNotes, 'Jardins e cafés');
  assert.deepEqual(captured.config.responseJsonSchema, providerSchema('coach'));
});

test('schema de geração evita limites de listas rejeitados pelo Gemini sem relaxar a resposta aceita', () => {
  for (const operation of ['itinerary', 'refine', 'coach', 'chat', 'analyze']) {
    const schema = providerSchema(operation);
    assert.doesNotMatch(JSON.stringify(schema), /"(?:minItems|maxItems)":/);
    assert.equal(schema.additionalProperties, false);
  }
  const schema = providerSchema('itinerary');
  assert.match(schema.properties.days.description, /Máximo de 90 itens/);
  assert.match(schema.properties.title.description, /Máximo de 100 caracteres/);
  assert.ok(schema.properties.bases.items.properties.destinationId.enum.includes('tokyo'));
  assert.equal(
    schema.properties.days.items.properties.activities.items.properties.estimatedCost.type,
    'null',
  );
  for (const change of [
    (p) => {
      p.experiences = Array(7).fill('Uma experiência');
    },
    (p) => {
      p.days[0].activities = Array(5).fill(p.days[0].activities[0]);
    },
    (p) => {
      p.days[0].activities = [];
    },
    (p) => {
      p.title = 'a'.repeat(101);
    },
  ]) {
    const value = proposal();
    change(value);
    assert.throws(() => validateOutput('itinerary', value, input()));
    assert.throws(() => validateOutput('refine', value, input('refine')));
  }
});
