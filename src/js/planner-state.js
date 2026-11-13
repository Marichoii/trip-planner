import { interests, paces, seasonForMonth } from '../data/preferences.js';
import { makeRoute } from './itinerary.js';
import destinations from '../data/destinations.js';
const clone = (value) => JSON.parse(JSON.stringify(value));
export function initialPlanner(trip, budget) {
  return {
    started: false,
    step: 1,
    furthestStep: 1,
    dirty: false,
    draftEdited: false,
    status: 'draft',
    result: null,
    acceptedId: null,
    baselineRoute: null,
    acceptedProfile: null,
    history: [],
    draft: {
      season: trip.selectedSeason,
      month: null,
      departureDate: trip.departureDate,
      travelers: trip.travelers,
      year: trip.year,
      days: trip.days,
      nights: trip.nights,
      departureCity: trip.departureCity,
      pace: 'balanced',
      interests: [],
      priorities: [],
      destinations: [],
      budgetChoice: null,
      budget: clone(budget),
    },
  };
}
export function migrateV1(value) {
  const p = initialPlanner(value.trip, value.budget);
  const customized =
    JSON.stringify(value.routes[value.selectedRoute]) !==
    JSON.stringify(makeRoute(value.selectedRoute));
  const routeChosen = customized || value.selectedRoute !== 'winter';
  if (value.trip.departureDate) p.draft.month = Number(value.trip.departureDate.slice(5, 7));
  const defaultBudget = p.draft.budget;
  if (value.budget.scenario !== 'balanced') p.draft.budgetChoice = value.budget.scenario;
  // A rota padrão não é evidência de uma escolha. Nenhum dado anterior é alterado.
  return {
    ...value,
    version: 2,
    routeChosen,
    planner: { ...p, draft: { ...p.draft, budget: defaultBudget } },
    legacyImported: true,
  };
}
export function profileErrors(draft, step = null) {
  const errors = [];
  if (step === null || step === 1) {
    if (draft.departureDate) {
      const date = new Date(draft.departureDate + 'T12:00:00Z');
      if (
        Number.isNaN(date.valueOf()) ||
        date.toISOString().slice(0, 10) !== draft.departureDate ||
        date.getUTCFullYear() !== draft.year
      )
        errors.push(`Escolha uma data válida em ${draft.year}, ou deixe a data em aberto.`);
      else {
        const month = date.getUTCMonth() + 1;
        if (draft.season && seasonForMonth(month) !== draft.season)
          errors.push('A data está em outra estação. Ajuste a estação ou deixe a data em aberto.');
        if (draft.month && draft.month !== month)
          errors.push('O mês preferido e a data precisam combinar.');
      }
    }
    if (draft.month && draft.season && seasonForMonth(draft.month) !== draft.season)
      errors.push('O mês escolhido não pertence à estação selecionada.');
  }
  if (step === null || step === 2) {
    if (!Number.isInteger(draft.travelers) || draft.travelers < 1 || draft.travelers > 50)
      errors.push('Escolha entre 1 e 50 viajantes.');
    if (!Number.isInteger(draft.year) || draft.year < 2027 || draft.year > 2040)
      errors.push('Escolha um ano entre 2027 e 2040.');
    if (
      !Number.isInteger(draft.days) ||
      draft.days < 1 ||
      draft.days > 90 ||
      !Number.isInteger(draft.nights) ||
      draft.nights < 0 ||
      draft.nights > 89
    )
      errors.push('A viagem pode ter de 1 a 90 dias e até 89 noites.');
    else if (draft.days !== draft.nights + 1)
      errors.push(
        `Para ${draft.days} dias, distribua ${draft.days - 1} noites. Ajuste os dias ou as noites antes de continuar.`,
      );
    if (!draft.departureCity?.trim()) errors.push('Preencha a cidade de partida.');
  }
  return [...new Set(errors)];
}
export function validatePlanner(planner) {
  const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const validList = (list, allowed) =>
    Array.isArray(list) &&
    list.length <= 100 &&
    list.every((v) => typeof v === 'string' && allowed.includes(v)) &&
    new Set(list).size === list.length;
  if (
    !isObject(planner) ||
    typeof planner.started !== 'boolean' ||
    typeof planner.dirty !== 'boolean' ||
    !Number.isInteger(planner.step) ||
    planner.step < 1 ||
    planner.step > 6 ||
    !Number.isInteger(planner.furthestStep) ||
    planner.furthestStep < planner.step ||
    planner.furthestStep > 6 ||
    !['draft', 'ready', 'accepted', 'rejected'].includes(planner.status)
  )
    throw new Error('Progresso do planejador inválido.');
  function validateProfile(d) {
    if (
      !isObject(d) ||
      !Number.isInteger(d.travelers) ||
      d.travelers < 1 ||
      d.travelers > 50 ||
      !Number.isInteger(d.year) ||
      d.year < 2027 ||
      d.year > 2040 ||
      !Number.isInteger(d.days) ||
      d.days < 1 ||
      d.days > 90 ||
      !Number.isInteger(d.nights) ||
      d.nights < 0 ||
      d.nights > 89 ||
      typeof d.departureCity !== 'string' ||
      d.departureCity.length > 150
    )
      throw new Error('Preferências de viagem inválidas.');
    if (
      ![null, 'spring', 'summer', 'autumn', 'winter'].includes(d.season) ||
      !(d.month === null || (Number.isInteger(d.month) && d.month >= 1 && d.month <= 12)) ||
      !paces.some((p) => p.id === d.pace) ||
      !validList(
        d.interests,
        interests.map((i) => i.id),
      ) ||
      !validList(d.priorities, d.interests) ||
      d.priorities.length > 3 ||
      !Array.isArray(d.destinations) ||
      d.destinations.length > 50 ||
      d.destinations.some((id) => typeof id !== 'string' || !/^[a-z-]+$/.test(id))
    )
      throw new Error('Escolhas do planejador inválidas.');
    if (
      d.departureDate !== null &&
      (typeof d.departureDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(d.departureDate) ||
        Number.isNaN(Date.parse(d.departureDate)) ||
        new Date(d.departureDate).toISOString().slice(0, 10) !== d.departureDate)
    )
      throw new Error('Data do rascunho inválida.');
    if (
      ![null, 'unknown', 'economic', 'balanced', 'comfortable', 'custom'].includes(
        d.budgetChoice,
      ) ||
      !isObject(d.budget)
    )
      throw new Error('Orçamento do rascunho inválido.');
  }
  validateProfile(planner.draft);
  if (planner.acceptedProfile) validateProfile(planner.acceptedProfile);
  if (planner.acceptedId !== null && typeof planner.acceptedId !== 'string')
    throw new Error('Identificação de sugestão inválida.');
  if (!Array.isArray(planner.history) || planner.history.length > 100)
    throw new Error('Histórico do planejador inválido.');
  if (planner.result) {
    if (
      !isObject(planner.result) ||
      typeof planner.result.id !== 'string' ||
      !isObject(planner.result.route)
    )
      throw new Error('Sugestão inválida.');
    validateProfile(planner.result.profile);
    if (
      profileErrors(planner.result.profile).length ||
      planner.result.route.bases.some((b) => !destinations.some((d) => d.id === b.destinationId))
    )
      throw new Error('A sugestão não corresponde a um perfil de viagem válido.');
  }
  for (const item of planner.history) {
    if (
      !isObject(item) ||
      typeof item.id !== 'string' ||
      !isObject(item.route) ||
      !isObject(item.trip) ||
      !isObject(item.budget)
    )
      throw new Error('Cópia de roteiro inválida.');
    if (item.profile) validateProfile(item.profile);
  }
  return planner;
}
