// ── PUBLICATION SUMMARY MODAL ─────────────────────────────────────
// Opens when a publication item is clicked.
// Displays metadata + AI-generated summary via Groq.

import { escHtml, typewriterEffect } from '../utils/dom.js';
import { reconstructAbstract }       from '../utils/text.js';
import { getSummary }                from '../services/groq.js';
import { state }                     from '../state.js';

/** Open the modal for the publication at index `idx` in the current list. */
export function openPubModalByIdx(idx) {
  const w = state.currentPubItems[idx];
  if (!w) return;

  const doi   = w.doi || w.externalIds?.DOI || null;
  const url   = doi ? `https://doi.org/${doi}` : null;
  const venue = w.primary_location?.source?.display_name || w.venue || '';

  openPubModal({
    title:          w.title || 'Untitled',
    doi,
    url,
    venue,
    year:           w.publication_year || null,
    cited_by_count: w.cited_by_count   || 0,
    type:           w.type             || '',
    abstract:       w.abstract || reconstructAbstract(w.abstract_inverted_index) || null,
  });
}

/** Populate and open the modal with the given publication data. */
export function openPubModal(pub) {
  _populateTitle(pub);
  _populateMeta(pub);
  _populateCta(pub);

  const copyBtn = document.getElementById('aiCopyBtn');
  copyBtn.textContent = 'Copy';
  copyBtn.classList.remove('copied', 'visible');

  document.getElementById('pubModalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  _loadSummary(pub, document.getElementById('pmSummary'), copyBtn);
}

export function closePubModalBtn() {
  document.getElementById('pubModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

export function closePubModal(e) {
  if (e.target === document.getElementById('pubModalOverlay')) closePubModalBtn();
}

export function copySummary() {
  const text = document.getElementById('pmSummary').textContent.trim();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('aiCopyBtn');
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  });
}

// ── Private helpers ───────────────────────────────────────────────

function _populateTitle(pub) {
  document.getElementById('pmTitle').textContent = pub.title;
}

function _populateMeta(pub) {
  const parts = [];
  if (pub.year) parts.push(`<span class="pub-year">${pub.year}</span>`);
  if (pub.type) parts.push(_typeTag(pub.type));
  if (pub.cited_by_count) parts.push(`<span class="pub-cites">cited ${pub.cited_by_count}&times;</span>`);
  if (pub.venue) parts.push(`<span class="pub-modal-venue">${escHtml(pub.venue)}</span>`);
  document.getElementById('pmMeta').innerHTML = parts.join('');
}

function _populateCta(pub) {
  const cta = document.getElementById('pmCta');
  if (pub.url) {
    cta.href = pub.url;
    cta.classList.remove('disabled');
    cta.textContent = 'Read Full Publication →';
  } else {
    cta.href = '#';
    cta.classList.add('disabled');
    cta.textContent = 'No Link Available';
  }
}

function _typeTag(type) {
  const tl = type.toLowerCase();
  if (tl.includes('journal'))                              return '<span class="pub-type-tag pub-type-journal">journal</span>';
  if (tl.includes('proceedings') || tl.includes('conference')) return '<span class="pub-type-tag pub-type-conference">conf</span>';
  if (tl.includes('preprint')    || tl.includes('repository')) return '<span class="pub-type-tag pub-type-preprint">preprint</span>';
  return '<span class="pub-type-tag pub-type-other">other</span>';
}

async function _loadSummary(pub, container, copyBtn) {
  container.classList.remove('typing-cursor');
  container.innerHTML = `
    <div class="summary-loading">
      <div class="pub-dots">
        <div class="pub-dot"></div><div class="pub-dot"></div><div class="pub-dot"></div>
      </div>
      <div class="summary-loading-label">Generating summary…</div>
    </div>`;

  try {
    const summary = await getSummary(pub);
    container.innerHTML = '';
    container.classList.add('typing-cursor');
    await typewriterEffect(container, summary, 8);
    container.classList.remove('typing-cursor');
    copyBtn.classList.add('visible');
  } catch (err) {
    // Graceful fallback: show the raw abstract if the AI call fails
    if (pub.abstract) {
      container.innerHTML = '';
      container.classList.add('typing-cursor');
      await typewriterEffect(container, pub.abstract, 6);
      container.classList.remove('typing-cursor');
      copyBtn.classList.add('visible');
      container.insertAdjacentHTML('afterend',
        `<div class="summary-fallback-note">⚠ AI unavailable — showing original abstract</div>`);
    } else {
      container.innerHTML = `<span class="summary-error">
        Could not generate summary: ${escHtml(err.message)}
      </span>`;
    }
  }
}
