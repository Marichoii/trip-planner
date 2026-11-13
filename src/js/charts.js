import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { climate, tourism, seasons, qualitativeScores } from './views.js';
import { monthShort, money } from './utils.js';
import { calculateBudget } from './budget.js';
Chart.register(
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);
const instances = new Map();
// As cores vêm dos tokens CSS para acompanhar o tema claro/escuro.
const token = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#8a5260';
const palette = () => [1, 2, 3, 4, 5, 6].map((i) => token(`--chart-${i}`));
const font = { family: 'DM Sans', size: 12 };
export function disposeCharts() {
  instances.forEach((chart) => chart.destroy());
  instances.clear();
}
function draw(id, type, data, extra = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = token('--color-text-secondary'),
    grid = token('--chart-grid');
  Chart.defaults.font = font;
  Chart.defaults.color = text;
  const chart = new Chart(el, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 300 },
      color: text,
      // Toque ou passagem do mouse em qualquer ponto do mês mostra todos os valores.
      interaction: type === 'doughnut' ? undefined : { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: type === 'line',
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            color: text,
            font,
            padding: 14,
          },
        },
        tooltip: {
          backgroundColor: token('--color-surface-elevated'),
          titleColor: token('--color-text'),
          bodyColor: token('--color-text-secondary'),
          borderColor: token('--color-border-strong'),
          borderWidth: 1,
          padding: 12,
          titleFont: { ...font, weight: '600' },
          bodyFont: font,
          boxPadding: 4,
          usePointStyle: true,
        },
      },
      scales:
        type === 'doughnut'
          ? {}
          : {
              x: { grid: { display: false }, ticks: { color: text, font } },
              y: {
                grid: { color: grid },
                border: { display: false },
                ticks: { color: text, font },
              },
            },
      ...extra,
    },
  });
  instances.set(id, chart);
}
export function weightedScores(s) {
  const weight = s.weights.reduce((a, b) => a + b, 0);
  return seasons.map((v) =>
    weight
      ? Math.round(
          (qualitativeScores[v.id].reduce((n, score, i) => n + score * s.weights[i], 0) / weight) *
            100,
        ) / 100
      : null,
  );
}
export function initCharts(s, ui, route) {
  if (route === 'months') {
    const city = climate.cities.find((c) => c.id === ui.city) || climate.cities[0];
    const colors = palette();
    draw('temperature-chart', 'line', {
      labels: monthShort,
      datasets: climate.cities.map((c, i) => ({
        label: c.name,
        data: c.temperature,
        borderColor: colors[i],
        backgroundColor: colors[i],
        borderWidth: 2,
        pointRadius: 2.5,
        pointHoverRadius: 5,
        tension: 0.3,
      })),
    });
    draw('rainfall-chart', 'bar', {
      labels: monthShort,
      datasets: [
        {
          label: 'Precipitação (mm)',
          data: city.rainfall,
          backgroundColor: monthShort.map((_, i) =>
            i === Number(ui.month) ? colors[0] : token('--chart-muted'),
          ),
          borderRadius: 4,
        },
      ],
    });
    draw(
      'tourism-chart',
      'bar',
      {
        labels: monthShort,
        datasets: [
          {
            label: `Chegadas internacionais · ${tourism.year}`,
            data: tourism.arrivals,
            backgroundColor: monthShort.map((_, i) =>
              i === Number(ui.month) ? colors[0] : token('--chart-muted'),
            ),
            borderRadius: 4,
          },
        ],
      },
      {
        scales: {
          x: { grid: { display: false }, ticks: { font } },
          y: {
            beginAtZero: true,
            grid: { color: token('--chart-grid') },
            border: { display: false },
            ticks: { callback: (v) => `${v / 1e6} mi`, font },
          },
        },
      },
    );
    const variable = ui.variable || 'temperature';
    draw('variable-chart', variable === 'temperature' ? 'line' : 'bar', {
      labels: monthShort,
      datasets: [
        {
          label:
            variable === 'temperature'
              ? 'Temperatura °C'
              : variable === 'rainfall'
                ? 'Chuva mm'
                : 'Umidade %',
          data: city[variable],
          borderColor: colors[0],
          backgroundColor:
            variable === 'temperature'
              ? `${colors[0]}33`
              : variable === 'rainfall'
                ? colors[3]
                : colors[1],
          fill: variable === 'temperature',
          tension: 0.3,
          borderRadius: 4,
        },
      ],
    });
    const scores = weightedScores(s);
    draw(
      'season-chart',
      'bar',
      {
        labels: seasons.map((v) => v.name),
        datasets: [
          {
            label: 'Nota editorial ponderada · 1–5',
            data: scores,
            backgroundColor: seasons.map((v) => v.color),
            borderRadius: 5,
          },
        ],
      },
      {
        scales: {
          x: { grid: { display: false }, ticks: { font } },
          y: {
            min: 0,
            max: 5,
            grid: { color: token('--chart-grid') },
            border: { display: false },
            ticks: { stepSize: 1, font },
          },
        },
      },
    );
    const text = document.getElementById('season-score-text');
    if (text)
      text.textContent = s.weights.some(Boolean)
        ? seasons.map((v, i) => `${v.name}: ${scores[i]}`).join(' · ')
        : 'Selecione ao menos um peso acima de zero para calcular.';
  }
  if (route === 'budget') {
    const b = calculateBudget(s.trip, s.budget);
    draw(
      'budget-season-chart',
      'bar',
      {
        labels: seasons.map((v) => v.name),
        datasets: [
          {
            label: 'BRL por pessoa · estimativa salva',
            data: seasons.map((v) =>
              s.seasonQuotes?.[v.id]
                ? calculateBudget(s.seasonQuotes[v.id].trip, s.seasonQuotes[v.id].budget).person
                : null,
            ),
            backgroundColor: seasons.map((v) => v.color),
            borderRadius: 5,
          },
        ],
      },
      {
        scales: {
          x: { grid: { display: false }, ticks: { font } },
          y: {
            beginAtZero: true,
            grid: { color: token('--chart-grid') },
            border: { display: false },
            ticks: { callback: (v) => money(v), font },
          },
        },
      },
    );
    draw(
      'budget-chart',
      'doughnut',
      {
        labels: Object.keys(b.categories),
        datasets: [
          {
            data: Object.values(b.categories),
            backgroundColor: [...palette(), token('--chart-muted'), token('--color-accent-soft')],
            borderWidth: 3,
            borderColor: token('--color-surface'),
          },
        ],
      },
      {
        cutout: '72%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, font, padding: 12 },
          },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.raw)}` } },
        },
      },
    );
  }
}
export function updateBudgetChart(s) {
  const c = instances.get('budget-chart');
  if (c) {
    c.data.datasets[0].data = Object.values(calculateBudget(s.trip, s.budget).categories);
    c.update('none');
  }
}
