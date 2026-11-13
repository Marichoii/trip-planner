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
const colors = ['#b5818b', '#9aa98c', '#c98e70', '#7e9eb7', '#a494bd', '#c2ac65'];
export function disposeCharts() {
  instances.forEach((chart) => chart.destroy());
  instances.clear();
}
function draw(id, type, data, extra = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const dark = document.documentElement.dataset.theme === 'dark';
  const chart = new Chart(el, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 300 },
      color: dark ? '#cfbfb4' : '#786b63',
      plugins: {
        legend: {
          display: type === 'line',
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 6,
            font: { family: 'DM Sans', size: 10 },
            padding: 16,
          },
        },
        tooltip: { backgroundColor: '#493c37', padding: 10 },
      },
      scales:
        type === 'doughnut'
          ? {}
          : {
              x: { grid: { display: false }, ticks: { font: { size: 10 } } },
              y: {
                grid: { color: dark ? '#51443e' : '#eee7de' },
                border: { display: false },
                ticks: { font: { size: 10 } },
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
    draw('temperature-chart', 'line', {
      labels: monthShort,
      datasets: climate.cities.map((c, i) => ({
        label: c.name,
        data: c.temperature,
        borderColor: colors[i],
        backgroundColor: colors[i],
        borderWidth: 2,
        pointRadius: 2,
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
            i === Number(ui.month) ? '#9e6572' : '#a9c4d5',
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
            backgroundColor: '#b5818b',
            borderRadius: 4,
          },
        ],
      },
      {
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { beginAtZero: true, ticks: { callback: (v) => `${v / 1e6} mi`, font: { size: 10 } } },
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
          borderColor: '#b5818b',
          backgroundColor: variable === 'temperature' ? '#ebcbd244' : '#a9b9a7',
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
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { min: 0, max: 5, ticks: { stepSize: 1 } },
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
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { callback: (v) => money(v) } },
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
            backgroundColor: [
              '#b5818b',
              '#a9b9a7',
              '#f0dda7',
              '#a9c4d5',
              '#c98e70',
              '#b8adc5',
              '#d9b5a6',
              '#d4c8b4',
            ],
            borderWidth: 3,
            borderColor: getComputedStyle(document.documentElement)
              .getPropertyValue('--surface')
              .trim(),
          },
        ],
      },
      {
        cutout: '72%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 7, font: { size: 9 }, padding: 12 },
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
