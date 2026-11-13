import '../css/style.css';
import '../css/redesign.css';
import '../css/mochi.css';
import { connectMochi } from './mochi-controller.js';
import { navigationItems, shellMarkup, updateNavigation } from './navigation.js';
import { connectPlanner } from './planner-controller.js';
import {
  createIcons,
  Flower2,
  Home,
  Sun,
  Leaf,
  Snowflake,
  Heart,
  CalendarDays,
  Users,
  Plane,
  Map,
  MapPin,
  Search,
  Check,
  CheckCheck,
  Menu,
  X,
  ArrowRight,
  ArrowUpRight,
  SlidersHorizontal,
  Wallet,
  Route,
  NotebookPen,
  CheckSquare,
  BookOpen,
  BedDouble,
  TrainFront,
  Utensils,
  Backpack,
  ShieldCheck,
  Moon,
  Download,
  Upload,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Move,
  Printer,
  RotateCcw,
  Info,
  Thermometer,
  CloudRain,
  Droplets,
  Umbrella,
  Footprints,
  Sparkles,
  PiggyBank,
  Maximize,
  Minimize,
  Bus,
  Luggage,
  Car,
  ExternalLink,
  Bookmark,
  ArrowLeft,
  Minus,
  CloudSun,
  Coffee,
  Compass,
  Gamepad2,
  ShoppingBag,
  Landmark,
  Waves,
  Music2,
  Camera,
  Sprout,
  ChevronDown,
  History,
} from 'lucide';
import {
  views,
  seasons,
  destinations,
  events,
  food,
  checklist,
  heading,
  img,
  btn,
  opt,
  field,
  notice,
  destinationDetail,
  budgetSummary,
  shoppingCategories,
} from './views.js';
import {
  esc,
  icon,
  link,
  money,
  uid,
  download,
  csv,
  toast,
  localDate,
  dateLabel,
} from './utils.js';
import { loadState, saveState, parseBackup, validateState } from './storage.js';
import { scenarioBudget, calculateBudget, transportCost, scenarios } from './budget.js';
import { makeRoute, moveActivity, routeNames, routeName } from './itinerary.js';
const icons = {
  Flower2,
  Home,
  Sun,
  Leaf,
  Snowflake,
  Heart,
  CalendarDays,
  Users,
  Plane,
  Map,
  MapPin,
  Search,
  Check,
  CheckCheck,
  Menu,
  X,
  ArrowRight,
  ArrowUpRight,
  SlidersHorizontal,
  Wallet,
  Route,
  NotebookPen,
  CheckSquare,
  BookOpen,
  BedDouble,
  TrainFront,
  Utensils,
  Backpack,
  ShieldCheck,
  Moon,
  Download,
  Upload,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Move,
  Printer,
  RotateCcw,
  Info,
  Thermometer,
  CloudRain,
  Droplets,
  Umbrella,
  Footprints,
  Sparkles,
  PiggyBank,
  Maximize,
  Minimize,
  Bus,
  Luggage,
  Car,
  ExternalLink,
  Bookmark,
  ArrowLeft,
  Minus,
  CloudSun,
  Coffee,
  Compass,
  Gamepad2,
  ShoppingBag,
  Landmark,
  Waves,
  Music2,
  Camera,
  Sprout,
  ChevronDown,
  History,
};
const nav = navigationItems;
let plannerController;
let mochiController;
let storage;
try {
  storage = window.localStorage;
} catch {}
const loaded = loadState(storage);
let state = loaded.state;
let ui = {
  season: state.trip.selectedSeason || 'spring',
  city: 'tokyo',
  month: 0,
  variable: 'temperature',
  itineraryView: 'calendar',
};
let activeRoute = 'home',
  renderVersion = 0,
  charts,
  maps,
  searchTimer,
  notesTimer;
const modal = document.getElementById('modal');
function refreshIcons() {
  createIcons({ icons, attrs: { 'stroke-width': 1.7 } });
}
function persist() {
  plannerController?.syncFromTools();
  const saved = saveState(storage, state);
  ui.plannerSaved = saved;
  const status = document.getElementById('save-status');
  if (status)
    status.innerHTML =
      icon(saved ? 'check-check' : 'info') +
      (saved ? 'Salvo neste navegador' : 'Memória local indisponível');
  refreshIcons();
  return saved;
}
function shell() {
  document.documentElement.dataset.theme = state.theme;
  document.getElementById('app').innerHTML = shellMarkup(state);
  updateNavigation(state, 'home');
  refreshIcons();
  tick();
  persist();
}
function parsedRoute() {
  const [path, detail] = location.hash.replace(/^#\/?/, '').split('/');
  return { route: views[path] ? path : 'home', detail };
}
async function render({ focus = false } = {}) {
  const version = ++renderVersion;
  charts?.disposeCharts();
  maps?.disposeMaps();
  const parsed = parsedRoute();
  activeRoute = parsed.route;
  plannerController?.prepare(activeRoute);
  document.body.dataset.page = activeRoute;
  mochiController?.onRender(activeRoute);
  document.querySelector('meta[name=theme-color]').content =
    state.theme === 'dark' ? '#252220' : '#faf7f2';
  if (activeRoute === 'seasons' && seasons.some((v) => v.id === parsed.detail))
    ui.season = parsed.detail;
  document.title = `${nav.find((n) => n[0] === activeRoute)[1]} · Japan Diary 2029`;
  document.getElementById('main').innerHTML =
    views[activeRoute](state, ui) +
    `<footer class="footer"><span>Japan Diary 2029 · a little guide to our big adventure. ♡</span><span>Planejamento local · <a href="#sources">Fontes, créditos e limites dos dados</a></span></footer>`;
  document.getElementById('current-page').textContent = nav.find((n) => n[0] === activeRoute)[1];
  updateNavigation(state, activeRoute);
  document.body.classList.remove('menu-open');
  document.querySelector('.mobile-menu').setAttribute('aria-expanded', 'false');
  syncSidebar();
  refreshIcons();
  tick();
  if (focus) {
    window.scrollTo(0, 0);
    document.querySelector('#main h1')?.focus({ preventScroll: true });
  }
  const stale = (new Date(localDate()) - new Date('2026-11-13')) / 86400000 > 180;
  if (stale && !['home', 'planner'].includes(activeRoute)) {
    const p = document.createElement('div');
    p.innerHTML = notice(
      'Fontes verificadas em 13/11/2026. Mais de 180 dias se passaram: revalide informações, tarifas e regras antes de decidir.',
    );
    document.getElementById('main').prepend(p);
    refreshIcons();
  }
  try {
    if (['months', 'budget'].includes(activeRoute)) {
      const module = await import('./charts.js');
      if (version !== renderVersion) return;
      charts = module;
      charts.initCharts(state, ui, activeRoute);
    }
    if (
      activeRoute === 'destinations' ||
      activeRoute === 'recommendations' ||
      (activeRoute === 'itinerary' && ui.itineraryView === 'map')
    ) {
      const module = await import('./maps.js');
      if (version !== renderVersion) return;
      maps = module;
      maps.initMaps(state, ui, activeRoute);
    }
  } catch (error) {
    if (version !== renderVersion) return;
    const msg = document.createElement('p');
    msg.className = 'notice';
    msg.textContent =
      'Não foi possível carregar a visualização. As listas e os dados continuam disponíveis. Recarregue para tentar novamente.';
    document.getElementById('main').append(msg);
    console.error(error);
  }
  if (activeRoute === 'destinations' && parsed.detail) {
    const d = destinations.find((d) => d.id === parsed.detail);
    if (d) showModal(destinationDetail(d, state));
  }
}
function tick() {
  const clock = document.getElementById('japan-clock');
  if (clock)
    clock.textContent = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  const homeClock = document.getElementById('home-clock');
  if (homeClock)
    homeClock.textContent =
      new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date()) + ' no Japão · JST';
  const countdown = document.getElementById('countdown');
  if (countdown && state.trip.departureDate) {
    const days = Math.ceil(
      (new Date(state.trip.departureDate + 'T00:00:00Z') - new Date(localDate() + 'T00:00:00Z')) /
        86400000,
    );
    countdown.textContent =
      days > 0
        ? `${days} dias até o nosso próximo capítulo. ♡`
        : days === 0
          ? 'É hoje. Boa viagem! ♡'
          : 'Nossa data de embarque já passou. Revise o planejamento.';
  }
}
function showModal(content) {
  if (modal.open) modal.close();
  modal.innerHTML = `<button class="icon-button close-dialog" data-action="close-modal" aria-label="Fechar janela">${icon('x')}</button>${content}`;
  modal.showModal();
  refreshIcons();
}
function closeModal() {
  if (modal.open) modal.close();
}
function confirmAction(title, message, action, id = '') {
  showModal(
    `<h2 id="modal-title">${title}</h2><p>${message}</p><div class="button-row">${btn('Cancelar', 'close-modal', '', 'secondary')}${btn('Confirmar', action, `data-id="${esc(id)}"`)}</div>`,
  );
}
function settings() {
  showModal(
    `<h2 id="modal-title">A nossa viagem</h2><p class="small muted">2029 está no horizonte. O resto, decidimos juntos.</p><form id="settings-form"><div class="form-grid">${field('Viajantes', 'travelers', state.trip.travelers, 'type="number" min="1" max="50" step="1" required')}${field('Dias', 'days', state.trip.days, 'type="number" min="1" max="90" step="1" required')}${field('Noites', 'nights', state.trip.nights, 'type="number" min="0" max="89" step="1" required')}${field('Data de embarque · opcional', 'departureDate', state.trip.departureDate, `type="date" min="${state.trip.year}-01-01" max="${state.trip.year}-12-31"`)}<label>Estação favorita<select name="selectedSeason">${opt('', 'Ainda vamos escolher', state.trip.selectedSeason)}${seasons.map((v) => opt(v.id, v.name, state.trip.selectedSeason)).join('')}</select></label>${field('Origem', 'departureCity', state.trip.departureCity, 'required maxlength="150"')}${field('Ano', 'year', state.trip.year, 'type="number" min="2027" max="2040" step="1" required')}</div><p class="small muted spaced">A duração não redistribui as noites das bases nem apaga atividades. Você poderá ajustar as diferenças no roteiro. A hospedagem mantém a diária cotada.</p><div class="button-row"><button class="btn" type="submit">Salvar configurações</button></div></form>`,
  );
}
function activityForm(id, day) {
  const route = state.routes[state.selectedRoute];
  const activity = route.days.flatMap((d) => d.activities).find((a) => a.id === id);
  showModal(
    `<h2 id="modal-title">${activity ? 'Editar' : 'Adicionar'} atividade</h2><form id="activity-form" data-id="${esc(id || '')}" data-day="${day || 1}"><div class="form-grid">${field('O que vamos fazer?', 'title', activity?.title, 'required maxlength="300" class="full"')}${field('Estimativa por pessoa · R$', 'cost', activity?.cost || 0, 'type="number" min="0" max="10000000" step="0.01" required')}<label>Dia<select name="day">${Array.from({ length: state.trip.days }, (_, i) => opt(i + 1, `Dia ${i + 1}`, day)).join('')}</select></label><label class="full" style="flex-direction:row;align-items:center"><input type="checkbox" name="free" ${activity?.free ? 'checked' : ''} /> Reservar como período livre / descanso</label></div><div class="button-row"><button class="btn" type="submit">Salvar atividade</button></div></form>`,
  );
}
function lodgingForm(id) {
  const l = state.lodgings.find((l) => l.id === id) || {
    nightly: 0,
    nights: state.trip.nights,
    capacity: state.trip.travelers,
    beds: state.trip.travelers,
    bathrooms: 2,
    cleaning: 0,
    taxes: 0,
  };
  showModal(
    `<h2 id="modal-title">${id ? 'Editar' : 'Cadastrar'} hospedagem</h2><form id="lodging-form" data-id="${esc(id || '')}"><div class="form-grid">${field('Nome', 'name', l.name, 'required maxlength="150"')}${field('Cidade / bairro', 'city', l.city, 'required maxlength="150"')}<label>Tipo<select name="type">${['Apartamento / Airbnb', 'Hostel privativo', 'Apart-hotel', 'Business hotel', 'Ryokan', 'Resort de praia', 'Hotel de esqui'].map((v) => opt(v, v, l.type)).join('')}</select></label>${field('Diária total do grupo · R$', 'nightly', l.nightly, 'type="number" min="0" max="10000000" step="0.01" required')}${field('Noites', 'nights', l.nights, 'type="number" min="1" max="90" step="1" required')}${field('Hóspedes autorizados', 'capacity', l.capacity, 'type="number" min="1" max="100" step="1" required')}${field('Camas', 'beds', l.beds, 'type="number" min="1" max="100" step="1" required')}${field('Banheiros', 'bathrooms', l.bathrooms, 'type="number" min="0" max="100" step="1" required')}${field('Limpeza total · R$', 'cleaning', l.cleaning, 'type="number" min="0" max="10000000" step="0.01" required')}${field('Taxas totais · R$', 'taxes', l.taxes, 'type="number" min="0" max="10000000" step="0.01" required')}${field('Distância / acesso à estação', 'distance', l.distance, 'maxlength="150" placeholder="Informado na cotação"')}${field('Cancelamento', 'cancellation', l.cancellation, 'maxlength="300"')}${field('Licença / registro', 'license', l.license, 'maxlength="150"')}${field('Link', 'url', l.url, 'type="url" pattern="https?://.*" placeholder="https://…" maxlength="2000"')}${field('Data da cotação', 'quotedAt', l.quotedAt || localDate(), 'type="date" required')}<div class="full chip-row">${[
      ['laundry', 'Lavanderia'],
      ['kitchen', 'Cozinha'],
      ['ac', 'Ar-condicionado'],
      ['heating', 'Aquecimento'],
    ]
      .map(
        ([key, label]) =>
          `<label style="flex-direction:row;align-items:center"><input type="checkbox" name="${key}" ${l[key] ? 'checked' : ''} /> ${label}</label>`,
      )
      .join(
        '',
      )}</div></div><div class="button-row"><button class="btn" type="submit">Salvar hospedagem</button></div></form>`,
  );
}
function legForm(id) {
  const l = state.legs.find((l) => l.id === id) || { price: 0 };
  showModal(
    `<h2 id="modal-title">${id ? 'Editar' : 'Adicionar'} trecho</h2><form id="leg-form" data-id="${esc(id || '')}"><div class="form-grid">${field('Origem', 'from', l.from, 'required maxlength="150" placeholder="Osaka"')}${field('Destino', 'to', l.to, 'required maxlength="150" placeholder="Kyoto"')}<label>Meio<select name="mode">${['Shinkansen', 'Trem local', 'Metrô', 'Ônibus', 'Voo doméstico', 'Ferry', 'Táxi', 'Envio de bagagem'].map((v) => opt(v, v, l.mode)).join('')}</select></label>${field('Preço total do trecho / pessoa · R$', 'price', l.price, 'type="number" min="0" max="10000000" step="0.01" required')}${field('Duração informada na fonte', 'duration', l.duration, 'maxlength="150" placeholder="Opcional, não calculada"')}${field('Data da cotação', 'quotedAt', l.quotedAt || localDate(), 'type="date" required')}<label class="full" style="flex-direction:row;align-items:center"><input type="checkbox" name="covered" ${l.covered ? 'checked' : ''} /> Confirmei cobertura pelo passe e validade na data</label></div><div class="button-row"><button class="btn" type="submit">Salvar trecho</button></div></form>`,
  );
}
function wishlistForm(id) {
  const w = state.wishlist.find((w) => w.id === id) || { price: 0, quantity: 1 };
  showModal(
    `<h2 id="modal-title">${id ? 'Editar' : 'Adicionar'} um pequeno desejo</h2><form id="wishlist-form" data-id="${esc(id || '')}"><div class="form-grid">${field('Produto', 'name', w.name, 'required maxlength="150"')}<label>Categoria<select name="category">${shoppingCategories.map((v) => opt(v, v, w.category)).join('')}</select></label>${field('Preço unitário estimado · JPY', 'price', w.price, 'type="number" min="0" max="10000000" step="1" required')}${field('Quantidade', 'quantity', w.quantity, 'type="number" min="1" max="1000" step="1" required')}</div><div class="button-row"><button class="btn" type="submit">Guardar na wishlist</button></div></form>`,
  );
}
function findActivity(id) {
  const r = state.routes[state.selectedRoute];
  for (const day of r.days) {
    const activity = day.activities.find((a) => a.id === id);
    if (activity) return { activity, day };
  }
  return {};
}
function ensureDay(day) {
  const r = state.routes[state.selectedRoute];
  if (!r.days.some((d) => d.day === Number(day))) r.days.push({ day: Number(day), activities: [] });
  return r.days.find((d) => d.day === Number(day));
}
const actions = {
  menu() {
    const open = !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    document.querySelector('.mobile-menu').setAttribute('aria-expanded', String(open));
    syncSidebar();
    if (open) document.querySelector('.nav-link.active')?.focus();
  },
  theme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = state.theme;
    persist();
    render();
  },
  settings,
  'close-modal': closeModal,
  'favorite-season'(el) {
    state.trip.selectedSeason = state.trip.selectedSeason === el.dataset.id ? null : el.dataset.id;
    persist();
    render();
  },
  'season-tab'(el) {
    ui.season = el.dataset.id;
    location.hash = `seasons/${el.dataset.id}`;
  },
  'packing-season'(el) {
    ui.packingSeason = el.dataset.id;
    render();
  },
  favorite(el) {
    const { kind, id } = el.dataset;
    if (!state.favorites[kind]) return;
    const arr = state.favorites[kind];
    const i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(id);
    persist();
    render();
  },
  'destination-detail'(el) {
    const d = destinations.find((d) => d.id === el.dataset.id);
    if (d) showModal(destinationDetail(d, state));
  },
  'add-destination'(el) {
    const d = destinations.find((d) => d.id === el.dataset.id);
    if (!d) return;
    showModal(
      `<h2 id="modal-title">Levar ${d.name} para o roteiro</h2><p class="small muted">Roteiro: ${routeName(state.selectedRoute)}. Nenhuma tarifa ou duração é adicionada automaticamente.</p><form id="destination-form" data-id="${d.id}"><div class="form-grid"><label>Adicionar visita no dia<select name="day">${Array.from({ length: state.trip.days }, (_, i) => opt(i + 1, `Dia ${i + 1}`, 1)).join('')}</select></label>${field('Estimativa por pessoa · R$', 'cost', 0, 'type="number" min="0" max="10000000" step="0.01" required')}<label class="full" style="flex-direction:row;align-items:center"><input type="checkbox" name="asBase" /> Criar também uma base de hospedagem (0 noites para distribuir)</label></div><div class="button-row"><button class="btn" type="submit">Adicionar ao roteiro</button></div></form>`,
    );
  },
  'choose-route'(el) {
    state.selectedRoute = el.dataset.id;
    state.routeChosen = true;
    persist();
    closeModal();
    if (activeRoute === 'itinerary') render();
    else location.hash = 'itinerary';
    toast('Roteiro selecionado. Suas alterações nas outras rotas foram preservadas.');
  },
  'restore-route'() {
    confirmAction(
      'Restaurar esta rota?',
      'As bases e atividades desta rota voltarão à sugestão original. Faça um backup se quiser guardar suas alterações.',
      'confirm-restore-route',
    );
  },
  'confirm-restore-route'() {
    state.routes[state.selectedRoute] =
      state.selectedRoute === 'personalized' && state.planner.baselineRoute
        ? JSON.parse(JSON.stringify(state.planner.baselineRoute))
        : makeRoute(state.selectedRoute);
    state.routeChosen = true;
    persist();
    closeModal();
    render();
    toast('Roteiro original restaurado.');
  },
  'add-base'() {
    state.routeChosen = true;
    state.routes[state.selectedRoute].bases.push({
      id: uid(),
      city: 'Nova base',
      nights: 0,
      destinationId: null,
    });
    persist();
    render();
  },
  'remove-base'(el) {
    state.routeChosen = true;
    state.routes[state.selectedRoute].bases.splice(Number(el.dataset.id), 1);
    persist();
    render();
  },
  'activity-add'(el) {
    activityForm(null, Number(el.dataset.day));
  },
  'activity-edit'(el) {
    const { day } = findActivity(el.dataset.id);
    if (day) activityForm(el.dataset.id, day.day);
  },
  'activity-favorite'(el) {
    state.routeChosen = true;
    const { activity } = findActivity(el.dataset.id);
    if (activity) {
      activity.favorite = !activity.favorite;
      persist();
      render();
    }
  },
  'activity-remove'(el) {
    state.routeChosen = true;
    const { day } = findActivity(el.dataset.id);
    if (day) {
      day.activities = day.activities.filter((a) => a.id !== el.dataset.id);
      persist();
      render();
    }
  },
  'activity-move'(el) {
    const { activity, day } = findActivity(el.dataset.id);
    if (!activity) return;
    showModal(
      `<h2 id="modal-title">Mover atividade</h2><p>${esc(activity.title)}</p><form id="move-form" data-id="${esc(activity.id)}"><label>Dia de destino<select name="day">${Array.from({ length: state.trip.days }, (_, i) => opt(i + 1, `Dia ${i + 1}`, day.day)).join('')}</select></label><div class="button-row"><button class="btn" type="submit">Mover</button></div></form>`,
    );
  },
  'export-itinerary'() {
    download(
      'japan-diary-roteiro.json',
      JSON.stringify(
        {
          trip: state.trip,
          route: state.selectedRoute,
          itinerary: state.routes[state.selectedRoute],
          note: 'Custos estimados em BRL por pessoa; ingressos de 2029 não confirmados.',
        },
        null,
        2,
      ),
    );
  },
  print() {
    window.print();
  },
  scenario(el) {
    const { saved, savingsStart } = state.budget;
    state.budget = {
      ...scenarioBudget(el.dataset.id, state.trip.travelers, state.trip.nights, state.trip.days),
      saved,
      savingsStart,
    };
    persist();
    render();
    toast('Estimativas do cenário aplicadas.');
  },
  'save-season-quote'() {
    const season = ui.quoteSeason || state.trip.selectedSeason || 'winter';
    state.seasonQuotes ??= {};
    state.seasonQuotes[season] = {
      trip: { ...state.trip },
      budget: { ...state.budget },
      route: state.selectedRoute,
      updatedAt: localDate(),
    };
    persist();
    render();
    toast('Estimativa salva para comparar as estações.');
  },
  'export-budget-json'() {
    download(
      'japan-diary-orcamento.json',
      JSON.stringify(
        {
          trip: state.trip,
          budget: state.budget,
          results: calculateBudget(state.trip, state.budget),
          currency: 'BRL',
          reference: 'Estimativas de planejamento de novembro/2026; não são tarifas de 2029.',
        },
        null,
        2,
      ),
    );
  },
  'export-budget-csv'() {
    const b = calculateBudget(state.trip, state.budget);
    download(
      'japan-diary-orcamento.csv',
      csv([
        ['Categoria', 'BRL grupo', 'BRL pessoa (rateio)'],
        ...Object.entries(b.categories).map(([k, v]) => [
          k,
          v.toFixed(2),
          (v / state.trip.travelers).toFixed(2),
        ]),
        ['Total', b.group.toFixed(2), b.person.toFixed(2)],
        ['Saldo individual', '', b.saved.toFixed(2)],
        ['Falta individual', '', b.remaining.toFixed(2)],
        ['Depósitos', '', b.deposits ?? 'Data não definida'],
        ['Mensal individual', '', b.monthly ?? 'Data não definida'],
        ['Referência', 'Estimativa nov/2026', 'Sem tarifas confirmadas de 2029'],
      ]),
      'text/csv;charset=utf-8',
    );
  },
  'lodging-add'() {
    lodgingForm();
  },
  'lodging-edit'(el) {
    lodgingForm(el.dataset.id);
  },
  'lodging-remove'(el) {
    state.lodgings = state.lodgings.filter((l) => l.id !== el.dataset.id);
    persist();
    render();
  },
  'leg-add'() {
    legForm();
  },
  'leg-edit'(el) {
    legForm(el.dataset.id);
  },
  'leg-remove'(el) {
    state.legs = state.legs.filter((l) => l.id !== el.dataset.id);
    persist();
    render();
  },
  'apply-transport'() {
    if (!state.legs.length) {
      toast('Adicione trechos cotados primeiro.');
      return;
    }
    confirmAction(
      'Aplicar trechos ao orçamento?',
      `O total de ${money(transportCost(state.legs, state.trip.travelers).person)} por pessoa substituirá o transporte local. Os campos Shinkansen, voos domésticos e ferry serão zerados para evitar duplicação.`,
      'confirm-transport',
    );
  },
  'confirm-transport'() {
    state.budget.localTransport = transportCost(state.legs, state.trip.travelers).person;
    state.budget.shinkansen = 0;
    state.budget.domesticFlight = 0;
    state.budget.ferry = 0;
    persist();
    closeModal();
    location.hash = 'budget';
  },
  'wishlist-add'() {
    wishlistForm();
  },
  'wishlist-edit'(el) {
    wishlistForm(el.dataset.id);
  },
  'wishlist-remove'(el) {
    state.wishlist = state.wishlist.filter((w) => w.id !== el.dataset.id);
    persist();
    render();
  },
  'task-remove'(el) {
    state.tasks = state.tasks.filter((t) => t.id !== el.dataset.id);
    delete state.checks[el.dataset.id];
    persist();
    render();
  },
  'export-backup'() {
    download(`japan-diary-backup-${localDate()}.json`, JSON.stringify(state, null, 2));
    toast('Backup exportado. Guarde uma cópia em local seguro.');
  },
  'import-backup'() {
    showModal(
      `<h2 id="modal-title">Importar uma cópia do diário</h2><p class="small muted">Importe o arquivo de backup completo exportado pelo aplicativo. Você verá um resumo antes de substituir o planejamento atual.</p><label>Backup JSON · até 2 MB<input id="backup-file" type="file" accept="application/json,.json" /></label><p id="import-status" role="status" class="small spaced"></p>`,
    );
  },
  'confirm-import'() {
    if (!ui.pendingImport) return;
    state = ui.pendingImport;
    plannerController?.reset();
    delete ui.pendingImport;
    persist();
    closeModal();
    document.documentElement.dataset.theme = state.theme;
    render();
    toast('Planejamento importado neste navegador.');
  },
  'expand-map'(el) {
    const map = document.getElementById(el.dataset.id);
    if (!map) return;
    const isFull = map.classList.toggle('map-full');
    el.innerHTML = icon(isFull ? 'minimize' : 'maximize') + (isFull ? ' Reduzir' : ' Ampliar');
    el.setAttribute('aria-expanded', String(isFull));
    refreshIcons();
    setTimeout(() => maps?.resizeMaps(), 50);
  },
};
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button) {
    event.preventDefault();
    actions[button.dataset.action]?.(button);
  }
  if (event.target.closest('#search-results a')) hideSearch();
  if (!event.target.closest('.search-wrap')) hideSearch();
});
function hideSearch() {
  const results = document.getElementById('search-results');
  if (results) results.hidden = true;
  document.getElementById('global-search')?.setAttribute('aria-expanded', 'false');
}
function search(value) {
  const results = document.getElementById('search-results'),
    normalized = (t) =>
      String(t)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase(),
    query = normalized(value.trim());
  if (query.length < 2) {
    hideSearch();
    return;
  }
  const found = [
    ...nav.map(([id, name]) => ({
      title: name,
      subtitle: 'Seção do diário',
      url: '#' + id,
      text: name,
    })),
    ...destinations.map((d) => ({
      title: d.name,
      subtitle: d.region,
      url: '#destinations/' + d.id,
      text: d.name + ' ' + d.attractions,
    })),
    ...events.map((e) => ({
      title: e.name,
      subtitle: 'Evento / festival',
      url: '#events',
      text: e.name + ' ' + e.city,
    })),
    ...food.map((f) => ({
      title: f.name,
      subtitle: 'Guia gastronômico',
      url: '#food',
      text: f.name + ' ' + f.description,
    })),
  ]
    .filter((v) => normalized(v.text).includes(query))
    .slice(0, 12);
  results.innerHTML = found.length
    ? found
        .map((r) => `<a href="${esc(r.url)}">${esc(r.title)}<small>${esc(r.subtitle)}</small></a>`)
        .join('')
    : '<p class="small muted" style="padding:10px">Nenhum resultado. Tente cidade, atração ou seção.</p>';
  results.hidden = false;
  document.getElementById('global-search').setAttribute('aria-expanded', 'true');
}
function refreshBudget() {
  document.getElementById('budget-summary').innerHTML = budgetSummary(state);
  charts?.updateBudgetChart(state);
  refreshIcons();
}
document.addEventListener('input', (event) => {
  const el = event.target;
  if (el.validity?.customError) el.setCustomValidity('');
  if (el.id === 'global-search') {
    search(el.value);
    return;
  }
  if (el.id === 'notes') {
    state.notes = el.value;
    clearTimeout(notesTimer);
    notesTimer = setTimeout(() => {
      const saved = persist();
      const note = document.getElementById('notes-status');
      if (note)
        note.textContent = saved
          ? 'Notas salvas neste navegador.'
          : 'Não foi possível salvar no navegador. Exporte um backup.';
    }, 300);
    return;
  }
  if (el.matches('[data-budget],[data-budget-trip]')) {
    if (!el.validity.valid) return;
    const target = el.hasAttribute('data-budget-trip') ? state.trip : state.budget;
    target[el.name] = ['departureDate', 'savingsStart'].includes(el.name)
      ? el.value || null
      : el.valueAsNumber;
    persist();
    refreshBudget();
    return;
  }
  if (el.dataset.searchFilter) {
    clearTimeout(searchTimer);
    const key = el.dataset.searchFilter,
      value = el.value,
      position = el.selectionStart;
    ui[key] = value;
    searchTimer = setTimeout(async () => {
      await render();
      const replacement = document.querySelector(`[data-search-filter="${key}"]`);
      replacement?.focus();
      replacement?.setSelectionRange(position, position);
    }, 220);
  }
});
document.addEventListener('change', async (event) => {
  const el = event.target;
  if (el.dataset.ui) {
    ui[el.dataset.ui] = el.type === 'checkbox' ? el.checked : el.value;
    render();
  }
  if (el.dataset.weight !== undefined) {
    state.weights[Number(el.dataset.weight)] = Number(el.value);
    persist();
    render();
  }
  if (el.hasAttribute('data-route-select')) {
    state.selectedRoute = el.value;
    state.routeChosen = true;
    persist();
    render();
  }
  if (el.dataset.check) {
    state[el.dataset.check][el.dataset.id] = el.checked;
    persist();
    render();
  }
  if (el.dataset.base !== undefined) {
    state.routeChosen = true;
    if (!el.validity.valid) return;
    const base = state.routes[state.selectedRoute].bases[Number(el.dataset.base)];
    base[el.dataset.field] =
      el.dataset.field === 'nights' ? Number(el.value) : el.value.trim() || 'Base a definir';
    if (el.dataset.field === 'city')
      base.destinationId =
        destinations.find((d) => base.city.toLowerCase().includes(d.name.toLowerCase()))?.id ||
        null;
    persist();
    render();
  }
  if (el.hasAttribute('data-exchange')) {
    if (!el.validity.valid) return;
    state.exchangeRate = el.value ? Number(el.value) : null;
    persist();
    render();
  }
  if (el.id === 'backup-file') {
    const file = el.files?.[0];
    if (!file) return;
    const status = document.getElementById('import-status');
    try {
      if (file.size > 2000000) throw new Error('Arquivo muito grande. Limite: 2 MB.');
      const imported = parseBackup(await file.text());
      ui.pendingImport = imported;
      status.innerHTML = `Arquivo válido: <strong>${imported.trip.travelers} viajantes</strong>, ${imported.trip.days} dias, ${imported.favorites.destinations.length} destinos favoritos e ${imported.lodgings.length} hospedagens.<br><br>O planejamento atual será substituído. Faça um backup antes, se quiser preservá-lo.<div class="button-row">${btn('Cancelar', 'close-modal', '', 'secondary')}${btn('Substituir pelo arquivo', 'confirm-import')}</div>`;
      refreshIcons();
    } catch (error) {
      delete ui.pendingImport;
      status.textContent = `Não foi possível importar: ${error.message}`;
      status.classList.add('error-text');
    }
  }
});
document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!form.id) return;
  event.preventDefault();
  for (const input of form.querySelectorAll('input[required]')) {
    if (['text', 'search', 'url'].includes(input.type) && !input.value.trim()) {
      input.setCustomValidity('Preencha este campo com um texto.');
      input.reportValidity();
      return;
    }
  }
  if (!form.reportValidity()) return;
  const fd = new FormData(form),
    get = (k) => String(fd.get(k) || '').trim(),
    num = (k) => Number(fd.get(k)) || 0;
  const id = form.dataset.id;
  switch (form.id) {
    case 'settings-form': {
      const next = {
        ...state,
        trip: {
          ...state.trip,
          year: num('year'),
          departureCity: get('departureCity'),
          travelers: num('travelers'),
          days: num('days'),
          nights: num('nights'),
          departureDate: get('departureDate') || null,
          selectedSeason: get('selectedSeason') || null,
        },
      };
      try {
        validateState(next);
      } catch (e) {
        toast(e.message);
        return;
      }
      state = next;
      break;
    }
    case 'activity-form': {
      state.routeChosen = true;
      const { activity, day } = findActivity(id);
      const target = ensureDay(num('day'));
      if (activity) {
        Object.assign(activity, { title: get('title'), cost: num('cost'), free: fd.has('free') });
        if (day.day !== target.day) moveActivity(state.routes[state.selectedRoute], id, target.day);
      } else
        target.activities.push({
          id: uid(),
          title: get('title'),
          cost: num('cost'),
          favorite: false,
          free: fd.has('free'),
        });
      break;
    }
    case 'move-form': {
      state.routeChosen = true;
      ensureDay(num('day'));
      moveActivity(state.routes[state.selectedRoute], id, num('day'));
      break;
    }
    case 'destination-form': {
      state.routeChosen = true;
      const d = destinations.find((d) => d.id === id);
      if (!d) return;
      ensureDay(num('day')).activities.push({
        id: uid(),
        title: `Visitar ${d.name} · acesso e ingressos a consultar`,
        cost: num('cost'),
        favorite: false,
        free: false,
      });
      if (fd.has('asBase'))
        state.routes[state.selectedRoute].bases.push({
          id: uid(),
          city: d.name,
          nights: 0,
          destinationId: d.id,
        });
      persist();
      closeModal();
      if (activeRoute === 'itinerary') render();
      else location.hash = 'itinerary';
      toast(`${d.name} adicionado ao roteiro.`);
      return;
    }
    case 'lodging-form': {
      const data = {
        id: id || uid(),
        name: get('name'),
        city: get('city'),
        type: get('type'),
        nightly: num('nightly'),
        nights: num('nights'),
        capacity: num('capacity'),
        beds: num('beds'),
        bathrooms: num('bathrooms'),
        cleaning: num('cleaning'),
        taxes: num('taxes'),
        distance: get('distance'),
        cancellation: get('cancellation'),
        license: get('license'),
        url: get('url'),
        quotedAt: get('quotedAt'),
        laundry: fd.has('laundry'),
        kitchen: fd.has('kitchen'),
        ac: fd.has('ac'),
        heating: fd.has('heating'),
      };
      const index = state.lodgings.findIndex((l) => l.id === id);
      if (index >= 0) state.lodgings[index] = data;
      else state.lodgings.push(data);
      break;
    }
    case 'leg-form': {
      const data = {
        id: id || uid(),
        from: get('from'),
        to: get('to'),
        mode: get('mode'),
        price: num('price'),
        duration: get('duration'),
        quotedAt: get('quotedAt'),
        covered: fd.has('covered'),
      };
      const index = state.legs.findIndex((l) => l.id === id);
      if (index >= 0) state.legs[index] = data;
      else state.legs.push(data);
      break;
    }
    case 'wishlist-form': {
      const data = {
        id: id || uid(),
        name: get('name'),
        category: get('category'),
        price: num('price'),
        quantity: num('quantity'),
      };
      const index = state.wishlist.findIndex((w) => w.id === id);
      if (index >= 0) state.wishlist[index] = data;
      else state.wishlist.push(data);
      break;
    }
    case 'task-form':
      state.tasks.push({ id: uid(), title: get('title') });
      break;
    case 'budget-form':
      return;
    default:
      return;
  }
  persist();
  closeModal();
  render();
  toast('Planejamento atualizado.');
});
let draggedId;
document.addEventListener('dragstart', (event) => {
  const activity = event.target.closest('[data-activity]');
  if (activity) {
    draggedId = activity.dataset.activity;
    event.dataTransfer.setData('text/plain', draggedId);
    event.dataTransfer.effectAllowed = 'move';
  }
});
document.addEventListener('dragover', (event) => {
  const day = event.target.closest('.day-card');
  if (day && draggedId) {
    event.preventDefault();
    day.classList.add('dragover');
  }
});
document.addEventListener('dragleave', (event) =>
  event.target.closest('.day-card')?.classList.remove('dragover'),
);
document.addEventListener('drop', (event) => {
  const day = event.target.closest('.day-card');
  if (day && draggedId) {
    event.preventDefault();
    state.routeChosen = true;
    ensureDay(Number(day.dataset.day));
    moveActivity(state.routes[state.selectedRoute], draggedId, Number(day.dataset.day));
    persist();
    render();
  }
  draggedId = null;
});
document.addEventListener('dragend', () => {
  draggedId = null;
  document.querySelectorAll('.dragover').forEach((el) => el.classList.remove('dragover'));
});
function syncSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar)
    sidebar.inert =
      matchMedia('(max-width:1024px)').matches && !document.body.classList.contains('menu-open');
}
matchMedia('(max-width:1024px)').addEventListener('change', syncSidebar);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    hideSearch();
    if (document.body.classList.contains('menu-open')) {
      document.body.classList.remove('menu-open');
      document.querySelector('.mobile-menu').setAttribute('aria-expanded', 'false');
      syncSidebar();
      document.querySelector('.mobile-menu').focus();
    }
    document.querySelectorAll('.map-full').forEach((el) => el.classList.remove('map-full'));
    maps?.resizeMaps();
  }
  if (event.key === 'Tab' && document.body.classList.contains('menu-open')) {
    const links = [
        ...document.querySelectorAll('.sidebar a, .sidebar summary, .sidebar button'),
      ].filter((el) => el.getClientRects().length && !el.disabled),
      first = links[0],
      last = links.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    const rect = modal.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeModal();
  }
});
window.addEventListener('hashchange', () => {
  closeModal();
  render({ focus: true }).then(syncSidebar);
});
window.addEventListener('beforeunload', () => {
  clearTimeout(notesTimer);
  saveState(storage, state);
});
plannerController = connectPlanner({
  getState: () => state,
  setState: (next) => {
    state = next;
  },
  ui,
  persist,
  render,
  icons: refreshIcons,
  showModal,
  closeModal,
});
shell();
mochiController = connectMochi({
  getState: () => state,
  setState: (next) => {
    state = next;
  },
  persist,
  render,
  ui,
});
render().then(syncSidebar);
setInterval(tick, 30000);
if (loaded.warning) setTimeout(() => toast(loaded.warning), 600);
