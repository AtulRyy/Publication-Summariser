// ── SEMANTIC SCHOLAR API SERVICE ──────────────────────────────────
// Used as fallback when OpenAlex returns 0 works.
// Routed via allorigins.win proxy to bypass CORS on file:// and some hosts.

const PROXY = 'https://api.allorigins.win/get?url=';
const SS_BASE = 'https://api.semanticscholar.org/graph/v1';

async function proxyJson(url) {
  const res  = await fetch(`${PROXY}${encodeURIComponent(url)}`);
  const wrap = await res.json();
  return JSON.parse(wrap.contents);
}

/**
 * Search Semantic Scholar for an author by name variants.
 *
 * @param {string[]} variants
 * @param {function} onStatus
 * @returns {{ authorId, authorName, stats } | null}
 */
export async function findAuthor(variants, onStatus) {
  for (const variant of variants) {
    onStatus(`Trying Semantic Scholar: "${variant}"…`);
    try {
      const url  = `${SS_BASE}/author/search?query=${encodeURIComponent(variant)}&fields=name,affiliations,paperCount,citationCount,hIndex&limit=5`;
      const data = await proxyJson(url);
      const candidates = data.data || [];
      if (!candidates.length) continue;

      // Score by REVA affiliation
      let best = candidates[0];
      let bestScore = -1;
      for (const c of candidates) {
        const affil = (c.affiliations || [])
          .map(a => (typeof a === 'string' ? a : a.name || ''))
          .join(' ')
          .toLowerCase();
        const score = affil.includes('reva') ? 100 : (c.paperCount || 0);
        if (score > bestScore) { bestScore = score; best = c; }
      }

      return {
        authorId:   best.authorId,
        authorName: best.name,
        stats: {
          paperCount:    best.paperCount    || 0,
          citationCount: best.citationCount || 0,
          hIndex:        best.hIndex        ?? null,
        },
      };
    } catch (e) {
      console.warn('Semantic Scholar author search failed:', e.message);
    }
  }
  return null;
}

/**
 * Fetch papers for a Semantic Scholar author.
 * Normalises the shape to match OpenAlex work objects.
 *
 * @param {string} authorId
 * @returns {object[]}
 */
export async function fetchPapers(authorId) {
  const url  = `${SS_BASE}/author/${authorId}/papers?fields=title,year,citationCount,venue,publicationTypes,externalIds,abstract&limit=100&offset=0`;
  const data = await proxyJson(url);

  return (data.data || []).map(p => {
    const types = (p.publicationTypes || []).join(' ').toLowerCase();
    return {
      title:            p.title,
      publication_year: p.year,
      cited_by_count:   p.citationCount || 0,
      doi:              p.externalIds?.DOI || null,
      abstract:         p.abstract || null,
      primary_location: { source: { display_name: p.venue || '' } },
      type: types.includes('journal')    ? 'journal-article'
          : types.includes('conference') ? 'proceedings-article'
          :                                'other',
    };
  });
}
