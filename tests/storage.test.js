import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, loadState, saveState, parseBackup, STORAGE_KEY } from '../src/js/storage.js';
const storage = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) || null, setItem: (key, v) => data.set(key, v) };
};
test('backup restaura valores, listas e atividades editadas', () => {
  const store = storage(),
    s = initialState();
  s.notes = 'Ideias & links';
  s.budget.saved = 3000;
  s.trip.departureDate = '2029-06-10';
  s.routes.winter.days[0].activities[0].title = 'Atividade personalizada';
  assert.equal(saveState(store, s), true);
  assert.deepEqual(loadState(store).state, s);
  assert.deepEqual(parseBackup(JSON.stringify(s)), s);
});
test('storage indisponível avisa e continua com estado utilizável', () => {
  const blocked = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('QuotaExceeded');
    },
  };
  const loaded = loadState(blocked);
  assert.ok(loaded.warning);
  assert.equal(loaded.state.trip.travelers, 6);
  assert.equal(saveState(blocked, loaded.state), false);
});
test('arquivo corrompido e versão incompatível não sobrescrevem original', () => {
  const store = storage();
  store.setItem(STORAGE_KEY, 'corrupto');
  assert.ok(loadState(store).warning);
  assert.equal(store.getItem(STORAGE_KEY), 'corrupto');
  assert.throws(() => parseBackup('{"version":999}'));
});
test('importação rejeita valores financeiros negativos e datas impossíveis', () => {
  let s = initialState();
  s.budget.flight = -1;
  assert.throws(() => parseBackup(JSON.stringify(s)));
  s = initialState();
  s.trip.departureDate = '2029-02-31';
  assert.throws(() => parseBackup(JSON.stringify(s)));
  s = initialState();
  s.trip.travelers = 0;
  assert.throws(() => parseBackup(JSON.stringify(s)));
});
test('importação rejeita atividades duplicadas e valores não numéricos', () => {
  const s = initialState();
  s.routes.winter.days[1].activities.push({ ...s.routes.winter.days[0].activities[0] });
  assert.throws(() => parseBackup(JSON.stringify(s)));
  s.routes.winter = initialState().routes.winter;
  s.budget.saved = '1000';
  assert.throws(() => parseBackup(JSON.stringify(s)));
});
test('notas da versão anterior são migradas e importação tem limite de tamanho', () => {
  const store = storage();
  store.setItem('jp-trip-notes', 'Notas anteriores');
  assert.equal(loadState(store).state.notes, 'Notas anteriores');
  assert.throws(() => parseBackup('x'.repeat(2000001)));
});
