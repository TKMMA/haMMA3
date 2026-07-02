/* ============================================================
   haMMA — dom.js — DOM references
   ─────────────────────────────────────────────────────────
   Looked up once at load. If an id changes in index.html it
   must change here too.
   ============================================================ */

export const panelEl        = document.getElementById('panel');
export const islandListEl   = document.getElementById('island-list');
export const infoContentEl  = document.getElementById('info-content');
export const areaSearchEl   = document.getElementById('area-search');
export const searchClearEl  = document.getElementById('search-clear-btn');
export const shareToastEl   = document.getElementById('share-toast');

// Interaction contract: keep delegated selector strings centralized here
// so render + event wiring evolve together safely.
export const UI_SELECTORS = {
  tabTarget: '[data-tab-target]',
  flashArea: '[data-flash-area]',
  summaryToggle: '[data-action="toggle-summary"]',
  summaryCard: '[data-summary-card]',
  summaryBody: '[data-summary-body]',
};
