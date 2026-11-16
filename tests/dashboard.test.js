import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, validateState } from '../src/js/storage.js';
import { dashboardState } from '../src/js/dashboard.js';

test('capa mostra ideias sem escolher ou alterar o roteiro do grupo', () => {
  const s = initialState();
  const before = structuredClone(s);
  const overview = dashboardState(s);
  assert.equal(overview.personalMap, false);
  assert.equal(overview.completed, 0);
  assert.equal(overview.continueUrl, '#planner');
  assert.ok(overview.points.every((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng)));
  assert.deepEqual(s, before);
});

test('capa acompanha o rascunho sem apresentar uma sugestão antiga como concluída', () => {
  const s = initialState();
  Object.assign(s.planner, { started: true, furthestStep: 4, dirty: true });
  Object.assign(s.planner.draft, { travelers: 3, days: 12, destinations: ['naha', 'tokyo'] });
  const overview = dashboardState(s);
  assert.equal(overview.profile.travelers, 3);
  assert.equal(overview.completed, 3);
  assert.equal(overview.continueUrl, '#planner');
  assert.deepEqual(
    overview.points.map((d) => d.id),
    ['naha', 'tokyo'],
  );
  assert.equal(overview.personalMap, true);
});

test('novo visual migra para claro uma vez e preserva viagem e escolha posterior de tema', () => {
  const old = initialState();
  delete old.appearanceVersion;
  old.theme = 'dark';
  old.appearanceVersion = 1;
  old.notes = 'Minhas anotações';
  old.budget.saved = 500;
  const migrated = validateState(old);
  assert.equal(migrated.theme, 'light');
  assert.equal(migrated.appearanceVersion, 2);
  assert.deepEqual(migrated.routes, old.routes);
  assert.deepEqual(migrated.planner, old.planner);
  assert.deepEqual(migrated.budget, old.budget);
  assert.equal(migrated.notes, old.notes);
  migrated.theme = 'dark';
  assert.equal(validateState(migrated).theme, 'dark');
});
