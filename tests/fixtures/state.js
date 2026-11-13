import { initialState, STORAGE_KEY } from '../../src/js/storage.js';
import { buildRecommendation } from '../../src/js/recommendations.js';
import { proposal, chat, review } from './mochi.js';

// Planejamento realista: verão, prioridades, cidades escolhidas e uma sugestão pronta.
export function seededState(theme = 'light') {
  const s = initialState();
  Object.assign(s.planner.draft, {
    season: 'summer',
    month: 7,
    interests: ['beach', 'parks', 'shopping', 'food', 'pop'],
    priorities: ['beach', 'parks', 'shopping'],
    destinations: ['tokyo', 'osaka', 'naha'],
    budgetChoice: 'balanced',
  });
  Object.assign(s.planner, { started: true, step: 1, furthestStep: 6, status: 'ready' });
  s.planner.result = buildRecommendation(s.planner.draft, 'visual-review', '2026-11-13');
  s.theme = theme;
  return s;
}

export async function seed(context, theme = 'light') {
  const state = seededState(theme);
  await context.addInitScript(
    ({ key, state }) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(key, JSON.stringify(state));
        sessionStorage.setItem('seeded', '1');
      }
    },
    { key: STORAGE_KEY, state },
  );
  return state;
}

// Respostas simuladas da Mochi; nenhuma chave ou serviço real é usado.
export async function mockMochi(context) {
  await context.route('**/api/ai/*', async (route) => {
    const operation = new URL(route.request().url()).pathname.split('/').at(-1);
    if (operation === 'session')
      return route.fulfill({ json: { enabled: true, authenticated: true, csrf: 'test-csrf' } });
    const data = route.request().postDataJSON();
    const result =
      operation === 'chat' ? chat : operation === 'analyze' ? review : proposal(data.profile);
    return route.fulfill({
      json: {
        data: result,
        meta: { mode: 'gemini', checks: ['As noites conferem no aplicativo.'] },
      },
    });
  });
}
