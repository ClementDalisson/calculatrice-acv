// ─────────────────────────────────────────────────────────────────────────────
// ui-perso.js — Calculatrice personnelle (catalogue, détail, comparaison, empreinte, méthode)
// Dépend de : data.js (CATALOGUE, EF31, DAMAGE_CATEGORIES, ...) | calc.js | app.js (state, showToast, createFocusTrap)
// ─────────────────────────────────────────────────────────────────────────────

/* ── Catalogue ── */
function renderCatalogue() {
  const grid = document.getElementById('cards-grid');
  const filtered = state.filterCat === 'all'
    ? CATALOGUE
    : CATALOGUE.filter(o => o.categorie === state.filterCat);

  grid.innerHTML = filtered.map(obj => {
    const gwp = obj.impacts.GWP;
    const catColor = CAT_COLORS[obj.categorie] || { bg: '#F7FAFC', border: '#CBD5E0' };
    const isSelected = state.selectedIds.includes(obj.id);
    return `
    <div class="card ${isSelected ? 'selected' : ''}"
         style="border-left: 4px solid ${catColor.border}"
         onclick="openDetail(${obj.id})">
      <span class="card-cat-tag">${obj.categorie}</span>
      <div class="card-emoji">${obj.emoji}</div>
      <div class="card-body">
        <div class="card-name">${obj.nom}</div>
        <div class="card-uf">${obj.uf}</div>
        ${obj.completude < 50 ? `<div class="completude-warning">⚠️ Données partielles (${obj.completude.toFixed(0)}%)</div>` : ''}
        ${renderTokenBars(obj)}
      </div>
      <button class="card-select-btn" onclick="toggleSelect(event, ${obj.id})"
              title="${isSelected ? 'Retirer de la comparaison' : 'Ajouter à la comparaison'}">
        ${isSelected ? '✓' : '+'}
      </button>
    </div>`;
  }).join('');
}

function setFilter(cat) {
  state.filterCat = cat;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  renderCatalogue();
}

function toggleSelect(e, id) {
  e.stopPropagation();
  if (state.selectedIds.includes(id)) {
    state.selectedIds = state.selectedIds.filter(x => x !== id);
  } else {
    if (state.selectedIds.length >= 5) {
      showToast('Maximum 5 objets en comparaison simultanée.');
      return;
    }
    state.selectedIds.push(id);
  }
  renderCatalogue();
  updateNavBadge();
}

/* ── Detail panel ── */
function openDetail(id) {
  state.detailId = id;
  state._detailOpener = document.activeElement;
  const obj = getObj(id);
  if (!obj) return;

  const overlay = document.getElementById('detail-overlay');
  overlay.classList.add('open');
  document.getElementById('detail-close-btn').focus();
  state._detailTrap = createFocusTrap(overlay);
  document.addEventListener('keydown', state._detailTrap);

  document.getElementById('detail-title').textContent = obj.emoji + ' ' + obj.nom;
  document.getElementById('detail-uf').textContent = obj.uf;
  document.getElementById('detail-pef-score').textContent = fmtPef(obj.pef_mpt, obj.completude);
  document.getElementById('detail-pef-completude').textContent = `${obj.completude.toFixed(0)}% des indicateurs disponibles`;

  // Barres catégories de dommage (harmonisées avec le catalogue)
  document.getElementById('detail-tokens').innerHTML = renderTokenBars(obj);

  // Charts
  renderDetailChart(obj);

  // Indicators by damage group
  const indContainer = document.getElementById('detail-indicators');
  indContainer.innerHTML = Object.entries(DAMAGE_CATEGORIES).map(([dKey, dData]) => {
    const rows = dData.indicators.map(ind => {
      const meta = EF31[ind];
      const v = obj.impacts[ind];
      const valHtml = (v !== null && v !== undefined)
        ? `<span class="ind-val">${fmt(v, ind)}</span>`
        : `<span class="ind-val nd">n.d.</span>`;
      return `<div class="indicator-row">
        <span class="ind-name" data-tooltip="Poids EF3.1: ${meta.weight}%">${meta.label}</span>
        ${valHtml}
        <span class="ind-unit">${meta.unit}</span>
      </div>`;
    }).join('');
    return `<div class="indicator-group">
      <div class="indicator-group-title" style="background:${dData.light};color:${dData.color}">
        ${dData.label} — ${dData.indicators.reduce((sum, k) => sum + EF31[k].weight, 0).toFixed(2)}% du score PEF
      </div>
      ${rows}
    </div>`;
  }).join('');

  // Composition
  const compContainer = document.getElementById('detail-composition');
  compContainer.innerHTML = obj.composition.length > 0
    ? `<table class="comp-table">
        <tr><th>Composant</th><th>Quantité</th><th>Source FE</th><th class="comp-gwp">GWP calc.</th></tr>
        ${obj.composition.map(c => {
          // Try to get GWP from CATALOGUE FE dict dynamically (approximated)
          return `<tr>
            <td>${c.composant}</td>
            <td style="text-align:right">${c.qty.toLocaleString('fr-FR', {maximumFractionDigits: 4})}</td>
            <td style="color:var(--text-muted);font-size:0.75rem">${c.fe}</td>
            <td class="comp-gwp">voir data.js</td>
          </tr>`;
        }).join('')}
      </table>`
    : '<p style="font-size:0.82rem;color:var(--text-muted)">Données de source directe (pas de composition décomposée disponible).</p>';

  document.getElementById('detail-hypothesis').textContent = obj.hypotheses;
  document.getElementById('detail-sources').textContent = obj.sources;

  // Add to compare button
  const addBtn = document.getElementById('detail-add-compare');
  const isSelected = state.selectedIds.includes(id);
  addBtn.textContent = isSelected ? '✓ Dans la comparaison' : '+ Ajouter à la comparaison';
  addBtn.className = 'btn ' + (isSelected ? '' : 'btn-outline');
  addBtn.onclick = () => {
    toggleSelect({ stopPropagation: () => {} }, id);
    addBtn.textContent = state.selectedIds.includes(id) ? '✓ Dans la comparaison' : '+ Ajouter à la comparaison';
    addBtn.className = 'btn ' + (state.selectedIds.includes(id) ? '' : 'btn-outline');
  };
}

function closeDetail() {
  document.getElementById('detail-overlay').classList.remove('open');
  if (state.detailChart) { state.detailChart.destroy(); state.detailChart = null; }
  if (state._detailTrap) { document.removeEventListener('keydown', state._detailTrap); state._detailTrap = null; }
  if (state._detailOpener) { state._detailOpener.focus(); state._detailOpener = null; }
}

function renderDetailChart(obj) {
  if (state.detailChart) { state.detailChart.destroy(); state.detailChart = null; }

  // Radar by damage category
  const ctx = document.getElementById('detail-radar-chart').getContext('2d');

  // Compute normalized contribution per damage category
  const damageScores = {};
  Object.entries(DAMAGE_CATEGORIES).forEach(([dKey, dData]) => {
    let total_w = 0, available_w = 0, score = 0;
    dData.indicators.forEach(ind => {
      const meta = EF31[ind];
      const v = obj.impacts[ind];
      total_w += meta.weight;
      if (v !== null && v !== undefined) {
        score += (v / meta.norm) * (meta.weight / 100) * 1000;
        available_w += meta.weight;
      }
    });
    damageScores[dKey] = { score, label: dData.label, color: dData.color };
  });

  const labels = Object.values(damageScores).map(d => d.label.replace(/^[^\s]+\s/, ''));
  const data   = Object.values(damageScores).map(d => d.score);
  const total  = data.reduce((a,b) => a+b, 0);
  const pct    = total > 0 ? data.map(v => (v/total)*100) : data;

  state.detailChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: pct.map(v => Math.max(v, 0)),
        backgroundColor: Object.values(DAMAGE_CATEGORIES).map(d => d.color + 'CC'),
        borderColor: Object.values(DAMAGE_CATEGORIES).map(d => d.color),
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 14 } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toFixed(1)}% du score PEF`
          }
        },
        title: { display: true, text: 'Répartition du score PEF par catégorie de dommage', font: { size: 12 } }
      }
    }
  });
}

/* ── Compare ── */
function renderCompare() {
  if (state.selectedIds.length === 0) {
    document.getElementById('compare-content').innerHTML = `
      <div class="empty-state">
        <div class="big">⚖️</div>
        <p>Sélectionnez des objets dans le Catalogue pour les comparer.<br>
        Cliquez sur <strong>+</strong> sur les cartes ou utilisez <strong>"Ajouter à la comparaison"</strong> dans le détail.</p>
        <br>
        <button class="btn" onclick="goTo('catalogue')">← Aller au catalogue</button>
      </div>`;
    return;
  }

  const objects = state.selectedIds.map(getObj).filter(Boolean);
  const n = objects.length;
  const objCols = objects.map(o => `<th>${o.emoji} ${o.nom}<br><small style="font-weight:400;opacity:0.8">${o.uf}</small></th>`).join('');

  // Build comparison table
  let rows = '';

  // PEF score
  rows += `<tr class="compare-score-total-row">
    <td>📊 Score PEF total (mPt)</td>
    ${objects.map(o => {
      const v = o.pef_mpt;
      const min = Math.min(...objects.filter(x => x.completude > 50).map(x => x.pef_mpt));
      const max = Math.max(...objects.filter(x => x.completude > 50).map(x => x.pef_mpt));
      const cls = (o.completude > 50 && v === min) ? 'best' : (o.completude > 50 && v === max) ? 'worst' : '';
      return `<td class="${cls}">${fmtPef(v, o.completude)}</td>`;
    }).join('')}
  </tr>`;

  // By damage group
  Object.entries(DAMAGE_CATEGORIES).forEach(([dKey, dData]) => {
    rows += `<tr class="group-header"><td colspan="${n+1}" style="background:${dData.light};color:${dData.color}">
      ${dData.label}</td></tr>`;
    dData.indicators.forEach(ind => {
      const meta = EF31[ind];
      rows += `<tr>
        <td data-tooltip="Poids EF3.1: ${meta.weight}%">${meta.label} <small style="color:var(--gray-400)">(${meta.unit})</small></td>
        ${buildValueCells(objects, ind, false)}
      </tr>`;
    });
  });

  const table = `
    <div class="compare-table-wrap">
      <table class="compare-table">
        <tr><th>Indicateur</th>${objCols}</tr>
        ${rows}
      </table>
    </div>`;

  // Charts
  const charts = `
    <div class="compare-chart-wrap">
      <div class="compare-chart-box" style="flex:1;min-width:320px">
        <h4>Catégories de dommage (Pt EF3.1)</h4>
        <div class="compare-radar-wrap"><canvas id="compare-radar-chart"></canvas></div>
      </div>
      <div class="compare-chart-box" style="flex:1;min-width:280px">
        <h4>Score PEF (mPt)</h4>
        <div class="compare-pef-chart-wrap"><canvas id="compare-pef-chart"></canvas></div>
      </div>
    </div>`;

  const tableSection = `
    <div style="margin-top:1.5rem">
      <button class="btn btn-outline compare-table-toggle-btn" onclick="toggleCompareTable(this)">📊 Voir le tableau détaillé</button>
    </div>
    <div id="compare-table-section" style="display:none;margin-top:1rem">${table}</div>`;

  document.getElementById('compare-content').innerHTML = charts + tableSection;

  // Render charts
  setTimeout(() => {
    renderCompareCharts(objects);
    updateCompareChips(objects);
  }, 50);
}

function buildValueCells(objects, ind, highlightBestWorst) {
  const vals = objects.map(o => o.impacts[ind]);
  const nonNull = vals.filter(v => v !== null && v !== undefined);
  const min = nonNull.length ? Math.min(...nonNull) : null;
  const max = nonNull.length ? Math.max(...nonNull) : null;
  return objects.map(o => {
    const v = o.impacts[ind];
    let cls = '';
    if (highlightBestWorst && v !== null) {
      if (v === min && min !== max) cls = 'best';
      if (v === max && min !== max) cls = 'worst';
    }
    return `<td class="${cls}">${v !== null && v !== undefined ? fmt(v, ind) : '<span style="color:var(--gray-400);font-style:italic">n.d.</span>'}</td>`;
  }).join('');
}

function renderCompareCharts(objects) {
  if (state.compareChart1) { state.compareChart1.destroy(); state.compareChart1 = null; }
  if (state.compareChart2) { state.compareChart2.destroy(); state.compareChart2 = null; }

  const colors = ['#C53030','#276749','#44337A','#744210','#2B6CB0'];

  // Helper: compute absolute mPt per damage category for an object
  function damageAbsolute(obj) {
    const result = {};
    Object.entries(DAMAGE_CATEGORIES).forEach(([dKey, dData]) => {
      let score = 0;
      dData.indicators.forEach(ind => {
        const meta = EF31[ind];
        const v = obj.impacts[ind];
        if (v !== null && v !== undefined) score += (v / meta.norm) * (meta.weight / 100) * 1000;
      });
      result[dKey] = score;
    });
    return result;
  }

  // Radar chart — normalisé : chaque axe = % du max entre les profils comparés
  const ctx1 = document.getElementById('compare-radar-chart');
  if (ctx1) {
    const radarLabels = Object.values(DAMAGE_CATEGORIES).map(d => d.label.replace(/^.+? /, ''));
    const allAbsData = objects.map(obj => {
      const abs = damageAbsolute(obj);
      return Object.keys(DAMAGE_CATEGORIES).map(k => abs[k]);
    });
    // Pour chaque axe, normaliser par le max entre tous les profils (→ 0–100 %)
    const numAxes = Object.keys(DAMAGE_CATEGORIES).length;
    const axisMaxes = Array.from({ length: numAxes }, (_, i) =>
      Math.max(...allAbsData.map(d => d[i]), 1e-12)
    );
    const normalizedData = allAbsData.map(row =>
      row.map((v, i) => +((v / axisMaxes[i]) * 100).toFixed(1))
    );

    const datasets = objects.map((obj, i) => ({
      label: obj.emoji + ' ' + obj.nom,
      data: normalizedData[i],
      backgroundColor: colors[i % colors.length] + '33',
      borderColor: colors[i % colors.length],
      pointBackgroundColor: colors[i % colors.length],
      borderWidth: 2,
      pointRadius: 4,
    }));

    state.compareChart1 = new Chart(ctx1, {
      type: 'radar',
      data: { labels: radarLabels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            beginAtZero: true,
            max: 100,
            ticks: { display: true, stepSize: 25, font: { size: 9 }, color: '#A0AEC0',
                     callback: v => v + '%' },
            pointLabels: { font: { size: 11 } },
            grid: { color: '#E2E8F0' },
          }
        },
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.r.toFixed(1)}% de l'impact max`
            }
          },
          title: { display: true, text: 'Profil normalisé — 100% = l\'impact le plus élevé sur chaque axe', font: { size: 11 }, color: '#718096' }
        }
      }
    });
  }

  // PEF bar
  const ctx2 = document.getElementById('compare-pef-chart');
  if (ctx2) {
    state.compareChart2 = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: objects.map(o => o.emoji + ' ' + o.nom.substring(0, 14)),
        datasets: [{
          label: 'Score PEF (mPt)',
          data: objects.map(o => o.completude > 50 ? o.pef_mpt : null),
          backgroundColor: objects.map((_, i) => colors[i % colors.length] + 'CC'),
          borderColor:     objects.map((_, i) => colors[i % colors.length]),
          borderWidth: 2,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { title: { display: true, text: 'mPt' } } }
      }
    });
  }
}

function updateCompareChips(objects) {
  const chips = document.getElementById('compare-chips');
  chips.innerHTML = objects.map(o => `
    <span class="compare-chip">
      ${o.emoji} ${o.nom}
      <button onclick="toggleSelect({stopPropagation:()=>{}},${o.id});renderCompare()">×</button>
    </span>`).join('');
}

function toggleCompareTable(btn) {
  const el = document.getElementById('compare-table-section');
  if (!el) return;
  const hidden = el.style.display === 'none';
  el.style.display = hidden ? '' : 'none';
  btn.textContent = hidden ? '▲ Masquer le tableau' : '📊 Voir le tableau détaillé';
}

function clearCompare() {
  state.selectedIds = [];
  renderCatalogue();
  updateNavBadge();
  renderCompare();
}

/* ── Empreinte annuelle ── */

function renderEmpreinte() {
  const profile = PROFILES[state.empreinteProfile];

  // Render profile selector
  const selector = document.getElementById('profile-selector');
  selector.innerHTML = PROFILES.map((p, i) => `
    <button class="profile-btn ${i === state.empreinteProfile ? 'active' : ''}"
            style="${i === state.empreinteProfile ? `background:${p.color};border-color:${p.color};color:#fff` : `border-color:${p.color};color:${p.color}`}"
            onclick="selectProfile(${i})">
      ${p.label}<br><small>${p.subtitle}</small>
    </button>`).join('');

  const totalPef = computeProfilePef(profile);
  const damageScores = computeProfileDamage(profile);
  const items = computeProfileItems(profile);

  // Gauge — horizontal bar chart with reference lines
  if (state.empreinteGaugeChart) { state.empreinteGaugeChart.destroy(); state.empreinteGaugeChart = null; }
  const gCtx = document.getElementById('empreinte-gauge-chart');
  if (gCtx) {
    const maxVal = Math.max(totalPef * 1.15, PLANETARY.EU_MOYENNE * 1.2, 1500);
    state.empreinteGaugeChart = new Chart(gCtx, {
      type: 'bar',
      data: {
        labels: ['Empreinte annuelle estimée'],
        datasets: [{
          label: profile.label,
          data: [totalPef],
          backgroundColor: profile.color + 'CC',
          borderColor: profile.color,
          borderWidth: 2,
          borderRadius: 6,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.x.toFixed(1)} mPt — ${profile.label}`
            }
          },
          annotation: {
            annotations: {
              lineEU: {
                type: 'line', xMin: PLANETARY.EU_MOYENNE, xMax: PLANETARY.EU_MOYENNE,
                borderColor: '#E53E3E', borderWidth: 2, borderDash: [6, 3],
                label: { content: 'Moyenne UE périmètre catalogue (500 mPt)', display: true,
                         position: 'start', color: '#E53E3E', font: { size: 10 } }
              },
              line2050: {
                type: 'line', xMin: PLANETARY.CIBLE_2050, xMax: PLANETARY.CIBLE_2050,
                borderColor: '#276749', borderWidth: 2, borderDash: [6, 3],
                label: { content: 'Cible 2050 périmètre catalogue (150 mPt)', display: true,
                         position: 'start', color: '#276749', font: { size: 10 } }
              }
            }
          }
        },
        scales: {
          x: {
            max: maxVal,
            title: { display: true, text: 'mPt (millipoints EF3.1)' },
            ticks: { font: { size: 11 } }
          },
          y: { ticks: { display: false } }
        }
      }
    });
  }

  // Legend beneath gauge
  const legend = document.getElementById('gauge-legend');
  const pct_eu = ((totalPef / PLANETARY.EU_MOYENNE) * 100).toFixed(0);
  const pct_2050 = ((totalPef / PLANETARY.CIBLE_2050) * 100).toFixed(0);
  legend.innerHTML = `
    <div class="gauge-stat" style="color:${profile.color}">
      <div class="gauge-stat-val">${totalPef.toFixed(1)}</div>
      <div class="gauge-stat-lbl">mPt / an</div>
    </div>
    <div class="gauge-divider"></div>
    <div class="gauge-stat" style="color:#E53E3E">
      <div class="gauge-stat-val">${pct_eu}%</div>
      <div class="gauge-stat-lbl">de la moyenne UE</div>
    </div>
    <div class="gauge-divider"></div>
    <div class="gauge-stat" style="color:#276749">
      <div class="gauge-stat-val">${pct_2050}%</div>
      <div class="gauge-stat-lbl">de la cible 2050</div>
    </div>`;

  // Breakdown radar chart — valeurs absolues (mPt) par catégorie de dommage
  if (state.empreinteBreakdownChart) { state.empreinteBreakdownChart.destroy(); state.empreinteBreakdownChart = null; }
  const bCtx = document.getElementById('empreinte-breakdown-chart');
  if (bCtx) {
    const radarLabels = Object.values(DAMAGE_CATEGORIES).map(d => d.label.replace(/^.+? /, ''));

    // Compute absolute mPt per damage category for all profiles
    const allDmgData = PROFILES.map(p => {
      const dmg = computeProfileDamage(p);
      return Object.keys(DAMAGE_CATEGORIES).map(k => +dmg[k].toFixed(2));
    });

    // Dynamic max scale: max value across all profiles & categories, rounded up
    const allVals = allDmgData.flat();
    const rawMax = Math.max(...allVals);
    const radarMax = Math.ceil(rawMax / 50) * 50;

    const datasets = PROFILES.map((p, i) => ({
      label: p.label,
      data: allDmgData[i],
      backgroundColor: p.color + (i === state.empreinteProfile ? '33' : '11'),
      borderColor: p.color + (i === state.empreinteProfile ? '' : '88'),
      pointBackgroundColor: p.color,
      borderWidth: i === state.empreinteProfile ? 3 : 1.5,
      pointRadius: i === state.empreinteProfile ? 5 : 3,
    }));

    state.empreinteBreakdownChart = new Chart(bCtx, {
      type: 'radar',
      data: { labels: radarLabels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: radarMax,
            ticks: { display: true, stepSize: radarMax / 4, font: { size: 9 }, color: '#A0AEC0',
                     callback: v => v + ' mPt' },
            pointLabels: { font: { size: 12, weight: 'bold' } },
            grid: { color: '#E2E8F0' },
          }
        },
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.r.toFixed(1)} mPt`
            }
          }
        }
      }
    });
  }

  // Per-item list
  const listEl = document.getElementById('empreinte-items-list');
  const topPef = items[0] ? items[0].pef : 1;
  listEl.innerHTML = items.map(({ obj, qty, pef }) => {
    const pct = (pef / totalPef * 100).toFixed(1);
    const barW = Math.max(2, (pef / topPef) * 100).toFixed(1);
    const catColor = CAT_COLORS[obj.categorie] || { border: '#CBD5E0' };
    const qtyFmt = qty >= 1
      ? qty.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + '×'
      : '×' + qty.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    return `
      <div class="empreinte-item" onclick="openDetail(${obj.id})">
        <div class="ei-head">
          <span class="ei-emoji">${obj.emoji}</span>
          <span class="ei-name">${obj.nom}</span>
          <span class="ei-qty">${qtyFmt} / an</span>
          <span class="ei-pef">${pef.toFixed(2)} mPt</span>
          <span class="ei-pct">${pct}%</span>
        </div>
        <div class="ei-bar-track">
          <div class="ei-bar" style="width:${barW}%;background:${catColor.border}"></div>
        </div>
      </div>`;
  }).join('');
}

function selectProfile(i) {
  state.empreinteProfile = i;
  renderEmpreinte();
}

/* ── Methodologie ── */

// Descriptions enrichies des indicateurs (intégrées dans le niveau 2)
const INDICATOR_META = {
  GWP:       { simple: "Mesure les gaz à effet de serre qui réchauffent la planète (CO₂, méthane, N₂O…)", fait: "1 km en voiture thermique ≈ 120 g CO₂ eq. — un Français émet ~10 t CO₂ eq./an" },
  ODP:       { simple: "Mesure la destruction de la couche d'ozone stratosphérique qui nous protège des UV", fait: "1 kg de CFC-11 détruit l'équivalent de 1 000 kg d'ozone stratosphérique" },
  IR:        { simple: "Mesure l'exposition aux radiations émises par des matières radioactives dans les procédés industriels", fait: "Un scanner médical expose à ~10 mSv — soit 3 ans de radioactivité naturelle" },
  POCF:      { simple: "Mesure la formation de smog photochimique (brouillard toxique) qui irrite les voies respiratoires", fait: "Les pics de smog réduisent l'espérance de vie de 1 à 2 ans dans les grandes villes" },
  PM:        { simple: "Mesure les poussières fines (PM2.5) qui pénètrent profondément dans les poumons et le sang", fait: "Les PM2.5 causent 40 000 décès prématurés/an en France — 1ère cause de mortalité environnementale" },
  HT_nc:     { simple: "Mesure les effets toxiques non-cancérogènes des substances chimiques sur la santé humaine", fait: "L'exposition aux pesticides organophosphorés est liée à des troubles neurologiques dès des doses infimes (μg/kg)" },
  HT_cancer: { simple: "Mesure le risque de cancers induit par l'exposition à des substances chimiques tout au long du cycle de vie", fait: "L'amiante cause encore 3 000 mésothéliomes/an en France, 40 ans après son interdiction" },
  AP:        { simple: "Mesure l'acidification des sols et des eaux par les pluies acides (SO₂, NOₓ, NH₃)", fait: "Le pH des lacs scandinaves a chuté de 0,5 unité en 30 ans à cause des pluies acides" },
  EP_Eau:    { simple: "Mesure l'excès de phosphore qui provoque la prolifération d'algues étouffant la vie en eau douce", fait: "15 kg de phosphore suffisent à rendre un lac de 1 ha impropre à la baignade" },
  EP_Marine: { simple: "Mesure l'excès d'azote qui crée des zones mortes sans oxygène dans les océans et mers côtières", fait: "La zone morte du Golfe du Mexique (>20 000 km²) est liée aux engrais du Mississippi" },
  EP_Terre:  { simple: "Mesure le dépôt d'azote qui appauvrit la biodiversité végétale des prairies et forêts", fait: "Les dépôts azotés font disparaître 1 espèce végétale tous les 10 ans dans les prairies européennes" },
  ETIC:      { simple: "Mesure la toxicité des substances chimiques (métaux lourds, pesticides…) sur les organismes aquatiques", fait: "10 μg/L de cuivre dans un ruisseau suffisent à éliminer 50% des invertébrés aquatiques" },
  LU:        { simple: "Mesure l'impact sur les sols : occupation, dégradation, imperméabilisation et déforestation", fait: "L'artificialisation consomme 20 000 ha/an en France — l'équivalent d'un département tous les 10 ans" },
  WU:        { simple: "Mesure la consommation d'eau douce dans les zones où elle est rare (eau de déprivation)", fait: "Produire 1 kg de bœuf consomme ~15 000 litres d'eau — 1 kg de blé ≈ 1 500 litres" },
  RU_Fossil: { simple: "Mesure l'épuisement des combustibles fossiles non renouvelables (pétrole, gaz, charbon)", fait: "À la consommation actuelle, les réserves de pétrole conventionnel couvrent ~50 ans" },
  RU_Metal:  { simple: "Mesure l'épuisement des ressources minérales et métalliques (fer, cuivre, lithium, terres rares…)", fait: "Un smartphone contient 60+ métaux différents — dont certains extraits quasi exclusivement en zone de conflit" },
};

// ════════════════════════════════════════════════════════════════════
// PAGE MÉTHODE — logique multi-niveaux
// ════════════════════════════════════════════════════════════════════

function renderMethodologie() {
  initMethodePage();
}

let _methodeInited = false;

function initMethodePage() {
  // Tabs niveau
  document.querySelectorAll('.mlevel-tab').forEach(btn => {
    btn.onclick = () => setMethodeLevel(parseInt(btn.dataset.level));
  });

  // Accordéons niveau 3
  document.querySelectorAll('.macc-header').forEach(hdr => {
    hdr.onclick = () => {
      const item = hdr.closest('.macc-item');
      item.classList.toggle('open');
    };
  });

  // Rendu dynamique niveau 2 (une seule fois)
  if (!_methodeInited) {
    _renderMethodeIndicatorsL2();
    _renderMethodeWeightBars();
    _methodeInited = true;
  }

  // Activer niveau 1 par défaut
  setMethodeLevel(1);
}

function setMethodeLevel(n) {
  // Tabs
  document.querySelectorAll('.mlevel-tab').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.level) === n);
  });
  // Contenu
  document.querySelectorAll('.methode-level-content').forEach(el => {
    el.classList.toggle('hidden', el.id !== `mlevel-${n}`);
  });
}

/* Grille des 16 indicateurs (niveau 2) — avec descriptions INDICATOR_META */
function _renderMethodeIndicatorsL2() {
  const container = document.getElementById('methode-indicators-l2');
  if (!container) return;

  const damageInfo = {
    climat:      { label: '🌡️ Changement climatique', color: '#C53030', bg: '#FFF5F5' },
    ecosystemes: { label: '🌿 Écosystèmes',            color: '#276749', bg: '#F0FFF4' },
    sante:       { label: '🏥 Santé humaine',           color: '#744210', bg: '#FFFFF0' },
    ressources:  { label: '🪨 Ressources',              color: '#44337A', bg: '#FAF5FF' },
  };

  const groups = {};
  Object.entries(EF31).forEach(([k, m]) => {
    if (!groups[m.damage]) groups[m.damage] = [];
    groups[m.damage].push({ k, ...m });
  });

  const maxWeight = Math.max(...Object.values(EF31).map(m => m.weight));

  let html = '';
  Object.entries(DAMAGE_CATEGORIES).forEach(([dKey, dData]) => {
    const grp = groups[dKey];
    if (!grp) return;
    const di = damageInfo[dKey];
    html += `<div class="mind-group">
      <div class="mind-group-header" style="background:${di.bg};color:${di.color}">${di.label}</div>`;
    grp.forEach(m => {
      const barW = (m.weight / maxWeight * 100).toFixed(1);
      const meta = INDICATOR_META[m.k] || {};
      const descHtml = meta.simple
        ? `<div class="mind-desc">${meta.simple}</div>`
        : '';
      const faitHtml = meta.fait
        ? `<div class="mind-fait">${meta.fait}</div>`
        : '';
      html += `<div class="mind-row">
        <span class="mind-name">${m.label}${descHtml}${faitHtml}</span>
        <span class="mind-code">${m.k}</span>
        <span class="mind-unit">${m.unit}</span>
        <span class="mind-weight" style="color:${di.color}">${m.weight}%</span>
        <div class="mind-weight-bar">
          <div class="mind-weight-bar-fill" style="width:${barW}%;background:${di.color}"></div>
        </div>
      </div>`;
    });
    html += '</div>';
  });

  container.innerHTML = html;
}

/* Barres de pondération agrégées (niveau 2) */
function _renderMethodeWeightBars() {
  const container = document.getElementById('methode-weight-bars-l2');
  if (!container) return;

  const damageColors = {
    climat:      '#C53030',
    ecosystemes: '#276749',
    sante:       '#744210',
    ressources:  '#44337A',
  };

  const sorted = Object.entries(EF31).sort((a, b) => b[1].weight - a[1].weight);
  const maxW = sorted[0][1].weight;

  container.innerHTML = sorted.map(([k, m]) => {
    const barW = (m.weight / maxW * 100).toFixed(1);
    const color = damageColors[m.damage] || '#718096';
    return `<div class="mwb-row">
      <span class="mwb-label">${m.label}</span>
      <div class="mwb-track">
        <div class="mwb-fill" style="width:${barW}%;background:${color}"></div>
      </div>
      <span class="mwb-val" style="color:${color}">${m.weight}%</span>
    </div>`;
  }).join('');
}

