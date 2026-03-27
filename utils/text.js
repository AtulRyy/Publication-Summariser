// ── TEXT / STRING UTILITIES ───────────────────────────────────────

/** Strip honorifics and normalise whitespace from a faculty name. */
export function cleanName(raw) {
  return raw
    .replace(/^(Dr|Prof|Mr|Ms|Mrs|Emeritus)\.?\s+/gi, '')
    .replace(/\.\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Collapse verbose designation strings to a short normalised label. */
export function normalizeDesig(d) {
  if (!d) return '';
  const dl = d.toLowerCase();
  if (dl.includes('pro vice') || dl.includes('pro-vice'))      return 'Pro Vice-Chancellor';
  if (dl.includes('vice chancellor'))                           return 'Vice Chancellor';
  if (dl.includes('director') && dl.includes('professor'))     return 'Director & Professor';
  if (dl.includes('director'))                                  return 'Director';
  if (dl.includes('professor') && dl.includes('head'))         return 'Professor & HOD';
  if (dl.includes('assistant professor'))                       return 'Assistant Professor';
  if (dl.includes('associate professor'))                       return 'Associate Professor';
  if (dl.includes('professor'))                                 return 'Professor';
  return d.split('&')[0].trim();
}

/**
 * Reconstruct plain abstract text from an OpenAlex abstract_inverted_index.
 * The inverted index maps each word to an array of character positions.
 */
export function reconstructAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return null;
  const entries = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) entries.push([pos, word]);
  }
  return entries
    .sort((a, b) => a[0] - b[0])
    .map(e => e[1])
    .join(' ');
}
