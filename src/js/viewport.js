// Acompanha o viewport visual para que barras fixas não cubram campos quando
// o teclado virtual abre, e para que painéis de altura total usem a área real.
export function watchViewport(win = window) {
  const vv = win.visualViewport;
  const root = win.document.documentElement;
  const body = win.document.body;
  if (!vv) return () => {};
  let frame = 0;
  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const keyboard = keyboardOpen(win.innerHeight, vv.height, win.document.activeElement);
      body.classList.toggle('keyboard-open', keyboard);
      root.style.setProperty('--app-h', `${Math.round(vv.height)}px`);
    });
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  win.document.addEventListener('focusin', update);
  win.document.addEventListener('focusout', () => setTimeout(update, 120));
  update();
  return () => {
    vv.removeEventListener('resize', update);
    vv.removeEventListener('scroll', update);
  };
}
// O teclado é considerado aberto quando um campo de texto tem foco e o viewport
// visual encolheu de forma significativa (não apenas a barra do navegador).
export function keyboardOpen(layoutHeight, visualHeight, active) {
  const typing =
    !!active &&
    (active.isContentEditable ||
      active.tagName === 'TEXTAREA' ||
      (active.tagName === 'INPUT' &&
        !['checkbox', 'radio', 'button', 'submit', 'range', 'color', 'file'].includes(
          active.type,
        )) ||
      active.tagName === 'SELECT');
  return typing && layoutHeight - visualHeight > 150;
}
