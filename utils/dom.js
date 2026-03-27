// ── DOM / UI UTILITIES ────────────────────────────────────────────

/** Escape a string for safe HTML insertion. */
export function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Return up-to-2-character initials from a display name. */
export function getInitials(name) {
  const parts = name.replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, '').split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic colour from a name string (used for avatars). */
export function avatarColor(name) {
  const palette = ['#1a73e8','#8e24aa','#f57c00','#2e7d32','#c62828','#0288d1','#6d4c41','#455a64'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

/** Show a brief toast message at the bottom of the screen. */
export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/**
 * Typewriter effect — resolves when done.
 * @param {HTMLElement} el
 * @param {string} text
 * @param {number} speed  ms per character
 */
export function typewriterEffect(el, text, speed = 10) {
  return new Promise(resolve => {
    let i = 0;
    function tick() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i++);
        setTimeout(tick, speed);
      } else {
        resolve();
      }
    }
    tick();
  });
}
