// Small native animations; preference changes also finish any entry animation.
export function connectMotion() {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  let lastPage;
  let entrances = [];
  try {
    paused = localStorage.getItem('planner-motion') === 'paused';
  } catch {}

  const enabled = () => !media.matches && !paused;
  function finishEntrances() {
    for (const animation of entrances) animation.finish();
    entrances = [];
  }
  function sync() {
    document.documentElement.dataset.motion = media.matches ? 'reduced' : paused ? 'paused' : 'on';
    if (!enabled()) finishEntrances();
    document.querySelectorAll('[data-motion-toggle]').forEach((button) => {
      const label = media.matches
        ? 'Animações reduzidas pela preferência do sistema'
        : paused
          ? 'Ativar animações'
          : 'Pausar animações';
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(!enabled()));
      button.disabled = media.matches;
    });
  }
  function animate(elements) {
    finishEntrances();
    if (!enabled()) return;
    entrances = elements.filter(Boolean).map((element, index) =>
      element.animate(
        [
          { opacity: 0, transform: 'translateY(14px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        {
          duration: 460,
          delay: index * 65,
          easing: 'cubic-bezier(.22,.8,.24,1)',
          fill: 'backwards',
        },
      ),
    );
  }
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-motion-toggle]') || media.matches) return;
    paused = !paused;
    try {
      localStorage.setItem('planner-motion', paused ? 'paused' : 'on');
    } catch {}
    sync();
  });
  media.addEventListener('change', sync);
  const visibility = () => {
    document.documentElement.dataset.pageHidden = String(document.hidden);
  };
  document.addEventListener('visibilitychange', visibility);
  visibility();
  sync();
  return {
    render(root, { panel = false } = {}) {
      sync();
      if (panel) {
        animate([root.querySelector('[role="tabpanel"]:not([hidden])')]);
        return;
      }
      const page = location.hash || '#home';
      if (page === lastPage) return;
      lastPage = page;
      const home = root.querySelector('.home-journal');
      animate(
        home
          ? [...root.querySelectorAll('.home-hero-copy, .home-postcards, .home-ticket, .home-hub')]
          : [
              root.querySelector(
                '.wizard-heading, .page-heading, .recommendation-hero, .editorial-heading',
              ),
            ],
      );
    },
  };
}
