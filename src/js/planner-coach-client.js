import { createAIClient } from './ai-client.js';
import { sharedProfile } from './mochi-state.js';
import { calculateBudget, scenarioBudget } from './budget.js';
export function createCoachClient() {
  const client = createAIClient();
  let ready = false;
  return {
    async request(state, step, question, withBudget, signal) {
      if (!ready) {
        const status = await client.status(signal);
        if (!status.enabled) throw Object.assign(new Error(), { code: 'disabled' });
        ready = true;
      }
      const p = state.planner.draft;
      const selected = ['economic', 'balanced', 'comfortable'].includes(p.budgetChoice)
        ? scenarioBudget(p.budgetChoice, p.travelers)
        : p.budget;
      const totals = withBudget ? calculateBudget(p, selected) : null;
      return client.request(
        'coach',
        {
          profile: sharedProfile(state, 'coach'),
          step,
          question,
          budgetChoice: p.budgetChoice || null,
          budget: totals ? { perPersonTotal: totals.person, monthlyTarget: totals.monthly } : null,
          additionalPreferences: '',
        },
        signal,
      );
    },
  };
}
