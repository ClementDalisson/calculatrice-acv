// ─────────────────────────────────────────────────────────────────────────────
// app.js — Logique calculatrice ACV Grand Public
// ─────────────────────────────────────────────────────────────────────────────

/* ── State ── */
let state = {
  main: 'perso',
  section: 'catalogue',
  subSection: 'catalogue',
  selectedIds: [],
  filterCat: 'all',
  detailId: null,
  detailChart: null,
  compareChart1: null,
  compareChart2: null,
  empreinteProfile: 2,
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
function showOnly(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('sec-' + section);
  if (el) el.classList.add('active');
}

function goToMain(main) {
  state.main = main;
  document.querySelectorAll('.nav-link[data-main]').forEach(l => {
    l.classList.toggle('active', l.dataset.main === main);
  });
  const subnav = document.getElementById('subnav');
  if (subnav) subnav.style.display = main === 'perso' ? '' : 'none';

  if (main === 'perso') {
    goTo(state.subSection || 'catalogue');
  } else if (main === 'organisation') {
    showOnly('entreprise');
    renderEntrepriseSection();
  } else if (main === 'contact') {
    showOnly('contact');
    renderMethodologie();
  }
}

function goTo(section) {
  state.section = section;
  if (['catalogue', 'compare', 'empreinte'].includes(section)) {
    state.subSection = section;
  }
  showOnly(section);
  document.querySelectorAll('.subnav-link').forEach(l => {
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

// ════════════════════════════════════════════════════════════════════
// MODE ENTREPRISE — Analyse multi-critères EF3.1 pour organisations
// ════════════════════════════════════════════════════════════════════

// ── Facteurs d'émission entreprise (EF3.1, 16 indicateurs) ──────────
const FE_ENTREPRISE = {
  // SCOPE 1 — Émissions directes
  gaz_kwh: {
    label: "Gaz naturel", unit: "kWh PCI", scope: 1,
    GWP:0.2763, ODP:1.212e-8, AP:2.263e-4, EP_Eau:1.133e-6,
    EP_Marine:6.760e-5, EP_Terre:7.468e-4, POCF:4.805e-4, PM:1.272e-9,
    IR:1.372e-3, LU:0.09513, WU:6.220e-3, RU_Fossil:3.925,
    RU_Metal:2.703e-7, HT_cancer:6.408e-11, HT_nc:5.678e-10, ETIC:0.20720
  },
  fioul_L: {
    label: "Fioul domestique", unit: "litres", scope: 1,
    GWP:3.15, ODP:9.89e-9, AP:2.939e-4, EP_Eau:1.190e-5,
    EP_Marine:7.436e-4, EP_Terre:8.638e-3, POCF:6.059e-3, PM:2.541e-8,
    IR:1.440e-2, LU:0.9989, WU:6.531e-2, RU_Fossil:37.7,
    RU_Metal:2.838e-6, HT_cancer:1.009e-9, HT_nc:8.965e-9, ETIC:2.776
  },
  diesel_100km: {
    label: "Véhicule flotte diesel", unit: "100 km", scope: 1,
    GWP:12.4, ODP:2.664e-7, AP:2.749e-2, EP_Eau:5.278e-5,
    EP_Marine:5.210e-3, EP_Terre:5.048e-2, POCF:2.839e-2, PM:3.348e-7,
    IR:4.627e-2, LU:21.84, WU:1.243, RU_Fossil:161.6,
    RU_Metal:3.200e-6, HT_cancer:2.298e-9, HT_nc:3.940e-8, ETIC:97.9
  },
  hfc134a_kg: {
    label: "Fuites réfrigérant HFC-134a", unit: "kg", scope: 1,
    GWP:1430.0, ODP:0, AP:0, EP_Eau:0, EP_Marine:0, EP_Terre:0,
    POCF:0, PM:0, IR:0, LU:0, WU:0, RU_Fossil:8.5,
    RU_Metal:0, HT_cancer:0, HT_nc:0, ETIC:0
  },
  // SCOPE 2 — Énergie achetée
  elec_kwh: {
    label: "Électricité réseau France", unit: "kWh", scope: 2,
    GWP:0.0801, ODP:8.773e-10, AP:2.098e-4, EP_Eau:3.269e-8,
    EP_Marine:7.613e-5, EP_Terre:4.978e-4, POCF:2.108e-4, PM:4.158e-9,
    IR:3.2342, LU:0, WU:null, RU_Fossil:9.313,
    RU_Metal:4.858e-8, HT_cancer:null, HT_nc:null, ETIC:null
  },
  // SCOPE 3 — Transport
  ve_100km: {
    label: "Véhicule électrique (usage)", unit: "100 km", scope: 3,
    GWP:1.442, ODP:1.579e-8, AP:3.776e-3, EP_Eau:5.884e-7,
    EP_Marine:1.370e-3, EP_Terre:8.960e-3, POCF:3.794e-3, PM:7.484e-8,
    IR:58.22, LU:0, WU:null, RU_Fossil:167.6,
    RU_Metal:8.744e-7, HT_cancer:null, HT_nc:null, ETIC:null
  },
  vol_court: {
    label: "Vol court-courrier (Europe)", unit: "passager", scope: 3,
    GWP:65.3, ODP:3.559e-10, AP:1.655e-4, EP_Eau:4.857e-6,
    EP_Marine:6.893e-5, EP_Terre:7.545e-4, POCF:1.918e-4, PM:6.426e-7,
    IR:1.281, LU:0, WU:null, RU_Fossil:531.3,
    RU_Metal:1.960e-6, HT_cancer:null, HT_nc:null, ETIC:null
  },
  vol_lc: {
    label: "Vol long-courrier (intercontinental)", unit: "passager", scope: 3,
    GWP:701.27, ODP:6.50e-9, AP:3.026e-3, EP_Eau:8.877e-5,
    EP_Marine:1.260e-3, EP_Terre:1.379e-2, POCF:3.505e-3, PM:1.174e-5,
    IR:23.41, LU:0, WU:null, RU_Fossil:9708.2,
    RU_Metal:3.583e-5, HT_cancer:null, HT_nc:null, ETIC:null
  },
  // SCOPE 3 — Achats
  papier_ramette: {
    label: "Papier A4 (ramette 500 f.)", unit: "ramettes", scope: 3,
    GWP:3.85, ODP:2.5e-9, AP:3.5e-2, EP_Eau:7.5e-4,
    EP_Marine:7.5e-3, EP_Terre:1.25e-2, POCF:5.0e-3, PM:7.5e-8,
    IR:0.075, LU:125.0, WU:0.75, RU_Fossil:50.0,
    RU_Metal:2.5e-7, HT_cancer:1.25e-9, HT_nc:2.0e-8, ETIC:12.5
  },
  ecran_24: {
    label: "Écran 24\" (cycle de vie)", unit: "unités", scope: 3,
    GWP:216.0, ODP:2.023e-8, AP:1.875, EP_Eau:2.573e-3,
    EP_Marine:3.539e-1, EP_Terre:3.764, POCF:1.008, PM:4.749e-5,
    IR:58.52, LU:null, WU:329.5, RU_Fossil:800.9,
    RU_Metal:2.618e-2, HT_cancer:2.181e-7, HT_nc:1.357e-5, ETIC:2481.8
  },
  serveur_1u: {
    label: "Serveur rack 1U (fabrication)", unit: "unités", scope: 3,
    GWP:800.0, ODP:7.494e-8, AP:6.943, EP_Eau:9.533e-3,
    EP_Marine:1.310, EP_Terre:1.394e1, POCF:3.732, PM:1.759e-4,
    IR:216.7, LU:null, WU:1220.6, RU_Fossil:2967.0,
    RU_Metal:9.696e-2, HT_cancer:8.076e-7, HT_nc:5.025e-5, ETIC:9190.0
  },
  // SCOPE 3 — Services
  nettoyage_m2: {
    label: "Nettoyage locaux", unit: "m²/an", scope: 3,
    GWP:10.2, ODP:3.5e-9, AP:4.5e-3, EP_Eau:9.0e-6,
    EP_Marine:1.8e-3, EP_Terre:7.5e-3, POCF:6.0e-3, PM:6.0e-9,
    IR:0.72, LU:null, WU:null, RU_Fossil:112.0,
    RU_Metal:1.8e-7, HT_cancer:5.0e-11, HT_nc:8.0e-10, ETIC:2.5
  },
  repas: {
    label: "Repas restauration collective", unit: "repas", scope: 3,
    GWP:2.2, ODP:8.0e-9, AP:1.9e-2, EP_Eau:8.0e-5,
    EP_Marine:6.5e-3, EP_Terre:9.7e-2, POCF:3.5e-3, PM:1.9e-7,
    IR:0.025, LU:80.0, WU:0.18, RU_Fossil:18.5,
    RU_Metal:2.2e-6, HT_cancer:6.0e-10, HT_nc:1.1e-8, ETIC:6.8
  },
  it_services_k: {
    label: "Services IT (1 000 €)", unit: "k€ HT", scope: 3,
    GWP:650.0, ODP:2.2e-7, AP:2.85e-1, EP_Eau:4.0e-4,
    EP_Marine:1.07e-1, EP_Terre:5.4e-1, POCF:2.85e-1, PM:2.8e-6,
    IR:210.0, LU:null, WU:null, RU_Fossil:6050.0,
    RU_Metal:6.5e-3, HT_cancer:null, HT_nc:null, ETIC:null
  },
  conseil_k: {
    label: "Conseil / formation (1 000 €)", unit: "k€ HT", scope: 3,
    GWP:450.0, ODP:1.5e-7, AP:1.97e-1, EP_Eau:2.8e-4,
    EP_Marine:7.4e-2, EP_Terre:3.74e-1, POCF:1.97e-1, PM:1.95e-6,
    IR:145.0, LU:null, WU:null, RU_Fossil:4185.0,
    RU_Metal:2.5e-3, HT_cancer:null, HT_nc:null, ETIC:null
  },
};

// ── Calcul PEF score depuis impacts bruts ────────────────────────────
function calcPEF_entreprise(impacts) {
  let score = 0, counted = 0;
  for (const [key, {norm, weight}] of Object.entries(EF31)) {
    const val = impacts[key];
    if (val != null && !isNaN(val)) {
      score += (val / norm) * (weight / 100) * 1000;
      counted++;
    }
  }
  return { score: Math.round(score * 1000) / 1000, completude: Math.round(counted / 16 * 100) };
}

// ── Rendu HTML du mode entreprise ────────────────────────────────────
function renderEntrepriseSection() {
  const sec = document.getElementById('sec-entreprise');
  if (!sec) return;

  sec.innerHTML = `
    <div class="entreprise-wrapper">
      <div class="entreprise-hero">
        <h2>🏢 Analyse Multi-Critères Entreprise</h2>
        <p>Estimez les impacts environnementaux de votre organisation selon les <strong>16 indicateurs EF3.1</strong> sur les 3 scopes du Bilan Carbone®. Saisissez vos données d'activité annuelles.</p>
        <div class="entreprise-badges">
          <span class="badge scope1">Scope 1 — Émissions directes</span>
          <span class="badge scope2">Scope 2 — Énergie achetée</span>
          <span class="badge scope3">Scope 3 — Chaîne de valeur</span>
        </div>
      </div>

      <div class="entreprise-form-grid">
        ${renderScopeForm(1, 'Scope 1 — Émissions directes', ['gaz_kwh','fioul_L','diesel_100km','hfc134a_kg'])}
        ${renderScopeForm(2, 'Scope 2 — Énergie achetée', ['elec_kwh'])}
        ${renderScopeForm(3, 'Scope 3 — Transport', ['ve_100km','vol_court','vol_lc'])}
        ${renderScopeForm(3, 'Scope 3 — Achats & équipements', ['papier_ramette','ecran_24','serveur_1u'])}
        ${renderScopeForm(3, 'Scope 3 — Services externalisés', ['nettoyage_m2','repas','it_services_k','conseil_k'])}
      </div>

      <button id="btn-calc-entreprise" onclick="calcEntreprise()">
        🔬 Calculer mes impacts multi-critères
      </button>

      <div id="entreprise-results" style="display:none"></div>

      <div class="entreprise-disclaimer">
        <strong>⚠️ Avertissement méthodologique</strong> : Les facteurs d'émission services (nettoyage, IT, conseil) sont issus de la méthode input-output EXIOBASE 3.9.4 (France 2019). Ils représentent des ordres de grandeur. Pour une étude certifiée Bilan Carbone®, des données primaires spécifiques au fournisseur sont recommandées.
        <br>Outil développé par <a href="mailto:clement.dalisson@gmail.com">Clément Dalisson</a> — Ingénieur Environnement, certifié Bilan Carbone® BCM2.
      </div>
    </div>
  `;
}

function renderScopeForm(scopeNum, titre, keys) {
  const scopeClass = `scope${scopeNum}`;
  const rows = keys.map(key => {
    const fe = FE_ENTREPRISE[key];
    if (!fe) return '';
    return `
      <div class="fe-input-row">
        <label class="fe-label">
          <span class="fe-name">${fe.label}</span>
          <span class="fe-unit">/ ${fe.unit}</span>
        </label>
        <input type="number" id="inp-${key}" class="fe-input"
               placeholder="0" min="0" step="any"
               onchange="updateEntreprisePreview()">
      </div>
    `;
  }).join('');

  return `
    <div class="scope-card ${scopeClass}">
      <h3><span class="scope-badge ${scopeClass}">${titre.split('—')[0].trim()}</span> ${titre.split('—')[1]?.trim() || ''}</h3>
      ${rows}
    </div>
  `;
}

function calcEntreprise() {
  const totals = {};
  const byScope = {1: {}, 2: {}, 3: {}};
  const IND_KEYS = Object.keys(EF31);

  for (const key of IND_KEYS) {
    totals[key] = 0;
    byScope[1][key] = 0;
    byScope[2][key] = 0;
    byScope[3][key] = 0;
  }

  let hasData = false;
  for (const [feKey, fe] of Object.entries(FE_ENTREPRISE)) {
    const input = document.getElementById(`inp-${feKey}`);
    if (!input) continue;
    const qty = parseFloat(input.value) || 0;
    if (qty === 0) continue;
    hasData = true;

    for (const indKey of IND_KEYS) {
      const val = fe[indKey];
      if (val != null && !isNaN(val)) {
        totals[indKey] += val * qty;
        byScope[fe.scope][indKey] += val * qty;
      }
    }
  }

  if (!hasData) {
    alert('Veuillez saisir au moins une donnée d\'activité.');
    return;
  }

  const pefTotal = calcPEF_entreprise(totals);
  const pefS1 = calcPEF_entreprise(byScope[1]);
  const pefS2 = calcPEF_entreprise(byScope[2]);
  const pefS3 = calcPEF_entreprise(byScope[3]);

  const resultsDiv = document.getElementById('entreprise-results');
  resultsDiv.style.display = 'block';
  resultsDiv.innerHTML = renderEntrepriseResults(totals, byScope, pefTotal, pefS1, pefS2, pefS3);
  resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

function renderEntrepriseResults(totals, byScope, pefTotal, pefS1, pefS2, pefS3) {
  const scopeTotal = pefS1.score + pefS2.score + pefS3.score;
  const pct = s => scopeTotal > 0 ? Math.round(s.score / scopeTotal * 100) : 0;

  return `
    <div class="entreprise-results-inner">
      <h3>📊 Résultats — Score environnemental EF3.1</h3>

      <div class="result-score-grid">
        <div class="result-score-total">
          <div class="score-val">${pefTotal.score.toFixed(1)} <span>mPt</span></div>
          <div class="score-label">Score environnemental total</div>
          <div class="score-sub">${pefTotal.completude}% des indicateurs disponibles</div>
        </div>
        <div class="result-scope-bars">
          ${[
            {label:'Scope 1', pef:pefS1, cls:'scope1'},
            {label:'Scope 2', pef:pefS2, cls:'scope2'},
            {label:'Scope 3', pef:pefS3, cls:'scope3'},
          ].map(s => `
            <div class="scope-bar-row">
              <span class="scope-bar-label ${s.cls}">${s.label}</span>
              <div class="scope-bar-track">
                <div class="scope-bar-fill ${s.cls}" style="width:${pct(s.pef)}%"></div>
              </div>
              <span class="scope-bar-val">${s.pef.score.toFixed(1)} mPt (${pct(s.pef)}%)</span>
            </div>
          `).join('')}
        </div>
      </div>

      <h4 style="margin-top:1.5rem">Détail par catégorie de dommage</h4>
      <div class="damage-grid">
        ${Object.entries(DAMAGE_CATEGORIES).map(([key, cat]) => {
          const catScore = cat.indicators.reduce((sum, ind) => {
            const v = totals[ind];
            if (v == null) return sum;
            return sum + (v / EF31[ind].norm) * (EF31[ind].weight / 100) * 1000;
          }, 0);
          return `
            <div class="damage-card" style="border-left:4px solid ${cat.color}">
              <div class="damage-label">${cat.label}</div>
              <div class="damage-score" style="color:${cat.color}">${catScore.toFixed(2)} mPt</div>
            </div>
          `;
        }).join('')}
      </div>

      <h4 style="margin-top:1.5rem">16 indicateurs EF3.1 détaillés</h4>
      <div class="indicators-table">
        <table>
          <thead>
            <tr>
              <th>Indicateur</th><th>Scope 1</th><th>Scope 2</th><th>Scope 3</th><th>Total</th><th>Unité</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(EF31).map(([key, meta]) => {
              const v1 = byScope[1][key] || 0;
              const v2 = byScope[2][key] || 0;
              const v3 = byScope[3][key] || 0;
              const tot = totals[key] || 0;
              const fmtV = v => v === 0 ? '—' : v.toExponential(2);
              return `
                <tr>
                  <td><strong>${meta.label}</strong></td>
                  <td class="scope1-text">${fmtV(v1)}</td>
                  <td class="scope2-text">${fmtV(v2)}</td>
                  <td class="scope3-text">${fmtV(v3)}</td>
                  <td><strong>${fmtV(tot)}</strong></td>
                  <td style="color:#888;font-size:0.75rem">${meta.unit}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="result-gwp-highlight">
        <span>🌡️ GWP total :</span>
        <strong>${(totals.GWP || 0).toFixed(1)} kg CO₂ eq.</strong>
        <span style="color:#888;font-size:0.85rem">= ${((totals.GWP||0)/1000).toFixed(2)} t CO₂ eq.</span>
      </div>

      <p style="font-size:0.78rem;color:#888;margin-top:1rem;text-align:center">
        Outil pédagogique — Pour un Bilan Carbone® certifié adapté à votre organisation :
        <a href="mailto:clement.dalisson@gmail.com" style="color:#2D5016;font-weight:bold">clement.dalisson@gmail.com</a>
      </p>
    </div>
  `;
}

function updateEntreprisePreview() {
  // Peut être étendu pour preview temps réel
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  // Main nav
  document.querySelectorAll('.nav-link[data-main]').forEach(l => {
    l.addEventListener('click', () => goToMain(l.dataset.main));
  });

  // Sub-nav
  document.querySelectorAll('.subnav-link').forEach(l => {
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
  updateNavBadge();
  goToMain('perso');
});
