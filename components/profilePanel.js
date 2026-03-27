// ── FACULTY PROFILE PANEL ─────────────────────────────────────────
// Slide-in side panel that shows a faculty member's profile
// and triggers publication fetching.

import { FACULTY_DATA } from '../data/faculty.js';
import { DEPT_MAP }     from '../config.js';
import { avatarColor, getInitials, escHtml } from '../utils/dom.js';
import { cleanName }    from '../utils/text.js';
import { renderPublications } from './publicationList.js';
import { findAuthor as oaFindAuthor, fetchWorks } from '../services/openAlex.js';
import { findAuthor as ssFindAuthor, fetchPapers } from '../services/semanticScholar.js';
import { state }        from '../state.js';

/** Open the profile panel for the faculty member at FACULTY_DATA[idx]. */
export function openProfile(idx) {
  const f = FACULTY_DATA[idx];
  state.currentFaculty = f;

  const d      = DEPT_MAP[f.department] || { short: '—', cls: 'c-cse', color: '#888' };
  const color  = avatarColor(f.name);

  document.getElementById('profAvatar').style.cssText = `background:${color}18;color:${color}`;
  document.getElementById('profAvatar').textContent    = getInitials(f.name);
  document.getElementById('profName').textContent      = f.name;
  document.getElementById('profDesig').textContent     = f.designation;

  const tag = document.getElementById('profDeptTag');
  tag.className   = `fc-dept-tag ${d.cls}`;
  tag.textContent = `${d.short} — ${f.department.replace('School of ', '')}`;

  // Reset metrics
  ['statPubs', 'statCites', 'statH'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });

  // Reset pub area
  document.getElementById('pubsContainer').innerHTML = `
    <div class="pub-loading">
      <div class="pub-dots">
        <div class="pub-dot"></div><div class="pub-dot"></div><div class="pub-dot"></div>
      </div>
      <div class="pub-status">Click below to fetch publications</div>
    </div>`;
  document.getElementById('trendSection').style.display = 'none';

  const btn = document.getElementById('loadPubsBtn');
  btn.style.display = 'block';
  btn.textContent   = '↓ Load Publications from OpenAlex';
  btn.disabled      = false;

  document.getElementById('profileOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeProfileBtn() {
  document.getElementById('profileOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

export function closeProfile(e) {
  if (e.target === document.getElementById('profileOverlay')) closeProfileBtn();
}

// ── Publication fetching ──────────────────────────────────────────

/** Main entry point — called by the "Load Publications" button. */
export async function loadPublications() {
  if (!state.currentFaculty) return;

  const btn = document.getElementById('loadPubsBtn');
  btn.disabled  = true;
  btn.textContent = 'Fetching…';

  const name     = cleanName(state.currentFaculty.name);
  const variants = _nameVariants(name);

  // ── STEP 1: OpenAlex ──────────────────────────────────────────
  const oaAuthor = await oaFindAuthor(variants, _setStatus);
  if (oaAuthor) {
    document.getElementById('statH').textContent     = oaAuthor.stats.hIndex     ?? '—';
    document.getElementById('statCites').textContent = oaAuthor.stats.citedBy.toLocaleString();
    document.getElementById('statPubs').textContent  = oaAuthor.worksCount;

    _setStatus(`Found: ${oaAuthor.authorName} — fetching works…`);
    try {
      const works = await fetchWorks(oaAuthor.authorId, _setStatus);
      if (works.length > 0) {
        renderPublications(works, 'OpenAlex', oaAuthor.authorName);
        btn.style.display = 'none';
        return;
      }
      _setStatus(`Author found but 0 works returned — trying Semantic Scholar…`);
    } catch (e) {
      console.error('Works fetch error:', e);
      _setStatus('Works fetch failed — trying Semantic Scholar…', e.message);
    }
  }

  // ── STEP 2: Semantic Scholar fallback ─────────────────────────
  const ssAuthor = await ssFindAuthor(variants, _setStatus);
  if (ssAuthor) {
    document.getElementById('statPubs').textContent  = ssAuthor.stats.paperCount;
    document.getElementById('statCites').textContent = ssAuthor.stats.citationCount.toLocaleString();
    document.getElementById('statH').textContent     = ssAuthor.stats.hIndex ?? '—';

    _setStatus(`Found on Semantic Scholar: ${ssAuthor.authorName} — fetching papers…`);
    try {
      const works = await fetchPapers(ssAuthor.authorId);
      if (works.length > 0) {
        renderPublications(works, 'Semantic Scholar', ssAuthor.authorName);
        btn.style.display = 'none';
        return;
      }
    } catch (e) {
      console.warn('Semantic Scholar papers fetch failed:', e.message);
    }
  }

  // ── Not found ─────────────────────────────────────────────────
  document.getElementById('pubsContainer').innerHTML = `
    <div class="pub-empty">
      <div class="pub-empty-icon">○</div>
      <div class="pub-empty-title">Not found in public databases</div>
      <div class="pub-empty-sub">
        Searched as: "${escHtml(name)}"<br>
        This faculty member may not be indexed yet, or publishes under a different name variant.
      </div>
    </div>`;
  btn.disabled    = false;
  btn.textContent = '↺ Try Again';
}

// ── Private helpers ───────────────────────────────────────────────

function _setStatus(msg, detail) {
  document.getElementById('pubsContainer').innerHTML = `
    <div class="pub-loading">
      <div class="pub-dots">
        <div class="pub-dot"></div><div class="pub-dot"></div><div class="pub-dot"></div>
      </div>
      <div class="pub-status">${escHtml(msg)}</div>
      ${detail ? `<div class="pub-status" style="font-size:10px;opacity:.6;margin-top:4px">${escHtml(detail)}</div>` : ''}
    </div>`;
}

function _nameVariants(name) {
  const parts = name.split(' ').filter(p => p.length > 1);
  return [
    name,
    [...parts].reverse().join(' '),
    parts[0],
    parts[parts.length - 1],
  ].filter((v, i, a) => v && a.indexOf(v) === i);
}
