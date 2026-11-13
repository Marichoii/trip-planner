import { seasons } from '../data/planning.js';
import { img, go, btn } from './components.js';
import { icon, esc } from './utils.js';
export function welcomeView(s) {
  const progress =
    s.planner.started ||
    s.routeChosen ||
    s.trip.selectedSeason ||
    s.notes ||
    s.favorites.destinations.length;
  const continueUrl =
    s.routeChosen && !s.planner.started
      ? '#itinerary'
      : s.planner.status === 'accepted'
        ? '#itinerary'
        : s.planner.result && !s.planner.dirty
          ? '#recommendations'
          : '#planner';
  return `<div class="welcome-page"><section class="welcome-hero" aria-labelledby="welcome-title"><div class="welcome-copy"><p class="eyebrow"><span lang="ja">私たちの日本旅行</span> <span class="eyebrow-divider" aria-hidden="true">/</span> OUR JAPAN ADVENTURE</p><h1 id="welcome-title" tabindex="-1">O Japão<br> nos espera.<span class="welcome-heart" aria-hidden="true">♡</span></h1><p class="welcome-intro">${s.trip.travelers === 6 ? 'Seis amigos' : `${s.trip.travelers} viajantes`}, infinitas possibilidades e uma viagem que a gente vai lembrar para sempre. Vamos descobrir juntos qual Japão queremos conhecer?</p><div class="welcome-actions">${go('planner', `${icon('heart')} Vamos planejar nossa viagem`, 'welcome-primary')}${go('explore', `Explorar o Japão ${icon('arrow-up-right')}`, 'welcome-secondary')}</div></div><div class="welcome-collage"><figure class="welcome-main-photo">${img('hero', '', true, '(min-width: 1280px) 34vw, (min-width: 768px) 42vw, 92vw')}<figcaption>um dia, a gente aqui.</figcaption></figure><figure class="welcome-small-photo">${img('spring', '', true, '(min-width: 768px) 220px, 40vw')}<figcaption>so many little things to discover.</figcaption></figure><div class="welcome-postmark" aria-hidden="true"><span>A LITTLE GUIDE TO</span><strong>our big<br>adventure</strong><span>JAPAN · ${s.trip.year}</span></div><span class="welcome-vertical" lang="ja" aria-hidden="true">まだ見ぬ景色に、会いに行こう。</span><span class="welcome-sakura sakura-one" aria-hidden="true">${icon('flower-2')}</span><span class="welcome-sakura sakura-two" aria-hidden="true">${icon('flower-2')}</span></div><div class="welcome-meta">${progress ? `<a href="${continueUrl}" class="continue-link"><span class="continue-icon">${icon('bookmark')}</span><span><strong>Continuar nosso planejamento</strong><small>Seu cantinho está salvo neste navegador</small></span>${icon('arrow-right')}</a>` : '<p class="welcome-footnote">Um primeiro rascunho em 6 passos. As decisões podem vir depois.</p>'}<p class="welcome-edition" aria-label="Japão ${s.trip.year}, ${s.trip.travelers} amigos, quatro estações"><span>JAPAN ${s.trip.year}</span><span aria-hidden="true">♡</span><span>${s.trip.travelers} FRIENDS</span><span aria-hidden="true">♡</span><span>4 SEASONS</span></p></div></section>
 <section class="welcome-seasons" aria-labelledby="welcome-seasons-title"><div class="welcome-section-heading"><div><p class="eyebrow">FOUR WAYS TO FALL IN LOVE</p><h2 id="welcome-seasons-title">Um país, quatro estações.</h2><p>Qual dessas histórias a gente quer viver?</p></div><a href="#seasons" class="text-button">Conhecer as estações ${icon('arrow-right')}</a></div><div class="welcome-season-grid">${seasons.map((v) => `<article class="welcome-season-card"><a href="#seasons/${v.id}"><span class="welcome-season-photo">${img(v.id, '', false, '(min-width: 1024px) 22vw, 46vw')}<span class="welcome-season-jp" lang="ja">${v.jp}</span></span><div class="welcome-season-body"><small>${v.english} · ${v.months}</small><h3>${v.name}</h3><p>${v.highlights[0]} · ${v.highlights[1]}</p></div></a><button class="welcome-save-season ${s.trip.selectedSeason === v.id ? 'favorited' : ''}" data-action="favorite-season" data-id="${v.id}" aria-label="${s.trip.selectedSeason === v.id ? 'Desmarcar' : 'Favoritar'} ${v.name}" aria-pressed="${s.trip.selectedSeason === v.id}">${icon('heart')}</button></article>`).join('')}</div></section>
 <section class="welcome-how" aria-labelledby="welcome-how-title"><div><p class="eyebrow">FROM A LITTLE IDEA TO A BIG ADVENTURE</p><h2 id="welcome-how-title">Tudo começa<br>com uma ideia.</h2><p>Você não precisa conhecer o Japão<br>para começar a planejar.</p></div><ol>${[
   ['01', 'Conte o que vocês amam', 'Uma estação, um interesse ou só a vontade de ir.'],
   [
     '02',
     'Descubra o Japão de vocês',
     'Sugestões que fazem sentido para o grupo, com os motivos de cada escolha.',
   ],
   [
     '03',
     'Faça o plano ganhar vida',
     'Ajuste o roteiro e use as ferramentas quando precisar. Tudo no seu tempo.',
   ],
 ]
   .map(([n, t, d]) => `<li><span>${n}</span><div><h3>${t}</h3><p>${d}</p></div></li>`)
   .join('')}</ol></section>
 <section class="welcome-places" aria-labelledby="welcome-places-title"><div class="welcome-section-heading"><div><p class="eyebrow">PLACES WE KEEP DREAMING ABOUT</p><h2 id="welcome-places-title">Lugares que queremos conhecer.</h2></div><a href="#destinations" class="text-button">Abrir nosso mapa ${icon('arrow-right')}</a></div><div class="welcome-gallery">${[
   ['tokyo', 'Tóquio', 'As luzes, as lojas, o inesperado.', 'tokyo'],
   ['osaka', 'Osaka', 'Um encontro com a diversão.', 'osaka'],
   ['summer', 'Okinawa', 'Um respiro azul no nosso caminho.', 'naha'],
 ]
   .map(
     ([image, title, caption, id]) =>
       `<a class="welcome-gallery-item" href="#destinations/${id}">${img(image, '', false, '(min-width: 1024px) 30vw, (min-width: 768px) 32vw, 78vw')}<div class="welcome-gallery-body"><h3>${title}</h3><p>${caption}</p>${icon('arrow-up-right')}</div></a>`,
   )
   .join(
     '',
   )}</div><p class="gallery-caption">Fotografias de referência do Japão. Créditos em <a href="#sources">Fontes & sobre</a>.</p></section>
 <section class="welcome-invitation" aria-labelledby="welcome-invitation-title"><span aria-hidden="true">${icon('flower-2')}</span><p class="eyebrow">OUR FAVOURITE CHAPTER IS STILL UNWRITTEN</p><h2 id="welcome-invitation-title">Vamos descobrir<br>o nosso Japão?</h2><p>Sem precisar decidir tudo hoje. (˶ᵔ ᵕ ᵔ˶) ♡</p>${go('planner', `Começar nosso primeiro capítulo ${icon('arrow-right')}`)}<p class="welcome-time-note"><time id="home-clock"></time></p>${s.trip.departureDate ? '<p class="welcome-time-note"><span id="countdown"></span></p>' : ''}</section></div>`;
}
export function exploreView() {
  const topics = [
    [
      'seasons',
      'flower-2',
      'O Japão em quatro estações',
      'Clima, paisagens e jeitos diferentes de viajar.',
      'spring',
    ],
    [
      'destinations',
      'map',
      'Lugares para se apaixonar',
      'Explore regiões e guarde seus destinos favoritos.',
      'hero',
    ],
    [
      'events',
      'sparkles',
      'O calendário dos sonhos',
      'Festivais, flores, neve e tradições.',
      'autumn',
    ],
    [
      'food',
      'utensils',
      'Sabores & pequenos garimpos',
      'Comidas, lojas e desejos para a mala.',
      'food',
    ],
  ];
  return `<div class="explore-page"><header class="editorial-heading"><p class="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</p><h1 tabindex="-1">O Japão tem<br>muito para contar.</h1><p>Explore sem compromisso. Uma descoberta pode virar o começo da nossa viagem.</p>${go('planner', `${icon('heart')} Levar essas ideias para a viagem`, 'secondary')}</header><div class="explore-grid">${topics.map(([id, i, title, description, image]) => `<a class="explore-story" href="#${id}"><span class="explore-story-photo">${img(image, '', false, '(min-width: 768px) 45vw, 92vw')}</span><div class="explore-story-body"><span class="explore-story-icon">${icon(i)}</span><h2>${title}</h2><p>${description}</p><span class="text-button">Descobrir ${icon('arrow-right')}</span></div></a>`).join('')}</div><section class="explore-tools"><p class="eyebrow">WHEN YOU NEED THE DETAILS</p><h2>Os detalhes também têm seu lugar.</h2><p>Hospedagem, transporte, malas e documentos podem esperar o momento certo.</p><div class="chip-row">${[
    ['months', 'Comparar os 12 meses'],
    ['hotels', 'Onde ficar'],
    ['transport', 'Como se deslocar'],
    ['packing', 'Preparar as malas'],
    ['rules', 'Regras e documentos'],
  ]
    .map(([id, t]) => go(id, esc(t), 'secondary small'))
    .join('')}</div></section></div>`;
}
