import destinations from '../data/destinations.js';
import { seasons } from '../data/planning.js';
import { interests, regionalBase, seasonForMonth } from '../data/preferences.js';
import { makeRoute, cityForDay } from './itinerary.js';
import { scenarioBudget, calculateBudget } from './budget.js';
export const clone = (value) => JSON.parse(JSON.stringify(value));
const baseId = (id) => regionalBase[id] || id;
const effectiveSeason = (p) => p.season || (p.month ? seasonForMonth(p.month) : null);
function affinity(d, interest) {
  return interest.destinations.includes(d.id) || interest.tags.some((t) => d.types.includes(t));
}
export function recommendDestinations(profile) {
  const season = effectiveSeason(profile);
  return destinations
    .map((d) => {
      let score = season && d.seasons.includes(season) ? 3 : 0;
      const reasons = [];
      if (profile.destinations.includes(d.id)) {
        score += 40;
        reasons.push('Está na lista de lugares que vocês escolheram.');
      }
      const matches = interests.filter((i) => profile.interests.includes(i.id) && affinity(d, i));
      for (const interest of matches) {
        const rank = profile.priorities.indexOf(interest.id);
        score += 2 + (rank >= 0 ? 6 - rank : 0);
      }
      matches.sort((a, b) => {
        const rank = (id) =>
          profile.priorities.includes(id) ? profile.priorities.indexOf(id) : 10;
        return rank(a.id) - rank(b.id);
      });
      reasons.push(
        ...matches
          .slice(0, 2)
          .map(
            (i) =>
              `${profile.priorities.includes(i.id) ? 'Uma das prioridades' : 'Combina com o interesse'}: ${i.name.toLocaleLowerCase('pt-BR')}.`,
          ),
      );
      if (season && d.seasons.includes(season))
        reasons.push(
          `É uma opção para ${seasons.find((v) => v.id === season).name.toLowerCase()}, conforme a época e as condições locais.`,
        );
      if (!reasons.length)
        reasons.push('Uma possibilidade para começar a explorar, sem fechar a época da viagem.');
      return { ...d, score, reasons };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        destinations.indexOf(destinations.find((d) => d.id === a.id)) -
          destinations.indexOf(destinations.find((d) => d.id === b.id)),
    );
}
export function chooseTemplate(profile) {
  const season = effectiveSeason(profile),
    desired = profile.destinations
      .map((id) => destinations.find((d) => d.id === id))
      .filter(Boolean);
  const beach = profile.interests.includes('beach') || desired.some((d) => d.region === 'Okinawa');
  const hokkaido = desired.some((d) => d.region === 'Hokkaido');
  if (season === 'summer') return beach ? 'summer-okinawa' : 'summer-hokkaido';
  if (season === 'winter') return 'winter';
  if (season === 'autumn') return 'autumn';
  if (season === 'spring') return 'spring';
  if (beach) return 'summer-okinawa';
  if (hokkaido) return 'summer-hokkaido';
  if (profile.interests.includes('snow')) return 'winter';
  return 'spring';
}
// Método dos maiores restos: a soma sempre é igual ao total de noites.
export function distributeNights(weights, total) {
  if (!weights.length) return [];
  const minimum = total >= weights.length ? 1 : 0;
  const remaining = Math.max(0, total - minimum * weights.length),
    sum = weights.reduce((a, b) => a + b, 0) || weights.length;
  const exact = weights.map((w) => (remaining * w) / sum),
    result = exact.map((n) => Math.floor(n) + minimum);
  let left = total - result.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, remainder: v - Math.floor(v) }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  for (let i = 0; i < left; i++) result[order[i % order.length].i]++;
  return result;
}
function interestScore(title, p) {
  return interests.reduce(
    (score, i) =>
      score +
      (p.interests.includes(i.id) && new RegExp(i.pattern, 'i').test(title)
        ? 2 + (p.priorities.includes(i.id) ? 4 - p.priorities.indexOf(i.id) : 0)
        : 0),
    0,
  );
}
function activityPool(destination, template, profile) {
  let fallback =
    destination.region === 'Kansai'
      ? 'osaka'
      : destination.region === 'Hokkaido'
        ? 'sapporo'
        : destination.region === 'Okinawa'
          ? 'naha'
          : destination.id;
  const route = makeRoute(template);
  let titles = route.days
    .filter((d) => {
      const name = cityForDay(route, d.day);
      return route.bases.find((b) => b.destinationId === fallback)?.city === name;
    })
    .flatMap((d) => d.activities)
    .filter((a) => !a.free && !/chegada|check-out|preparar malas|retorno/i.test(a.title))
    .map((a) => a.title);
  // Os modelos existentes também fornecem atividades de regiões ausentes neste cenário.
  for (const key of ['spring', 'summer-okinawa', 'summer-hokkaido', 'autumn', 'winter']) {
    const r = makeRoute(key),
      base = r.bases.find((b) => b.destinationId === fallback);
    if (!base) continue;
    titles.push(
      ...r.days
        .filter((d) => cityForDay(r, d.day) === base.city)
        .flatMap((d) => d.activities)
        .filter((a) => !a.free && !/chegada|check-out|retorno/i.test(a.title))
        .map((a) => a.title),
    );
  }
  titles = [...new Set(titles)];
  if (effectiveSeason(profile) !== 'winter')
    titles = titles.filter((t) => !/Neve \/ Hakuba/.test(t));
  if (!titles.length)
    titles = [
      `${destination.name}: ${destination.attractions}`,
      `Gastronomia e bairros de ${destination.name}`,
    ];
  return titles.sort((a, b) => interestScore(b, profile) - interestScore(a, profile));
}
export function buildRecommendation(profile, id = 'suggestion', generatedAt = '') {
  const p = clone(profile),
    templateKey = chooseTemplate(p),
    template = makeRoute(templateKey),
    ranked = recommendDestinations(p);
  const desiredBases = [...new Set(p.destinations.map(baseId))].filter((id) =>
    destinations.some((d) => d.id === id),
  );
  const limit = Math.min(
    p.nights || 1,
    p.pace === 'calm' || p.budgetChoice === 'economic'
      ? 2
      : p.pace === 'intense' && p.days >= 20
        ? 4
        : 3,
    Math.max(1, Math.floor(p.days / 4)),
  );
  let ids = desiredBases.slice(0, limit);
  const templateIds = template.bases.map((b) => b.destinationId);
  if (ids.length < limit && templateIds.length > limit) {
    const anchor =
      templateKey === 'summer-okinawa'
        ? 'naha'
        : templateKey === 'summer-hokkaido'
          ? 'sapporo'
          : null;
    if (anchor && !ids.includes(anchor)) ids.push(anchor);
  }
  const candidates =
    templateIds.length > limit
      ? [...templateIds].sort(
          (a, b) => ranked.find((d) => d.id === b).score - ranked.find((d) => d.id === a).score,
        )
      : templateIds;
  // Preserva a ideia das rotas sazonais; lugares desejados têm precedência.
  for (const candidate of candidates) {
    if (ids.length >= limit) break;
    if (!ids.includes(candidate)) ids.push(candidate);
  }
  if (!ids.length) ids = ['tokyo'];
  const weights = ids.map(
    (id) =>
      template.bases.find((b) => b.destinationId === id)?.nights ||
      Math.max(2, Math.round(p.nights / ids.length)),
  );
  const nights = distributeNights(weights, p.nights);
  const bases = ids.map((id, i) => ({
    id: `${id}-${i}`,
    destinationId: id,
    city: destinations.find((d) => d.id === id).name,
    nights: nights[i],
  }));
  const days = [];
  let day = 1;
  for (const base of bases) {
    const destination = destinations.find((d) => d.id === base.destinationId),
      pool = activityPool(destination, templateKey, p);
    let activityIndex = 0;
    for (let i = 0; i < base.nights; i++, day++) {
      const free = (p.pace === 'calm' ? day % 4 === 0 : day % 5 === 0) || day === p.days - 1;
      const title =
        i === 0
          ? `Chegada em ${base.city} · passeio leve e descanso`
          : free
            ? 'Período livre · café, descanso e descobertas'
            : pool[activityIndex++ % pool.length];
      const activities = [
        { id: `${id}-${day}-main`, title, cost: 0, favorite: false, free: free || i === 0 },
      ];
      if (
        p.pace === 'intense' &&
        i > 0 &&
        !free &&
        day % 3 === 0 &&
        !/Disney|Universal|Fuji-Q/.test(title)
      )
        activities.push({
          id: `${id}-${day}-extra`,
          title: `Ideia extra opcional: ${pool[activityIndex++ % pool.length]}`,
          cost: 0,
          favorite: false,
          free: false,
        });
      days.push({ day, activities });
    }
  }
  // A última data é de saída, mesmo em uma viagem de um único dia.
  days.push({
    day: p.days,
    activities: [
      {
        id: `${id}-return`,
        title: 'Check-out e retorno · conferir aeroporto e conexão',
        cost: 0,
        favorite: false,
        free: false,
      },
    ],
  });
  // Destinos associados entram como ideias de visita, sem prometer tempo ou conexão.
  const associated = p.destinations.filter(
    (selected) => selected !== baseId(selected) && ids.includes(baseId(selected)),
  );
  for (const selected of associated) {
    const d = destinations.find((d) => d.id === selected),
      base = bases.find((b) => b.destinationId === baseId(selected));
    const target = days.find(
      (day) =>
        cityForDay({ bases }, day.day) === base.city &&
        day.day < p.days &&
        !day.activities.some((a) => a.free),
    );
    if (d && target)
      target.activities[0].title = `${d.name} · ${d.attractions} Acesso e ingresso a consultar.`;
  }
  return { id, profile: p, route: { bases, days }, templateKey, generatedAt };
}
export function recommendationDetails(result) {
  const p = result.profile,
    season = effectiveSeason(p),
    ranked = recommendDestinations(p),
    ids = result.route.bases.map((b) => b.destinationId),
    deferred = p.destinations.filter((id) => !ids.includes(baseId(id)));
  const warnings = [];
  if (ids.some((id) => ['naha', 'ishigaki', 'miyakojima'].includes(id)))
    warnings.push(
      'Okinawa exige voo doméstico; algumas ilhas exigem outro voo ou ferry. Cote bagagem, transfers e margem para tempo severo. Não há Shinkansen.',
    );
  if (ids.includes('sapporo'))
    warnings.push(
      'Hokkaido exige avaliar voo ou trem de longa distância e tempo porta a porta; nenhum deslocamento foi cotado.',
    );
  if (ids.some((id) => ['naha', 'ishigaki', 'miyakojima'].includes(id)) && ids.includes('sapporo'))
    warnings.push(
      'Okinawa e Hokkaido ficam em extremos do país. Vocês pediram ambos; considerem escolher um para reduzir deslocamentos e custos.',
    );
  if (season === 'summer')
    warnings.push(
      'Planeje pausas para calor e umidade; chuvas, tufões e Obon podem afetar a viagem. Hokkaido e Okinawa têm climas diferentes.',
    );
  if (season === 'spring')
    warnings.push(
      'Sakura varia por cidade e por ano. A florada e a Golden Week podem pressionar hospedagens e transportes.',
    );
  if (season === 'autumn')
    warnings.push(
      'Setembro ainda pode ter calor e tufões. Momiji muda por região, e Kyoto pode ter hotéis disputados.',
    );
  if (season === 'winter' || (!season && p.interests.includes('snow')))
    warnings.push(
      'Neve depende da região e da época. Resorts, festival de Sapporo e Ano Novo podem elevar custos; confira equipamentos e seguro.',
    );
  if (p.interests.includes('snow') && season && season !== 'winter')
    warnings.push(
      'Vocês escolheram neve fora do inverno. As montanhas continuam como opção, mas a experiência de neve não está garantida.',
    );
  if (p.interests.includes('beach') && season === 'winter')
    warnings.push(
      'Praias no inverno têm outra experiência e água mais fria. Para banho de mar, reavaliem a época e as condições locais.',
    );
  if (deferred.length)
    warnings.push(
      `${deferred.map((id) => destinations.find((d) => d.id === id)?.name || id).join(', ')} continuam nas preferências, mas ficaram fora das bases desta primeira distribuição. Acrescente-os ao editar, após consultar os acessos.`,
    );
  if (p.days < 12)
    warnings.push(
      'Uma viagem mais curta pede poucas bases. Priorizamos tempo no destino; outras cidades podem ficar para uma próxima revisão.',
    );
  if (p.budgetChoice === 'economic')
    warnings.push(
      'Para o perfil econômico, reduzimos trocas de base. Isso é uma escolha de ritmo e logística, sem afirmar que há tarifas mais baratas disponíveis.',
    );
  if (!season)
    warnings.push(
      'A estação continua em aberto. A rota é um ponto de partida; clima e eventos precisam ser revistos quando escolherem a época.',
    );
  warnings.push(
    'Ingressos, hotéis, tarifas e datas de eventos futuros precisam ser confirmados. Custos das atividades começam em zero até serem estimados por vocês.',
  );
  const budget = ['economic', 'balanced', 'comfortable'].includes(p.budgetChoice)
    ? scenarioBudget(p.budgetChoice, p.travelers, p.nights, p.days)
    : p.budgetChoice === 'custom'
      ? p.budget
      : null;
  const trip = {
    travelers: p.travelers,
    days: p.days,
    nights: p.nights,
    departureDate: p.departureDate,
  };
  const nameList = ids.map((id) => destinations.find((d) => d.id === id).name);
  const message = ids.includes('naha')
    ? `Que tal combinar ${nameList.filter((n) => n !== 'Naha').join(', ')} e alguns dias de praia em Okinawa?`
    : season === 'winter' && p.interests.includes('snow')
      ? `Uma aventura com montanhas, cultura e tempo para descobrir ${nameList.join(', ')}.`
      : `Uma primeira ideia com ${nameList.join(', ')} — no ritmo de vocês.`;
  return {
    season,
    ranked,
    bases: ids.map((id) => {
      const d = ranked.find((d) => d.id === id),
        specific = d.reasons.filter((r) => !r.startsWith('É uma opção'));
      return {
        ...d,
        reasons: specific.length
          ? specific
          : [
              id === 'tokyo'
                ? 'Uma etapa urbana do modelo, com bairros, cultura e parques para equilibrar as outras experiências.'
                : id === 'osaka'
                  ? 'Uma base do modelo para explorar Kansai e avaliar visitas a Kyoto e Nara.'
                  : 'Uma base do modelo sazonal para distribuir os dias e explorar a região.',
              d.attractions,
            ],
      };
    }),
    deferred,
    warnings,
    budget,
    totals: budget ? calculateBudget(trip, budget) : null,
    message,
  };
}
