export const routeNames = {
  spring: 'Primavera · flores e cidades',
  'summer-okinawa': 'Verão · Okinawa e cidades',
  'summer-hokkaido': 'Verão · Hokkaido e festivais',
  autumn: 'Outono · caminhos e momiji',
  winter: 'Inverno · neve e onsen',
};
const bases = {
  spring: [
    ['Tóquio', 9, 'tokyo'],
    ['Osaka / Kyoto', 10, 'osaka'],
    ['Kanazawa / Takayama', 5, 'kanazawa'],
  ],
  'summer-okinawa': [
    ['Tóquio', 8, 'tokyo'],
    ['Osaka / Kyoto', 8, 'osaka'],
    ['Okinawa / Naha', 8, 'naha'],
  ],
  'summer-hokkaido': [
    ['Tóquio', 8, 'tokyo'],
    ['Osaka / Kyoto', 8, 'osaka'],
    ['Sapporo / Furano', 8, 'sapporo'],
  ],
  autumn: [
    ['Tóquio', 9, 'tokyo'],
    ['Nagano / Kanazawa', 5, 'nagano'],
    ['Osaka / Kyoto', 10, 'osaka'],
  ],
  winter: [
    ['Osaka', 11, 'osaka'],
    ['Nagano', 2, 'nagano'],
    ['Tóquio', 11, 'tokyo'],
  ],
};
const activities = {
  tokyo: [
    'Chegada, check-in e passeio leve',
    'Shibuya e Harajuku',
    'Tokyo DisneySea · ingresso a consultar',
    'Akihabara, anime, gachapon e fliperamas',
    'Pausa livre: café e descanso',
    'Sanrio Puroland · ingresso a consultar',
    'Fuji-Q / Kawaguchiko · avaliar clima',
    'Skincare, roupas e papelaria',
    'Bairros e restaurantes temáticos',
    'Karaokê com o grupo',
  ],
  osaka: [
    'Chegada e Dotonbori',
    'Universal Studios Japan / Super Nintendo World · ingresso e acesso a consultar',
    'Kyoto: Higashiyama e templos',
    'Nara: parque e templos',
    'Pausa livre: lavanderia e descanso',
    'Nintendo Museum · se houver ingresso',
    'Nipponbashi e action figures',
    'Kyoto: Arashiyama',
    'Kobe ou bairros de Osaka',
    'Compras e gastronomia',
    'Dia livre e preparar malas',
  ],
  nagano: ['Chegada, onsen e descanso', 'Neve / Hakuba · conforme condições'],
  kanazawa: [
    'Kenrokuen e bairros históricos',
    'Mercados e gastronomia',
    'Takayama · consultar deslocamento',
    'Ruas tradicionais e cafés',
    'Pausa livre e malas',
  ],
  naha: [
    'Chegada em Naha · voo doméstico a cotar',
    'Cultura Ryukyu e Kokusai-dori',
    'Praia / Onna · transporte a consultar',
    'Snorkel · condições do mar',
    'Pausa livre: descanso e lavanderia',
    'Ilha próxima · ferry a consultar',
    'Praia ou museu conforme clima',
    'Dia de margem para tempo severo',
  ],
  sapporo: [
    'Chegada em Sapporo · voo a cotar',
    'Sapporo: parques e mercados',
    'Otaru e canais',
    'Furano · flores conforme época',
    'Pausa livre: descanso e cafés',
    'Biei · transporte a consultar',
    'Comida e bairros locais',
    'Dia livre e preparar malas',
  ],
};
function activitiesForRoute(key, destinationId) {
  const names = [...(activities[destinationId] || ['Explorar com calma'])];
  if (key === 'spring' && destinationId === 'tokyo')
    names[8] = 'Ueno / Meguro · hanami conforme a florada';
  if (key === 'spring' && destinationId === 'osaka')
    names[2] = 'Kyoto: Higashiyama, templos e sakura conforme a florada';
  if (key === 'summer-hokkaido' && destinationId === 'sapporo')
    names[4] = 'Furano e lavandas · época e transporte a consultar';
  if (key === 'summer-okinawa' && destinationId === 'naha')
    names[6] = 'Praia ou snorkel · conforme condições do mar';
  if (key === 'autumn' && destinationId === 'tokyo')
    names[6] = 'Nikko: templos e momiji · conforme época e acesso';
  if (key === 'autumn' && destinationId === 'osaka')
    names[2] = 'Kyoto: jardins e momiji · conforme a mudança das folhas';
  if (key === 'autumn' && destinationId === 'nagano')
    return [
      'Chegada e cafés de Nagano',
      'Montanhas e folhas de outono · conforme época',
      'Kanazawa: Kenrokuen · consultar deslocamento',
      'Ruas históricas e gastronomia',
      'Período livre · descanso e malas',
    ];
  if (key === 'winter' && destinationId === 'tokyo') {
    names[4] = 'Shibuya e Harajuku';
    names[8] = 'Fuji-Q / Kawaguchiko · alternativa coberta se vento ou frio';
    names[9] = 'Karaokê e cafés temáticos com o grupo';
  }
  return names;
}
export function makeRoute(key) {
  const selected = bases[key] || bases.winter;
  let day = 1;
  const days = [];
  const routeBases = selected.map(([city, nights, destinationId], index) => ({
    id: `base-${key}-${index}`,
    city,
    nights,
    destinationId,
  }));
  for (const base of routeBases) {
    for (let i = 0; i < base.nights; i++) {
      const names = activitiesForRoute(key, base.destinationId);
      const title =
        day % 5 === 0 || day === 24
          ? 'Período livre · descanso e descobertas'
          : names[i % names.length];
      days.push({
        day,
        activities: [
          {
            id: `${key}-${day}`,
            title,
            cost: 0,
            favorite: false,
            free: /livre|descanso/i.test(title),
          },
        ],
      });
      day++;
    }
  }
  days.push({
    day: 25,
    activities: [
      {
        id: `${key}-25`,
        title: 'Check-out e retorno · conferir aeroportos',
        cost: 0,
        favorite: false,
        free: false,
      },
    ],
  });
  return { bases: routeBases, days };
}
export function validateRoute(route, trip) {
  const nights = route.bases.reduce((sum, b) => sum + Number(b.nights), 0);
  const messages = [];
  if (nights !== trip.nights)
    messages.push(
      `As bases somam ${nights} noites; a viagem está configurada para ${trip.nights}. Ajuste a distribuição.`,
    );
  if (trip.days !== trip.nights + 1)
    messages.push(
      'Dias e noites diferem do padrão dias = noites + 1. Confira a duração configurada.',
    );
  if (route.days.some((d) => d.day > trip.days && d.activities.length))
    messages.push(
      'Há atividades além da duração configurada; remova ou mova antes de reduzir os dias.',
    );
  for (let start = 1; start <= trip.days - 4; start += 5) {
    const days = route.days.filter((d) => d.day >= start && d.day < start + 5);
    if (
      days.length &&
      !days.some((d) => d.activities.length === 0 || d.activities.some((a) => a.free))
    )
      messages.push(`Dias ${start}–${start + 4}: reserve um período livre para o grupo.`);
  }
  return { nights, messages };
}
export function cityForDay(route, day) {
  let end = 0;
  for (const base of route.bases) {
    end += base.nights;
    if (day <= end) return base.city;
  }
  return route.bases.at(-1)?.city || 'A definir';
}
export function moveActivity(route, id, target) {
  const destination = route.days.find((d) => d.day === Number(target));
  if (!destination) return false;
  for (const day of route.days) {
    const index = day.activities.findIndex((a) => a.id === id);
    if (index >= 0) {
      const [activity] = day.activities.splice(index, 1);
      destination.activities.push(activity);
      return true;
    }
  }
  return false;
}
