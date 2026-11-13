export const money = (value, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(Number(value) || 0);
export const number = (value) => new Intl.NumberFormat('pt-BR').format(value);
export const esc = (value = '') =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const icon = (name, cls = '') =>
  `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
export const uid = () =>
  globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
export const link = (url, label, cls = '') =>
  safeUrl(url)
    ? `<a class="${cls}" href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label)} ${icon('arrow-up-right')}</a>`
    : esc(label);
export function download(filename, content, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows) {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((v) => {
            const s = String(v ?? '');
            return '"' + (/^[=+@\-]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"';
          })
          .join(';'),
      )
      .join('\r\n')
  );
}
export const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
export const monthShort = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];
export function localDate(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(date);
}
export function dateLabel(value) {
  return value
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', dateStyle: 'medium' }).format(
        new Date(value + 'T12:00:00Z'),
      )
    : 'A escolher';
}
export function tripDayDate(start, day) {
  if (!start) return '';
  const date = new Date(start + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + day - 1);
  return date.toISOString().slice(0, 10);
}
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('visible'), 3500);
}
