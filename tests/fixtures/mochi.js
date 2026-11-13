import { initialState } from '../../src/js/storage.js';
import { sharedProfile, sharedRoute } from '../../src/js/mochi-state.js';
export function input(operation = 'itinerary') {
  const s = initialState();
  return {
    profile: sharedProfile(s, operation),
    budget: null,
    additionalPreferences: '',
    ...(operation === 'itinerary' ? {} : { route: sharedRoute(s.routes.winter) }),
    ...(operation === 'chat'
      ? { message: 'Como organizar seis malas?', history: [] }
      : operation === 'refine'
        ? { message: 'Mais tempo em Tóquio.' }
        : {}),
  };
}
export function proposal(profile = input().profile) {
  const first = Math.floor(profile.nights * 0.6),
    second = profile.nights - first;
  const bases =
    profile.nights < 2
      ? [{ destinationId: 'tokyo', nights: profile.nights, reason: 'Uma base para descansar.' }]
      : [
          { destinationId: 'tokyo', nights: first, reason: 'Bairros e cultura pop com calma.' },
          { destinationId: 'osaka', nights: second, reason: 'Uma base para explorar Kansai.' },
        ];
  const result = {
    title: 'Nosso Japão, no nosso ritmo ♡',
    introduction: 'Uma proposta de cidades e pequenas pausas para o grupo.',
    bases,
    days: Array.from({ length: profile.days }, (_, i) => ({
      day: i + 1,
      destinationId: bases.length === 1 || i < first ? 'tokyo' : 'osaka',
      activities: [
        {
          title: i % 5 === 0 ? 'Pausa livre e lavanderia' : 'Bairros e descobertas com calma',
          category: i % 5 === 0 ? 'rest' : 'sightseeing',
          estimatedCost: null,
        },
      ],
    })),
    experiences: ['Cultura pop e bairros locais.'],
    rainAlternatives: ['Escolher um museu e confirmar funcionamento.'],
    seasonalCare: ['Conferir previsão e alertas antes dos passeios.'],
    logistics: ['Revisar bagagens e acessos entre as bases.'],
    economy: ['Agrupar passeios próximos e cotar alternativas.'],
    assumptions: ['A distribuição ainda pode ser ajustada.'],
    pendingVerification: ['Confirmar acessos, abertura e ingressos nas fontes oficiais.'],
    omittedDestinations: profile.destinations
      .filter((id) => !bases.some((b) => b.destinationId === id))
      .map((destinationId) => ({
        destinationId,
        reason: 'Avaliar como passeio regional ou em uma próxima versão.',
      })),
  };
  return result;
}
export const review = {
  positives: [{ text: 'As pausas podem ajudar o grupo.', certainty: 'inference' }],
  improvements: [{ text: 'Avaliar a concentração de passeios.', certainty: 'suggestion' }],
  optional: [{ text: 'Reservar espaço para compras e malas.', certainty: 'suggestion' }],
};
export const chat = {
  answer:
    'Uma lavanderia perto da hospedagem pode ajudar com as malas. Confirmem as opções antes de viajar. ♡',
  sourceIds: [],
  pendingVerification: ['Conferir regras de bagagem no operador escolhido.'],
};
