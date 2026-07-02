/* ============================================================
   haMMA — utils.js — pure helper functions
   ─────────────────────────────────────────────────────────
   Feature-property access, HTML escaping, URL validation,
   Hawaiian-text search normalization, viewport helpers.
   No app state — everything here is a pure function.
   ============================================================ */

import { MOBILE_MQ } from './config.js';

export const isMobile = () => MOBILE_MQ.matches;

export function getSheetHeight() {
  // Height of the sheet in its default (half) state — for fitBounds padding
  return Math.round(window.innerHeight * 0.5);
}

export function getVal(props, key) {
  const found = Object.keys(props).find((k) => k.toLowerCase() === key.toLowerCase());
  const val   = found ? props[found] : null;
  return val === 'N/A' || val === '' || val === null ? null : val;
}

export function getFeatureName(props) {
  return (getVal(props, 'Full_name') || 'Unknown Area').trim();
}

// Stable feature ID for deduplication
export function featureId(f) {
  return getVal(f.properties, 'OBJECTID') ??
         getVal(f.properties, 'ObjectId') ??
         `${getFeatureName(f.properties)}|${JSON.stringify(f.geometry?.coordinates?.[0]?.[0] || '')}`;
}

export function escapeHtml(v) {
  return String(v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

export function formatDate(dateVal) {
  if (!dateVal || dateVal === 'N/A') return 'N/A';
  const d = new Date(dateVal);
  return Number.isNaN(d.getTime())
    ? escapeHtml(dateVal)
    : `${String(d.getUTCMonth()+1).padStart(2,'0')}/${String(d.getUTCDate()).padStart(2,'0')}/${d.getUTCFullYear()}`;
}

export function getSafeUrl(value) {
  if (!value || value === 'N/A') return null;
  const raw = String(value).trim();
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) return null;
  try {
    const p = new URL(raw);
    return (p.protocol === 'http:' || p.protocol === 'https:') ? p.href : null;
  } catch { return null; }
}

export function normalizeHawaiianText(str) {
  if (!str) return '';
  // Second class deliberately includes the curly quotes ‘ ’ — the data layer
  // and phone keyboards often use them in place of a true ʻokina, so deleting
  // them makes "milolii", "miloli‘i", and "miloliʻi" all match the same areas.
  return String(str).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[ʻʼ‘’'`]/g,'')
    .replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
}

export function getAreaImages(feature) {
  const props    = feature?.properties || {};
  const areaName = getFeatureName(props) || 'Managed area';
  return ['Area_Image_URL_1','Area_Image_URL_2','Area_Image_URL_3']
    .map((k) => getSafeUrl(getVal(props, k)))
    .filter(Boolean)
    .map((url) => ({ url, alt: areaName, caption: '' }));
}
