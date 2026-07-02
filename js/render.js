/* ============================================================
   haMMA — render.js — HTML builders
   ─────────────────────────────────────────────────────────
   Everything that turns feature data into HTML strings:
   the About/Sources tabs (schema-driven), rules blocks,
   source chips, the combined rules summary, the image
   carousel, and the area cards.

   Every piece of data that goes into HTML is escaped with
   escapeHtml(); every URL passes through getSafeUrl() before
   it reaches an href/src.
   ============================================================ */

import { RULES_CATEGORIES, RULE_STATUS, FIELD_SCHEMA } from './config.js';
import { getVal, getFeatureName, escapeHtml, formatDate, getSafeUrl, getAreaImages } from './utils.js';
import { infoContentEl, UI_SELECTORS } from './dom.js';

// ── Schema field rendering ───────────────────────────────────
function renderSchemaField(entry, props) {
  const value = entry.format === 'join'
    ? (entry.keys || []).map((k) => getVal(props, k)).filter(Boolean)
    : getVal(props, entry.key);
  if (!value) return '';

  // 'link' — standalone full-width button link (DAR page etc.)
  if (entry.format === 'link') {
    const url = getSafeUrl(value);
    return url ? `<a class="reg-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${entry.linkText || escapeHtml(url)}</a>` : '';
  }

  // 'doclink' — citation name + lightweight inline link on same field-block
  if (entry.format === 'doclink') {
    const name = getVal(props, entry.key);
    const url  = getSafeUrl(getVal(props, entry.urlKey));
    if (!name && !url) return '';
    const linkHtml = url
      ? `<a class="doc-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${entry.linkText || escapeHtml(url)}</a>`
      : '';
    return `<div class="field-block">
      <div class="field-block__label">${entry.label}</div>
      <div class="field-block__doc">${name ? escapeHtml(name) : ''}${linkHtml}</div>
    </div>`;
  }

  // 'rules' — rendered via renderRuleLines into a rule-item-list
  if (entry.format === 'rules') {
    const items = renderRuleLines(String(value));
    if (!items) return '';
    return `<div class="field-block">
      <div class="field-block__label">${entry.label}</div>
      <ul class="rule-item-list">${items}</ul>
    </div>`;
  }

  const display =
    entry.format === 'join' ? value.map((v) => escapeHtml(v)).join('<br>')
  : entry.format === 'date' ? formatDate(value)
  :                           escapeHtml(value);

  return `<div class="field-block"><div class="field-block__label">${entry.label}</div><div>${display}</div></div>`;
}

function renderTab(tabKey, props) {
  return (FIELD_SCHEMA[tabKey] || [])
    .map((entry) => renderSchemaField(entry, props)).join('');
}

// ── Rules rendering ──────────────────────────────────────────
// Render rule text lines into <li> elements. Three levels:
//   '- text'    → top-level bullet (disc)
//   '  - text'  → indented sub-bullet (secondary color, indented)
//   'text'      → prose qualifier (italic, no bullet — e.g. "All fishing gear except:")
function renderRuleLines(text) {
  return text.trim().split('\n').filter(Boolean).map((line) => {
    const isIndented = /^\s+[-•]\s/.test(line);
    const isBullet   = /^[-•]\s/.test(line);
    const clean      = line.replace(/^\s*[-•]\s*/, '').trim();
    if (!clean) return '';
    if (isIndented)
      return `<li class="rule-item rule-item--sub">${escapeHtml(clean)}</li>`;
    if (isBullet)
      return `<li class="rule-item">${escapeHtml(clean)}</li>`;
    return `<li class="rule-item rule-item--prose">${escapeHtml(clean)}</li>`;
  }).join('');
}

function renderRuleStatusBlock(statusKey, text) {
  if (!text?.trim()) return '';
  const status = RULE_STATUS[statusKey];
  if (!status) return '';
  const items = renderRuleLines(text);
  return `<div class="rule-status-block ${status.cls}">
    <div class="rule-status-block__header">${status.label}</div>
    <ul class="rule-item-list">${items}</ul>
  </div>`;
}

function renderRulesCategory(category, props) {
  const html = Object.entries(category.fields)
    .map(([sk, fk]) => renderRuleStatusBlock(sk, getVal(props, fk))).join('');
  return html.trim() ? `<div class="rules-category">
    <div class="rules-category__title">${category.label}</div>${html}</div>` : '';
}

function renderRulesTab(props) {
  const html = RULES_CATEGORIES.map((c) => renderRulesCategory(c, props)).join('');
  return html.trim() ? html : '<p class="rules-empty">No specific rules on record for this area.</p>';
}

// ── Source chips ─────────────────────────────────────────────
function buildSummarySources(features) {
  return features.map((f, i) => ({
    id: i + 1, feature: f,
    name: getFeatureName(f.properties),
    className: `source-chip--${(i % 8) + 1}`,
  }));
}

function renderSourceChip(source) {
  return `<span class="source-chip ${source.className}"
    title="Source ${source.id}: ${escapeHtml(source.name)}"
    aria-label="Source ${source.id}: ${escapeHtml(source.name)}">
    <span class="sr-only">Source </span>${source.id}</span>`;
}

// ── Combined summary ─────────────────────────────────────────
function _normaliseNote(t) { return t.replace(/\s+/g,' ').trim().toLowerCase(); }

function buildCombinedRulesSummary(features) {
  const sources = buildSummarySources(features);
  const categories = RULES_CATEGORIES.map((category) => {
    const statusMap = {};
    Object.keys(category.fields).forEach((sk) => { statusMap[sk] = []; });

    sources.forEach((source) => {
      const props = source.feature.properties;
      Object.entries(category.fields).forEach(([sk, fk]) => {
        const val = (getVal(props, fk) || '').trim();
        if (val) statusMap[sk].push({ source, text: val });
      });
    });

    Object.keys(statusMap).forEach((sk) => {
      const entries = statusMap[sk];
      if (entries.length < 2) return;
      const groups = {};
      entries.forEach((e) => {
        const key = _normaliseNote(e.text);
        if (!groups[key]) groups[key] = { text: e.text, sources: [] };
        groups[key].sources.push(e.source);
      });
      statusMap[sk] = Object.values(groups).map(({ text, sources }) =>
        sources.length === 1 ? { source: sources[0], text } : { source: null, sources, text }
      );
    });

    const hasContent = Object.values(statusMap).some((e) => e.length > 0);
    return hasContent ? { category, statusMap } : null;
  }).filter(Boolean);

  return { sources, categories };
}

// UI contract for overlap-summary rendering/interaction:
// - `.info-content` remains the only scroll owner (desktop).
// - Overlap summary card must include:
//     [data-summary-card] wrapper
//     [data-action="toggle-summary"] toggle button
//     [data-summary-body] collapsible content block
// - Delegated click handler toggles only the nearest summary card body.
// Keep these selectors stable when editing markup.

function renderSummaryStatusGroup(statusKey, entries) {
  if (!entries?.length) return '';
  const status = RULE_STATUS[statusKey];
  if (!status) return '';

  const entriesHtml = entries.map(({ source, sources: multi, text }) => {
    const chipHtml = multi
      ? multi.map((s) => renderSourceChip(s)).join('')
      : renderSourceChip(source);

    const items = renderRuleLines(text);

    return `<div class="summary-field-entry"><div class="summary-entry-chips">${chipHtml}</div><ul class="rule-item-list">${items}</ul></div>`;
  }).join('');

  return `<div class="summary-status-group">
    <div class="summary-status-group__header rule-status-label ${status.cls}">${status.label}</div>
    ${entriesHtml}</div>`;
}

function renderSummaryHeader(areaCount) {
  return `<button class="summary-card-toggle" type="button"
            aria-expanded="true" data-action="toggle-summary">
      <span class="summary-card-label">Combined rules for ${areaCount} area${areaCount===1?'':'s'}</span>
      <svg class="btn-icon summary-card-toggle__chevron" viewBox="0 0 256 256" aria-hidden="true">
        <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/>
      </svg>
    </button>`;
}

function renderSummaryLegend(sources) {
  const legendHtml = sources.map((s) => `
    <button class="summary-source-pill" type="button"
      data-flash-area="${escapeHtml(s.name)}"
      title="Tap to highlight ${escapeHtml(s.name)} on the map"
      aria-label="Highlight ${escapeHtml(s.name)} on map">
      ${renderSourceChip(s)}
      <span class="summary-source-pill__name">${escapeHtml(s.name)}</span>
    </button>`).join('');
  return `<div class="summary-source-legend">
        <div class="summary-source-pills">${legendHtml}</div>
        <div class="summary-source-legend__label">Tap an area to highlight it on the map</div>
      </div>`;
}

function renderSummaryRules(categories) {
  if (!categories.length) return '<p class="summary-empty">No rules on record for these areas.</p>';
  return `<div class="summary-field-stack">${categories.map(({ category, statusMap }) => `
        <div class="summary-field-block">
          <div class="summary-section-title">${escapeHtml(category.label)}</div>
          ${Object.entries(statusMap).map(([sk, entries]) => renderSummaryStatusGroup(sk, entries)).join('')}
        </div>`).join('')}
      </div>`;
}

function buildSummaryPanel(features) {
  const summary = buildCombinedRulesSummary(features);
  return `<div class="mmcard mmcard--summary" data-summary-card>
    ${renderSummaryHeader(features.length)}
    <div class="summary-body" data-summary-body>
      ${renderSummaryLegend(summary.sources)}
      ${renderSummaryRules(summary.categories)}
    </div>
  </div>`;
}

export function assertOverlapPaneContract() {
  if (!infoContentEl) return;
  const card = infoContentEl.querySelector('[data-summary-card]');
  if (!card) return;
  const toggle = card.querySelector(UI_SELECTORS.summaryToggle);
  const body = card.querySelector(UI_SELECTORS.summaryBody);
  if (!toggle || !body) {
    console.warn('haMMA UI contract mismatch: overlap summary card is missing required selectors.');
  }
}

// ── Carousel ─────────────────────────────────────────────────
const CHEVRON_LEFT_SVG  = `<svg class="btn-icon" viewBox="0 0 256 256" aria-hidden="true"><path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"/></svg>`;
const CHEVRON_RIGHT_SVG = `<svg class="btn-icon" viewBox="0 0 256 256" aria-hidden="true"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"/></svg>`;

function buildCarousel(images, areaName) {
  if (!images.length) return '';
  const encoded = images.map((img) => encodeURIComponent(JSON.stringify(img))).join('|');
  const multi   = images.length > 1;
  const dots    = multi
    ? `<div class="mmcard__image-dots" aria-hidden="true">
        ${images.map((_, i) => `<span class="mmcard__image-dot${i===0?' is-active':''}"></span>`).join('')}
       </div>` : '';
  const navs = multi
    ? `<button class="mmcard__image-nav mmcard__image-prev" type="button"
         aria-label="Previous image" data-images="${encoded}" data-direction="-1">${CHEVRON_LEFT_SVG}</button>
       <button class="mmcard__image-nav mmcard__image-next" type="button"
         aria-label="Next image" data-images="${encoded}" data-direction="1">${CHEVRON_RIGHT_SVG}</button>` : '';
  return `<div class="mmcard__image-wrap" data-carousel-index="0">
    <img class="mmcard__image" src="${escapeHtml(images[0].url)}" alt="${escapeHtml(images[0].alt||areaName)}" loading="lazy">
    <div class="mmcard__image-fallback" hidden>Image unavailable</div>
    ${navs}${dots}
  </div>`;
}

// ── Area card ────────────────────────────────────────────────
function buildAreaCard(feature, uid) {
  const props  = feature.properties;
  const name   = getFeatureName(props);
  const images = getAreaImages(feature);
  return `<div class="area-section mmcard">
    ${buildCarousel(images, name)}
    <div class="mmcard__body">
      <h3 class="mmcard__title">${escapeHtml(name)}</h3>
      <div class="mmtabs">
        <button type="button" data-tab-target="about-${uid}">About</button>
        <button type="button" data-tab-target="rules-${uid}" class="active">Rules</button>
        <button type="button" data-tab-target="sources-${uid}">Sources</button>
      </div>
      <div id="about-${uid}"   class="tab-pane field-stack" hidden>${renderTab('about',props)}</div>
      <div id="rules-${uid}"   class="tab-pane field-stack">${renderRulesTab(props)}</div>
      <div id="sources-${uid}" class="tab-pane field-stack" hidden>${renderTab('sources',props)}</div>
    </div>
  </div>`;
}

// ── Info pane HTML ────────────────────────────────────────────
export function renderSingleAreaInfoPane(feature, overlapCount) {
  const notice = overlapCount > 0 ? `
    <div class="overlap-notice" role="status">
      <strong>${overlapCount} other managed area${overlapCount===1?'':'s'} overlap${overlapCount===1?'s':''} with this zone.</strong>
      Tap the map to see combined rules at a specific spot.
    </div>` : '';
  return `<div class="mmpopup">
    <div class="mmpopup__scroll">${notice}${buildAreaCard(feature,'area-0')}</div>
  </div>`;
}

export function renderOverlapInfoPane(features) {
  return `<div class="mmpopup">
    <div class="mmpopup__scroll">
      ${buildSummaryPanel(features)}
      <section class="area-specific-section" aria-label="Area-specific rules">
        ${features.map((f,i) => buildAreaCard(f,`area-${i}`)).join('')}
      </section>
    </div>
  </div>`;
}

// ── Tab switching ────────────────────────────────────────────
export function showTab(btn, tabId) {
  const card = btn.closest('.area-section');
  if (!card) return;
  card.querySelectorAll('.tab-pane').forEach((p) => { p.hidden = true; });
  card.querySelectorAll('.mmtabs button').forEach((b) => b.classList.remove('active'));
  const target = card.querySelector(`#${CSS.escape(tabId)}`);
  if (target) target.hidden = false;
  btn.classList.add('active');
}
