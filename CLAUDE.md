# REVA University — Faculty Research Dashboard · CLAUDE.md

## What this is

Static, zero-dependency faculty research portal for REVA University (339 faculty, 5 engineering schools). Deployed as GitHub Pages via `.github/workflows/deploy.yml`. No build step — pure ES modules served over HTTP.

## Tech stack

| Concern | Technology |
|---|---|
| Runtime | Vanilla ES modules in browser |
| Charts | Chart.js 4.4.4 (CDN) |
| Publications | OpenAlex (primary) → Semantic Scholar (fallback) |
| AI summaries | Groq API · `llama-3.1-8b-instant` |
| Persistence | `localStorage` · 7-day TTL · prefix `reva_pub_` |
| Deploy | GitHub Actions → GitHub Pages |

## File map

```
index.html              HTML entry + all UI structure; inline onclick → window.__app
app.js                  Module entry: filter logic, global window.__app API
config.js               GROQ_API_KEY (CI-injected), DEPT_MAP
state.js                Single mutable state object (import + mutate directly)

components/
  facultyCard.js        Dept overview grid + faculty card rendering
  profilePanel.js       Slide-in panel: profile display, cache-first pub loading
  publicationList.js    Filtered/sorted publication list HTML builder
  publicationModal.js   AI summary modal (Groq / typewriter effect)
  trendChart.js         Chart.js line chart (publications per year)

services/
  openAlex.js           Author search + paginated works fetch (up to 2000)
  semanticScholar.js    Fallback via allorigins.win CORS proxy
  groq.js               AI summarisation; session-level DOI-keyed memory cache
  dataCache.js          localStorage publication cache (7-day TTL)

data/
  faculty.js            Hardcoded array of 339 faculty objects

utils/
  dom.js                escHtml, avatarColor, getInitials, showToast, typewriter
  text.js               cleanName, normalizeDesig, reconstructAbstract
  csv.js                CSV export: per-faculty pubs, dept stats, all-faculty stats

styles/
  base.css              CSS vars (light theme), reset, animations, toast
  layout.css            Header, stats row, dept grid, search, results, responsive
  components.css        Chips, buttons, faculty cards, list-view overrides
  profile.css           Profile panel, pub list, metrics, trend chart
  modal.css             Publication summary modal
  dark.css              Dark theme colour overrides
```

## Data flow

```
Faculty filter (app.js)
  → state.{activeDept, activeDesig, searchQuery}
  → renderFaculty(filteredList)              [facultyCard.js]

Click faculty card → openProfile(idx)        [profilePanel.js]
  → loadPublications() (button click)
      1. cacheGet(cleanName)                 [services/dataCache.js]
         HIT  → render immediately, show "⚡ From cache" status
         MISS → OpenAlex findAuthor + fetchWorks (cursor pagination)
              → fallback: Semantic Scholar findAuthor + fetchPapers
              → cacheSet(name, { works, stats, source, matchedName })
      → renderPublications(works)            [publicationList.js]
      → renderTrendChart(works)              [trendChart.js]

Click publication → openPubModal(idx)        [publicationModal.js]
  → groq.getSummary(pub)                     [services/groq.js]
      Session-level DOI cache; typewriter animation on display
```

## Cache system (`services/dataCache.js`)

- **Storage:** `localStorage`, prefix `reva_pub_`
- **TTL:** 7 days — auto-purged on next `cacheGet` call
- **Key:** `reva_pub_{lowercase_name_with_underscores}`
- **Entry shape:**
  ```json
  {
    "savedAt":     1714000000000,
    "faculty":     { "name": "...", "designation": "...", "department": "..." },
    "works":       [ ... ],
    "stats":       { "pubs": 42, "citedBy": 380, "hIndex": 10 },
    "source":      "OpenAlex",
    "matchedName": "Priya Kumar"
  }
  ```

## CSV exports (`utils/csv.js`)

| Mode | `window.__app` method | When visible |
|---|---|---|
| Individual publications | `downloadCurrentFacultyCSV()` | After pubs load in profile panel |
| Department stats | `downloadDeptCSV()` | Results header when dept filter active |
| All faculty stats | `downloadAllFacultyCSV()` | Results header, always visible |

Dept/all-faculty CSVs pull from `localStorage` cache only. Faculty not yet loaded show empty stats + "Not loaded" in the Last Cached column.

## Key conventions

- **No bundler** — import paths use relative `.js` extensions; served as-is.
- **`window.__app`** — All HTML `onclick` attributes call into this namespace.
- **`state.js`** — Single source of truth; mutate directly from any module.
- **ES module** requires an HTTP server (`file://` does not work).
- **Groq key** — `__GROQ_API_KEY__` placeholder replaced by `sed` in `deploy.yml`.

## Running locally

```bash
npx serve .
# or
python -m http.server 8080
```

## Deployment

Push to `main` → GitHub Actions injects Groq key → deploys to GitHub Pages.
Current working branch: `feature/csv` (CSV export + localStorage cache).
