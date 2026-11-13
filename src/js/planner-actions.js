import { clone, recommendationDetails } from './recommendations.js';
import { profileErrors } from './planner-state.js';
import { routeNames } from './itinerary.js';
import { scenarioBudget } from './budget.js';
export function needsAcceptanceConfirmation(state) {
  const standard = scenarioBudget('balanced');
  return (
    state.routeChosen ||
    state.legacyImported === true ||
    state.trip.travelers !== 6 ||
    state.trip.days !== 25 ||
    state.trip.departureDate !== null ||
    Object.keys(standard)
      .filter((k) => !['scenario', 'saved', 'savingsStart'].includes(k))
      .some((k) => state.budget[k] !== standard[k])
  );
}
export function archiveCurrent(state, resultId, date) {
  if (state.planner.history.length >= 100)
    throw new Error('O histórico tem 100 versões. Exporte um backup antes de continuar.');
  return {
    id: `${resultId}-before-${state.planner.history.length}`,
    label:
      state.selectedRoute === 'personalized'
        ? 'Nosso roteiro personalizado'
        : routeNames[state.selectedRoute],
    route: clone(state.routes[state.selectedRoute]),
    trip: clone(state.trip),
    budget: clone(state.budget),
    profile: {
      ...clone(state.planner.acceptedProfile || state.planner.draft),
      season: state.trip.selectedSeason,
      month: state.trip.departureDate ? Number(state.trip.departureDate.slice(5, 7)) : null,
      departureDate: state.trip.departureDate,
      year: state.trip.year,
      travelers: state.trip.travelers,
      days: state.trip.days,
      nights: state.trip.nights,
      departureCity: state.trip.departureCity,
      budget: clone(state.budget),
    },
    archivedAt: date,
  };
}
export function acceptSuggestion(state, confirmed = false, date = '') {
  if (!state.planner.result) throw new Error('Crie uma sugestão antes de aplicar.');
  if (state.planner.acceptedId === state.planner.result.id) return state;
  if (profileErrors(state.planner.result.profile).length)
    throw new Error('Revise as preferências antes de aplicar.');
  if (state.planner.dirty)
    throw new Error('As preferências mudaram. Crie uma nova sugestão antes de aplicar.');
  if (needsAcceptanceConfirmation(state) && !confirmed)
    throw new Error('Confirme a substituição antes de aplicar.');
  const next = clone(state),
    result = next.planner.result,
    p = result.profile,
    details = recommendationDetails(result);
  if (needsAcceptanceConfirmation(state))
    next.planner.history.push(archiveCurrent(state, result.id, date));
  next.trip = {
    ...next.trip,
    year: p.year,
    travelers: p.travelers,
    days: p.days,
    nights: p.nights,
    departureCity: p.departureCity,
    departureDate: p.departureDate,
    selectedSeason: p.season,
  };
  if (details.budget)
    next.budget = {
      ...details.budget,
      saved: state.budget.saved,
      savingsStart: state.budget.savingsStart,
    };
  next.routes.personalized = clone(result.route);
  next.selectedRoute = 'personalized';
  next.routeChosen = true;
  next.planner.acceptedProfile = clone(p);
  next.planner.status = 'accepted';
  next.planner.acceptedId = result.id;
  next.planner.baselineRoute = clone(result.route);
  next.planner.dirty = false;
  next.planner.draftEdited = false;
  return next;
}
export function restorePlannerArchive(state, id, date = '') {
  const copy = state.planner.history.find((h) => h.id === id);
  if (!copy) throw new Error('Essa versão não está mais disponível.');
  const next = clone(state);
  next.planner.history.push(archiveCurrent(state, 'restore-' + id, date));
  next.routes.personalized = clone(copy.route);
  next.selectedRoute = 'personalized';
  next.routeChosen = true;
  next.trip = clone(copy.trip);
  next.budget = clone(copy.budget);
  next.planner.baselineRoute = clone(copy.route);
  next.planner.acceptedId = null;
  next.planner.status = 'draft';
  next.planner.dirty = true;
  if (copy.profile) {
    next.planner.draft = clone(copy.profile);
    next.planner.acceptedProfile = clone(copy.profile);
  }
  return next;
}
