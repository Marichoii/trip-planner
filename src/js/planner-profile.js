import { seasonForMonth, interests, paces } from '../data/preferences.js';
import destinations from '../data/destinations.js';
import { scenarioBudget } from './budget.js';

// Apply a single user choice and keep related fields coherent.
export function updateProfile(profile, key, value) {
  profile[key] = value;
  let notice = '';
  if (key === 'days') profile.nights = value - 1;
  if (key === 'nights') profile.days = value + 1;
  if (key === 'departureDate' && value) {
    profile.month = Number(value.slice(5, 7));
    profile.season = seasonForMonth(profile.month);
  }
  if (key === 'season') {
    if (profile.month && seasonForMonth(profile.month) !== value) profile.month = null;
    if (
      profile.departureDate &&
      seasonForMonth(Number(profile.departureDate.slice(5, 7))) !== value
    ) {
      profile.departureDate = null;
      notice = 'A data anterior ficou em aberto porque pertencia a outra estação.';
    }
  }
  if (key === 'month') {
    if (value) profile.season = seasonForMonth(value);
    if (profile.departureDate && Number(profile.departureDate.slice(5, 7)) !== value) {
      profile.departureDate = null;
      notice = 'A data anterior ficou em aberto. Escolha um dia no novo mês, se quiser.';
    }
  }
  if (key === 'year' && profile.departureDate) {
    const date = `${value}${profile.departureDate.slice(4)}`;
    if (new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) === date)
      profile.departureDate = date;
    else {
      profile.departureDate = null;
      notice = 'A data ficou em aberto: esse dia não existe no novo ano.';
    }
  }
  if (
    ['days', 'nights', 'travelers'].includes(key) &&
    ['economic', 'balanced', 'comfortable'].includes(profile.budgetChoice)
  )
    profile.budget = scenarioBudget(profile.budgetChoice, profile.travelers);
  return notice;
}
export function coachChangeLabel(change) {
  if (change.field === 'season')
    return `Escolher ${{ spring: 'primavera', summer: 'verão', autumn: 'outono', winter: 'inverno' }[change.value]}`;
  if (change.field === 'month')
    return `Escolher ${new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2029, change.value - 1, 1)))}`;
  if (change.field === 'pace')
    return `Usar ritmo ${paces.find((p) => p.id === change.value)?.name.toLowerCase()}`;
  if (change.field === 'destination')
    return `Adicionar ${destinations.find((d) => d.id === change.value)?.name}`;
  if (change.field === 'interest')
    return `Incluir ${interests.find((i) => i.id === change.value)?.name}`;
  return '';
}
export function hasCoachChange(p, change) {
  return change.field === 'destination'
    ? p.destinations.includes(change.value)
    : change.field === 'interest'
      ? p.interests.includes(change.value)
      : p[change.field] === change.value;
}
export function applyCoachChange(p, change) {
  const allowed = {
    season: ['spring', 'summer', 'autumn', 'winter'],
    month: Array.from({ length: 12 }, (_, i) => i + 1),
    pace: paces.map((v) => v.id),
    destination: destinations.map((v) => v.id),
    interest: interests.map((v) => v.id),
  };
  if (!allowed[change.field]?.includes(change.value)) throw new Error('Sugestão inválida.');
  if (hasCoachChange(p, change)) return '';
  if (['destination', 'interest'].includes(change.field)) {
    p[change.field === 'destination' ? 'destinations' : 'interests'].push(change.value);
    return '';
  }
  return updateProfile(p, change.field, change.value);
}
