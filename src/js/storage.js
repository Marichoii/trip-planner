import { scenarioBudget } from './budget.js';
import { makeRoute, routeNames } from './itinerary.js';
export const STORAGE_KEY = 'japan-diary-planner-v1';
export const VERSION = 1;
export function initialState() {
  return {
    version: VERSION,
    trip: {
      year: 2029,
      travelers: 6,
      days: 25,
      nights: 24,
      departureCity: 'Brasília',
      departureDate: null,
      selectedSeason: null,
    },
    budget: scenarioBudget('balanced'),
    selectedRoute: 'winter',
    routes: Object.fromEntries(Object.keys(routeNames).map((key) => [key, makeRoute(key)])),
    favorites: { destinations: [], events: [], food: [] },
    checks: {},
    packed: {},
    notes: '',
    tasks: [],
    wishlist: [],
    exchangeRate: null,
    lodgings: [],
    legs: [],
    seasonQuotes: {},
    theme: 'light',
    weights: [1, 1, 1, 1, 1],
  };
}
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const text = (value, max = 1000) => (typeof value === 'string' ? value.slice(0, max) : '');
const numeric = (value, min = 0, max = 10000000) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const stringArray = (value) =>
  Array.isArray(value) &&
  value.length <= 2000 &&
  value.every((v) => typeof v === 'string' && v.length <= 150);
export function validateState(value) {
  if (!object(value) || value.version !== VERSION)
    throw new Error('Versão do backup incompatível. Use um arquivo exportado por esta versão.');
  const t = value.trip,
    b = value.budget;
  if (
    !object(t) ||
    !Number.isInteger(t.travelers) ||
    !numeric(t.travelers, 1, 50) ||
    !Number.isInteger(t.days) ||
    !numeric(t.days, 1, 90) ||
    !Number.isInteger(t.nights) ||
    !numeric(t.nights, 0, 89)
  )
    throw new Error('Configurações da viagem inválidas.');
  if (
    t.departureDate !== null &&
    (typeof t.departureDate !== 'string' ||
      !/^2029-\d{2}-\d{2}$/.test(t.departureDate) ||
      Number.isNaN(Date.parse(t.departureDate)) ||
      new Date(t.departureDate).toISOString().slice(0, 10) !== t.departureDate)
  )
    throw new Error('A data de embarque deve ser válida e pertencer a 2029.');
  const seed = initialState();
  if (
    !object(b) ||
    Object.keys(seed.budget)
      .filter((k) => !['scenario', 'savingsStart'].includes(k))
      .some((k) => !numeric(b[k]))
  )
    throw new Error('Valores financeiros inválidos.');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(b.savingsStart || ''))
    throw new Error('Mês inicial da poupança inválido.');
  if (!object(value.routes) || !Object.keys(routeNames).includes(value.selectedRoute))
    throw new Error('Roteiro inválido.');
  for (const key of Object.keys(routeNames)) {
    const route = value.routes[key];
    if (
      !object(route) ||
      !Array.isArray(route.bases) ||
      route.bases.length > 100 ||
      !Array.isArray(route.days) ||
      route.days.length > 90
    )
      throw new Error('Formato de roteiro inválido.');
    const ids = new Set();
    if (
      route.bases.some(
        (b) =>
          !object(b) ||
          !text(b.city, 150) ||
          !numeric(b.nights, 0, 89) ||
          !Number.isInteger(b.nights),
      )
    )
      throw new Error('Bases de roteiro inválidas.');
    const days = new Set();
    for (const d of route.days) {
      if (
        !object(d) ||
        !Number.isInteger(d.day) ||
        !numeric(d.day, 1, 90) ||
        days.has(d.day) ||
        !Array.isArray(d.activities) ||
        d.activities.length > 100
      )
        throw new Error('Dias de roteiro inválidos.');
      days.add(d.day);
      for (const a of d.activities) {
        if (
          !object(a) ||
          !text(a.id, 150) ||
          ids.has(a.id) ||
          !text(a.title, 300) ||
          !numeric(a.cost)
        )
          throw new Error('Atividade inválida.');
        ids.add(a.id);
      }
    }
  }
  if (
    !object(value.favorites) ||
    ['destinations', 'events', 'food'].some((k) => !stringArray(value.favorites[k]))
  )
    throw new Error('Favoritos inválidos.');
  for (const k of ['checks', 'packed'])
    if (
      !object(value[k]) ||
      Object.keys(value[k]).length > 5000 ||
      Object.values(value[k]).some((v) => typeof v !== 'boolean')
    )
      throw new Error('Checklist inválido.');
  for (const k of ['lodgings', 'legs', 'wishlist', 'tasks'])
    if (!Array.isArray(value[k]) || value[k].length > 1000 || value[k].some((v) => !object(v)))
      throw new Error('Listas inválidas.');
  for (const k of ['lodgings', 'legs', 'wishlist', 'tasks']) {
    const ids = new Set();
    for (const item of value[k]) {
      if (!text(item.id, 150) || ids.has(item.id))
        throw new Error('Identificadores de lista inválidos ou duplicados.');
      ids.add(item.id);
    }
  }
  if (
    value.lodgings.some(
      (l) =>
        !text(l.name, 150) ||
        !numeric(l.nightly) ||
        !numeric(l.nights, 1, 90) ||
        !numeric(l.cleaning) ||
        !numeric(l.taxes) ||
        !numeric(l.capacity, 1, 100) ||
        !numeric(l.beds, 1, 100) ||
        !numeric(l.bathrooms, 0, 100),
    )
  )
    throw new Error('Hospedagens inválidas.');
  if (value.legs.some((l) => !text(l.from, 150) || !text(l.to, 150) || !numeric(l.price)))
    throw new Error('Trechos inválidos.');
  if (
    value.wishlist.some(
      (w) =>
        !text(w.name, 150) ||
        !numeric(w.price) ||
        !Number.isInteger(w.quantity) ||
        !numeric(w.quantity, 1, 1000),
    )
  )
    throw new Error('Wishlist inválida.');
  if (value.tasks.some((t) => !text(t.id, 150) || !text(t.title, 300)))
    throw new Error('Tarefas inválidas.');
  if (typeof value.notes !== 'string' || value.notes.length > 100000)
    throw new Error('Notas inválidas.');
  if (value.exchangeRate !== null && !numeric(value.exchangeRate, 0.000001, 100))
    throw new Error('Cotação inválida.');
  if (
    !Array.isArray(value.weights) ||
    value.weights.length !== 5 ||
    value.weights.some((w) => !numeric(w, 0, 5))
  )
    throw new Error('Pesos inválidos.');
  if (value.seasonQuotes !== undefined) {
    if (!object(value.seasonQuotes)) throw new Error('Comparações de estação inválidas.');
    for (const [key, q] of Object.entries(value.seasonQuotes)) {
      if (
        !['spring', 'summer', 'autumn', 'winter'].includes(key) ||
        !object(q) ||
        !object(q.trip) ||
        !object(q.budget) ||
        !numeric(q.trip.travelers, 1, 50) ||
        !numeric(q.trip.days, 1, 90) ||
        !numeric(q.trip.nights, 0, 89) ||
        Object.keys(seed.budget)
          .filter((k) => !['scenario', 'savingsStart'].includes(k))
          .some((k) => !numeric(q.budget[k]))
      )
        throw new Error('Orçamento de estação inválido.');
    }
  }
  return {
    ...seed,
    ...value,
    trip: {
      ...seed.trip,
      ...t,
      year: 2029,
      selectedSeason: ['spring', 'summer', 'autumn', 'winter'].includes(t.selectedSeason)
        ? t.selectedSeason
        : null,
    },
    budget: {
      ...b,
      scenario: Object.keys({ economic: 1, balanced: 1, comfortable: 1 }).includes(b.scenario)
        ? b.scenario
        : 'balanced',
    },
    theme: value.theme === 'dark' ? 'dark' : 'light',
  };
}
export function loadState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) return { state: validateState(JSON.parse(raw)), warning: null };
    const state = initialState();
    const old = storage.getItem('jp-trip-notes');
    if (old) state.notes = text(old, 100000);
    return { state, warning: null };
  } catch {
    let recovered = false;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        storage.setItem(STORAGE_KEY + '-recovery', raw);
        recovered = true;
      }
    } catch {}
    return {
      state: initialState(),
      warning: recovered
        ? 'O estado local não pôde ser restaurado. Uma cópia foi preservada na chave de recuperação do navegador.'
        : 'Não foi possível acessar o planejamento local. Exporte um backup antes de sair.',
    };
  }
}
export function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
export function parseBackup(raw) {
  if (typeof raw !== 'string' || raw.length > 2000000)
    throw new Error('Arquivo muito grande. Limite: 2 MB.');
  return validateState(JSON.parse(raw));
}
