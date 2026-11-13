import { scenarioBudget } from './budget.js';
import { makeRoute, routeNames } from './itinerary.js';
import { initialPlanner, migrateV1, validatePlanner } from './planner-state.js';
export const STORAGE_KEY = 'japan-diary-planner-v2';
export const LEGACY_STORAGE_KEY = 'japan-diary-planner-v1';
export const VERSION = 2;
export function initialState() {
  const trip = {
      year: 2029,
      travelers: 6,
      days: 25,
      nights: 24,
      departureCity: 'Brasília',
      departureDate: null,
      selectedSeason: null,
    },
    budget = scenarioBudget('balanced');
  return {
    version: VERSION,
    trip,
    budget,
    selectedRoute: 'winter',
    routeChosen: false,
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
    planner: initialPlanner(trip, budget),
  };
}
const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
const text = (v, max = 1000) => (typeof v === 'string' && v.length <= max ? v : '');
const numeric = (v, min = 0, max = 10000000) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const stringArray = (v) =>
  Array.isArray(v) &&
  v.length <= 2000 &&
  v.every((item) => typeof item === 'string' && item.length <= 150);
function validateTrip(t) {
  if (
    !object(t) ||
    !text(t.departureCity, 150)?.trim() ||
    !Number.isInteger(t.travelers) ||
    !numeric(t.travelers, 1, 50) ||
    !Number.isInteger(t.days) ||
    !numeric(t.days, 1, 90) ||
    !Number.isInteger(t.nights) ||
    !numeric(t.nights, 0, 89) ||
    !Number.isInteger(t.year) ||
    !numeric(t.year, 2027, 2040)
  )
    throw new Error('Configurações da viagem inválidas.');
  if (
    t.departureDate !== null &&
    (typeof t.departureDate !== 'string' ||
      !new RegExp(`^${t.year}-\\d{2}-\\d{2}$`).test(t.departureDate) ||
      Number.isNaN(Date.parse(t.departureDate)) ||
      new Date(t.departureDate).toISOString().slice(0, 10) !== t.departureDate)
  )
    throw new Error(`A data de embarque deve ser válida e pertencer a ${t.year}.`);
}
function validateBudget(b) {
  const fields = Object.keys(scenarioBudget('balanced')).filter(
    (k) => !['scenario', 'savingsStart'].includes(k),
  );
  if (
    !object(b) ||
    fields.some((k) => !numeric(b[k])) ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(b.savingsStart || '')
  )
    throw new Error('Valores financeiros ou mês inicial inválidos.');
}
export function validateRouteData(route) {
  if (
    !object(route) ||
    !Array.isArray(route.bases) ||
    route.bases.length > 100 ||
    !Array.isArray(route.days) ||
    route.days.length > 90
  )
    throw new Error('Formato de roteiro inválido.');
  const ids = new Set(),
    days = new Set();
  if (
    route.bases.some(
      (b) =>
        !object(b) ||
        !text(b.city, 150) ||
        !Number.isInteger(b.nights) ||
        !numeric(b.nights, 0, 89),
    )
  )
    throw new Error('Bases de roteiro inválidas.');
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
export function validateState(value) {
  if (!object(value) || ![1, VERSION].includes(value.version))
    throw new Error('Versão do backup incompatível. Use um backup das versões 1 ou 2.');
  const legacy = value.version === 1,
    t = value.trip,
    b = value.budget;
  validateTrip(t);
  validateBudget(b);
  if (
    !object(value.routes) ||
    ![...Object.keys(routeNames), 'personalized'].includes(value.selectedRoute) ||
    !value.routes[value.selectedRoute]
  )
    throw new Error('Roteiro inválido.');
  for (const key of Object.keys(routeNames)) validateRouteData(value.routes[key]);
  if (value.routes.personalized) validateRouteData(value.routes.personalized);
  if (
    !object(value.favorites) ||
    ['destinations', 'events', 'food'].some((k) => !stringArray(value.favorites[k]))
  )
    throw new Error('Favoritos inválidos.');
  for (const key of ['checks', 'packed'])
    if (
      !object(value[key]) ||
      Object.keys(value[key]).length > 5000 ||
      Object.values(value[key]).some((v) => typeof v !== 'boolean')
    )
      throw new Error('Checklist inválido.');
  for (const key of ['lodgings', 'legs', 'wishlist', 'tasks']) {
    if (
      !Array.isArray(value[key]) ||
      value[key].length > 1000 ||
      value[key].some((v) => !object(v))
    )
      throw new Error('Listas inválidas.');
    const ids = new Set();
    for (const item of value[key]) {
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
  if (value.tasks.some((t) => !text(t.title, 300))) throw new Error('Tarefas inválidas.');
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
    if (!object(value.seasonQuotes)) throw new Error('Comparações inválidas.');
    for (const [key, q] of Object.entries(value.seasonQuotes)) {
      if (
        !['spring', 'summer', 'autumn', 'winter'].includes(key) ||
        !object(q) ||
        !object(q.trip) ||
        !numeric(q.trip.travelers, 1, 50) ||
        !numeric(q.trip.days, 1, 90) ||
        !numeric(q.trip.nights, 0, 89)
      )
        throw new Error('Orçamento de estação inválido.');
      validateBudget(q.budget);
    }
  }
  const seed = initialState(),
    normalized = {
      ...seed,
      ...value,
      trip: {
        ...seed.trip,
        ...t,
        selectedSeason: ['spring', 'summer', 'autumn', 'winter'].includes(t.selectedSeason)
          ? t.selectedSeason
          : null,
      },
      budget: {
        ...b,
        scenario: ['economic', 'balanced', 'comfortable'].includes(b.scenario)
          ? b.scenario
          : 'balanced',
      },
      theme: value.theme === 'dark' ? 'dark' : 'light',
    };
  const result = legacy ? migrateV1(normalized) : normalized;
  if (typeof result.routeChosen !== 'boolean')
    throw new Error('Estado de escolha de roteiro inválido.');
  validatePlanner(result.planner);
  validateBudget(result.planner.draft.budget);
  if (result.planner.result) {
    validateRouteData(result.planner.result.route);
    validateBudget(result.planner.result.profile.budget);
  }
  if (result.planner.acceptedProfile) validateBudget(result.planner.acceptedProfile.budget);
  if (result.planner.baselineRoute) validateRouteData(result.planner.baselineRoute);
  for (const copy of result.planner.history) {
    validateRouteData(copy.route);
    validateTrip(copy.trip);
    validateBudget(copy.budget);
  }
  return result;
}
export function loadState(storage) {
  let sourceKey = STORAGE_KEY;
  try {
    let raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = storage.getItem(LEGACY_STORAGE_KEY);
      if (raw) sourceKey = LEGACY_STORAGE_KEY;
    }
    if (raw)
      return {
        state: validateState(JSON.parse(raw)),
        warning: null,
        migrated: sourceKey === LEGACY_STORAGE_KEY,
      };
    const state = initialState(),
      old = storage.getItem('jp-trip-notes');
    if (old) state.notes = String(old).slice(0, 100000);
    return { state, warning: null };
  } catch {
    let recovered = false;
    try {
      const raw = storage.getItem(sourceKey);
      if (raw) {
        storage.setItem(sourceKey + '-recovery', raw);
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
