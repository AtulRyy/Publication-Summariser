// ── GROQ SUMMARISATION SERVICE ────────────────────────────────────
// Uses Groq's free-tier API (14,400 req/day) with Llama 3.1 8B.
// Free key: https://console.groq.com/keys

import { GROQ_API_KEY, GROQ_MODEL } from '../config.js';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// In-memory cache keyed by DOI or title — avoids repeat API calls
// for the same publication within a session.
const cache = new Map();

/**
 * Generate a 4–5 sentence plain-language summary of a publication.
 * Sends title + venue + year + abstract to Groq.
 *
 * @param {object} pub  - { title, venue, year, type, abstract }
 * @returns {Promise<string>}
 */
export async function getSummary(pub) {
  const cacheKey = pub.doi || pub.title;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  if (!GROQ_API_KEY || GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
    throw new Error('GROQ_API_KEY not set — add your key to config.js');
  }

  const context = [
    `Title: ${pub.title || 'Unknown'}`,
    pub.venue    ? `Journal/Venue: ${pub.venue}` : '',
    pub.year     ? `Year: ${pub.year}`           : '',
    pub.type     ? `Type: ${pub.type}`           : '',
    pub.abstract ? `Abstract: ${pub.abstract}`   : '',
  ].filter(Boolean).join('\n');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a research summariser for a university faculty dashboard. ' +
            'Write clear, engaging summaries for a general academic audience.',
        },
        {
          role: 'user',
          content:
            'Summarise this publication in 4–5 sentences. ' +
            'Explain what it is about, the approach used, and why it matters. ' +
            'Write in flowing prose — no bullet points.\n\n' + context,
        },
      ],
      max_tokens:  300,
      temperature: 0.4,
    }),
  });

  if (res.status === 429) {
    throw new Error('Rate limit reached — try again in a moment');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Groq API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '';
  if (!text) throw new Error('Empty response from Groq');

  cache.set(cacheKey, text);
  return text;
}
