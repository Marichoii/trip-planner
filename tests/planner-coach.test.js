import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, parseBackup } from '../src/js/storage.js';
import { updateProfile, applyCoachChange } from '../src/js/planner-profile.js';
import { sharedProfile, sharedBudget } from '../src/js/mochi-state.js';
import { requestSchemas, validateOutput } from '../src/js/mochi-contracts.js';
import { scenarioBudget, calculateBudget } from '../src/js/budget.js';
import { buildRecommendation } from '../src/js/recommendations.js';

const advice = {
  summary: 'Vale deixar espaço para pausas entre as cidades.',
  suggestions: [
    { reason: 'Mais tempo para explorar cada bairro.', change: { field: 'pace', value: 'calm' } },
  ],
  cautions: ['Confira os horários antes de reservar.'],
};
test('datas, mês, estação e ano permanecem coerentes ao editar o perfil', () => {
  const p = initialState().planner.draft;
  updateProfile(p, 'departureDate', '2029-07-20');
  assert.equal(p.month, 7);
  assert.equal(p.season, 'summer');
  updateProfile(p, 'season', 'winter');
  assert.equal(p.month, null);
  assert.equal(p.departureDate, null);
  updateProfile(p, 'month', 4);
  assert.equal(p.season, 'spring');
  updateProfile(p, 'departureDate', '2029-04-03');
  updateProfile(p, 'year', 2030);
  assert.equal(p.departureDate, '2030-04-03');
  updateProfile(p, 'month', null);
  assert.equal(p.departureDate, null);
  updateProfile(p, 'year', 2028);
  updateProfile(p, 'departureDate', '2028-02-29');
  updateProfile(p, 'year', 2029);
  assert.equal(p.departureDate, null);
});
test('dias e noites se acompanham, e estimativas diárias variam com a duração', () => {
  const p = initialState().planner.draft;
  p.budgetChoice = 'balanced';
  const base = calculateBudget(p, scenarioBudget('balanced', p.travelers)).person;
  updateProfile(p, 'days', 10);
  assert.equal(p.nights, 9);
  const short = calculateBudget(p, p.budget).person;
  assert.ok(short < base);
  updateProfile(p, 'nights', 29);
  assert.equal(p.days, 30);
  assert.ok(calculateBudget(p, p.budget).person > base);
  p.budgetChoice = 'custom';
  p.budget.lodgingNight = 777;
  updateProfile(p, 'travelers', 2);
  assert.equal(p.budget.lodgingNight, 777);
});
test('sugestões aceitam apenas escolhas do catálogo, somam destinos e preservam a rota', () => {
  const s = initialState(),
    before = structuredClone(s.routes);
  const p = s.planner.draft;
  p.destinations = ['tokyo'];
  applyCoachChange(p, { field: 'destination', value: 'naha' });
  applyCoachChange(p, { field: 'destination', value: 'naha' });
  assert.deepEqual(p.destinations, ['tokyo', 'naha']);
  assert.deepEqual(s.routes, before);
  assert.throws(() => applyCoachChange(p, { field: 'destination', value: 'unknown' }));
  assert.throws(() => applyCoachChange(p, { field: 'budget', value: 123 }));
  assert.throws(() => applyCoachChange(p, { field: 'month', value: 13 }));
});
test('Mochi usa o rascunho atual e orçamento escolhido, mesmo com sugestão antiga', () => {
  const s = initialState();
  s.planner.result = buildRecommendation(s.planner.draft, 'old', '2026-11-14');
  s.planner.dirty = true;
  Object.assign(s.planner.draft, {
    travelNotes: 'Cafés e jardins',
    avoid: 'Trocas de hotel',
    budgetChoice: 'custom',
  });
  updateProfile(s.planner.draft, 'days', 10);
  s.planner.draft.budget.flight = 4321;
  for (const operation of ['coach', 'itinerary']) {
    const p = sharedProfile(s, operation);
    assert.equal(p.days, 10);
    assert.equal(p.travelNotes, 'Cafés e jardins');
    assert.equal(p.avoid, 'Trocas de hotel');
    assert.equal(p.budget, undefined);
  }
  const p = sharedProfile(s, 'itinerary');
  assert.equal(
    sharedBudget(s, p, 'itinerary').perPersonTotal,
    calculateBudget(p, s.planner.draft.budget).person,
  );
});
test('contrato do acompanhamento valida contexto e recusa ações, texto e campos inesperados', () => {
  const s = initialState();
  const input = {
    profile: sharedProfile(s, 'coach'),
    budget: null,
    additionalPreferences: '',
    step: 3,
    question: '',
    budgetChoice: null,
  };
  assert.ok(requestSchemas.coach.safeParse(input).success);
  assert.deepEqual(validateOutput('coach', advice, input), advice);
  assert.equal(requestSchemas.coach.safeParse({ ...input, step: 7 }).success, false);
  assert.equal(
    requestSchemas.coach.safeParse({
      ...input,
      profile: { ...input.profile, avoid: 'a'.repeat(301) },
    }).success,
    false,
  );
  assert.throws(() =>
    validateOutput('coach', { ...advice, summary: '<script>alert(1)</script>' }, input),
  );
  assert.throws(() =>
    validateOutput(
      'coach',
      {
        ...advice,
        suggestions: [{ reason: 'x', change: { field: 'destination', value: 'unknown' } }],
      },
      input,
    ),
  );
  assert.throws(() => validateOutput('coach', { ...advice, price: 50 }, input));
});
test('pedidos persistem no backup e perfis antigos sem os novos campos continuam válidos', () => {
  const s = initialState();
  s.planner.draft.travelNotes = 'Um dia de cafés';
  s.planner.draft.avoid = 'Trocar de hotel todos os dias';
  assert.equal(parseBackup(JSON.stringify(s)).planner.draft.travelNotes, 'Um dia de cafés');
  delete s.planner.draft.travelNotes;
  delete s.planner.draft.avoid;
  assert.doesNotThrow(() => parseBackup(JSON.stringify(s)));
  s.planner.draft = null;
  assert.throws(() => parseBackup(JSON.stringify(s)), /Preferências/);
});
