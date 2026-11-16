import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mochiApiPlugin } from '../server/mochi-vite.js';

function middleware(env = {}) {
  let handle;
  mochiApiPlugin({ env, log() {} }).configureServer({
    middlewares: {
      use(fn) {
        handle = fn;
      },
    },
    config: {},
  });
  return (url) =>
    new Promise((resolve) => {
      const req = Object.assign(new EventEmitter(), { url, method: 'GET', headers: {} });
      const res = Object.assign(new EventEmitter(), {
        headers: {},
        setHeader(key, value) {
          this.headers[key] = value;
        },
        end(raw) {
          this.writableEnded = true;
          resolve({ status: this.statusCode, headers: this.headers, body: JSON.parse(raw) });
        },
      });
      handle(req, res, () => resolve({ next: true }));
    });
}
test('servidor Vite atende as seis rotas de IA com JSON e mantém bloqueio sem configuração', async () => {
  const call = middleware();
  for (const route of ['session', 'itinerary', 'refine', 'chat', 'analyze', 'coach']) {
    const response = await call('/api/ai/' + route + '?local=true');
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, 'disabled');
    assert.match(response.headers['Content-Type'], /^application\/json/);
    assert.equal(response.headers['Cache-Control'], 'no-store');
  }
});
test('rotas desconhecidas de IA não servem código-fonte, demais páginas continuam no Vite', async () => {
  const call = middleware();
  assert.equal((await call('/api/ai/session.js')).status, 404);
  assert.equal((await call('/api/ai/unknown')).status, 404);
  assert.deepEqual(await call('/src/js/main.js'), { next: true });
  assert.deepEqual(await call('/'), { next: true });
  assert.equal(mochiApiPlugin().apply, 'serve');
});
