// ── BULK FACULTY FETCHER ──────────────────────────────────────────
// Iterates over a faculty list, serving cache hits instantly and
// hitting OpenAlex → Semantic Scholar for misses.
// Designed for the "All Faculty CSV" / "Dept CSV" bulk-download flow.

import { cleanName } from '../utils/text.js';
import { cacheGet, cacheSet } from './dataCache.js';
import { findAuthor as oaFindAuthor, fetchWorks } from './openAlex.js';
import { findAuthor as ssFindAuthor, fetchPapers } from './semanticScholar.js';

const INTER_DELAY_MS = 180; // pause between API-fetched faculty (rate limiting)
const SEARCH_TIMEOUT = 12_000;
const WORKS_TIMEOUT  = 30_000;

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function _raceTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

function _nameVariants(name) {
  const parts = name.split(' ').filter(p => p.length > 1);
  return [name, [...parts].reverse().join(' '), parts[0], parts[parts.length - 1]]
    .filter((v, i, a) => v && a.indexOf(v) === i);
}

/**
 * Fetch publication data for every faculty member in the list.
 * Cache hits are served without any network call.
 *
 * @param {object[]}   facultyList  - subset (or all) of FACULTY_DATA
 * @param {function}   onProgress   - called after each faculty with a progress object
 * @param {AbortSignal} signal      - cancel token; checked between faculty
 * @returns {Promise<{found,fromCache,notFound}>}
 */
export async function fetchFacultyBulk(facultyList, onProgress, signal) {
  const counts = { found: 0, fromCache: 0, notFound: 0 };

  for (let i = 0; i < facultyList.length; i++) {
    if (signal.aborted) break;

    const f    = facultyList[i];
    const name = cleanName(f.name);

    // ── Cache hit ─────────────────────────────────────────────────
    const cached = cacheGet(name);
    if (cached) {
      counts.fromCache++;
      onProgress({ i: i + 1, total: facultyList.length, faculty: f, status: 'cache', counts });
      continue; // no network delay needed
    }

    // Signal that we're about to hit the network for this faculty
    onProgress({ i: i + 1, total: facultyList.length, faculty: f, status: 'fetching', counts });

    const variants = _nameVariants(name);
    const noop     = () => {};
    let   saved    = false;

    // ── OpenAlex ──────────────────────────────────────────────────
    try {
      const oaAuthor = await _raceTimeout(oaFindAuthor(variants, noop), SEARCH_TIMEOUT);
      if (oaAuthor && !signal.aborted) {
        const stats = {
          pubs:    oaAuthor.worksCount,
          citedBy: oaAuthor.stats.citedBy,
          hIndex:  oaAuthor.stats.hIndex,
        };
        const works = await _raceTimeout(fetchWorks(oaAuthor.authorId, noop), WORKS_TIMEOUT);
        if (works.length > 0) {
          cacheSet(name, {
            faculty:     f,
            works,
            stats,
            source:      'OpenAlex',
            matchedName: oaAuthor.authorName,
          });
          counts.found++;
          saved = true;
          onProgress({ i: i + 1, total: facultyList.length, faculty: f, status: 'found', counts });
        }
      }
    } catch (e) {
      console.warn(`[bulk] OpenAlex failed for "${name}":`, e.message);
    }

    // ── Semantic Scholar fallback ─────────────────────────────────
    if (!saved && !signal.aborted) {
      try {
        const ssAuthor = await _raceTimeout(ssFindAuthor(variants, noop), SEARCH_TIMEOUT);
        if (ssAuthor) {
          const stats = {
            pubs:    ssAuthor.stats.paperCount,
            citedBy: ssAuthor.stats.citationCount,
            hIndex:  ssAuthor.stats.hIndex,
          };
          const works = await _raceTimeout(fetchPapers(ssAuthor.authorId), WORKS_TIMEOUT);
          if (works.length > 0) {
            cacheSet(name, {
              faculty:     f,
              works,
              stats,
              source:      'Semantic Scholar',
              matchedName: ssAuthor.authorName,
            });
            counts.found++;
            saved = true;
            onProgress({ i: i + 1, total: facultyList.length, faculty: f, status: 'found', counts });
          }
        }
      } catch (e) {
        console.warn(`[bulk] Semantic Scholar failed for "${name}":`, e.message);
      }
    }

    if (!saved) {
      counts.notFound++;
      onProgress({ i: i + 1, total: facultyList.length, faculty: f, status: 'not-found', counts });
    }

    if (!signal.aborted) await _sleep(INTER_DELAY_MS);
  }

  return counts;
}
