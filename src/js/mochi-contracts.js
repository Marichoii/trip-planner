import { z } from 'zod';
import destinations from '../data/destinations.js';
import { interests, seasonForMonth } from '../data/preferences.js';

export const RESTING =
  'A Mochi está descansando um pouquinho. ♡ Você ainda pode continuar planejando normalmente.';
export const destinationIds = destinations.map((d) => d.id);
const destination = z.enum(destinationIds);
const text = (max = 600) => z.string().trim().min(1).max(max);
const integer = (min, max) => z.number().int().min(min).max(max);
const season = z.enum(['spring', 'summer', 'autumn', 'winter']).nullable();
const interest = z.enum(interests.map((i) => i.id));
const unique = (list) => new Set(list).size === list.length;
export const profileSchema = z
  .strictObject({
    year: integer(2027, 2040),
    season,
    month: integer(1, 12).nullable(),
    departureDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    travelers: integer(1, 50),
    days: integer(1, 90),
    nights: integer(0, 89),
    departureCity: text(150),
    pace: z.enum(['calm', 'balanced', 'intense']),
    interests: z.array(interest).max(12),
    priorities: z.array(interest).max(3),
    destinations: z.array(destination).max(29),
  })
  .superRefine((p, ctx) => {
    const bad =
      p.days !== p.nights + 1 ||
      !unique(p.destinations) ||
      !unique(p.interests) ||
      !unique(p.priorities) ||
      p.priorities.some((i) => !p.interests.includes(i)) ||
      (p.month && p.season && seasonForMonth(p.month) !== p.season);
    const date = p.departureDate && new Date(p.departureDate + 'T12:00:00Z');
    if (
      bad ||
      (date &&
        (Number.isNaN(+date) ||
          date.toISOString().slice(0, 10) !== p.departureDate ||
          date.getUTCFullYear() !== p.year ||
          (p.month && date.getUTCMonth() + 1 !== p.month) ||
          (p.season && seasonForMonth(date.getUTCMonth() + 1) !== p.season)))
    )
      ctx.addIssue({ code: 'custom', message: 'Preferências inconsistentes.' });
  });
export const routeContextSchema = z.strictObject({
  bases: z
    .array(
      z.strictObject({
        destinationId: destination.nullable(),
        city: text(150),
        nights: integer(0, 89),
      }),
    )
    .max(30),
  days: z
    .array(
      z.strictObject({
        day: integer(1, 90),
        activities: z.array(z.strictObject({ title: text(300), free: z.boolean() })).max(12),
      }),
    )
    .max(90),
});
const budgetSchema = z.strictObject({
  perPersonTotal: z.number().min(0).max(1e8),
  monthlyTarget: z.number().min(0).max(1e8).nullable(),
});
const common = {
  profile: profileSchema,
  budget: budgetSchema.nullable(),
  additionalPreferences: z.string().trim().max(1000),
};
export const requestSchemas = {
  itinerary: z.strictObject(common),
  refine: z.strictObject({ ...common, route: routeContextSchema, message: text(1200) }),
  analyze: z.strictObject({ ...common, route: routeContextSchema }),
  chat: z.strictObject({
    ...common,
    route: routeContextSchema.nullable(),
    message: text(1200),
    history: z.array(z.strictObject({ role: z.enum(['user', 'model']), text: text(1500) })).max(6),
  }),
};
export const proposalSchema = z.strictObject({
  title: text(100),
  introduction: text(700),
  bases: z
    .array(
      z.strictObject({ destinationId: destination, nights: integer(0, 89), reason: text(400) }),
    )
    .min(1)
    .max(8),
  days: z
    .array(
      z.strictObject({
        day: integer(1, 90),
        destinationId: destination,
        activities: z
          .array(
            z.strictObject({
              title: text(180),
              category: z.enum([
                'sightseeing',
                'rest',
                'shopping',
                'culture',
                'food',
                'nature',
                'parks',
              ]),
              estimatedCost: z.null(),
            }),
          )
          .min(1)
          .max(4),
      }),
    )
    .min(1)
    .max(90),
  experiences: z.array(text(300)).max(6),
  rainAlternatives: z.array(text(300)).max(6),
  seasonalCare: z.array(text(300)).max(6),
  logistics: z.array(text(300)).max(6),
  economy: z.array(text(300)).max(6),
  assumptions: z.array(text(300)).max(6),
  pendingVerification: z.array(text(300)).min(1).max(8),
  omittedDestinations: z
    .array(z.strictObject({ destinationId: destination, reason: text(300) }))
    .max(29),
});
const observation = z.strictObject({
  text: text(500),
  certainty: z.enum(['inference', 'suggestion']),
});
export const reviewSchema = z.strictObject({
  positives: z.array(observation).max(8),
  improvements: z.array(observation).max(8),
  optional: z.array(observation).max(8),
});
export const chatSchema = z.strictObject({
  answer: text(1500),
  sourceIds: z.array(z.enum(['jnto', 'jma'])).max(2),
  pendingVerification: z.array(text(300)).max(5),
});
export const outputSchemas = {
  itinerary: proposalSchema,
  refine: proposalSchema,
  analyze: reviewSchema,
  chat: chatSchema,
};
// Output is plain data. No links, markup, prices or transit durations from the model.
export function validateOutput(operation, value, request) {
  const parsed = outputSchemas[operation].parse(value);
  const strings = [];
  function walk(v) {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  }
  walk(parsed);
  if (
    strings.some((s) =>
      /<\/?[a-z!]|javascript:|data:text\/html|https?:\/\/|R\$|US\$|¥|\b\d+(?:[.,]\d+)?\s*(?:ienes|reais|d[oó]lares|minutos|horas)\b|\b2029\b.{0,50}confirmad|\bconfirmad.{0,50}\b2029\b/i.test(
        s,
      ),
    )
  )
    throw new Error('Resposta exige verificação externa.');
  if (operation === 'itinerary' || operation === 'refine') {
    const p = request.profile,
      ids = parsed.bases.map((b) => b.destinationId);
    if (p.nights === 0 && ids.length !== 1)
      throw new Error('Uma viagem sem pernoite precisa de uma base de referência.');
    if (
      !unique(ids) ||
      parsed.bases.reduce((n, b) => n + b.nights, 0) !== p.nights ||
      parsed.days.length !== p.days ||
      parsed.days.some((d, i) => d.day !== i + 1 || !ids.includes(d.destinationId))
    )
      throw new Error('Dias, bases ou noites inconsistentes.');
    let end = 0;
    for (const b of parsed.bases) {
      if (p.nights > 0 && b.nights === 0) throw new Error('Base sem noites.');
      for (let i = end; i < end + b.nights; i++)
        if (parsed.days[i]?.destinationId !== b.destinationId)
          throw new Error('Sequência de bases inconsistente.');
      end += b.nights;
    }
    if (parsed.days.at(-1).destinationId !== ids.at(-1))
      throw new Error('Retorno fora da última base.');
    const visited = new Set([...ids, ...parsed.days.map((d) => d.destinationId)]);
    for (const id of p.destinations)
      if (!visited.has(id) && !parsed.omittedDestinations.some((d) => d.destinationId === id))
        throw new Error('Destino escolhido sem explicação.');
  }
  return parsed;
}
export const REVIEW_OK =
  'As noites conferem e as regras de carga e pausas não sinalizaram problemas.';
export function deterministicReview(route, profile) {
  const issues = [];
  const nights = route.bases.reduce((n, b) => n + b.nights, 0);
  if (nights !== profile.nights)
    issues.push(`As bases somam ${nights} noites; o grupo configurou ${profile.nights}.`);
  if (route.days.some((d) => d.day > profile.days))
    issues.push('Há dias além da duração configurada.');
  const busy = route.days.filter((d) => d.activities.length > 3).map((d) => d.day);
  if (busy.length) issues.push(`Mais de três atividades nos dias ${busy.join(', ')}.`);
  for (let start = 1; start <= profile.days - 4; start += 5) {
    const days = route.days.filter((d) => d.day >= start && d.day < start + 5);
    if (
      days.length === 5 &&
      !days.some((d) => !d.activities.length || d.activities.some((a) => a.free))
    )
      issues.push(`Dias ${start}–${start + 4} sem período livre marcado.`);
  }
  if (route.bases.length > Math.ceil(profile.nights / 3) && route.bases.length > 1)
    issues.push('A distribuição tem mais de uma base a cada três noites.');
  if (!issues.length) issues.push(REVIEW_OK);
  return issues;
}
