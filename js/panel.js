/* ============================================================
   haMMA — panel.js — panel state machine + mobile drag
   ─────────────────────────────────────────────────────────
   Two orthogonal pieces of state:
     panelView      — 'list' | 'info'   (which content is shown)
     panelSnap      — 'peek'|'half'|'full'  (mobile position)
     panelCollapsed — bool  (desktop only: sidebar slid off-screen)

   All state lives on the #panel element as data attributes +
   classes. JS reads/writes those; CSS does all visual output.

   Mobile drag is a two-phase gesture on the panel header:
   Phase 1 (passive): watch for clear vertical intent (>8px,
   not horizontal). Phase 2 (active): take control, translateY
   the panel in real time. On release: snap to nearest of
   peek / half / full.

   snapYForState() is the single source of truth for snap
   positions. Values must stay in sync with the CSS snap
   transforms in style.css.
   ============================================================ */

import { INITIAL_CHAIN_BOUNDS, PANEL_MARGIN } from './config.js';
import { panelEl, infoContentEl } from './dom.js';
import { state } from './state.js';
import { isMobile, getSheetHeight } from './utils.js';
import { map, zoomControl } from './map-core.js';
import { getPanelWidth } from './geometry.js';

function setView(view) {
  panelEl.dataset.view = view;
}

export function resetInfoScrollPosition() {
  if (!infoContentEl) return;
  infoContentEl.scrollTop = 0;
  const innerScroll = infoContentEl.querySelector('.mmpopup__scroll');
  if (innerScroll) innerScroll.scrollTop = 0;
}

export function setSnap(snap) {
  if (!isMobile()) return;
  panelEl.dataset.snap = snap;
}

export function openInfoView() {
  setView('info');
  if (isMobile()) setSnap('half');
}

export function closeToPeek() {
  // × button: return to list and minimize panel
  setView('list');
  if (isMobile()) setSnap('peek');
  state.sharePayload = null;
}

export function openListView() {
  // ← back button: return to list, keep current snap height
  setView('list');
  panelEl.classList.remove('is-dragging');
  state.sharePayload = null;
}

export function collapsePanel() {
  panelEl.classList.add('is-collapsed');
  map.invalidateSize({ animate: false });
}

export function expandPanel() {
  panelEl.classList.remove('is-collapsed');
  map.invalidateSize({ animate: false });
}

export function syncPanelToViewport() {
  if (isMobile()) {
    panelEl.classList.remove('is-collapsed');
    if (!panelEl.dataset.snap) panelEl.dataset.snap = 'half';
  } else {
    // Desktop: ensure correct initial snap cleared
    delete panelEl.dataset.snap;
  }
  syncLeafletControlPosition();
  syncMobileBrowserInset();
  map.invalidateSize({ animate: false });
}

export function syncMobileBrowserInset() {
  if (!isMobile()) return;
  const vv = window.visualViewport;
  const inset = vv
    ? Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)))
    : 0;
  panelEl.style.setProperty('--browser-offset', `${inset}px`);
}

function syncLeafletControlPosition() {
  const target = isMobile() ? 'bottomright' : 'topright';
  if (zoomControl.options.position === target) return;
  map.removeControl(zoomControl);
  zoomControl.setPosition(target);
  zoomControl.addTo(map);
}

export function setInitialMapExtent() {
  if (!map) return;
  if (isMobile()) {
    map.fitBounds(INITIAL_CHAIN_BOUNDS, {
      paddingTopLeft:     [12, 30],
      paddingBottomRight: [12, getSheetHeight()],
      maxZoom: 8.3,
    });
    return;
  }
  map.fitBounds(INITIAL_CHAIN_BOUNDS, {
    paddingTopLeft:     [getPanelWidth() + PANEL_MARGIN + 24, 30],
    paddingBottomRight: [24, 30],
    maxZoom: 8.5,
  });
}


// ── Mobile drag ──────────────────────────────────────────────

function snapYForState(snap, view) {
  const H  = window.innerHeight;
  const bh = 72;  // --panel-header-h (52px) + --panel-grip-h (20px) on mobile
  if (snap === 'peek') return H - bh;
  if (snap === 'half') return H * 0.5;
  if (snap === 'full') return view === 'info' ? H * 0.12 : H * 0.08;
  return H * 0.5;
}

const SNAPS = ['peek', 'half', 'full'];
let _drag = null;

function _cleanupDrag() {
  document.removeEventListener('touchmove', _passiveDragWatch, { passive: true });
  document.removeEventListener('touchmove', _activeDragMove);
  document.removeEventListener('touchend',   _dragEnd);
  document.removeEventListener('touchcancel',_dragEnd);
  panelEl.classList.remove('is-dragging');
  _drag = null;
}

function _passiveDragWatch(e) {
  if (!_drag) { _cleanupDrag(); return; }
  const t = (e.touches || [e])[0];
  const dy = Math.abs(t.clientY - _drag.startY);
  const dx = Math.abs(t.clientX - _drag.startX);
  if (dy < 8) return;
  if (dx > dy * 1.2) { _cleanupDrag(); return; }

  // Confirmed vertical — upgrade to active
  document.removeEventListener('touchmove', _passiveDragWatch, { passive: true });
  panelEl.classList.add('is-dragging');
  // Use known snap Y instead of computed style — more reliable at all snap positions
  const currentSnap = panelEl.dataset.snap || 'half';
  const currentView = panelEl.dataset.view  || 'list';
  _drag.baseY = snapYForState(currentSnap, currentView);
  _drag.lastY = _drag.baseY;
  _drag.lastTime = Date.now();
  document.addEventListener('touchmove', _activeDragMove, { passive: false });
}

function _activeDragMove(e) {
  if (!_drag) return;
  e.preventDefault();
  const t      = (e.touches || [e])[0];
  const view   = panelEl.dataset.view || 'list';
  const rawY   = _drag.baseY + (t.clientY - _drag.startY);
  const minY   = snapYForState('full', view);
  const maxY   = snapYForState('peek', view);
  const y      = Math.max(minY, Math.min(maxY, rawY));
  const now    = Date.now();
  const dt     = now - _drag.lastTime || 1;
  _drag.velocity = (y - _drag.lastY) / dt;
  _drag.lastY    = y;
  _drag.lastTime = now;
  panelEl.style.transform = `translateY(${y}px)`;
}

function _dragEnd() {
  if (!_drag) return;
  const wasActive = panelEl.classList.contains('is-dragging');
  const y         = _drag.lastY;
  const vel       = _drag.velocity;
  const view      = panelEl.dataset.view || 'list';
  _cleanupDrag();
  if (!wasActive) return;

  panelEl.style.transform = '';
  const projected = y + vel * 160;  // 160ms momentum projection

  // Snap to nearest
  const nearest = SNAPS
    .map((s) => ({ s, d: Math.abs(projected - snapYForState(s, view)) }))
    .sort((a, b) => a.d - b.d)[0].s;

  setSnap(nearest);
}

export function startDrag(e) {
  if (!isMobile() || _drag) return;
  // Don't intercept taps on buttons or links
  const touch = (e.touches || [e])[0];
  const el    = document.elementFromPoint(touch.clientX, touch.clientY) || touch.target;
  if (el?.closest('button,a')) return;

  _drag = {
    startX:   touch.clientX,
    startY:   touch.clientY,
    baseY:    0, lastY: 0,
    lastTime: Date.now(), velocity: 0,
  };
  document.addEventListener('touchmove', _passiveDragWatch, { passive: true });
  document.addEventListener('touchend',   _dragEnd, { passive: false });
  document.addEventListener('touchcancel',_dragEnd, { passive: false });
}
