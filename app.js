// ── APP ENTRY POINT ───────────────────────────────────────────────
// Wires together all modules, owns filter state, exposes a minimal
// global API (window.__app) so inline HTML onclick attributes can
// reach JS without polluting the global scope.

import { FACULTY_DATA } from './data/faculty.js';
import { DEPT_MAP }     from './config.js';
import { state }        from './state.js';

import { buildDeptGrid, renderFaculty }    from './components/facultyCard.js';
import { openProfile, closeProfileBtn, closeProfile, loadPublications } from './components/profilePanel.js';
import { openPubModalByIdx, closePubModalBtn, closePubModal, copySummary } from './components/publicationModal.js';
import { applyPubFilters }                 from './components/publicationList.js';
import { renderTrendChart }               from './components/trendChart.js';
import { showToast }                      from './utils/dom.js';
import { normalizeDesig }                 from './utils/text.js';

// ── Filter logic ──────────────────────────────────────────────────

function applyFilters() {
  const q = state.searchQuery.toLowerCase();

  let list = FACULTY_DATA.filter(f => {
    const matchDept  = state.activeDept  === 'all' || f.department === state.activeDept;
    const matchDesig = state.activeDesig === 'all' || normalizeDesig(f.designation).includes(state.activeDesig);
    const matchQ     = !q
      || f.name.toLowerCase().includes(q)
      || f.designation.toLowerCase().includes(q);
    return matchDept && matchDesig && matchQ;
  });

  document.getElementById('resultsTitle').textContent =
    state.activeDept === 'all' ? 'All Faculty'
    : DEPT_MAP[state.activeDept]?.short + ' Faculty';

  document.getElementById('resultsCount').textContent =
    `${list.length} of ${FACULTY_DATA.length} faculty`;

  renderFaculty(list);
}

// ── Global API (called from HTML onclick attributes) ──────────────
// Keeping inline event handlers is fine for a no-bundler project,
// but we isolate them to one namespace to avoid global pollution.

window.__app = {
  // Filters
  setDept(dept, el) {
    state.activeDept = dept;
    document.querySelectorAll('.dept-chip').forEach(c => c.classList.remove('active'));
    // el may be a dept-card or dept-chip
    const chip = document.querySelector(`.dept-chip[data-dept="${CSS.escape(dept)}"]`);
    if (chip) chip.classList.add('active');
    if (!chip) {
      // clicked from dept-card — activate the matching chip
      const allChip = document.querySelector('.dept-chip[data-dept="all"]');
      if (dept === 'all' && allChip) allChip.classList.add('active');
    }
    applyFilters();
  },

  setDesig(desig, el) {
    state.activeDesig = desig;
    document.querySelectorAll('.desig-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    applyFilters();
  },

  setView(mode) {
    state.viewMode = mode;
    document.getElementById('vGrid').classList.toggle('active', mode === 'grid');
    document.getElementById('vList').classList.toggle('active', mode === 'list');
    applyFilters();
  },

  // Profile panel
  openProfile,
  closeProfile,
  closeProfileBtn,
  loadPublications,

  // Publication modal
  openPubModal: openPubModalByIdx,
  closePubModal,
  closePubModalBtn,
  copySummary,

  // Pub list controls (called from select elements rendered inside publicationList)
  setSortBy(val) {
    state.pubSortBy = val;
    applyPubFilters();
  },
  setFilterType(val) {
    state.pubFilterType = val;
    applyPubFilters();
  },

  // Dark mode
  toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    document.getElementById('darkToggle').textContent = isDark ? '☀ Light' : '◑ Dark';
    localStorage.setItem('revaDashDark', isDark ? '1' : '0');
    if (state.allLoadedWorks.length) renderTrendChart(state.allLoadedWorks);
  },

  showToast,
};

// ── Keyboard shortcuts ────────────────────────────────────────────

document.getElementById('searchInput').addEventListener('input', e => {
  state.searchQuery = e.target.value;
  applyFilters();
});

document.getElementById('searchInput').addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    e.target.value  = '';
    state.searchQuery = '';
    applyFilters();
  }
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('pubModalOverlay').classList.contains('open')) {
    closePubModalBtn();
  } else {
    closeProfileBtn();
  }
});

// ── Initialise ────────────────────────────────────────────────────

buildDeptGrid();
applyFilters();
document.getElementById('lastUpdated').textContent =
  `${FACULTY_DATA.length} faculty · Engineering & Technology`;

// Restore dark mode preference
if (localStorage.getItem('revaDashDark') === '1') {
  document.body.classList.add('dark');
  document.getElementById('darkToggle').textContent = '☀ Light';
}
