/* ============================================================
   haMMA — selection.js — map selection / clear
   ─────────────────────────────────────────────────────────
   Clearing the current selection (marker, highlights, pending
   animations) and marking the active item in the sidebar list.
   ============================================================ */

import { map } from './map-core.js';
import { state } from './state.js';
import { islandListEl } from './dom.js';
import { clearAccordionSelectionHighlight, clearHoverHighlight } from './layer-styles.js';
import { openListView } from './panel.js';

export function clearMapSelection() {
  if (state.flyTimer) { clearTimeout(state.flyTimer); state.flyTimer = null; }
  if (state.pendingMoveendHandler) {
    map.off('moveend', state.pendingMoveendHandler);
    state.pendingMoveendHandler = null;
  }
  map.stop();
  state.activeLastBounds = null;
  state.sharePayload = null;

  if (state.activeSelectionMarker) { map.removeLayer(state.activeSelectionMarker); state.activeSelectionMarker = null; }
  clearAccordionSelectionHighlight();
  clearHoverHighlight();
  setActiveAreaItem(null, null);
  openListView();
}

export function setActiveAreaItem(islandName, areaName) {
  islandListEl.querySelectorAll('.area-item.active-area')
    .forEach((el) => el.classList.remove('active-area'));
  if (!islandName || !areaName) return;
  islandListEl.querySelectorAll('.area-item').forEach((el) => {
    if (el.dataset.island === islandName && el.dataset.area === areaName)
      el.classList.add('active-area');
  });
}
