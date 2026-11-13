import { buildRecommendation, clone } from './recommendations.js';
import { profileErrors } from './planner-state.js';
import {
  needsAcceptanceConfirmation,
  acceptSuggestion,
  restorePlannerArchive,
} from './planner-actions.js';
import { seasonForMonth } from '../data/preferences.js';
import { scenarioBudget, calculateBudget } from './budget.js';
import { icon, money, uid, localDate, toast, esc } from './utils.js';
export function connectPlanner(ctx) {
  const get = () => ctx.getState(),
    ui = ctx.ui;
  let observed = JSON.stringify([get().trip, get().budget]),
    searchTimer;
  const markDirty = () => {
    const w = get().planner;
    w.started = true;
    w.dirty = true;
    w.draftEdited = true;
    w.status = 'draft';
    ui.plannerErrors = [];
    ui.confirmSuggestion = false;
    document.getElementById('wizard-errors')?.replaceChildren();
    document.querySelectorAll('#planner-page [aria-invalid=true]').forEach((el) => {
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    });
  };
  const save = () => {
    const success = ctx.persist();
    document
      .querySelectorAll('[data-planner-save]')
      .forEach(
        (el) =>
          (el.innerHTML =
            icon(success ? 'check-check' : 'info') +
            (success
              ? ' Progresso salvo neste navegador.'
              : ' Não foi possível salvar. Exporte um backup antes de sair.')),
      );
    ctx.icons();
  };
  async function repaint(focus = false) {
    const active = document.activeElement,
      attributes = [
        'data-planner-action',
        'data-id',
        'data-field',
        'data-step',
        'data-delta',
        'data-profile',
      ];
    const selector =
      active && active !== document.body
        ? attributes
            .filter((a) => active.hasAttribute(a))
            .map((a) => `[${a}="${CSS.escape(active.getAttribute(a))}"]`)
            .join('')
        : '';
    await ctx.render({ focus });
    if (!focus && selector) document.querySelector(selector)?.focus({ preventScroll: true });
  }
  function setStep(step) {
    const w = get().planner;
    w.step = step;
    history.replaceState(null, '', `#planner/${step}`);
    w.furthestStep = Math.max(w.furthestStep, step);
    ui.plannerErrors = [];
    save();
    repaint(true);
  }
  function validateCurrent() {
    const w = get().planner,
      invalid = document.querySelector('#planner-page input:invalid');
    if (invalid) {
      const details = invalid.closest('details');
      if (details) details.open = true;
      invalid.reportValidity();
      return false;
    }
    const errors = profileErrors(w.draft, w.step);
    if (errors.length) {
      ui.plannerErrors = errors;
      repaint().then(() => {
        const target = document.querySelector(
          w.step === 1 ? '[data-profile=departureDate]' : '[data-profile=nights]',
        );
        if (target) {
          target.setAttribute('aria-invalid', 'true');
          target.setAttribute('aria-describedby', 'wizard-errors');
          target.focus();
        }
        document.getElementById('wizard-errors')?.scrollIntoView({ block: 'nearest' });
      });
      return false;
    }
    return true;
  }
  function next() {
    if (!validateCurrent()) return;
    setStep(Math.min(6, get().planner.step + 1));
  }
  const handlers = {
    season(el) {
      markDirty();
      const p = get().planner.draft;
      p.season = el.dataset.id;
      if (p.month && seasonForMonth(p.month) !== p.season) p.month = null;
      save();
      repaint();
    },
    undecided() {
      markDirty();
      Object.assign(get().planner.draft, { season: null, month: null, departureDate: null });
      save();
      repaint();
    },
    counter(el) {
      const p = get().planner.draft,
        key = el.dataset.field;
      const limits = { travelers: [1, 50], year: [2027, 2040], days: [1, 90], nights: [0, 89] };
      if (!limits[key]) return;
      markDirty();
      p[key] = Math.max(
        limits[key][0],
        Math.min(limits[key][1], p[key] + Number(el.dataset.delta)),
      );
      if (key === 'days') p.nights = p.days - 1;
      save();
      repaint();
    },
    pace(el) {
      markDirty();
      get().planner.draft.pace = el.dataset.id;
      save();
      repaint();
    },
    interest(el) {
      markDirty();
      const p = get().planner.draft,
        id = el.dataset.id,
        index = p.interests.indexOf(id);
      if (index >= 0) {
        p.interests.splice(index, 1);
        p.priorities = p.priorities.filter((v) => v !== id);
      } else p.interests.push(id);
      save();
      repaint();
    },
    priority(el) {
      const p = get().planner.draft,
        id = el.dataset.id,
        index = p.priorities.indexOf(id);
      if (index < 0 && p.priorities.length >= 3) {
        toast('Escolha até três prioridades. Desmarque uma para trocar.');
        return;
      }
      markDirty();
      if (index >= 0) p.priorities.splice(index, 1);
      else p.priorities.push(id);
      save();
      repaint();
    },
    destination(el) {
      markDirty();
      const p = get().planner.draft,
        id = el.dataset.id,
        index = p.destinations.indexOf(id);
      if (index >= 0) p.destinations.splice(index, 1);
      else p.destinations.push(id);
      save();
      repaint();
    },
    'all-cities'() {
      ui.plannerAllCities = !ui.plannerAllCities;
      repaint();
    },
    region(el) {
      ui.plannerRegion = el.dataset.id || '';
      repaint();
    },
    'budget-choice'(el) {
      markDirty();
      const p = get().planner.draft;
      p.budgetChoice = el.dataset.id;
      if (['economic', 'balanced', 'comfortable'].includes(p.budgetChoice))
        p.budget = scenarioBudget(p.budgetChoice, p.travelers, p.nights, p.days);
      save();
      repaint();
    },
    previous() {
      setStep(Math.max(1, get().planner.step - 1));
    },
    next,
    skip: next,
    step(el) {
      const step = Number(el.dataset.step);
      if (step >= 1 && step <= get().planner.furthestStep) setStep(step);
    },
    generate() {
      const w = get().planner,
        errors = profileErrors(w.draft);
      if (errors.length) {
        ui.plannerErrors = errors;
        repaint();
        return;
      }
      w.result = buildRecommendation(w.draft, uid(), localDate());
      w.status = 'ready';
      w.dirty = false;
      w.draftEdited = false;
      ui.confirmSuggestion = false;
      ui.plannerAllDays = false;
      save();
      location.hash = 'recommendations';
    },
    accept() {
      const state = get();
      if (state.planner.dirty) {
        toast('Gere outra sugestão para incorporar as novas preferências.');
        return;
      }
      if (state.planner.status === 'rejected') {
        toast('Refine as preferências e gere uma nova sugestão.');
        return;
      }
      if (needsAcceptanceConfirmation(state)) {
        ui.confirmSuggestion = true;
        repaint().then(() =>
          document.querySelector('.suggestion-confirm')?.scrollIntoView({
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
            block: 'center',
          }),
        );
      } else apply(false);
    },
    'confirm-accept'() {
      apply(true);
    },
    'cancel-accept'() {
      ui.confirmSuggestion = false;
      repaint();
    },
    refine() {
      get().planner.step = 6;
      save();
      location.hash = 'planner';
    },
    restart() {
      // Volta ao início do wizard com as escolhas preservadas para criar outra sugestão.
      get().planner.step = 1;
      ui.confirmSuggestion = false;
      save();
      location.hash = 'planner/1';
    },
    reject() {
      get().planner.status = 'rejected';
      ui.confirmSuggestion = false;
      save();
      repaint();
      toast('A sugestão foi guardada sem alterar seu roteiro.');
    },
    'toggle-days'() {
      ui.plannerAllDays = !ui.plannerAllDays;
      repaint();
    },
    'restore-archive'(el) {
      const copy = get().planner.history.find((h) => h.id === el.dataset.id);
      if (!copy) return;
      ctx.showModal(
        `<h2 id="modal-title">Restaurar esta versão?</h2><p>O roteiro, as configurações e o orçamento de ${esc(copy.label || 'uma versão anterior')} serão recuperados. O planejamento atual será guardado no histórico.</p><div class="button-row"><button class="btn secondary" data-action="close-modal">Cancelar</button><button class="btn" data-planner-action="confirm-restore" data-id="${esc(copy.id)}">Guardar atual e restaurar</button></div>`,
      );
    },
    'confirm-restore'(el) {
      try {
        ctx.setState(restorePlannerArchive(get(), el.dataset.id, localDate()));
        reset();
        save();
        ctx.closeModal();
        repaint();
        toast('Versão restaurada. A cópia anterior continua no histórico.');
      } catch (e) {
        toast(e.message);
      }
    },
  };
  function apply(confirmed) {
    try {
      ctx.setState(acceptSuggestion(get(), confirmed, localDate()));
      reset();
      save();
      ui.confirmSuggestion = false;
      location.hash = 'itinerary';
      toast('Nosso roteiro está pronto para ganhar os próximos detalhes.');
    } catch (e) {
      toast(e.message);
    }
  }
  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-planner-action]');
    if (!el) return;
    event.preventDefault();
    handlers[el.dataset.plannerAction]?.(el);
  });
  document.addEventListener('input', (event) => {
    const el = event.target,
      p = get().planner.draft;
    if (el.hasAttribute('data-planner-search')) {
      ui.plannerSearch = el.value;
      clearTimeout(searchTimer);
      const value = el.value;
      searchTimer = setTimeout(async () => {
        await repaint();
        const next = document.querySelector('[data-planner-search]');
        next?.focus();
        next?.setSelectionRange(value.length, value.length);
      }, 180);
      return;
    }
    if (el.hasAttribute('data-profile') && !['SELECT'].includes(el.tagName)) {
      if (!el.validity.valid && el.value !== '') return;
      const key = el.dataset.profile;
      if (
        ['travelers', 'year', 'days', 'nights'].includes(key) &&
        !Number.isFinite(el.valueAsNumber)
      )
        return;
      markDirty();
      p[key] = el.type === 'number' ? el.valueAsNumber : el.value || null;
      if (key === 'departureCity') p[key] = el.value;
      if (key === 'days') {
        p.nights = p.days - 1;
        const input = document.querySelector('[data-profile="nights"]');
        if (input) input.value = p.nights;
      }
      if (key === 'departureDate' && p.departureDate) {
        p.month = Number(p.departureDate.slice(5, 7));
        p.season = seasonForMonth(p.month);
        save();
        repaint();
        return;
      }
      document
        .querySelectorAll(`[data-draft-summary="${key}"]`)
        .forEach((node) => (node.textContent = p[key]));
      if (['days', 'nights'].includes(key)) {
        const hint = document.getElementById('duration-hint');
        if (hint)
          hint.textContent =
            p.days === p.nights + 1
              ? `${p.days} dias e ${p.nights} noites. Um bom começo.`
              : `Para ${p.days} dias, distribua ${p.days - 1} noites antes de continuar.`;
      }
      save();
    }
    if (el.hasAttribute('data-planner-budget') && el.validity.valid) {
      markDirty();
      p.budget[el.dataset.plannerBudget] = el.valueAsNumber;
      save();
      const total = document.getElementById('planner-budget-total');
      if (total)
        total.textContent = `${money(calculateBudget(p, p.budget).person)} por pessoa · ${p.travelers} viajantes`;
    }
  });
  document.addEventListener('change', (event) => {
    const el = event.target;
    if (el.tagName === 'SELECT' && el.hasAttribute('data-profile')) {
      markDirty();
      const p = get().planner.draft,
        key = el.dataset.profile;
      p[key] = key === 'month' ? Number(el.value) || null : el.value;
      if (key === 'month' && p.month) p.season = seasonForMonth(p.month);
      save();
      repaint();
    }
  });
  function reset() {
    observed = JSON.stringify([get().trip, get().budget]);
    ui.plannerErrors = [];
    ui.confirmSuggestion = false;
  }
  function syncFromTools() {
    const s = get(),
      fingerprint = JSON.stringify([s.trip, s.budget]);
    if (fingerprint === observed) return;
    const previous = JSON.parse(observed);
    observed = fingerprint;
    if (s.planner.draftEdited ?? s.planner.dirty) return;
    const monetaryChanged = Object.keys(s.budget)
      .filter((k) => !['saved', 'savingsStart', 'scenario'].includes(k))
      .some((k) => s.budget[k] !== previous[1][k]);
    const tripChanged = JSON.stringify(s.trip) !== JSON.stringify(previous[0]);
    Object.assign(s.planner.draft, {
      season: s.trip.selectedSeason,
      departureDate: s.trip.departureDate,
      travelers: s.trip.travelers,
      year: s.trip.year,
      days: s.trip.days,
      nights: s.trip.nights,
      departureCity: s.trip.departureCity,
      budget: clone(s.budget),
    });
    if (s.trip.departureDate) s.planner.draft.month = Number(s.trip.departureDate.slice(5, 7));
    else if (
      s.planner.draft.month &&
      s.trip.selectedSeason &&
      seasonForMonth(s.planner.draft.month) !== s.trip.selectedSeason
    )
      s.planner.draft.month = null;
    if (monetaryChanged)
      s.planner.draft.budgetChoice =
        s.budget.scenario !== previous[1].scenario ? s.budget.scenario : 'custom';
    if (s.planner.result && (tripChanged || monetaryChanged)) s.planner.dirty = true;
  }
  return {
    reset,
    syncFromTools,
    prepare(route) {
      if (route === 'planner') {
        const w = get().planner,
          requested = Number(location.hash.split('/')[1]);
        if (requested >= 1 && requested <= w.furthestStep) w.step = requested;
        history.replaceState(null, '', `#planner/${w.step}`);
        if (!w.started) {
          w.started = true;
          save();
        }
      }
    },
  };
}
