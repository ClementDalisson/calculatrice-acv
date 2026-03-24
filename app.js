// ─────────────────────────────────────────────────────────────────────────────
// app.js — Logique calculatrice ACV Grand Public
// ─────────────────────────────────────────────────────────────────────────────

/* ── State ── */
let state = {
  section: 'catalogue',
  selectedIds: [],
  filterCat: 'all',
  detailId: null,
  detailChart: null,
  compareChart1: null,
  compareChart2: null,
  empreinteProfile: 2, // Default: Moyen français
  empreinteGaugeChart: null,
  empreinteBreakdownChart: null,
};

/* ── Utils ── */
function fmt(v, ind) {
  if (v === null || v === undefined) return '<span class="nd">n.d.</span>';
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (ind === 'GWP' || ind === 'LU' || ind === 'RU_Fossil' || ind === 'IR' || ind === 'ETIC')
    return abs < 0.001 ? v.toExponential(2) : v.toLocaleString('fr-FR', {maximumFractionDigits: 3, minimumFractionDigits: 2});
  if (abs < 1e-6) return v.toExponential(2);
  if (abs < 0.01) return v.toExponential(3);
  if (abs < 1)    return v.toPrecision(4);
  return v.toLocaleString('fr-FR', {maximumFractionDigits: 3});
}

function fmtGwp(v) {
  if (v === null) return '—';
  const abs = Math.abs(v);
  if (abs < 0.001) return v.toFixed(5);
  if (abs < 0.01)  return v.toFixed(4);
  if (abs < 0.1)   return v.toFixed(3);
  if (abs < 10)    return v.toFixed(2);
  return v.toLocaleString('fr-FR', {maximumFractionDigits: 1});
}

function fmtPef(v, completude) {
  if (completude < 50) return 'Incomplet*';
  return v.toLocaleString('fr-FR', {maximumFractionDigits: 3, minimumFractionDigits: 3});
}

function getObj(id) { return CATALOGUE.find(o => o.id === id); }

/* ── Jetons (tokens) ── */

// Calcule le coût externe environnemental total d'un objet (en €)
function computeExtCost(obj) {
  let total = 0;
  Object.entries(ECI).forEach(([ind, factor]) => {
    const v = obj.impacts[ind];
    if (v !== null && v !== undefined) total += v * factor;
  });
  return total;
}

// Formate une valeur de jeton avec l'unité la plus lisible
function fmtTokenVal(val, type) {
  if (val === null || val === undefined) return null;
  const abs = Math.abs(val);
  switch (type) {
    case 'co2':
      if (abs < 0.001) return '<0,001 kg';
      if (abs < 10)    return val.toFixed(2) + ' kg';
      if (abs < 1000)  return val.toFixed(1) + ' kg';
      return (val / 1000).toFixed(2) + ' t';
    case 'eau':
      if (abs < 0.001) return (abs * 1000).toFixed(1) + ' L';
      if (abs < 0.1)   return val.toFixed(3) + ' m³';
      if (abs < 1)     return val.toFixed(2) + ' m³';
      if (abs < 1000)  return val.toFixed(1) + ' m³';
      return val.toFixed(0) + ' m³';
    case 'minerais':
      // val en kg Sb eq. → choisir l'unité lisible
      if (abs < 1e-6) return (abs * 1e9).toFixed(1) + ' µg';
      if (abs < 1e-3) return (abs * 1e6).toFixed(1) + ' mg';
      if (abs < 1)    return (abs * 1e3).toFixed(2) + ' g';
      return abs.toFixed(2) + ' kg';
    case 'fossile':
      if (abs < 1)    return abs.toFixed(2) + ' MJ';
      if (abs < 1000) return abs.toFixed(0) + ' MJ';
      return (abs / 1000).toFixed(1) + ' GJ';
    case 'eau_L':  // WU en m³ → afficher en L (ou m³ si très grand)
      { const L = val * 1000;
        if (L < 1)     return L.toFixed(2) + ' L';
        if (L < 100)   return L.toFixed(1) + ' L';
        if (L < 10000) return Math.round(L) + ' L';
        return (L / 1000).toFixed(0) + ' m³'; }
    case 'mpt':  // score en millipoints
      if (abs < 0.001) return val.toFixed(5) + ' mPt';
      if (abs < 0.1)   return val.toFixed(3) + ' mPt';
      if (abs < 10)    return val.toFixed(2) + ' mPt';
      return val.toFixed(1) + ' mPt';
  }
}

// Calcule le sous-score santé environnementale (catégorie "sante" du PEF, en mPt)
function computeHealthScore(obj) {
  let score = 0;
  DAMAGE_CATEGORIES.sante.indicators.forEach(ind => {
    const meta = EF31[ind];
    const v = obj.impacts[ind];
    if (v !== null && v !== undefined) score += (v / meta.norm) * (meta.weight / 100) * 1000;
  });
  return score;
}

// Maxima du catalogue (référence 100% pour les barres de progression)
let _tokenMaxes = null;
function getTokenMaxes() {
  if (_tokenMaxes) return _tokenMaxes;
  _tokenMaxes = { GWP: 1e-9, WU: 1e-9, RU_Metal: 1e-12, RU_Fossil: 1e-9, health: 1e-9, pef: 1e-9 };
  CATALOGUE.forEach(obj => {
    if (obj.impacts.GWP       != null) _tokenMaxes.GWP       = Math.max(_tokenMaxes.GWP,       obj.impacts.GWP);
    if (obj.impacts.WU        != null) _tokenMaxes.WU        = Math.max(_tokenMaxes.WU,        obj.impacts.WU);
    if (obj.impacts.RU_Metal  != null) _tokenMaxes.RU_Metal  = Math.max(_tokenMaxes.RU_Metal,  Math.abs(obj.impacts.RU_Metal));
    if (obj.impacts.RU_Fossil != null) _tokenMaxes.RU_Fossil = Math.max(_tokenMaxes.RU_Fossil, obj.impacts.RU_Fossil);
    _tokenMaxes.health = Math.max(_tokenMaxes.health, computeHealthScore(obj));
    if (obj.completude >= 50) _tokenMaxes.pef = Math.max(_tokenMaxes.pef, obj.pef_mpt);
  });
  return _tokenMaxes;
}

// Barres de progression compactes pour les cartes du catalogue
// 4 barres = 4 catégories de dommage EF3.1, normalisées en % de ce produit (somme = 100%)
function renderTokenBars(obj) {
  const catEmoji = { climat: '🌡️', ecosystemes: '🌿', sante: '🏥', ressources: '⛏️💧' };

  // Sous-scores mPt par catégorie de dommage
  const catScores = Object.entries(DAMAGE_CATEGORIES).map(([dKey, dData]) => {
    let score = 0;
    dData.indicators.forEach(ind => {
      const meta = EF31[ind];
      const v = obj.impacts[ind];
      if (v !== null && v !== undefined) score += (v / meta.norm) * (meta.weight / 100) * 1000;
    });
    return { dKey, dData, score: Math.max(0, score) };
  });

  const total = catScores.reduce((sum, c) => sum + c.score, 0);

  const bars = total > 0 ? catScores.map(({ dKey, dData, score }) => {
    const pctW   = Math.max(2, (score / total) * 100).toFixed(1);
    const pctLbl = Math.round((score / total) * 100);
    const emoji  = catEmoji[dKey] || '🔵';
    const valFmt = score.toFixed(2) + ' mPt';
    return `<div class="tbr" title="${dData.label} : ${pctLbl}% (${valFmt})">
      <span class="tbr-emoji">${emoji}</span>
      <div class="tbr-track"><div class="tbr-fill" style="width:${pctW}%;background:${dData.color}"></div></div>
      <span class="tbr-val">${pctLbl}%</span>
    </div>`;
  }).join('') : '';

  // Score environnemental — entier mPt, sans barre
  const scoreChip = obj.completude >= 50
    ? `<div class="card-score-chip">📊 ${Math.round(obj.pef_mpt)} mPt</div>`
    : '';

  return `<div class="card-bars">${bars}${scoreChip}</div>`;
}

// Panneau de détail : 6 token-cards (CO₂, Eau, Minerais, Fossiles, Santé, Score)
function renderTokenRow(obj) {
  const healthVal = computeHealthScore(obj);
  const items = [
    { emoji: '🌡️', label: 'CO₂',         val: obj.impacts.GWP,                            type: 'co2',      title: 'Changement climatique (kg CO₂ eq.)' },
    { emoji: '💧', label: 'Eau',         val: obj.impacts.WU,                             type: 'eau_L',    title: 'Consommation d\'eau (litres)' },
    { emoji: '⛏️', label: 'Minerais',    val: obj.impacts.RU_Metal,                       type: 'minerais', title: 'Ressources minérales extraites (kg Sb eq.)' },
    { emoji: '⚡', label: 'Fossiles',    val: obj.impacts.RU_Fossil,                      type: 'fossile',  title: 'Ressources fossiles extraites (MJ surplus)' },
    { emoji: '🫁', label: 'Santé env.',  val: healthVal,                                  type: 'mpt',      title: 'Impacts santé humaine — sous-score EF3.1 (mPt)' },
    { emoji: '📊', label: 'Score env.',  val: obj.completude >= 50 ? obj.pef_mpt : null,  type: 'mpt',      title: 'Score environnemental total (somme des 16 indicateurs EF3.1, en mPt)' },
  ];
  return items.map(t => {
    const formatted = fmtTokenVal(t.val, t.type);
    if (formatted === null) return '';
    const isSynthesis = t.emoji === '📊';
    return `<div class="token-card${isSynthesis ? ' token-card-score' : ''}" title="${t.title}">
      <div class="tc-emoji">${t.emoji}</div>
      <div class="tc-val">${formatted}</div>
      <div class="tc-lbl">${t.label}</div>
    </div>`;
  }).join('');
}

// Retourne les totaux annuels (jetons) d'un profil
function computeProfileTokenTotals(profile) {
  const totals = { GWP: 0, WU: 0, RU_Metal: 0, RU_Fossil: 0, euro: 0 };
  CATALOGUE.forEach(obj => {
    const qty = profile.qtys[obj.id] || 0;
    if (qty === 0) return;
    ['GWP','WU','RU_Metal','RU_Fossil'].forEach(ind => {
      if (obj.impacts[ind] !== null && obj.impacts[ind] !== undefined)
        totals[ind] += obj.impacts[ind] * qty;
    });
    totals.euro += computeExtCost(obj) * qty;
  });
  return totals;
}

/* ── Navigation ── */
function goTo(section) {
  state.section = section;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-' + section).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.section === section);
  });
  if (section === 'compare') renderCompare();
  if (section === 'empreinte') renderEmpreinte();
  updateNavBadge();
}

function updateNavBadge() {
  const badge = document.getElementById('compare-badge');
  badge.textContent = state.selectedIds.length;
  badge.style.display = state.selectedIds.length > 0 ? 'inline' : 'none';
}

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
      alert('Maximum 5 objets en comparaison simultanée.');
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
  const obj = getObj(id);
  if (!obj) return;

  const overlay = document.getElementById('detail-overlay');
  overlay.classList.add('open');

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
      maintainAspectRatio: true,
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

  // GWP header row
  rows += `<tr class="highlight-row">
    <td>🌡️ GWP (kg CO₂ eq.) — <em>Climat 21%</em></td>
    ${buildValueCells(objects, 'GWP', true)}</tr>`;

  // PEF score
  rows += `<tr class="highlight-row">
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
        <h4>Catégories de dommage (% du score PEF)</h4>
        <div class="compare-radar-wrap"><canvas id="compare-radar-chart"></canvas></div>
      </div>
      <div class="compare-chart-box" style="flex:1;min-width:280px">
        <h4>Score PEF (mPt)</h4>
        <canvas id="compare-pef-chart"></canvas>
      </div>
    </div>`;

  document.getElementById('compare-content').innerHTML = table + charts;

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

  // Radar chart — 4 catégories de dommage en valeurs absolues (mPt)
  const ctx1 = document.getElementById('compare-radar-chart');
  if (ctx1) {
    const radarLabels = Object.values(DAMAGE_CATEGORIES).map(d => d.label.replace(/^.+? /, ''));
    const allAbsData = objects.map(obj => {
      const abs = damageAbsolute(obj);
      return Object.keys(DAMAGE_CATEGORIES).map(k => +abs[k].toFixed(2));
    });
    const radarMax = Math.ceil(Math.max(...allAbsData.flat()) / 10) * 10 || 50;

    const datasets = objects.map((obj, i) => ({
      label: obj.emoji + ' ' + obj.nom,
      data: allAbsData[i],
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
        maintainAspectRatio: true,
        scales: {
          r: {
            beginAtZero: true,
            max: radarMax,
            ticks: { display: true, stepSize: radarMax / 4, font: { size: 9 }, color: '#A0AEC0',
                     callback: v => v + ' mPt' },
            pointLabels: { font: { size: 11 } },
            grid: { color: '#E2E8F0' },
          }
        },
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.r.toFixed(2)} mPt`
            }
          }
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
        responsive: true, maintainAspectRatio: true,
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

function clearCompare() {
  state.selectedIds = [];
  renderCatalogue();
  updateNavBadge();
  renderCompare();
}

/* ── Empreinte annuelle ── */

// Compute total PEF mPt for a profile
function computeProfilePef(profile) {
  let total = 0;
  CATALOGUE.forEach(obj => {
    const qty = profile.qtys[obj.id] || 0;
    if (qty === 0 || obj.completude < 50) return;
    total += obj.pef_mpt * qty;
  });
  return total;
}

// Compute PEF per damage category for a profile
function computeProfileDamage(profile) {
  const damage = {};
  Object.keys(DAMAGE_CATEGORIES).forEach(k => { damage[k] = 0; });
  CATALOGUE.forEach(obj => {
    const qty = profile.qtys[obj.id] || 0;
    if (qty === 0) return;
    Object.entries(DAMAGE_CATEGORIES).forEach(([dKey, dData]) => {
      dData.indicators.forEach(ind => {
        const meta = EF31[ind];
        const v = obj.impacts[ind];
        if (v !== null && v !== undefined) {
          damage[dKey] += (v / meta.norm) * (meta.weight / 100) * 1000 * qty;
        }
      });
    });
  });
  return damage;
}

// Compute per-item PEF contributions for a profile (sorted descending)
function computeProfileItems(profile) {
  return CATALOGUE
    .map(obj => {
      const qty = profile.qtys[obj.id] || 0;
      const pef = (qty > 0 && obj.completude >= 50) ? obj.pef_mpt * qty : 0;
      return { obj, qty, pef };
    })
    .filter(x => x.pef > 0)
    .sort((a, b) => b.pef - a.pef);
}

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
  const annualTokens = computeProfileTokenTotals(profile);
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
    </div>
    <div style="width:100%;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--gray-200)">
      <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:.04em">Jetons annuels estimés</div>
      <div class="annual-tokens-row">
        <span class="token-pill" title="CO₂ annuel"><span class="tp-emoji">🌡️</span><span class="tp-val">${fmtTokenVal(annualTokens.GWP, 'co2')}</span></span>
        <span class="token-pill" title="Eau annuelle"><span class="tp-emoji">💧</span><span class="tp-val">${fmtTokenVal(annualTokens.WU, 'eau_L')}</span></span>
        <span class="token-pill" title="Minerais annuels"><span class="tp-emoji">⛏️</span><span class="tp-val">${fmtTokenVal(annualTokens.RU_Metal, 'minerais')}</span></span>
        <span class="token-pill" title="Ressources fossiles annuelles"><span class="tp-emoji">⚡</span><span class="tp-val">${fmtTokenVal(annualTokens.RU_Fossil, 'fossile')}</span></span>
      </div>
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
        maintainAspectRatio: true,
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
function renderMethodologie() {
  const container = document.getElementById('methodo-indicators');
  container.innerHTML = Object.entries(EF31).map(([k, m]) => {
    const dmg = DAMAGE_CATEGORIES[m.damage];
    return `<tr>
      <td><strong>${m.label}</strong></td>
      <td style="font-family:monospace;font-size:0.78rem">${k}</td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${m.unit}</td>
      <td style="text-align:right;font-weight:700">${m.weight}%</td>
      <td style="color:${dmg.color};font-size:0.78rem">${dmg.label}</td>
    </tr>`;
  }).join('');
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  // Nav
  document.querySelectorAll('.nav-link').forEach(l => {
    l.addEventListener('click', () => goTo(l.dataset.section));
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.addEventListener('click', () => setFilter(b.dataset.cat));
  });

  // Close detail
  document.getElementById('detail-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetail();
  });
  document.getElementById('detail-close-btn').addEventListener('click', closeDetail);

  // Clear compare
  document.getElementById('compare-clear-btn').addEventListener('click', clearCompare);

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDetail();
  });

  renderCatalogue();
  renderMethodologie();
  updateNavBadge();
  goTo('catalogue');
});
