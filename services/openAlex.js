// ── OPENALEX API SERVICE ──────────────────────────────────────────
// Docs: https://docs.openalex.org

const MAILTO = 'research@reva.edu.in';

async function safeJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} from OpenAlex`);
  return r.json();
}

/**
 * Search OpenAlex for an author by name variants.
 * Scores results by REVA affiliation.
 *
 * @param {string[]} variants  - name strings to try in order
 * @param {function} onStatus  - callback(msg) for UI status updates
 * @returns {{ authorId, authorName, worksCount, stats } | null}
 */
export async function findAuthor(variants, onStatus) {
  for (const variant of variants) {
    onStatus(`Searching OpenAlex: "${variant}"…`);
    try {
      const url = `https://api.openalex.org/authors?search=${encodeURIComponent(variant)}&per-page=5&mailto=${MAILTO}`;
      const data = await safeJson(url);
      const results = data.results || [];
      if (!results.length) continue;

      // Prefer REVA-affiliated authors
      let best = results[0];
      let bestScore = -1;
      for (const r of results) {
        const inst = (r.last_known_institution?.display_name || '').toLowerCase();
        const score = inst.includes('reva') ? 100 : inst.includes('india') ? 10 : 0;
        if (score > bestScore) { bestScore = score; best = r; }
      }

      return {
        authorId:   best.id.replace('https://openalex.org/', ''),
        authorName: best.display_name,
        worksCount: best.works_count || 0,
        stats: {
          hIndex:     best.summary_stats?.h_index ?? null,
          citedBy:    best.cited_by_count || 0,
        },
      };
    } catch (e) {
      console.warn('OpenAlex author search failed:', e);
    }
  }
  return null;
}

/**
 * Fetch all works for an author using cursor pagination.
 * Includes abstract_inverted_index for summary generation.
 *
 * @param {string}   authorId
 * @param {function} onStatus  - callback(msg) for progress updates
 * @returns {object[]}  raw OpenAlex work objects
 */
export async function fetchWorks(authorId, onStatus) {
  const fields = 'title,doi,publication_year,cited_by_count,primary_location,type,abstract_inverted_index';
  let allWorks = [];
  let cursor   = '*';
  let page     = 1;

  while (true) {
    const url =
      `https://api.openalex.org/works` +
      `?filter=authorships.author.id:${authorId}` +
      `&per-page=200&cursor=${cursor}` +
      `&select=${fields}&mailto=${MAILTO}`;

    const data  = await safeJson(url);
    const batch = data.results || [];
    allWorks    = allWorks.concat(batch);

    onStatus(`Fetching… ${allWorks.length} of ${data.meta?.count || '?'} works`);

    const nextCursor = data.meta?.next_cursor;
    if (!nextCursor || batch.length < 200) break;
    cursor = nextCursor;
    if (++page > 10) break;   // safety cap: 2,000 works
  }

  return allWorks;
}
