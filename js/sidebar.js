/* ============================================================
   haMMA — sidebar.js — areas list population & interactions
   ─────────────────────────────────────────────────────────
   Building the island-grouped areas list, expand/collapse,
   zoom-to-area on tap, hover highlight, and search filtering
   (Hawaiian-diacritic-insensitive).
   ============================================================ */

import { islandListEl, areaSearchEl } from './dom.js';
import { state, allIslandLayers } from './state.js';
import { isMobile, getFeatureName, normalizeHawaiianText } from './utils.js';
import { map } from './map-core.js';
import { getPanelWidth } from './geometry.js';
import { flashLayerBorder, applyHoverHighlight, clearHoverHighlight } from './layer-styles.js';
import { setActiveAreaItem } from './selection.js';
import { openInfoPanel } from './info-panel.js';

export function populateSidebar(islandName, sortedNames) {
  if (!islandListEl) return;
  islandListEl.querySelector('.loading-notice')?.remove();

  const id   = islandName.replace(/[^a-zA-Z0-9]/g, '');
  const frag = document.createDocumentFragment();

  const group = document.createElement('div');
  group.className = 'island-group';

  const header = document.createElement('button');
  header.className = 'island-header';
  header.id        = `header-${id}`;
  header.setAttribute('aria-expanded', 'false');
  header.setAttribute('aria-controls',  `list-${id}`);
  header.addEventListener('click', () => toggleIsland(id));

  const left = document.createElement('div');
  left.className = 'header-left';

  const labelEl = document.createElement('span');
  labelEl.textContent = islandName;

  // Area count badge
  const countEl = document.createElement('span');
  countEl.className   = 'island-count';
  countEl.textContent = String(sortedNames.length);
  countEl.setAttribute('aria-hidden', 'true');

  left.append(labelEl, countEl);

  // SVG chevron — Phosphor caret-down
  const chevronNS = 'http://www.w3.org/2000/svg';
  const chevronSvg = document.createElementNS(chevronNS, 'svg');
  chevronSvg.setAttribute('viewBox', '0 0 256 256');
  chevronSvg.setAttribute('aria-hidden', 'true');
  chevronSvg.classList.add('chevron');
  const chevronPath = document.createElementNS(chevronNS, 'path');
  chevronPath.setAttribute('d', 'M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z');
  chevronSvg.appendChild(chevronPath);

  header.append(left, chevronSvg);

  const list = document.createElement('div');
  list.id = `list-${id}`;
  list.className = 'area-list';
  list.setAttribute('role', 'list');

  sortedNames.forEach((areaName) => {
    const item = document.createElement('div');
    item.className = 'area-item';
    item.textContent = areaName;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `View details for ${areaName}`);
    item.dataset.island = islandName;
    item.dataset.area   = areaName;
    item.addEventListener('click',      () => zoomToArea(islandName, areaName));
    item.addEventListener('keydown',    (e) => { if (e.key==='Enter'||e.key===' '){e.preventDefault();zoomToArea(islandName,areaName);} });
    item.addEventListener('mouseenter', () => hoverArea(islandName, areaName));
    item.addEventListener('mouseleave', clearHoverHighlight);
    list.appendChild(item);
  });

  group.append(header, list);
  frag.appendChild(group);
  islandListEl.appendChild(frag);
}

function toggleIsland(id) {
  const list   = document.getElementById(`list-${id}`);
  const header = document.getElementById(`header-${id}`);
  if (!list || !header) return;
  const open = !list.classList.contains('active');
  // Mobile: single-expand
  if (isMobile()) {
    islandListEl.querySelectorAll('.area-list.active').forEach((el) => { if (el !== list) el.classList.remove('active'); });
    islandListEl.querySelectorAll('.island-header.expanded').forEach((el) => { if (el !== header) el.classList.remove('expanded'); });
  }
  list.classList.toggle('active', open);
  header.classList.toggle('expanded', open);
  header.setAttribute('aria-expanded', String(open));
  if (isMobile() && open) islandListEl.scrollTo({ top: header.offsetTop - 2, behavior: 'smooth' });
}

function zoomToArea(islandName, areaName) {
  setActiveAreaItem(islandName, areaName);
  const group = allIslandLayers[islandName];
  if (!group) return;

  group.eachLayer((layer) => {
    if (getFeatureName(layer.feature.properties) !== areaName) return;
    const bounds = layer.getBounds();
    const center = bounds.getCenter();
    map.stop();
    if (state.pendingMoveendHandler) { map.off('moveend', state.pendingMoveendHandler); state.pendingMoveendHandler = null; }

    state.activeLastBounds = bounds;
    openInfoPanel(center, [layer.feature], { source: 'menu' });
    flashLayerBorder(layer);

    if (!isMobile()) {
      // Desktop: fly with panel padding, then flash
      const lw = getPanelWidth();
      const queueMoveend = (fn) => {
        state.pendingMoveendHandler = () => { state.pendingMoveendHandler = null; fn(); };
        map.once('moveend', state.pendingMoveendHandler);
      };
      queueMoveend(() => flashLayerBorder(layer));
      map.flyToBounds(bounds, {
        animate: true, duration: 0.8, easeLinearity: 0.2,
        paddingTopLeft:     [lw + 30, 30],
        paddingBottomRight: [30, 30],
        maxZoom: 16,
      });
    }
  });
}

function hoverArea(islandName, areaName) {
  const group = allIslandLayers[islandName];
  if (!group) return;
  let matched = null;
  group.eachLayer((l) => { if (!matched && getFeatureName(l.feature.properties) === areaName) matched = l; });
  if (!matched || !map.getBounds().intersects(matched.getBounds())) return;
  applyHoverHighlight(matched);
}

export function clearSidebarSearch() {
  if (!areaSearchEl) return;
  areaSearchEl.value = '';
  syncSearchClear();
  filterSidebar();
  areaSearchEl.focus();
}

export function syncSearchClear() {
  areaSearchEl?.closest('.search-input-wrapper')
    ?.classList.toggle('has-value', Boolean(areaSearchEl?.value));
}

export function filterSidebar() {
  const term = normalizeHawaiianText(areaSearchEl?.value || '');
  let total  = 0;
  islandListEl.querySelectorAll('.island-group').forEach((group) => {
    const islandLabel = group.querySelector('.header-left span')?.textContent || '';
    const islandMatch = term && normalizeHawaiianText(islandLabel).includes(term);
    let hasMatch = false;
    group.querySelectorAll('.area-item').forEach((item) => {
      const matches = !term || islandMatch || normalizeHawaiianText(item.textContent).includes(term);
      item.style.display = matches ? '' : 'none';
      if (matches) { hasMatch = true; total++; }
    });
    const areaList = group.querySelector('.area-list');
    const hdr      = group.querySelector('.island-header');
    if (term && hasMatch) {
      group.style.display = '';
      areaList?.classList.add('active'); hdr?.classList.add('expanded');
      hdr?.setAttribute('aria-expanded','true');
    } else if (term && !hasMatch) {
      group.style.display = 'none';
    } else {
      group.style.display = '';
      areaList?.classList.remove('active'); hdr?.classList.remove('expanded');
      hdr?.setAttribute('aria-expanded','false');
    }
  });
  let notice = islandListEl.querySelector('#search-no-results');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'search-no-results'; notice.className = 'loading-notice';
    notice.textContent = 'No matching areas found'; notice.hidden = true;
    islandListEl.appendChild(notice);
  }
  notice.hidden = !(term && total === 0);
}
