/* ============================================================
   haMMA — data.js — data loading
   ─────────────────────────────────────────────────────────
   Fetches the ArcGIS feature service (metadata + GeoJSON) and
   version.json, builds the Leaflet layers per island, wires
   polygon hover/click, and populates the sidebar.

   On failure, shows a retry button in the sidebar.
   ============================================================ */

import { SERVICE_LAYER_URL, ISLAND_DISPLAY_ORDER } from './config.js';
import { islandListEl } from './dom.js';
import { state, allIslandLayers } from './state.js';
import { getVal, getFeatureName, featureId, isMobile } from './utils.js';
import { map } from './map-core.js';
import { pointInFeatureGeometry } from './geometry.js';
import { applyHoverHighlight, clearHoverHighlight } from './layer-styles.js';
import { clearMapSelection, setActiveAreaItem } from './selection.js';
import { openInfoPanel, openAboutPane } from './info-panel.js';
import { populateSidebar } from './sidebar.js';

// Abort slow requests after 30s so the retry UI appears instead of
// hanging forever (older browsers without AbortSignal.timeout just skip this).
function fetchTimeout() {
  return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? { signal: AbortSignal.timeout(30000) }
    : {};
}

export async function loadAllFromSingleService() {
  try {
    const [metaResp, dataResp, versionResp] = await Promise.all([
      fetch(`${SERVICE_LAYER_URL}?f=json`, fetchTimeout()),
      fetch(`${SERVICE_LAYER_URL}/query?where=1=1&outFields=*&f=geojson&returnGeometry=true`, fetchTimeout()),
      fetch('version.json').catch(() => null),   // non-fatal if missing
    ]);

    // Read app version date (non-fatal if version.json is absent or malformed)
    if (versionResp?.ok) {
      try {
        const versionData = await versionResp.json();
        if (versionData.appLastUpdated) {
          const d = new Date(versionData.appLastUpdated + 'T00:00:00Z');
          state.appVersion = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
        }
      } catch { /* malformed version.json — silently ignore */ }
    }

    if (!metaResp.ok || !dataResp.ok) {
      throw new Error(`Service responded with HTTP ${!metaResp.ok ? metaResp.status : dataResp.status}`);
    }

    const [metadata, geojson] = await Promise.all([metaResp.json(), dataResp.json()]);

    if (metadata.error) {
      throw new Error(`ArcGIS error ${metadata.error.code}: ${metadata.error.message}`);
    }
    if (!geojson.features) {
      throw new Error('ArcGIS returned no features array — service may be unavailable or schema changed');
    }

    const editDate = metadata?.editingInfo?.dataLastEditDate;
    if (editDate) state.dataLastUpdated = new Date(editDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

    const renderer      = metadata?.drawingInfo?.renderer;
    const globalOpacity = (100 - (metadata?.drawingInfo?.transparency || 0)) / 100;

    // Group features by island in display order
    const grouped = {};
    (geojson.features || []).forEach((f) => {
      const island = getVal(f.properties, 'Island') || 'Unknown';
      if (!grouped[island]) grouped[island] = [];
      grouped[island].push(f);
    });
    const orderedKeys = [
      ...ISLAND_DISPLAY_ORDER.filter((n) => grouped[n]),
      ...Object.keys(grouped).filter((n) => !ISLAND_DISPLAY_ORDER.includes(n)).sort(),
    ];

    orderedKeys.forEach((name) => {
      const features    = grouped[name];
      const sortedNames = features.map((f) => getFeatureName(f.properties))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

      const islandLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
        style: (feature) => {
          const fName = getFeatureName(feature.properties).toLowerCase();
          const match = renderer?.uniqueValueInfos?.find(
            (info) => String(info.value||'').toLowerCase() === fName
          );
          if (match) {
            const c = match.symbol.color;
            return {
              fillColor:   `rgba(${c[0]},${c[1]},${c[2]},${c[3]/255})`,
              fillOpacity: globalOpacity,
              color:       `rgb(${match.symbol.outline.color.slice(0,3).join(',')})`,
              weight:      1.5,
            };
          }
          return { weight: 1.2, fillOpacity: 0.3, color: '#005a87' };
        },

        onEachFeature: (feature, layer) => {
          layer.on('mouseover', () => { if (!isMobile()) applyHoverHighlight(layer); });
          layer.on('mouseout',  () => { if (!isMobile()) clearHoverHighlight(); });

          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            map.stop();
            if (state.pendingMoveendHandler) { map.off('moveend', state.pendingMoveendHandler); state.pendingMoveendHandler = null; }

            // Accumulate all overlapping hits, then open once via microtask
            if (!state.clickPending) {
              state.clickPending = { latlng: e.latlng, hits: [] };
              Promise.resolve().then(() => {
                const { latlng, hits } = state.clickPending;
                state.clickPending = null;
                if (!hits.length) { clearMapSelection(); return; }

                if (hits.length === 1) {
                  setActiveAreaItem(getVal(hits[0].properties,'Island'), getFeatureName(hits[0].properties));
                } else {
                  setActiveAreaItem(null, null);
                }
                openInfoPanel(latlng, hits, { source: 'map' });
              });
            }

            // Add this feature if not already in hits
            if (!state.clickPending.hits.some((f) => featureId(f) === featureId(feature))) {
              state.clickPending.hits.push(feature);
            }
            // Scan all layers for other hits at this point
            Object.values(allIslandLayers).forEach((grp) => {
              if (!map.hasLayer(grp)) return;
              grp.eachLayer((l) => {
                if (pointInFeatureGeometry(e.latlng, l.feature) &&
                    !state.clickPending.hits.some((f) => featureId(f) === featureId(l.feature))) {
                  state.clickPending.hits.push(l.feature);
                }
              });
            });
          });
        },
      }).addTo(map);

      allIslandLayers[name] = islandLayer;
      populateSidebar(name, sortedNames);
    });

    islandListEl?.removeAttribute('aria-busy');

    // About button
    const aboutBtn = document.createElement('button');
    aboutBtn.type = 'button';
    aboutBtn.className = 'about-map-btn';
    aboutBtn.innerHTML = '<span class="about-map-btn__icon">ℹ</span><span class="about-map-btn__label">About this map</span>';
    aboutBtn.addEventListener('click', openAboutPane);
    islandListEl?.appendChild(aboutBtn);

    // Run hash restore if one was queued
    state.onLoadAction?.();
    state.onLoadAction = null;

  } catch (err) {
    console.error('[haMMA] Load failed:', err);
    islandListEl?.removeAttribute('aria-busy');
    if (islandListEl) {
      islandListEl.innerHTML = `<div class="error-notice">
        <p>Unable to load marine areas. Please check your connection.</p>
        <button class="retry-btn" id="retry-btn" type="button">Try again</button>
      </div>`;
      document.getElementById('retry-btn')?.addEventListener('click', () => {
        islandListEl.innerHTML = '<div class="loading-notice" role="status">Loading marine areas…</div>';
        islandListEl.setAttribute('aria-busy','true');
        loadAllFromSingleService();
      });
    }
  }
}
