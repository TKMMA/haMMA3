/* ============================================================
   haMMA — state.js — shared mutable state
   ─────────────────────────────────────────────────────────
   All state that more than one module reads or writes lives
   here, on a single `state` object. Modules import { state }
   and read/write state.xxx — that way every module always
   sees the current value.

   allIslandLayers maps island name → Leaflet GeoJSON layer
   group; it is filled in by data.js when the service loads.
   ============================================================ */

export const allIslandLayers = {};

export const state = {
  activeSelectionMarker:  null,   // L.Marker at the last map tap
  activeAccordionLayer:   null,   // layer highlighted from list selection / flash
  activeHoverLayer:       null,   // layer highlighted on hover (desktop)
  activeLastBounds:       null,   // L.LatLngBounds of current selection
  flyTimer:               null,   // pending mobile fitBounds timeout
  pendingMoveendHandler:  null,   // pending one-shot moveend callback
  clickPending:           null,   // accumulates overlapping map click hits via microtask
  sharePayload:           null,   // { type:'area'|'latlng', value:string }
  dataLastUpdated:        null,   // filled in from ArcGIS editingInfo on load
  appVersion:             null,   // filled in from version.json on load
  onLoadAction:           null,   // queued hash-restore action, run after data loads
};
