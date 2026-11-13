export const scenarios = {
  economic: {
    name: 'Econômico',
    flight: 8500,
    lodging: 4200,
    food: 3000,
    transport: 1700,
    parks: 1600,
    extras: 700,
    shopping: 5000,
    emergency: 1900,
    monthly: 1100,
  },
  balanced: {
    name: 'Equilibrado',
    flight: 9000,
    lodging: 5250,
    food: 3900,
    transport: 2300,
    parks: 2400,
    extras: 900,
    shopping: 8500,
    emergency: 2500,
    monthly: 1400,
  },
  comfortable: {
    name: 'Confortável',
    flight: 11000,
    lodging: 6400,
    food: 5500,
    transport: 3200,
    parks: 3300,
    extras: 1300,
    shopping: 12000,
    emergency: 3200,
    monthly: 1900,
  },
};
export const cents = (value) => Math.round(((Number(value) || 0) + Number.EPSILON) * 100);
export function depositCount(start, departure) {
  if (!/^\d{4}-\d{2}$/.test(start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(departure || ''))
    return null;
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = departure.split('-').map(Number);
  return Math.max(0, (ey - sy) * 12 + em - sm);
}
export function scenarioBudget(key, travelers = 6, nights = 24, days = 25) {
  const s = scenarios[key] || scenarios.balanced;
  return {
    scenario: key,
    flight: s.flight,
    lodgingNight: Math.round(((s.lodging * travelers) / Math.max(1, nights)) * 100) / 100,
    foodDay: Math.round((s.food / Math.max(1, days)) * 100) / 100,
    localTransport: s.transport - 1100,
    shinkansen: 1100,
    domesticFlight: 0,
    ferry: 0,
    parks: s.parks,
    tickets: 0,
    insurance: s.extras - 200,
    internet: 100,
    taxes: 100,
    shopping: s.shopping,
    emergency: s.emergency,
    saved: 0,
    savingsStart: '2026-12',
  };
}
export function calculateBudget(trip, b) {
  const travelers = Math.max(1, Math.floor(Number(trip.travelers) || 1));
  const nights = Math.max(0, Math.floor(Number(trip.nights) || 0));
  const days = Math.max(1, Math.floor(Number(trip.days) || 1));
  const lodgingGroup = cents(b.lodgingNight) * nights;
  const categories = {
    Passagens: cents(b.flight) * travelers,
    Hospedagem: lodgingGroup,
    Alimentação: cents(b.foodDay) * days * travelers,
    Transporte:
      ['localTransport', 'shinkansen', 'domesticFlight', 'ferry'].reduce(
        (t, k) => t + cents(b[k]),
        0,
      ) * travelers,
    'Parques e ingressos': (cents(b.parks) + cents(b.tickets)) * travelers,
    'Seguro, internet e taxas':
      ['insurance', 'internet', 'taxes'].reduce((t, k) => t + cents(b[k]), 0) * travelers,
    Compras: cents(b.shopping) * travelers,
    Imprevistos: cents(b.emergency) * travelers,
  };
  const group = Object.values(categories).reduce((a, b) => a + b, 0);
  const person = Math.round(group / travelers);
  const saved = cents(b.saved);
  const remaining = Math.max(0, person - saved);
  const deposits = depositCount(b.savingsStart, trip.departureDate);
  return {
    group: group / 100,
    person: person / 100,
    lodgingGroup: lodgingGroup / 100,
    lodgingPerson: Math.round(lodgingGroup / travelers) / 100,
    remaining: remaining / 100,
    saved: saved / 100,
    progress: person ? Math.min(100, (saved / person) * 100) : 100,
    deposits,
    monthly: deposits ? Math.ceil(remaining / deposits) / 100 : null,
    categories: Object.fromEntries(Object.entries(categories).map(([k, v]) => [k, v / 100])),
  };
}
export function lodgingCost(lodging, travelers) {
  const total =
    cents(lodging.nightly) * lodging.nights + cents(lodging.cleaning) + cents(lodging.taxes);
  return { total: total / 100, person: Math.round(total / Math.max(1, travelers)) / 100 };
}
export function transportCost(legs, travelers) {
  const person = legs.reduce((sum, item) => sum + cents(item.price), 0);
  return { person: person / 100, group: (person * travelers) / 100 };
}
export function wishlistCost(items, rate) {
  const yen = items.reduce((sum, item) => sum + cents(item.price) * item.quantity, 0) / 100;
  return { yen, brl: Number(rate) > 0 ? Math.round(yen * Number(rate) * 100) / 100 : null };
}
