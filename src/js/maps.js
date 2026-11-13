import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { filteredDestinations, destinations } from './views.js';
import { esc } from './utils.js';
const maps = [];
export function disposeMaps() {
  maps.splice(0).forEach((m) => m.remove());
}
function map(id, points) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map = L.map(el, {
    scrollWheelZoom: false,
    zoomAnimation: false,
    markerZoomAnimation: false,
    fadeAnimation: !reduced,
    inertia: !reduced,
  }).setView([36.5, 137], 5);
  maps.push(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  }).addTo(map);
  const markers = [];
  points.forEach((d, i) => {
    const marker = L.marker([d.lat, d.lng], {
      keyboard: true,
      title: d.name,
      icon: L.divIcon({
        className: 'map-marker',
        html: String(i + 1),
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
    }).addTo(map);
    marker.bindPopup(
      `<strong>${esc(d.name)}</strong><p style="font-size:12px">${esc(d.attractions)}</p><button class="btn small" data-action="destination-detail" data-id="${esc(d.id)}">Explorar destino</button>`,
    );
    markers.push(marker);
  });
  if (markers.length)
    map.fitBounds(L.featureGroup(markers).getBounds(), {
      padding: [30, 30],
      maxZoom: 9,
      animate: false,
    });
  if (!markers.length) {
    const c = L.control({ position: 'topright' });
    c.onAdd = () => {
      const d = L.DomUtil.create('div');
      d.textContent = 'Nenhum destino filtrado';
      d.style.cssText = 'background:white;padding:10px;font-size:12px';
      return d;
    };
    c.addTo(map);
  }
  setTimeout(() => {
    if (maps.includes(map) && el.isConnected) map.invalidateSize();
  }, 50);
}
export function initMaps(s, ui, route) {
  if (route === 'destinations') map('destination-map', filteredDestinations(s, ui));
  if (route === 'itinerary' && ui.itineraryView === 'map') {
    const points = s.routes[s.selectedRoute].bases
      .map(
        (b) =>
          destinations.find((d) => d.id === b.destinationId) ||
          destinations.find((d) => b.city.toLowerCase().includes(d.name.toLowerCase())),
      )
      .filter(Boolean);
    map('itinerary-map', points);
  }
}
export function resizeMaps() {
  maps.forEach((m) => m.invalidateSize());
}
