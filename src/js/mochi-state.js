import {
  profileSchema,
  routeContextSchema,
  destinationIds,
  validateOutput,
} from './mochi-contracts.js';
import destinations from '../data/destinations.js';
import { archiveCurrent } from './planner-actions.js';
import { clone } from './recommendations.js';
import { calculateBudget } from './budget.js';

export function sharedProfile(state, operation) {
  const draft =
    operation === 'itinerary'
      ? state.planner.result?.profile || state.planner.draft
      : state.planner.acceptedProfile || state.planner.draft;
  const t = state.trip;
  const source =
    operation === 'itinerary'
      ? draft
      : {
          ...draft,
          year: t.year,
          travelers: t.travelers,
          days: t.days,
          nights: t.nights,
          departureDate: t.departureDate,
          season: t.selectedSeason,
          month: t.departureDate ? Number(t.departureDate.slice(5, 7)) : null,
          departureCity: t.departureCity,
        };
  return profileSchema.parse(
    Object.fromEntries(Object.keys(profileSchema.shape).map((k) => [k, source[k]])),
  );
}
export function sharedRoute(route) {
  return routeContextSchema.parse({
    bases: route.bases.map((b) => ({
      destinationId: destinationIds.includes(b.destinationId) ? b.destinationId : null,
      city: b.city,
      nights: b.nights,
    })),
    days: route.days.map((d) => ({
      day: d.day,
      activities: d.activities.map((a) => ({ title: a.title, free: !!a.free })),
    })),
  });
}
export function sharedBudget(state, profile, operation) {
  const chosen = state.planner.result?.profile;
  const budget =
    operation === 'itinerary' && chosen && ![null, 'unknown'].includes(chosen.budgetChoice)
      ? chosen.budget
      : state.budget;
  const totals = calculateBudget({ ...state.trip, ...profile }, budget);
  return { perPersonTotal: totals.person, monthlyTarget: totals.monthly };
}
export const planningFingerprint = (state) =>
  JSON.stringify([
    state.trip,
    state.routes[state.selectedRoute],
    state.planner.result,
    state.planner.draft,
  ]);
export function proposalRoute(proposal, id, current = { days: [] }) {
  const existing = new Map();
  for (const day of current.days)
    for (const activity of day.activities) {
      if (!existing.has(activity.title)) existing.set(activity.title, []);
      existing.get(activity.title).push(activity);
    }
  return {
    bases: proposal.bases.map((b, i) => ({
      id: `${id}-base-${i}`,
      destinationId: b.destinationId,
      city: destinations.find((d) => d.id === b.destinationId).name,
      nights: b.nights,
    })),
    days: proposal.days.map((d) => ({
      day: d.day,
      activities: d.activities.map((a, i) => {
        const retained = existing.get(a.title)?.shift();
        return {
          id: `${id}-${d.day}-${i}`,
          title: a.title,
          cost: retained?.cost || 0,
          favorite: !!retained?.favorite,
          free: a.category === 'rest',
        };
      }),
    })),
  };
}
export function applyMochiProposal(
  state,
  proposal,
  request,
  confirmed = false,
  date = '',
  id = 'mochi-' + Date.now(),
) {
  if (!confirmed) throw new Error('Confirme a alteração antes de aplicar.');
  const parsed = validateOutput('itinerary', proposal, request),
    next = clone(state);
  const copy = archiveCurrent(state, id, date);
  next.planner.history.push(copy);
  next.routes.personalized = proposalRoute(parsed, id, state.routes[state.selectedRoute]);
  next.selectedRoute = 'personalized';
  next.routeChosen = true;
  const p = request.profile;
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
  const full = { ...clone(next.planner.draft), ...clone(p), budget: clone(next.budget) };
  next.planner.draft = full;
  next.planner.acceptedProfile = clone(full);
  next.planner.baselineRoute = clone(next.routes.personalized);
  next.planner.acceptedId = null;
  next.planner.status = 'draft';
  next.planner.dirty = !!next.planner.result;
  next.planner.draftEdited = false;
  return { state: next, archiveId: copy.id };
}
