// ── BULK FETCH PROGRESS MODAL ─────────────────────────────────────
// Shows a full-screen progress overlay while fetching publication
// data for all faculty in a list, then triggers a CSV download.

import { DEPT_MAP }        from '../config.js';
import { fetchFacultyBulk } from '../services/bulkFetcher.js';

const FUN_LINES = [
  'Consulting the oracle of academic papers…',
  'Negotiating with OpenAlex on your behalf…',
  'Counting citations like a patient bibliometrician…',
  'Waking up the search indices — they were napping…',
  'Translating faculty names into API queries, one by one…',
  'Cross-referencing with the known academic universe…',
  'The API is also having coffee. Solidarity.',
  'Summoning publication records from the digital ether…',
  'Your patience is greatly appreciated by the server rack.',
  'Fun fact: peer review takes longer than this. Probably.',
  'So many citations. An embarrassment of citations.',
  'OpenAlex indexes 250 million works. We need ~339 authors.',
  'Asking politely — that\'s what the mailto= param is for.',
  'This is faster than reading all the papers. We checked.',
  'The internet is large. Academic papers are many. We persist.',
  'Checking h-indices… they are, in fact, quite h-igh.',
  'Still here. The server is still here. Everyone is fine.',
  'Good things take time. Like peer review. And this.',
  'Science moves slowly. Our API calls, slightly faster.',
  'Fetching. Fetching. More fetching. The circle of research.',
  'Each row in your CSV represents years of hard work. Respect.',
  'Almost certainly not stuck. Probably. Definitely maybe.',
];

let _abortController = null;
let _funInterval     = null;
let _funIdx          = 0;
let _csvCallback     = null;

export function openBulkModal(facultyList, onDone) {
  _csvCallback     = onDone;
  _abortController = new AbortController();

  // Reset UI
  _el('bulkTotal').textContent         = facultyList.length;
  _el('bsFound').textContent           = '0';
  _el('bsCache').textContent           = '0';
  _el('bsNotFound').textContent        = '0';
  _el('bulkProgressFill').style.width  = '0%';
  _el('bulkProgressLabel').textContent = `0 / ${facultyList.length}`;
  _el('bulkCurrentFaculty').textContent = 'Starting…';
  _el('bulkFunLine').textContent       = FUN_LINES[0];
  _el('bulkActionBtn').textContent     = 'Cancel';
  _el('bulkActionBtn').disabled        = false;
  _el('bulkDoneMsg').style.display     = 'none';

  _el('bulkOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Rotate fun messages every 3.5 s
  _funIdx      = 0;
  _funInterval = setInterval(_rotateFun, 3500);

  fetchFacultyBulk(facultyList, _onProgress, _abortController.signal)
    .then(_onComplete)
    .catch(err => {
      if (!_abortController.signal.aborted) console.error('[bulk] unexpected error:', err);
    });
}

export function closeBulkModal(shouldDownload = false) {
  clearInterval(_funInterval);
  _abortController?.abort();
  _el('bulkOverlay').classList.remove('open');
  document.body.style.overflow = '';
  if (shouldDownload && _csvCallback) {
    const cb = _csvCallback;
    _csvCallback = null; // prevent double-fire if called again
    cb();
  } else {
    _csvCallback = null;
  }
}

// ── Private ───────────────────────────────────────────────────────

function _el(id) { return document.getElementById(id); }

function _rotateFun() {
  const el = _el('bulkFunLine');
  el.style.opacity = '0';
  setTimeout(() => {
    _funIdx = (_funIdx + 1) % FUN_LINES.length;
    el.textContent = FUN_LINES[_funIdx];
    el.style.opacity = '1';
  }, 300);
}

function _onProgress({ i, total, faculty, status, counts }) {
  const pct = Math.round((i / total) * 100);
  _el('bulkProgressFill').style.width  = pct + '%';
  _el('bulkProgressLabel').textContent = `${i} / ${total}`;
  _el('bsFound').textContent           = counts.found;
  _el('bsCache').textContent           = counts.fromCache;
  _el('bsNotFound').textContent        = counts.notFound;

  const short = DEPT_MAP[faculty.department]?.short || '';
  const icon  = { cache: '⚡', found: '✓', fetching: '…', 'not-found': '○' }[status] || '·';
  _el('bulkCurrentFaculty').textContent =
    `${icon} ${faculty.name}${short ? '  ·  ' + short : ''}`;
}

function _onComplete(counts) {
  if (_abortController.signal.aborted) return;

  clearInterval(_funInterval);

  _el('bulkFunLine').textContent    = 'All done! Preparing your CSV…';
  _el('bulkFunLine').style.opacity  = '1';
  _el('bulkActionBtn').textContent  = 'Close';
  _el('bulkDoneMsg').style.display  = '';
  _el('bulkDoneMsg').textContent    =
    `${counts.found} fetched · ${counts.fromCache} from cache · ${counts.notFound} not found`;

  setTimeout(() => closeBulkModal(true), 900);
}
