import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState,
  validateState,
  loadState,
  saveState,
  parseBackup,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
} from '../src/js/storage.js';
import {
  recommendDestinations,
  buildRecommendation,
  distributeNights,
  recommendationDetails,
} from '../src/js/recommendations.js';
import { profileErrors } from '../src/js/planner-state.js';
import {
  acceptSuggestion,
  needsAcceptanceConfirmation,
  restorePlannerArchive,
} from '../src/js/planner-actions.js';
const profile = () => initialState().planner.draft;
const legacy = () => {
  const s = initialState();
  s.version = 1;
  delete s.planner;
  delete s.routeChosen;
  return s;
};
test('método dos maiores restos conserva as noites, inclusive viagens curtas', () => {
  for (let total = 0; total < 90; total++)
    for (const weights of [[11, 2, 11], [8, 8, 8], [1], [1, 4, 9, 3]]) {
      const actual = distributeNights(weights, total);
      assert.equal(
        actual.reduce((a, b) => a + b, 0),
        total,
      );
      assert.ok(actual.every(Number.isInteger));
      assert.ok(actual.every((n) => n >= 0));
    }
});
test('verão e praias incluem Okinawa em um plano explicável', () => {
  const p = {
    ...profile(),
    season: 'summer',
    interests: ['beach', 'shopping', 'parks'],
    priorities: ['beach', 'parks', 'shopping'],
  };
  const r = buildRecommendation(p, 'summer', '2026-11-13');
  assert.ok(r.route.bases.some((b) => b.destinationId === 'naha'));
  const d = recommendationDetails(r);
  assert.ok(d.warnings.some((t) => t.includes('Não há Shinkansen')));
  assert.equal(d.totals, null);
  assert.ok(
    recommendDestinations(p)
      .find((d) => d.id === 'naha')
      .reasons.some((t) => t.includes('Praias'.toLowerCase())),
  );
});
test('verão tranquilo mantém a opção de praia mesmo com apenas duas bases', () => {
  const p = {
    ...profile(),
    season: 'summer',
    pace: 'calm',
    interests: ['parks', 'beach'],
    priorities: ['parks', 'beach'],
  };
  const r = buildRecommendation(p);
  assert.equal(r.route.bases.length, 2);
  assert.ok(r.route.bases.some((b) => b.destinationId === 'naha'));
});
test('inverno e neve recebem montanhas, enquanto verão/natureza pode ir a Hokkaido', () => {
  const p = { ...profile(), season: 'winter', interests: ['snow', 'pop'], priorities: ['snow'] };
  assert.ok(
    recommendDestinations(p)
      .slice(0, 8)
      .some((d) => ['nagano', 'hakuba', 'sapporo'].includes(d.id)),
  );
  assert.ok(buildRecommendation(p).route.bases.some((b) => b.destinationId === 'nagano'));
  const summer = { ...profile(), season: 'summer', interests: ['nature'] };
  assert.ok(buildRecommendation(summer).route.bases.some((b) => b.destinationId === 'sapporo'));
});
test('prioridades, escolhas explícitas e duração afetam a recomendação sem fabricar custos', () => {
  const p = {
    ...profile(),
    season: 'autumn',
    destinations: ['hiroshima'],
    interests: ['culture'],
    priorities: ['culture'],
    days: 14,
    nights: 13,
  };
  const r = buildRecommendation(p, 'id', 'date');
  assert.equal(r.route.bases[0].destinationId, 'hiroshima');
  assert.equal(
    r.route.bases.reduce((n, b) => n + b.nights, 0),
    13,
  );
  assert.equal(r.route.days.length, 14);
  assert.ok(r.route.days.every((d) => d.activities.every((a) => a.cost === 0)));
  assert.deepEqual(buildRecommendation(p, 'id', 'date'), r);
});
test('o ritmo muda o número de bases e a presença de ideias extras', () => {
  const calm = buildRecommendation({ ...profile(), pace: 'calm' }),
    intense = buildRecommendation({ ...profile(), pace: 'intense' });
  assert.ok(calm.route.bases.length < intense.route.bases.length);
  assert.ok(intense.route.days.some((d) => d.activities.length > 1));
});
test('sem estação ou orçamento, a sugestão não inventa uma decisão', () => {
  const p = profile(),
    r = buildRecommendation(p),
    d = recommendationDetails(r);
  assert.equal(r.profile.season, null);
  assert.equal(r.profile.departureDate, null);
  assert.equal(d.totals, null);
  assert.ok(d.warnings.some((t) => t.includes('estação continua em aberto')));
  assert.equal(initialState().routeChosen, false);
});
test('noites, pausas e quantidade de dias permanecem coerentes em diferentes durações', () => {
  for (const days of [1, 2, 5, 10, 25, 40, 90])
    for (const pace of ['calm', 'balanced', 'intense']) {
      const p = { ...profile(), days, nights: days - 1, pace },
        r = buildRecommendation(p);
      assert.equal(
        r.route.bases.reduce((n, b) => n + b.nights, 0),
        days - 1,
      );
      assert.equal(r.route.days.length, days);
      assert.equal(new Set(r.route.days.map((d) => d.day)).size, days);
      assert.equal(r.route.days.at(-1).day, days);
      for (let day = 1; day <= days - 4; day += 5)
        assert.ok(
          r.route.days
            .filter((d) => d.day >= day && d.day < day + 5)
            .some((d) => d.activities.some((a) => a.free)) || days === day + 4,
        );
    }
});
test('valida data e estação, mas aceita informações opcionais em aberto', () => {
  assert.deepEqual(profileErrors(profile()), []);
  assert.ok(profileErrors({ ...profile(), season: 'winter', departureDate: '2029-07-10' }).length);
  assert.ok(profileErrors({ ...profile(), days: 14, nights: 24 }, 2).length);
  assert.deepEqual(
    profileErrors({ ...profile(), season: null, month: null, departureDate: null }, 1),
    [],
  );
});
test('migração v1 preserva dados e mantém winter padrão sem atribuir escolha', () => {
  const before = legacy();
  before.notes = 'Nossas notas';
  before.budget.saved = 1000;
  before.favorites.destinations = ['naha'];
  const raw = JSON.stringify(before),
    migrated = parseBackup(raw);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.routeChosen, false);
  assert.equal(migrated.planner.draft.season, null);
  assert.deepEqual(migrated.routes, before.routes);
  assert.deepEqual(migrated.budget, before.budget);
  assert.equal(migrated.notes, before.notes);
  assert.deepEqual(migrated.favorites, before.favorites);
  assert.equal(JSON.stringify(before), raw);
});
test('migração identifica um roteiro anterior personalizado e preserva a chave v1', () => {
  const before = legacy();
  before.routes.winter.days[0].activities[0].title = 'Nosso passeio especial';
  const data = new Map([[LEGACY_STORAGE_KEY, JSON.stringify(before)]]),
    storage = { getItem: (k) => data.get(k) || null, setItem: (k, v) => data.set(k, v) };
  const loaded = loadState(storage);
  assert.equal(loaded.state.routeChosen, true);
  assert.equal(loaded.migrated, true);
  saveState(storage, loaded.state);
  assert.equal(data.get(LEGACY_STORAGE_KEY), JSON.stringify(before));
  assert.ok(data.has(STORAGE_KEY));
});
test('aceitação exige confirmação e guarda roteiro, orçamento e preferências anteriores', () => {
  const state = initialState();
  state.routeChosen = true;
  state.notes = 'Não apagar';
  state.routes.winter.days[0].activities[0].title = 'Atividade original';
  state.budget.saved = 1234;
  state.planner.result = buildRecommendation(
    { ...profile(), season: 'summer', interests: ['beach'], budgetChoice: 'economic' },
    'new',
    '2026-11-13',
  );
  state.planner.dirty = false;
  assert.equal(needsAcceptanceConfirmation(state), true);
  assert.throws(() => acceptSuggestion(state));
  const applied = acceptSuggestion(state, true, '2026-11-13');
  assert.equal(state.selectedRoute, 'winter');
  assert.equal(applied.selectedRoute, 'personalized');
  assert.equal(applied.trip.selectedSeason, 'summer');
  assert.equal(applied.notes, 'Não apagar');
  assert.equal(applied.budget.saved, 1234);
  assert.equal(applied.planner.history[0].route.days[0].activities[0].title, 'Atividade original');
  assert.deepEqual(applied.routes.winter, state.routes.winter);
  assert.doesNotThrow(() => validateState(applied));
  const restored = restorePlannerArchive(applied, applied.planner.history[0].id, '2026-11-13');
  assert.equal(restored.routes.personalized.days[0].activities[0].title, 'Atividade original');
  assert.equal(restored.planner.history.length, 2);
  assert.doesNotThrow(() => parseBackup(JSON.stringify(restored)));
});
test('não conhecer orçamento preserva valores existentes e mudanças no wizard não apagam roteiros', () => {
  const state = initialState();
  state.budget.shopping = 7777;
  const budget = JSON.stringify(state.budget),
    routes = JSON.stringify(state.routes);
  state.planner.result = buildRecommendation(
    { ...profile(), budgetChoice: 'unknown' },
    'test',
    '2026-11-13',
  );
  const next = acceptSuggestion(state, true);
  assert.equal(JSON.stringify(next.budget), budget);
  assert.equal(JSON.stringify(state.routes), routes);
  next.planner.dirty = true;
  next.planner.result.id = 'another';
  assert.throws(() => acceptSuggestion(next, true));
});
