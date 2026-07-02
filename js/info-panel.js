/* ============================================================
   haMMA — info-panel.js — info panel open / close
   ─────────────────────────────────────────────────────────
   Opening the info panel for a single area, an overlap set,
   or the About page. Decides the panel title, share payload,
   markers, and whether the map flies to the selection.
   ============================================================ */

import { TRANSITION_MS } from './config.js';
import { infoContentEl } from './dom.js';
import { state, allIslandLayers } from './state.js';
import { getFeatureName } from './utils.js';
import { map } from './map-core.js';
import { openInfoView, resetInfoScrollPosition } from './panel.js';
import { getBoundsForFeatures, countOverlapsForFeature, fitInView } from './geometry.js';
import { clearAccordionSelectionHighlight, updateClickMarker } from './layer-styles.js';
import { clearMapSelection } from './selection.js';
import { renderSingleAreaInfoPane, renderOverlapInfoPane, assertOverlapPaneContract } from './render.js';

function setPanelTitle(title) {
  const el = document.getElementById('panel-info-title');
  if (el) el.textContent = title;
}

export function openAboutPane() {
  clearMapSelection();
  setPanelTitle('About');

  // Read content from the <template id="about-content"> in index.html
  const tmpl = document.getElementById('about-content');
  const content = tmpl
    ? tmpl.content.cloneNode(true)
    : null;

  if (content) {
    // Inject app last-updated from version.json (loaded at boot)
    const appSpan = content.querySelector('[data-app-updated]');
    if (appSpan) appSpan.textContent = state.appVersion ?? '—';

    // Inject data last-updated from ArcGIS editingInfo
    const dataSpan = content.querySelector('[data-data-updated]');
    if (dataSpan) dataSpan.textContent = state.dataLastUpdated ?? '—';

    const wrapper = document.createElement('div');
    wrapper.className = 'mmpopup';
    const scroll = document.createElement('div');
    scroll.className = 'mmpopup__scroll';
    scroll.appendChild(content);
    wrapper.appendChild(scroll);
    infoContentEl.innerHTML = '';
    infoContentEl.appendChild(wrapper);
  } else {
    // Fallback if template is missing
    infoContentEl.innerHTML = '<div class="mmpopup"><div class="mmpopup__scroll"><p class="loading-notice">About content unavailable.</p></div></div>';
  }

  openInfoView();
  clearAccordionSelectionHighlight();
  state.sharePayload = null;
}

export function openInfoPanel(latlng, features, options = {}) {
  state.activeLastBounds = options.source === 'menu' ? getBoundsForFeatures(features) : null;

  const isMulti  = features.length > 1;
  const areaName = getFeatureName(features[0].properties) || 'Area Info';
  const count    = features.length;

  let overlapCount = 0;
  if (!isMulti) {
    // Show overlap notice for both list-selection AND map-tap single hits
    let targetLayer = null;
    Object.values(allIslandLayers).some((group) => {
      group.eachLayer((layer) => {
        if (!targetLayer && getFeatureName(layer.feature?.properties) === areaName)
          targetLayer = layer;
      });
      return !!targetLayer;
    });
    if (targetLayer) overlapCount = countOverlapsForFeature(targetLayer);
  }

  infoContentEl.innerHTML = isMulti
    ? renderOverlapInfoPane(features)
    : renderSingleAreaInfoPane(features[0], overlapCount);
  if (isMulti) assertOverlapPaneContract();

  // Scroll to top
  resetInfoScrollPosition();

  // Set header title
  const title = isMulti ? `${count} Area${count===1?'':'s'} Selected` : areaName;
  setPanelTitle(title);

  // Set share payload
  if (isMulti && latlng) {
    state.sharePayload = { type: 'latlng', value: `${latlng.lat.toFixed(5)},${latlng.lng.toFixed(5)}` };
  } else {
    state.sharePayload = { type: 'area', value: encodeURIComponent(areaName) };
  }

  openInfoView();

  // Markers
  if (options.source === 'menu' && state.activeSelectionMarker) {
    map.removeLayer(state.activeSelectionMarker);
    state.activeSelectionMarker = null;
  }
  if (options.source === 'map' && latlng) {
    clearAccordionSelectionHighlight();
    updateClickMarker(latlng);
  }

  // Fly to bounds — only for list selections, never for map clicks
  if (options.source === 'menu' && state.activeLastBounds) {
    fitInView(state.activeLastBounds, { delay: TRANSITION_MS });
  }
}
