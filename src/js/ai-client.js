import { RESTING, requestSchemas, outputSchemas, validateOutput } from './mochi-contracts.js';
export class AIError extends Error {
  constructor(code, message = RESTING) {
    super(message);
    this.code = code;
  }
}
export function createAIClient(fetcher = fetch) {
  let csrf = null;
  async function call(path, { method = 'POST', data, signal } = {}) {
    let response;
    try {
      response = await fetcher('/api/ai/' + path, {
        method,
        credentials: 'same-origin',
        headers: {
          ...(data ? { 'Content-Type': 'application/json' } : {}),
          ...(csrf ? { 'X-Mochi-CSRF': csrf } : {}),
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
        signal,
      });
    } catch (error) {
      if (error.name === 'AbortError')
        throw new AIError('cancelled', 'Pedido cancelado. Seu roteiro continua como estava.');
      throw new AIError('network');
    }
    let body;
    try {
      const raw = await response.text();
      if (raw.length > 100000) throw Error();
      body = JSON.parse(raw);
    } catch {
      throw new AIError('unavailable');
    }
    if (!response.ok) throw new AIError(body.error?.code || 'unavailable');
    return body;
  }
  return {
    async status(signal) {
      const result = await call('session', { method: 'GET', signal });
      csrf = result.csrf;
      return result;
    },
    async login(code, signal) {
      const result = await call('session', { data: { code }, signal });
      csrf = result.csrf;
      return result;
    },
    async logout() {
      await call('session', { method: 'DELETE' });
      csrf = null;
    },
    async request(operation, input, signal) {
      const parsed = requestSchemas[operation].safeParse(input);
      if (!parsed.success)
        throw new AIError(
          'invalid_input',
          'Revise a duração, as preferências e o tamanho do roteiro antes de enviar.',
        );
      const response = await call(operation, { data: parsed.data, signal });
      try {
        response.data =
          response.meta?.mode === 'local' && operation === 'chat'
            ? outputSchemas.chat.parse(response.data)
            : validateOutput(operation, response.data, parsed.data);
      } catch {
        throw new AIError('invalid_response');
      }
      return response;
    },
  };
}
