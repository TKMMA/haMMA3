/* ============================================================
   haMMA — layer-styles.js — polygon highlight styles
   ─────────────────────────────────────────────────────────
   Hover highlight, selection highlight, the yellow flash
   used by the summary legend pills, and the click marker.
   ============================================================ */

import { state, allIslandLayers } from './state.js';
import { getFeatureName } from './utils.js';
import { map } from './map-core.js';

export function getBaseStyle(layer) {
  if (!layer.__baseStyle) {
    layer.__baseStyle = {
      color:       layer.options.color       ?? '#005a87',
      weight:      layer.options.weight      ?? 1.2,
      fillOpacity: layer.options.fillOpacity ?? 0.3,
      opacity:     layer.options.opacity     ?? 1,
    };
  }
  return layer.__baseStyle;
}

export function clearHoverHighlight() {
  if (!state.activeHoverLayer || state.activeHoverLayer === state.activeAccordionLayer) {
    state.activeHoverLayer = null; return;
  }
  state.activeHoverLayer.setStyle(getBaseStyle(state.activeHoverLayer));
  state.activeHoverLayer = null;
}

export function applyHoverHighlight(layer) {
  if (!layer || layer === state.activeAccordionLayer) return;
  if (state.activeHoverLayer && state.activeHoverLayer !== layer) clearHoverHighlight();
  const base = getBaseStyle(layer);
  layer.setStyle({ color: '#ffd60a', weight: Math.max(base.weight + 0.6, 2), opacity: 0.5, fillOpacity: base.fillOpacity });
  state.activeHoverLayer = layer;
}

export function clearAccordionSelectionHighlight() {
  if (!state.activeAccordionLayer || typeof state.activeAccordionLayer.setStyle !== 'function') return;
  state.activeAccordionLayer.setStyle(getBaseStyle(state.activeAccordionLayer));
  state.activeAccordionLayer = null;
}

// Shared flash helper — brief bright yellow → sustained gold highlight
function _applyFlashStyle(layer, base) {
  layer.setStyle({ color: '#ffe066', weight: 5, opacity: 1, fillOpacity: base.fillOpacity });
  setTimeout(() => {
    layer.setStyle({ color: '#ffd60a', weight: Math.max(base.weight + 0.8, 2.2), opacity: 1, fillOpacity: base.fillOpacity });
  }, 1200);
}

export function flashLayerBorder(layer) {
  if (!layer || typeof layer.setStyle !== 'function') return;
  const base = getBaseStyle(layer);
  if (state.activeAccordionLayer && state.activeAccordionLayer !== layer) clearAccordionSelectionHighlight();
  clearHoverHighlight();
  state.activeAccordionLayer = layer;
  _applyFlashStyle(layer, base);
}

export function flashFeatureByName(areaName) {
  let found = false;
  Object.values(allIslandLayers).forEach((group) => {
    if (found) return;
    group.eachLayer((layer) => {
      if (found || getFeatureName(layer.feature.properties) !== areaName) return;
      found = true;
      if (typeof layer.setStyle !== 'function') return;
      const base = getBaseStyle(layer);
      _applyFlashStyle(layer, base);
      setTimeout(() => {
        if (state.activeAccordionLayer !== layer) layer.setStyle(base);
      }, 2400);  // 1200ms flash + 1200ms gold hold
    });
  });
}

export function updateClickMarker(latlng) {
  if (state.activeSelectionMarker) map.removeLayer(state.activeSelectionMarker);
  state.activeSelectionMarker = L.marker(latlng).addTo(map);
}
