import destinations from '../data/destinations.js';

// A capa reflete o rascunho em edição; destinos de exemplo nunca viram um roteiro.
export function dashboardState(s) {
  const planner = s.planner;
  const profile = planner.started ? planner.draft : { ...planner.draft, ...s.trip };
  const completed = !planner.started
    ? 0
    : planner.result && !planner.dirty
      ? 6
      : Math.max(0, Math.min(5, planner.furthestStep - 1));
  const continueUrl =
    planner.status === 'accepted' || (s.routeChosen && !planner.started)
      ? '#itinerary'
      : planner.result && !planner.dirty
        ? '#recommendations'
        : '#planner';
  const ids =
    planner.started && profile.destinations.length
      ? profile.destinations
      : s.routeChosen
        ? s.routes[s.selectedRoute].bases.map((b) => b.destinationId).filter(Boolean)
        : [];
  const selected = [...new Set(ids)]
    .map((id) => destinations.find((d) => d.id === id))
    .filter(Boolean);
  return {
    profile,
    completed,
    continueUrl,
    personalMap: selected.length > 0,
    points: selected.length
      ? selected
      : ['tokyo', 'osaka', 'kyoto', 'sapporo', 'naha'].map((id) =>
          destinations.find((d) => d.id === id),
        ),
  };
}
