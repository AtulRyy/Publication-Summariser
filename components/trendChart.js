// ── PUBLICATION TREND CHART ───────────────────────────────────────
// Renders a Chart.js line chart of publications-per-year
// inside the profile panel's #trendSection element.

let chartInstance = null;

/**
 * Build or rebuild the trend chart from a works array.
 * Hides the section if there is insufficient data.
 *
 * @param {object[]} works  - raw publication objects with publication_year
 */
export function renderTrendChart(works) {
  const section = document.getElementById('trendSection');
  if (!works?.length) { section.style.display = 'none'; return; }

  // Count publications per year, ignoring implausible values
  const nowYear = new Date().getFullYear();
  const yearMap = {};
  for (const w of works) {
    const y = w.publication_year;
    if (y && y >= 1980 && y <= nowYear) {
      yearMap[y] = (yearMap[y] || 0) + 1;
    }
  }

  const years = Object.keys(yearMap).map(Number).sort((a, b) => a - b);
  if (years.length < 2) { section.style.display = 'none'; return; }

  section.style.display = 'block';

  // Destroy previous chart instance before re-creating
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  const isDark    = document.body.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)';
  const tickColor = isDark ? '#6e6a65' : '#7a7670';
  const monoFont  = "'DM Mono', monospace";

  chartInstance = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: years,
      datasets: [{
        label:            'Publications',
        data:             years.map(y => yearMap[y]),
        borderColor:      '#c8391a',
        backgroundColor:  'rgba(200,57,26,.09)',
        borderWidth:      2,
        pointBackgroundColor: '#c8391a',
        pointRadius:      3,
        pointHoverRadius: 5,
        fill:             true,
        tension:          0.35,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1a1916' : '#2c2820',
          borderColor:     isDark ? '#2e2c27' : '#444',
          borderWidth:     1,
          titleFont: { family: monoFont, size: 10 },
          bodyFont:  { family: monoFont, size: 11 },
          callbacks: {
            title: ctx => `Year ${ctx[0].label}`,
            label: ctx => ` ${ctx.raw} publication${ctx.raw !== 1 ? 's' : ''}`,
          },
        },
      },
      scales: {
        x: {
          grid:  { color: gridColor },
          ticks: { font: { family: monoFont, size: 9 }, color: tickColor, maxTicksLimit: 10 },
          title: { display: true, text: 'Year', font: { family: monoFont, size: 9 }, color: tickColor },
        },
        y: {
          beginAtZero: true,
          grid:  { color: gridColor },
          ticks: { font: { family: monoFont, size: 9 }, color: tickColor, stepSize: 1, precision: 0 },
          title: { display: true, text: 'Publications', font: { family: monoFont, size: 9 }, color: tickColor },
        },
      },
    },
  });
}

/** Re-render with updated dark/light colours (call after theme toggle). */
export function refreshChartTheme(works) {
  renderTrendChart(works);
}
