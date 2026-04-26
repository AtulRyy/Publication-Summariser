// ── CSV EXPORT UTILITIES ───────────────────────────────────────────
// Three export modes:
//   exportFacultyPubs  — all publications for the currently-open faculty
//   exportDeptStats    — per-faculty summary stats for one department
//   exportAllStats     — per-faculty summary stats for all departments
//
// Dept and all-faculty exports pull from the localStorage cache only.
// Faculty who haven't been loaded show empty stat columns.

import { FACULTY_DATA } from '../data/faculty.js';
import { DEPT_MAP }     from '../config.js';
import { cacheGet }     from '../services/dataCache.js';
import { cleanName }    from './text.js';

function _esc(v) {
  const s = String(v ?? '');
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function _trigger(filename, rows) {
  const csv  = rows.map(r => r.map(_esc).join(',')).join('\r\n');
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** All publications for the currently-open faculty as CSV. */
export function exportFacultyPubs(faculty, works) {
  const header = ['Title', 'Year', 'Type', 'Venue', 'Citations', 'DOI'];
  const rows   = works.map(w => [
    w.title || '',
    w.publication_year || '',
    w.type || '',
    w.primary_location?.source?.display_name || w.venue || '',
    w.cited_by_count ?? '',
    w.doi || '',
  ]);
  const slug = faculty.name.replace(/[^a-zA-Z0-9]+/g, '_');
  _trigger(`${slug}_publications.csv`, [header, ...rows]);
}

/** Per-faculty stats for all members of one department (from localStorage cache). */
export function exportDeptStats(deptName) {
  const members = FACULTY_DATA.filter(f => f.department === deptName);
  const short   = DEPT_MAP[deptName]?.short || 'dept';
  const header  = ['Name', 'Designation', 'Department', 'Publications', 'Citations', 'h-index', 'Matched As', 'Source', 'Last Cached'];
  const rows    = members.map(f => {
    const e = cacheGet(cleanName(f.name));
    return [
      f.name,
      f.designation,
      short,
      e?.stats?.pubs    ?? '',
      e?.stats?.citedBy ?? '',
      e?.stats?.hIndex  ?? '',
      e?.matchedName    ?? '',
      e?.source         ?? '',
      e ? new Date(e.savedAt).toLocaleDateString('en-IN') : 'Not loaded',
    ];
  });
  _trigger(`REVA_${short}_stats.csv`, [header, ...rows]);
}

/** Per-faculty stats across all departments (from localStorage cache). */
export function exportAllStats() {
  const header = ['Name', 'Designation', 'Department', 'Dept', 'Publications', 'Citations', 'h-index', 'Matched As', 'Source', 'Last Cached'];
  const rows   = FACULTY_DATA.map(f => {
    const e     = cacheGet(cleanName(f.name));
    const short = DEPT_MAP[f.department]?.short || '';
    return [
      f.name,
      f.designation,
      f.department,
      short,
      e?.stats?.pubs    ?? '',
      e?.stats?.citedBy ?? '',
      e?.stats?.hIndex  ?? '',
      e?.matchedName    ?? '',
      e?.source         ?? '',
      e ? new Date(e.savedAt).toLocaleDateString('en-IN') : 'Not loaded',
    ];
  });
  _trigger('REVA_all_faculty_stats.csv', [header, ...rows]);
}
