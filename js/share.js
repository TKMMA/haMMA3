/* ============================================================
   haMMA — share.js — share links & hash restore
   ─────────────────────────────────────────────────────────
   Building/copying share URLs (#AreaName or #lat,lng) and
   restoring a shared selection from the URL hash on boot.
   ============================================================ */

import { state, allIslandLayers } from './state.js';
import { shareToastEl } from './dom.js';
import { isMobile, getFeatureName, featureId } from './utils.js';
import { pointInFeatureGeometry } from './geometry.js';
import { updateClickMarker, flashLayerBorder } from './layer-styles.js';
import { setActiveAreaItem } from './selection.js';
import { openInfoPanel } from './info-panel.js';

function buildShareUrl() {
  if (!state.sharePayload) return window.location.href.split('#')[0];
  return `${window.location.href.split('#')[0]}#${state.sharePayload.value}`;
}

function showToast(msg = 'Link copied!') {
  if (!shareToastEl) return;
  shareToastEl.textContent = msg;
  shareToastEl.removeAttribute('hidden');
  shareToastEl.classList.add('is-visible');
  setTimeout(() => {
    shareToastEl.classList.remove('is-visible');
    setTimeout(() => shareToastEl.setAttribute('hidden', ''), 300);
  }, 2200);
}

export async function shareCurrentSelection() {
  const url = buildShareUrl();
  if (navigator.share && isMobile()) {
    try {
      await navigator.share({ title: document.title, url });
      return;
    } catch { /* user cancelled — fall through */ }
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied!');
  } catch {
    // Clipboard unavailable — show the URL
    showToast('Copy: ' + url);
  }
}

// Read URL hash on boot and restore selection.
// Wrapped in try/catch: a mangled share link (bad percent-encoding)
// must never be able to break app startup.
export function readHashOnBoot() {
  try {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;

    // Coordinates: lat,lng
    const coordMatch = hash.match(/^(-?\d+\.\d+),(-?\d+\.\d+)$/);
    if (coordMatch) {
      const latlng = L.latLng(parseFloat(coordMatch[1]), parseFloat(coordMatch[2]));
      // Wait for layers to load, then simulate map tap
      const tryClick = () => {
        const hits = [];
        Object.values(allIslandLayers).forEach((group) => {
          group.eachLayer((l) => {
            if (pointInFeatureGeometry(latlng, l.feature) &&
                !hits.some((f) => featureId(f) === featureId(l.feature)))
              hits.push(l.feature);
          });
        });
        if (hits.length) {
          openInfoPanel(latlng, hits, { source: 'map' });
          updateClickMarker(latlng);
        }
      };
      state.onLoadAction = tryClick;
      return;
    }

    // Area name
    const name = decodeURIComponent(hash);
    state.onLoadAction = () => {
      let found = null;
      Object.entries(allIslandLayers).some(([island, group]) => {
        group.eachLayer((layer) => {
          if (!found && getFeatureName(layer.feature.properties) === name) {
            found = { island, layer };
          }
        });
        return !!found;
      });
      if (!found) return;
      const { island, layer } = found;
      const areaName = getFeatureName(layer.feature.properties);
      setActiveAreaItem(island, areaName);
      state.activeLastBounds = layer.getBounds();
      openInfoPanel(layer.getBounds().getCenter(), [layer.feature], { source: 'menu' });
      flashLayerBorder(layer);
    };
  } catch (err) {
    console.warn('[haMMA] Ignoring unreadable share link hash:', err);
  }
}
