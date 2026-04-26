// ── PUBLICATION DATA CACHE ─────────────────────────────────────────
// Persists fetched publication data to localStorage so repeat visits
// for the same faculty skip API calls entirely.
//
// Key format : reva_pub_{normalised_name}
// TTL        : 7 days

const PREFIX = 'reva_pub_';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function _key(name) {
  return PREFIX + name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

/**
 * Retrieve a cached entry for a faculty name.
 * Returns null when absent or expired (expired entries are removed).
 */
export function cacheGet(name) {
  try {
    const raw = localStorage.getItem(_key(name));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.savedAt > TTL_MS) {
      localStorage.removeItem(_key(name));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

/**
 * Persist fetched data for a faculty member.
 * @param {string} name  - cleaned faculty name (from cleanName())
 * @param {{ faculty, works, stats, source, matchedName }} payload
 */
export function cacheSet(name, payload) {
  try {
    localStorage.setItem(_key(name), JSON.stringify({ savedAt: Date.now(), ...payload }));
  } catch (e) {
    console.warn('Publication cache write failed (storage quota?):', e);
  }
}

/** True if a non-expired entry exists for this name. */
export function cacheHas(name) {
  return cacheGet(name) !== null;
}

/** All non-expired cache entries across all faculty. */
export function cacheGetAll() {
  const result = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(PREFIX)) continue;
    try {
      const entry = JSON.parse(localStorage.getItem(key));
      if (entry && Date.now() - entry.savedAt <= TTL_MS) result.push(entry);
    } catch { /* skip corrupt entries */ }
  }
  return result;
}

/** Remove all reva_pub_* entries from localStorage. */
export function cacheClear() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach(k => localStorage.removeItem(k));
}
