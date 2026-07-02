/* ============================================================
   haMMA — main.js — event wiring & boot
   ─────────────────────────────────────────────────────────
   The entry point. Wires all top-level event listeners
   (search, panel buttons, drag, delegated info-panel clicks,
   resize) and then boots the app.

   Load order: index.html loads Leaflet first, then this file
   as an ES module — all other modules are pulled in from here
   through the import chain.
   ============================================================ */

import { REDUCED_MOTION_MQ, MOBILE_MQ } from './config.js';
import { panelEl, areaSearchEl, searchClearEl, infoContentEl, UI_SELECTORS } from './dom.js';
import { isMobile } from './utils.js';
import { map } from './map-core.js';
import {
  openListView, closeToPeek, collapsePanel, expandPanel, setSnap,
  startDrag, syncPanelToViewport, syncMobileBrowserInset, setInitialMapExtent,
} from './panel.js';
import { clearMapSelection } from './selection.js';
import { showTab } from './render.js';
import { flashFeatureByName } from './layer-styles.js';
import { shareCurrentSelection, readHashOnBoot } from './share.js';
import { clearSidebarSearch, syncSearchClear, filterSidebar } from './sidebar.js';
import { loadAllFromSingleService } from './data.js';

// ── Event wiring ─────────────────────────────────────────────

// Search
areaSearchEl?.addEventListener('input',  () => { syncSearchClear(); filterSidebar(); });
searchClearEl?.addEventListener('click', clearSidebarSearch);

// Panel header buttons
document.getElementById('panel-back-btn')?.addEventListener('click', openListView);
document.getElementById('panel-close-btn')?.addEventListener('click', closeToPeek);
document.getElementById('panel-share-btn')?.addEventListener('click', shareCurrentSelection);
document.getElementById('panel-collapse-btn')?.addEventListener('click', collapsePanel);
document.getElementById('panel-reveal-btn')?.addEventListener('click', expandPanel);

// Mobile grip drag — wire to ENTIRE panel header for large drag surface
// The grip visual is just decorative; the whole header is the drag target.
// Buttons inside the header are excluded by the button/a check in startDrag.
document.getElementById('panel-header')?.addEventListener('touchstart', startDrag, { passive: true });

// Tap header when peeked → restore to half (for users who tap rather than drag)
document.getElementById('panel-header')?.addEventListener('click', (e) => {
  if (isMobile() && panelEl.dataset.snap === 'peek' && !e.target.closest('button,a')) {
    setSnap('half');
  }
});

function setSummaryBodyCollapsed(body, shouldCollapse) {
  if (!body) return;
  if (REDUCED_MOTION_MQ.matches) {
    body.classList.toggle('is-closed', shouldCollapse);
    body.style.maxHeight = shouldCollapse ? '0px' : '';
    return;
  }

  const currentHeight = `${body.scrollHeight}px`;
  body.style.maxHeight = currentHeight;

  if (shouldCollapse) {
    requestAnimationFrame(() => {
      body.classList.add('is-closed');
      body.style.maxHeight = '0px';
    });
    return;
  }

  body.classList.remove('is-closed');
  requestAnimationFrame(() => {
    body.style.maxHeight = `${body.scrollHeight}px`;
  });
  const clear = () => {
    if (!body.classList.contains('is-closed')) body.style.maxHeight = '';
    body.removeEventListener('transitionend', clear);
  };
  body.addEventListener('transitionend', clear);
}

function handleSummaryToggleClick(toggleBtn) {
  const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
  toggleBtn.setAttribute('aria-expanded', String(!isExpanded));
  const body = toggleBtn.closest(UI_SELECTORS.summaryCard)?.querySelector(UI_SELECTORS.summaryBody);
  if (body?.classList.contains('summary-body')) {
    setSummaryBodyCollapsed(body, isExpanded);
  }
  return true;
}

function handleSummaryFlashClick(flashPill) {
  flashFeatureByName(flashPill.dataset.flashArea);
  return true;
}

function handleCardTabClick(tabBtn) {
  showTab(tabBtn, tabBtn.dataset.tabTarget);
  return true;
}

// Info content — delegated for tabs, flash pills, notices, carousel, summary
infoContentEl?.addEventListener('click', (e) => {
  const tabBtn = e.target.closest(UI_SELECTORS.tabTarget);
  if (tabBtn && handleCardTabClick(tabBtn)) return;

  const flashPill = e.target.closest(UI_SELECTORS.flashArea);
  if (flashPill && handleSummaryFlashClick(flashPill)) return;

  const toggleBtn = e.target.closest(UI_SELECTORS.summaryToggle);
  if (toggleBtn && handleSummaryToggleClick(toggleBtn)) return;

  const navBtn = e.target.closest('.mmcard__image-nav');
  if (navBtn) {
    const wrap = navBtn.closest('.mmcard__image-wrap');
    const img  = wrap?.querySelector('.mmcard__image');
    if (!wrap || !img) return;
    const images = (navBtn.dataset.images||'').split('|').filter(Boolean)
      .map((enc) => { try { return JSON.parse(decodeURIComponent(enc)); } catch { return null; } })
      .filter((i) => i?.url);
    if (images.length < 2) return;
    const dir  = Number(navBtn.dataset.direction || 1);
    const cur  = Number(wrap.dataset.carouselIndex || 0);
    const next = (cur + dir + images.length) % images.length;
    wrap.dataset.carouselIndex = String(next);
    img.src = images[next].url; img.alt = images[next].alt || 'Area image';
    wrap.classList.remove('is-image-failed');
    const fb = wrap.querySelector('.mmcard__image-fallback');
    if (fb) fb.hidden = true;
    wrap.querySelectorAll('.mmcard__image-dot').forEach((d, i) => d.classList.toggle('is-active', i===next));
    return;
  }
});

infoContentEl?.addEventListener('error', (e) => {
  const img  = e.target.closest('.mmcard__image');
  const wrap = img?.closest('.mmcard__image-wrap');
  if (!wrap) return;
  img.style.display = 'none';
  wrap.classList.add('is-image-failed');
  const fb = wrap.querySelector('.mmcard__image-fallback');
  if (fb) fb.hidden = false;
}, true);

// Desktop map click — clear selection if click on empty map
map.on('click', () => { if (!isMobile()) clearMapSelection(); });

// Resize / orientation
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { syncPanelToViewport(); }, 100);
});
MOBILE_MQ.addEventListener('change', syncPanelToViewport);

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncMobileBrowserInset, { passive: true });
  window.visualViewport.addEventListener('scroll', syncMobileBrowserInset, { passive: true });
}


// ── Boot ─────────────────────────────────────────────────────
readHashOnBoot();
syncPanelToViewport();
setInitialMapExtent();
loadAllFromSingleService();
