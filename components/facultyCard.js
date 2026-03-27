// ── FACULTY CARDS & DEPT GRID ─────────────────────────────────────

import { FACULTY_DATA } from '../data/faculty.js';
import { DEPT_MAP }     from '../config.js';
import { escHtml, getInitials, avatarColor } from '../utils/dom.js';
import { normalizeDesig } from '../utils/text.js';
import { state }          from '../state.js';

/** Render the department overview cards at the top of the page. */
export function buildDeptGrid() {
  const depts = Object.entries(DEPT_MAP);
  const total = FACULTY_DATA.length;
  const grid  = document.getElementById('deptGrid');

  grid.innerHTML = depts.map(([fullName, d]) => {
    const count = FACULTY_DATA.filter(f => f.department === fullName).length;
    const pct   = Math.round((count / total) * 100);
    return `
      <div class="dept-card ${d.cls}" onclick="window.__app.setDept('${escHtml(fullName)}', this)">
        <div class="dept-card-label">Department</div>
        <div class="dept-card-name">${escHtml(fullName.replace('School of ', ''))}</div>
        <div class="dept-card-count">${count}</div>
        <div class="dept-card-sub">faculty members</div>
        <div class="dept-bar">
          <div class="dept-bar-fill" style="width:${pct}%;background:${d.color}"></div>
        </div>
      </div>`;
  }).join('');
}

/**
 * Render the filtered faculty list.
 * @param {object[]} list  - subset of FACULTY_DATA
 */
export function renderFaculty(list) {
  const container = document.getElementById('facultyList');
  container.className = `faculty-list${state.viewMode === 'list' ? ' list-view' : ''}`;

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-title">No faculty found</div>
        <div class="empty-sub">Try clearing filters or a different search.</div>
      </div>`;
    return;
  }

  container.innerHTML = list.map((f, i) => {
    const d       = DEPT_MAP[f.department] || { short: '—', cls: 'c-cse', color: '#888' };
    const color   = avatarColor(f.name);
    const initials = getInitials(f.name);
    const idx     = FACULTY_DATA.indexOf(f);
    const delay   = Math.min(i, 30) * 0.025;

    return `
      <div class="faculty-card" style="animation-delay:${delay}s"
           onclick="window.__app.openProfile(${idx})">
        <div class="fc-info">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
            <div class="fc-avatar" style="background:${color}18;color:${color}">${initials}</div>
            <div>
              <div class="fc-name">${escHtml(f.name)}</div>
              <div class="fc-desig">${escHtml(normalizeDesig(f.designation))}</div>
            </div>
          </div>
          <span class="fc-dept-tag ${d.cls}">${d.short}</span>
        </div>
        <div class="fc-action">
          <button class="fc-btn"
                  onclick="event.stopPropagation();window.__app.openProfile(${idx})">
            View profile & publications →
          </button>
        </div>
      </div>`;
  }).join('');
}
