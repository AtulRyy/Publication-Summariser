// ── PUBLICATION LIST ──────────────────────────────────────────────
// Renders the filtered/sorted list of publications inside the profile panel.

import { escHtml }        from '../utils/dom.js';
import { renderTrendChart } from './trendChart.js';
import { state }          from '../state.js';

/**
 * Store all loaded works and trigger first render.
 * Called after a successful API fetch.
 */
export function renderPublications(works, source, matchedName) {
  state.allLoadedWorks = works;
  state.pubSortBy      = 'year-desc';
  state.pubFilterType  = 'all';
  applyPubFilters(source, matchedName);
  renderTrendChart(works);
}

/** Re-apply current sort + filter to allLoadedWorks and re-render the list. */
export function applyPubFilters(source, matchedName) {
  // Persist source/matchedName in DOM so filter controls can call us without args
  if (source)      _setLabel('source',  source);
  if (matchedName) _setLabel('matched', matchedName);
  source      = source      || _getLabel('source');
  matchedName = matchedName || _getLabel('matched');

  let works = state.allLoadedWorks;
  if (!works.length) return;

  // ── Filter ──────────────────────────────────────────────────────
  if (state.pubFilterType !== 'all') {
    works = works.filter(w => _matchesType(w.type, state.pubFilterType));
  }

  // ── Sort ────────────────────────────────────────────────────────
  const sortMap = {
    'year-desc': (a, b) => (b.publication_year || 0) - (a.publication_year || 0),
    'year-asc':  (a, b) => (a.publication_year || 0) - (b.publication_year || 0),
    'citations': (a, b) => (b.cited_by_count   || 0) - (a.cited_by_count   || 0),
    'title':     (a, b) => (a.title || '').localeCompare(b.title || ''),
  };
  const sorter = sortMap[state.pubSortBy] || sortMap['year-desc'];
  works = [...works].sort(sorter);

  // Expose current slice for modal index lookups
  state.currentPubItems = works;

  document.getElementById('pubsContainer').innerHTML = _buildHTML(works, source, matchedName);
}

// ── Private helpers ───────────────────────────────────────────────

function _matchesType(type, filter) {
  const t = (type || '').toLowerCase();
  if (filter === 'journal')    return t.includes('journal');
  if (filter === 'conference') return t.includes('proceedings') || t.includes('conference');
  if (filter === 'preprint')   return t.includes('preprint')    || t.includes('repository');
  return true;
}

function _typeTag(type) {
  if (!type) return '<span class="pub-type-tag pub-type-other">other</span>';
  const t = type.toLowerCase();
  if (t.includes('journal'))                         return '<span class="pub-type-tag pub-type-journal">journal</span>';
  if (t.includes('proceedings')||t.includes('conference')) return '<span class="pub-type-tag pub-type-conference">conf</span>';
  if (t.includes('preprint')   ||t.includes('repository')) return '<span class="pub-type-tag pub-type-preprint">preprint</span>';
  return '<span class="pub-type-tag pub-type-other">other</span>';
}

function _typeCount(filter) {
  return state.allLoadedWorks.filter(w => _matchesType(w.type, filter)).length;
}

function _setLabel(key, val) {
  const el = document.getElementById('pubSourceLabel');
  if (el) el.dataset[key] = val;
}
function _getLabel(key) {
  return document.getElementById('pubSourceLabel')?.dataset[key] || '';
}

function _buildHTML(works, source, matchedName) {
  const all  = state.allLoadedWorks.length;
  const sf   = state.pubFilterType;
  const ss   = state.pubSortBy;

  const controls = `
    <div class="pub-controls">
      <span class="pub-controls-label">Sort:</span>
      <select onchange="window.__app.setSortBy(this.value)">
        <option value="year-desc" ${ss==='year-desc'?'selected':''}>Newest first</option>
        <option value="year-asc"  ${ss==='year-asc' ?'selected':''}>Oldest first</option>
        <option value="citations" ${ss==='citations'?'selected':''}>Most cited</option>
        <option value="title"     ${ss==='title'    ?'selected':''}>Title A–Z</option>
      </select>
      <span class="pub-controls-label" style="margin-left:8px">Type:</span>
      <select onchange="window.__app.setFilterType(this.value)">
        <option value="all"        ${sf==='all'       ?'selected':''}>All (${all})</option>
        <option value="journal"    ${sf==='journal'   ?'selected':''}>Journals (${_typeCount('journal')})</option>
        <option value="conference" ${sf==='conference'?'selected':''}>Conferences (${_typeCount('conference')})</option>
        <option value="preprint"   ${sf==='preprint'  ?'selected':''}>Preprints (${_typeCount('preprint')})</option>
      </select>
      <span class="pub-controls-shown">${works.length} shown</span>
    </div>`;

  const items = works.map((w, idx) => {
    const venue = w.primary_location?.source?.display_name || w.venue || '';
    const title = escHtml(w.title || 'Untitled');
    return `
      <div class="pub-item" onclick="window.__app.openPubModal(${idx})" title="Click for AI summary">
        <div class="pub-title">${title}</div>
        ${venue ? `<div class="pub-venue">${escHtml(venue)}</div>` : ''}
        <div class="pub-meta-row">
          ${w.publication_year ? `<span class="pub-year">${w.publication_year}</span>` : ''}
          ${_typeTag(w.type)}
          ${w.cited_by_count ? `<span class="pub-cites">cited ${w.cited_by_count}&times;</span>` : ''}
          <span class="pub-ai-hint">✦ AI summary</span>
        </div>
      </div>`;
  }).join('');

  const sourceNote = `
    <div class="pub-source-note" id="pubSourceLabel"
         data-source="${escHtml(source)}" data-matched="${escHtml(matchedName)}">
      Matched as: ${escHtml(matchedName || '—')} · Source: ${escHtml(source)} · Indicative, not Scopus-official
    </div>`;

  return controls + items + sourceNote;
}
