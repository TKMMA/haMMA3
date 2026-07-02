/* ============================================================
   haMMA — map-core.js — map initialisation
   ─────────────────────────────────────────────────────────
   Creates the Leaflet map, zoom control, and basemap tile
   layers. Every module that needs the map imports it here.
   ============================================================ */

import { MOBILE_MQ } from './config.js';

export const map = L.map('map', { zoomControl: false }).setView([20.4, -157.4], 7);

export const zoomControl = L.control
  .zoom({ position: MOBILE_MQ.matches ? 'bottomright' : 'topright' })
  .addTo(map);

L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { attribution: 'Esri' },
).addTo(map);

L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  { attribution: 'Labels', pane: 'shadowPane' },
).addTo(map);
