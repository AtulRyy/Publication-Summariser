// ── API CONFIG ────────────────────────────────────────────────────
// Get a free Groq key (14,400 req/day) at https://console.groq.com/keys
export const GROQ_API_KEY = 'YOUR_GROQ_API_KEY_HERE';
export const GROQ_MODEL   = 'llama-3.1-8b-instant';

// ── DEPARTMENT MAP ────────────────────────────────────────────────
export const DEPT_MAP = {
  'School of Computer Science and Engineering':          { short: 'CSE',  cls: 'c-cse',   color: '#1a73e8' },
  'School of Electronics and Communication Engineering': { short: 'ECE',  cls: 'c-ece',   color: '#8e24aa' },
  'School of Electrical and Electronics Engineering':    { short: 'EEE',  cls: 'c-eee',   color: '#f57c00' },
  'School of Civil Engineering':                         { short: 'Civil',cls: 'c-civil', color: '#2e7d32' },
  'School of Mechanical Engineering':                    { short: 'Mech', cls: 'c-mech',  color: '#c62828' },
};
