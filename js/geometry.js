/* ============================================================
   haMMA — geometry.js — map geometry helpers
   ─────────────────────────────────────────────────────────
   Panel-aware fitBounds, bounds building, point-in-polygon
   testing (ray casting), and overlap counting.
   ============================================================ */

import { PANEL_MARGIN, TRANSITION_MS } from './config.js';
import { panelEl } from './dom.js';
import { state, allIslandLayers } from './state.js';
import { isMobile, getSheetHeight } from './utils.js';
import { map } from './map-core.js';

export function getPanelWidth() {
  // Returns panel's actual rendered width for fitBounds padding
  if (isMobile()) return 0;
  if (panelEl.classList.contains('is-collapsed')) return 0;
  return panelEl.getBoundingClientRect().width + PANEL_MARGIN;
}

export function fitInView(bounds, opts = {}) {
  if (!bounds) return;
  if (isMobile()) {
    if (state.flyTimer) { clearTimeout(state.flyTimer); state.flyTimer = null; }
    const delay = opts.delay ?? TRANSITION_MS;
    state.flyTimer = setTimeout(() => {
      state.flyTimer = null;
      map.fitBounds(bounds, {
        animate: true, duration: 0.8, easeLinearity: 0.2,
        paddingTopLeft:     [16, 16],
        paddingBottomRight: [16, getSheetHeight() + 16],
        maxZoom: 16,
      });
    }, delay);
  } else {
    const lw = getPanelWidth();
    map.flyToBounds(bounds, {
      animate: true, duration: 0.8, easeLinearity: 0.2,
      paddingTopLeft:     [lw + 30, 30],
      paddingBottomRight: [30, 30],
      maxZoom: opts.maxZoom ?? 16,
    });
  }
}

export function getBoundsForFeatures(features) {
  if (!features?.length) return null;
  try {
    const b = L.geoJSON({ type: 'FeatureCollection', features }).getBounds();
    return b?.isValid?.() ? b : null;
  } catch { return null; }
}

// Point-in-polygon — ray casting
function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    const hit = (yi > point[1]) !== (yj > point[1]) &&
                point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}
function pointInPolygonCoords(point, coords) {
  if (!coords?.length) return false;
  if (!pointInRing(point, coords[0])) return false;
  for (let i = 1; i < coords.length; i++) if (pointInRing(point, coords[i])) return false;
  return true;
}
export function pointInFeatureGeometry(latlng, feature) {
  const g = feature?.geometry;
  if (!g) return false;
  const pt = [latlng.lng, latlng.lat];
  if (g.type === 'Polygon')      return pointInPolygonCoords(pt, g.coordinates);
  if (g.type === 'MultiPolygon') return g.coordinates.some((p) => pointInPolygonCoords(pt, p));
  return false;
}

export function countOverlapsForFeature(targetLayer) {
  if (!targetLayer) return 0;
  const tb  = targetLayer.getBounds();
  const tc  = tb.getCenter();
  let count = 0;
  Object.values(allIslandLayers).forEach((group) => {
    group.eachLayer((layer) => {
      if (layer === targetLayer || !layer.getBounds) return;
      const lb = layer.getBounds();
      if (!tb.intersects(lb)) return;
      if (pointInFeatureGeometry(tc, layer.feature) ||
          pointInFeatureGeometry(lb.getCenter(), targetLayer.feature)) count++;
    });
  });
  return count;
}
