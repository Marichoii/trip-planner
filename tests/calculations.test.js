import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBudget,
  scenarioBudget,
  depositCount,
  lodgingCost,
  transportCost,
  wishlistCost,
} from '../src/js/budget.js';
import { initialState } from '../src/js/storage.js';
import { makeRoute, validateRoute, moveActivity, cityForDay } from '../src/js/itinerary.js';
test('cenários do PDF mantêm totais corretos por pessoa e para seis', () => {
  const trip = initialState().trip;
  for (const [key, total] of [
    ['economic', 26600],
    ['balanced', 34750],
    ['comfortable', 45900],
  ]) {
    const result = calculateBudget(trip, scenarioBudget(key));
    assert.equal(result.person, total);
    assert.equal(result.group, total * 6);
  }
});
test('a diária pertence ao grupo e os gastos diários pertencem à pessoa', () => {
  const trip = { travelers: 6, days: 25, nights: 24, departureDate: null };
  const budget = Object.fromEntries(Object.keys(scenarioBudget('balanced')).map((k) => [k, 0]));
  Object.assign(budget, { lodgingNight: 600, foodDay: 100 });
  const b = calculateBudget(trip, budget);
  assert.equal(b.lodgingGroup, 14400);
  assert.equal(b.person, 4900);
  assert.equal(b.group, 29400);
});
test('soma valores monetários em centavos antes de ratear', () => {
  const s = initialState();
  const b = Object.fromEntries(Object.keys(s.budget).map((k) => [k, 0]));
  b.flight = 0.1;
  b.parks = 0.2;
  b.lodgingNight = 0.01;
  const r = calculateBudget({ ...s.trip, nights: 1 }, b);
  assert.equal(r.group, 1.81);
  assert.equal(r.person, 0.3);
});
test('26 depósitos de dez/2026 a jan/2029 para embarque em fev/2029', () =>
  assert.equal(depositCount('2026-12', '2029-02-01'), 26));
test('depósitos não inventam uma data de viagem e não ficam negativos', () => {
  assert.equal(depositCount('2026-12', null), null);
  assert.equal(depositCount('2029-02', '2029-02-10'), 0);
  assert.equal(depositCount('2029-03', '2029-02-10'), 0);
  assert.equal(depositCount('2028-11', '2029-01-10'), 2);
});
test('mensalidade arredonda para cima e saldo excedente não cria dívida', () => {
  const s = initialState();
  s.trip.departureDate = '2029-02-10';
  s.budget.saved = 10000;
  const b = calculateBudget(s.trip, s.budget);
  assert.equal(b.remaining, 24750);
  assert.equal(b.monthly, 951.93);
  s.budget.saved = 40000;
  const done = calculateBudget(s.trip, s.budget);
  assert.equal(done.remaining, 0);
  assert.equal(done.progress, 100);
  assert.equal(done.monthly, 0);
});
test('sem data não há mensalidade e com zero meses não há divisão por zero', () => {
  const s = initialState();
  assert.equal(calculateBudget(s.trip, s.budget).monthly, null);
  s.trip.departureDate = '2029-02-10';
  s.budget.savingsStart = '2029-02';
  assert.equal(calculateBudget(s.trip, s.budget).monthly, null);
});
test('hospedagem inclui limpeza e impostos uma única vez', () =>
  assert.deepEqual(lodgingCost({ nightly: 600, nights: 5, cleaning: 100, taxes: 200 }, 6), {
    total: 3300,
    person: 550,
  }));
test('trechos são cotados por pessoa, wishlist só converte com cotação', () => {
  assert.deepEqual(transportCost([{ price: 10.1 }, { price: 20.2 }], 6), {
    person: 30.3,
    group: 181.8,
  });
  assert.deepEqual(wishlistCost([{ price: 1000, quantity: 2 }], null), { yen: 2000, brl: null });
  assert.deepEqual(wishlistCost([{ price: 1000, quantity: 2 }], 0.035), { yen: 2000, brl: 70 });
});
test('cinco roteiros iniciais têm 24 noites, 25 dias e períodos livres', () => {
  const s = initialState();
  for (const r of Object.values(s.routes)) {
    assert.equal(r.days.length, 25);
    assert.deepEqual(validateRoute(r, s.trip).messages, []);
  }
  assert.deepEqual(
    s.routes.winter.bases.map((b) => b.nights),
    [11, 2, 11],
  );
});
test('alteração de duração avisa sobre noites e dias sem apagar atividades', () => {
  const r = makeRoute('winter');
  assert.ok(
    validateRoute(r, { days: 10, nights: 9 }).messages.some((m) => m.includes('24 noites')),
  );
  assert.ok(validateRoute(r, { days: 10, nights: 9 }).messages.some((m) => m.includes('além')));
  assert.equal(r.days.length, 25);
});
test('mover atividade mantém dados e quantidade, inclusive entre dias', () => {
  const r = makeRoute('winter'),
    a = r.days[0].activities[0];
  a.cost = 123.45;
  const count = r.days.flatMap((d) => d.activities).length;
  assert.equal(moveActivity(r, a.id, 2), true);
  assert.equal(r.days[0].activities.length, 0);
  assert.equal(r.days[1].activities.at(-1).cost, 123.45);
  assert.equal(r.days.flatMap((d) => d.activities).length, count);
  assert.equal(moveActivity(r, a.id, 1000), false);
  assert.equal(cityForDay(r, 12), 'Nagano');
  assert.equal(cityForDay(r, 14), 'Tóquio');
});
test('arredondamento de meia unidade de centavo não perde o centavo', () => {
  const s = initialState();
  const b = { ...s.budget, flight: 1.005 };
  const difference = calculateBudget(s.trip, b).categories.Passagens;
  assert.equal(difference, 6.06);
});
test('os roteiros mantêm experiências coerentes com a estação e pausas', () => {
  const titles = (key) =>
    makeRoute(key)
      .days.flatMap((d) => d.activities)
      .map((a) => a.title)
      .join(' ');
  assert.match(titles('summer-hokkaido'), /Furano e lavandas/);
  assert.match(titles('summer-okinawa'), /snorkel/);
  assert.match(titles('autumn'), /Nikko/);
  assert.match(titles('autumn'), /momiji/);
  assert.doesNotMatch(titles('autumn'), /Neve \/ Hakuba/);
  assert.match(titles('winter'), /Shibuya e Harajuku/);
  assert.match(titles('winter'), /Fuji-Q/);
});
