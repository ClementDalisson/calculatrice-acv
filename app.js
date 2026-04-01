// ─────────────────────────────────────────────────────────────────────────────
// app.js — Logique calculatrice ACV Grand Public
// ─────────────────────────────────────────────────────────────────────────────

/* ── Toast notification ── */
function showToast(message, type = 'warning') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
  });
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3500);
}

/* ── State ── */
let state = {
  main: 'home',
  section: 'catalogue',
  subSection: 'catalogue',
  // Organisation
  orgSection: 'outil',
  orgItemsMap: {},    // { itemId: { qty: number } }
  orgProfile: { nom: '', secteur: '', salaries: '', surface: '', chauffage: '', travail: '' },
  orgSectorFilter: 'all',
  orgSearchQuery: '',
  orgLastResults: null,  // { totals, bySecteur, pefBySecteur, profile, selectedItems }
  // Perso
  entrepriseDonutChart: null,
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
  // Dropdown Outils : active si une calculatrice est sélectionnée
  const navToolsBtn = document.getElementById('nav-tools-btn');
  if (navToolsBtn) {
    navToolsBtn.classList.toggle('active', main === 'perso' || main === 'organisation');
    document.getElementById('nav-tools-dropdown').classList.remove('open');
  }
  const subnav = document.getElementById('subnav');
  const subnavOrg = document.getElementById('subnav-org');
  if (subnav) subnav.style.display = main === 'perso' ? '' : 'none';
  if (subnavOrg) subnavOrg.style.display = main === 'organisation' ? '' : 'none';

  if (main === 'home') {
    showOnly('home');
  } else if (main === 'perso') {
    goTo(state.subSection || 'catalogue');
  } else if (main === 'organisation') {
    showOnly('entreprise');
    goToOrg(state.orgSection || 'outil');
  } else if (main === 'contact') {
    showOnly('contact');
  } else if (main === 'methode') {
    showOnly('methode');
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

function goToOrg(section) {
  state.orgSection = section;
  document.querySelectorAll('.subnav-org-link').forEach(l => {
    l.classList.toggle('active', l.dataset.orgSection === section);
  });
  renderEntrepriseSection();
}

function updateOrgItemBadge() {
  const badge = document.getElementById('org-items-badge');
  if (!badge) return;
  const count = Object.keys(state.orgItemsMap).length;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline' : 'none';
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

// ════════════════════════════════════════════════════════════════════
// MODE ENTREPRISE — Analyse multi-critères EF3.1 pour organisations
// ════════════════════════════════════════════════════════════════════

const SECTEUR_META = {
  'Mobilier':               { icon: '🪑', color: '#8B5E3C' },
  'Informatique':           { icon: '💻', color: '#2563EB' },
  'Téléphonie':             { icon: '📱', color: '#7C3AED' },
  'Éclairage':              { icon: '💡', color: '#D97706' },
  'Énergie':                { icon: '⚡', color: '#059669' },
  'CVC':                    { icon: '🌡️', color: '#DC2626' },
  'Déplacements':           { icon: '🚗', color: '#3B82F6' },
  'Logistique':             { icon: '📦', color: '#6366F1' },
  'Consommables bureau':    { icon: '📄', color: '#92400E' },
  'Bâtiment':               { icon: '🏢', color: '#6B7280' },
  'Hygiène & Entretien':    { icon: '🧹', color: '#0EA5E9' },
  'Alimentation':           { icon: '🍽️', color: '#16A34A' },
  'Communication':          { icon: '📡', color: '#9333EA' },
  'Eau':                    { icon: '💧', color: '#0284C7' },
  'Vêtements & EPI':        { icon: '👔', color: '#B45309' },
  'Services':               { icon: '🤝', color: '#475569' },
  'Affichage':              { icon: '🖼️', color: '#BE185D' },
  'Espaces extérieurs':     { icon: '🌿', color: '#15803D' },
  'Déchets':                { icon: '♻️', color: '#65A30D' },
  'Électroménager':         { icon: '☕', color: '#C026D3' },
  'Équipements sectoriels': { icon: '🔧', color: '#0F766E' },
};

// Index ORG_CATALOGUE par id (chargé depuis org_catalogue.js)
const _orgById = {};
(function() { ORG_CATALOGUE.forEach(it => { _orgById[it.id] = it; }); })();

// Structure Secteur → Catégorie → [items] (calculée une fois)
const _orgTree = {};
(function() {
  ORG_CATALOGUE.forEach(it => {
    if (!_orgTree[it.s]) _orgTree[it.s] = {};
    if (!_orgTree[it.s][it.c]) _orgTree[it.s][it.c] = [];
    _orgTree[it.s][it.c].push(it);
  });
})();

// ── Facteurs d'émission entreprise legacy (EF3.1, 16 indicateurs) ───
// (conservé uniquement pour calcPEF_entreprise)
const FE_ENTREPRISE_LEGACY = {
  // ÉNERGIE & CHAUFFAGE
  gaz_kwh: {
    label: "Gaz naturel", unit: "kWh PCI",
    GWP:0.2763, ODP:1.212e-8, AP:2.263e-4, EP_Eau:1.133e-6,
    EP_Marine:6.760e-5, EP_Terre:7.468e-4, POCF:4.805e-4, PM:1.272e-9,
    IR:1.372e-3, LU:0.09513, WU:6.220e-3, RU_Fossil:3.925,
    RU_Metal:2.703e-7, HT_cancer:6.408e-11, HT_nc:5.678e-10, ETIC:0.20720
  },
  fioul_L: {
    label: "Fioul domestique", unit: "litres",
    GWP:3.15, ODP:9.89e-9, AP:2.939e-4, EP_Eau:1.190e-5,
    EP_Marine:7.436e-4, EP_Terre:8.638e-3, POCF:6.059e-3, PM:2.541e-8,
    IR:1.440e-2, LU:0.9989, WU:6.531e-2, RU_Fossil:37.7,
    RU_Metal:2.838e-6, HT_cancer:1.009e-9, HT_nc:8.965e-9, ETIC:2.776
  },
  elec_kwh: {
    label: "Électricité réseau France", unit: "kWh",
    GWP:0.0801, ODP:8.773e-10, AP:2.098e-4, EP_Eau:3.269e-8,
    EP_Marine:7.613e-5, EP_Terre:4.978e-4, POCF:2.108e-4, PM:4.158e-9,
    IR:3.2342, LU:0, WU:null, RU_Fossil:9.313,
    RU_Metal:4.858e-8, HT_cancer:null, HT_nc:null, ETIC:null
  },
  hfc134a_kg: {
    label: "Fuites réfrigérant HFC-134a", unit: "kg",
    GWP:1430.0, ODP:0, AP:0, EP_Eau:0, EP_Marine:0, EP_Terre:0,
    POCF:0, PM:0, IR:0, LU:0, WU:0, RU_Fossil:8.5,
    RU_Metal:0, HT_cancer:0, HT_nc:0, ETIC:0
  },
  // MOBILITÉ PROFESSIONNELLE
  diesel_100km: {
    label: "Véhicule thermique diesel", unit: "100 km parcourus",
    GWP:12.4, ODP:2.664e-7, AP:2.749e-2, EP_Eau:5.278e-5,
    EP_Marine:5.210e-3, EP_Terre:5.048e-2, POCF:2.839e-2, PM:3.348e-7,
    IR:4.627e-2, LU:21.84, WU:1.243, RU_Fossil:161.6,
    RU_Metal:3.200e-6, HT_cancer:2.298e-9, HT_nc:3.940e-8, ETIC:97.9
  },
  ve_100km: {
    label: "Véhicule électrique (usage)", unit: "100 km parcourus",
    GWP:1.442, ODP:1.579e-8, AP:3.776e-3, EP_Eau:5.884e-7,
    EP_Marine:1.370e-3, EP_Terre:8.960e-3, POCF:3.794e-3, PM:7.484e-8,
    IR:58.22, LU:0, WU:null, RU_Fossil:167.6,
    RU_Metal:8.744e-7, HT_cancer:null, HT_nc:null, ETIC:null
  },
  train_km: {
    label: "Train (TGV / intercités France)", unit: "km·passager",
    GWP:3.85e-3, ODP:2.5e-11, AP:5.9e-6, EP_Eau:9.2e-10,
    EP_Marine:2.1e-6, EP_Terre:1.4e-5, POCF:5.9e-6, PM:1.2e-10,
    IR:0.0905, LU:0, WU:null, RU_Fossil:0.261,
    RU_Metal:1.4e-9, HT_cancer:null, HT_nc:null, ETIC:null
  },
  vol_court: {
    label: "Vol court-courrier (Europe)", unit: "passager·vol",
    GWP:65.3, ODP:3.559e-10, AP:1.655e-4, EP_Eau:4.857e-6,
    EP_Marine:6.893e-5, EP_Terre:7.545e-4, POCF:1.918e-4, PM:6.426e-7,
    IR:1.281, LU:0, WU:null, RU_Fossil:531.3,
    RU_Metal:1.960e-6, HT_cancer:null, HT_nc:null, ETIC:null
  },
  vol_lc: {
    label: "Vol long-courrier (intercontinental)", unit: "passager·vol",
    GWP:701.27, ODP:6.50e-9, AP:3.026e-3, EP_Eau:8.877e-5,
    EP_Marine:1.260e-3, EP_Terre:1.379e-2, POCF:3.505e-3, PM:1.174e-5,
    IR:23.41, LU:0, WU:null, RU_Fossil:9708.2,
    RU_Metal:3.583e-5, HT_cancer:null, HT_nc:null, ETIC:null
  },
  // ACHATS & ÉQUIPEMENTS
  papier_ramette: {
    label: "Papier A4 (ramette 500 f.)", unit: "ramettes",
    GWP:3.85, ODP:2.5e-9, AP:3.5e-2, EP_Eau:7.5e-4,
    EP_Marine:7.5e-3, EP_Terre:1.25e-2, POCF:5.0e-3, PM:7.5e-8,
    IR:0.075, LU:125.0, WU:0.75, RU_Fossil:50.0,
    RU_Metal:2.5e-7, HT_cancer:1.25e-9, HT_nc:2.0e-8, ETIC:12.5
  },
  ecran_24: {
    label: "Écran 24\" (cycle de vie)", unit: "unités achetées",
    GWP:216.0, ODP:2.023e-8, AP:1.875, EP_Eau:2.573e-3,
    EP_Marine:3.539e-1, EP_Terre:3.764, POCF:1.008, PM:4.749e-5,
    IR:58.52, LU:null, WU:329.5, RU_Fossil:800.9,
    RU_Metal:2.618e-2, HT_cancer:2.181e-7, HT_nc:1.357e-5, ETIC:2481.8
  },
  serveur_1u: {
    label: "Serveur rack 1U (fabrication)", unit: "unités achetées",
    GWP:800.0, ODP:7.494e-8, AP:6.943, EP_Eau:9.533e-3,
    EP_Marine:1.310, EP_Terre:1.394e1, POCF:3.732, PM:1.759e-4,
    IR:216.7, LU:null, WU:1220.6, RU_Fossil:2967.0,
    RU_Metal:9.696e-2, HT_cancer:8.076e-7, HT_nc:5.025e-5, ETIC:9190.0
  },
  // SERVICES EXTERNALISÉS
  nettoyage_m2: {
    label: "Nettoyage des locaux", unit: "m²/an",
    GWP:10.2, ODP:3.5e-9, AP:4.5e-3, EP_Eau:9.0e-6,
    EP_Marine:1.8e-3, EP_Terre:7.5e-3, POCF:6.0e-3, PM:6.0e-9,
    IR:0.72, LU:null, WU:null, RU_Fossil:112.0,
    RU_Metal:1.8e-7, HT_cancer:5.0e-11, HT_nc:8.0e-10, ETIC:2.5
  },
  it_services_k: {
    label: "Services IT externalisés", unit: "k€ HT/an",
    GWP:650.0, ODP:2.2e-7, AP:2.85e-1, EP_Eau:4.0e-4,
    EP_Marine:1.07e-1, EP_Terre:5.4e-1, POCF:2.85e-1, PM:2.8e-6,
    IR:210.0, LU:null, WU:null, RU_Fossil:6050.0,
    RU_Metal:6.5e-3, HT_cancer:null, HT_nc:null, ETIC:null
  },
  conseil_k: {
    label: "Conseil / formation", unit: "k€ HT/an",
    GWP:450.0, ODP:1.5e-7, AP:1.97e-1, EP_Eau:2.8e-4,
    EP_Marine:7.4e-2, EP_Terre:3.74e-1, POCF:1.97e-1, PM:1.95e-6,
    IR:145.0, LU:null, WU:null, RU_Fossil:4185.0,
    RU_Metal:2.5e-3, HT_cancer:null, HT_nc:null, ETIC:null
  },
  // ALIMENTATION
  repas: {
    label: "Repas restauration collective", unit: "repas/an",
    GWP:2.2, ODP:8.0e-9, AP:1.9e-2, EP_Eau:8.0e-5,
    EP_Marine:6.5e-3, EP_Terre:9.7e-2, POCF:3.5e-3, PM:1.9e-7,
    IR:0.025, LU:80.0, WU:0.18, RU_Fossil:18.5,
    RU_Metal:2.2e-6, HT_cancer:6.0e-10, HT_nc:1.1e-8, ETIC:6.8
  },
};

// (FE_TO_GROUP et ACTIVITY_GROUPS supprimés — remplacés par SECTEUR_META + ORG_CATALOGUE)

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

// ── Rendu HTML du mode entreprise — routeur ──────────────────────────
function renderEntrepriseSection() {
  const sec = document.getElementById('sec-entreprise');
  if (!sec) return;
  if (state.orgSection === 'catalogue') {
    sec.innerHTML = renderOrgCatalogueSection();
    renderOrgCatalogueGrid();
  } else if (state.orgSection === 'outil') {
    sec.innerHTML = renderOrgOutilSection();
  } else if (state.orgSection === 'analyse') {
    sec.innerHTML = renderOrgAnalyseSection();
    if (state.orgLastResults) {
      renderEntrepriseDonut(state.orgLastResults.totals);
    }
  }
}

// ── Onglet Catalogue ─────────────────────────────────────────────────
function renderOrgCatalogueSection() {
  const sectors = Object.keys(SECTEUR_META);
  const sectorChips = [`<button class="org-sector-chip${state.orgSectorFilter === 'all' ? ' active' : ''}" data-sector="all" onclick="setOrgSector('all')">Tout <span class="org-sector-count">${ORG_CATALOGUE.length}</span></button>`]
    .concat(sectors.map(s => {
      const meta = SECTEUR_META[s];
      const count = ORG_CATALOGUE.filter(it => it.s === s).length;
      if (!count) return '';
      const escapedS = s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `<button class="org-sector-chip${state.orgSectorFilter === s ? ' active' : ''}" data-sector="${s}" onclick="setOrgSector('${escapedS}')">${meta.icon} ${s} <span class="org-sector-count">${count}</span></button>`;
    })).join('');

  return `
    <div class="org-catalogue-wrapper">
      <div class="org-catalogue-header">
        <h2>📋 Catalogue des postes d'activité</h2>
        <p class="org-catalogue-intro">325 postes · EF3.1 · Base ACV Harmonisée — Cliquez sur <strong>+ Ajouter</strong> pour sélectionner un poste</p>
      </div>
      <div class="org-cat-filters">
        <div class="org-sector-chips">${sectorChips}</div>
        <div class="org-search-row">
          <input type="text" id="org-search" class="org-search-input"
            placeholder="Rechercher un poste…" value="${state.orgSearchQuery}"
            oninput="state.orgSearchQuery=this.value; renderOrgCatalogueGrid()">
          <span id="org-results-count" class="org-results-count"></span>
        </div>
      </div>
      <div id="org-cards-grid" class="org-cards-grid"></div>
    </div>`;
}

function renderOrgTokenBars(item) {
  const catEmoji = { climat: '🌡️', ecosystemes: '🌿', sante: '🏥', ressources: '⛏️' };
  const catScores = Object.entries(DAMAGE_CATEGORIES).map(([dKey, dData]) => {
    let score = 0;
    dData.indicators.forEach(ind => {
      const meta = EF31[ind];
      const v = item.imp[ind];
      if (v !== null && v !== undefined) score += (v / meta.norm) * (meta.weight / 100) * 1000;
    });
    return { dKey, dData, score: Math.max(0, score) };
  });
  const total = catScores.reduce((sum, c) => sum + c.score, 0);
  if (total === 0) return '';
  const bars = catScores.map(({ dKey, dData, score }) => {
    const pctW   = Math.max(2, (score / total) * 100).toFixed(1);
    const pctLbl = Math.round((score / total) * 100);
    const emoji  = catEmoji[dKey] || '🔵';
    return `<div class="tbr" title="${dData.label} : ${pctLbl}%">
      <span class="tbr-emoji">${emoji}</span>
      <div class="tbr-track"><div class="tbr-fill" style="width:${pctW}%;background:${dData.color}"></div></div>
      <span class="tbr-val">${pctLbl}%</span>
    </div>`;
  }).join('');
  const pef = calcPEF_entreprise(item.imp);
  const scoreChip = pef.score > 0 ? `<div class="card-score-chip">📊 ${pef.score.toFixed(1)} mPt</div>` : '';
  return `<div class="card-bars">${bars}${scoreChip}</div>`;
}

function renderOrgCatalogueGrid() {
  const grid = document.getElementById('org-cards-grid');
  if (!grid) return;
  let items = ORG_CATALOGUE;
  if (state.orgSectorFilter !== 'all') {
    items = items.filter(it => it.s === state.orgSectorFilter);
  }
  if (state.orgSearchQuery.trim()) {
    const q = state.orgSearchQuery.trim().toLowerCase();
    items = items.filter(it =>
      it.n.toLowerCase().includes(q) ||
      it.c.toLowerCase().includes(q) ||
      it.s.toLowerCase().includes(q)
    );
  }
  const countEl = document.getElementById('org-results-count');
  if (countEl) countEl.textContent = `${items.length} poste${items.length !== 1 ? 's' : ''}`;

  grid.innerHTML = items.map(it => {
    const meta = SECTEUR_META[it.s] || { icon: '📦', color: '#718096' };
    const inMap = !!state.orgItemsMap[it.id];
    return `
      <div class="org-cat-card${inMap ? ' selected' : ''}" data-item-id="${it.id}">
        <span class="org-cat-secteur-tag" style="color:${meta.color}">${meta.icon} ${it.s}</span>
        <span class="org-cat-cat-tag">${it.c}</span>
        <div class="org-cat-name">${it.n}</div>
        <div class="org-cat-uf">${it.uf}</div>
        ${renderOrgTokenBars(it)}
        <button class="org-cat-add-btn${inMap ? ' added' : ''}" onclick="toggleOrgCatalogueItem('${it.id}')">
          ${inMap ? '✓ Ajouté' : '+ Ajouter'}
        </button>
      </div>`;
  }).join('');
}

function setOrgSector(sector) {
  state.orgSectorFilter = sector;
  document.querySelectorAll('.org-sector-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.sector === sector);
  });
  renderOrgCatalogueGrid();
}

function toggleOrgCatalogueItem(id) {
  if (state.orgItemsMap[id]) {
    delete state.orgItemsMap[id];
  } else {
    state.orgItemsMap[id] = { qty: 1 };
  }
  updateOrgItemBadge();
  const card = document.querySelector(`.org-cat-card[data-item-id="${id}"]`);
  if (card) {
    const inMap = !!state.orgItemsMap[id];
    card.classList.toggle('selected', inMap);
    const btn = card.querySelector('.org-cat-add-btn');
    if (btn) {
      btn.textContent = inMap ? '✓ Ajouté' : '+ Ajouter';
      btn.classList.toggle('added', inMap);
    }
  }
}

// ── Onglet Outil ─────────────────────────────────────────────────────
function renderOrgOutilSection() {
  const p = state.orgProfile;
  const SECTEURS = [
    '— Secteur d\'activité —', 'Services & Conseil', 'Numérique & Technologie',
    'Finance & Assurance', 'Santé & Social', 'Éducation & Recherche',
    'Commerce & Distribution', 'Industrie & Manufacture', 'Construction & BTP',
    'Agriculture & Agroalimentaire', 'Transport & Logistique',
    'Énergie & Environnement', 'Hôtellerie & Tourisme', 'Médias & Communication',
    'Collectivité territoriale', 'Association & ONG', 'Autre',
  ];
  const itemCount = Object.keys(state.orgItemsMap).length;

  const itemsHtml = Object.entries(state.orgItemsMap).map(([id, { qty }]) => {
    const item = _orgById[id];
    if (!item) return '';
    const meta = SECTEUR_META[item.s] || { icon: '📦', color: '#718096' };
    return `<div class="org-sel-row" data-item-id="${id}">
      <span class="org-sel-tag" style="background:${meta.color}20;color:${meta.color}">${item.c}</span>
      <div class="org-sel-info">
        <span class="org-sel-name">${item.n}</span>
        <span class="org-sel-uf">${item.uf}</span>
        ${item.bom ? `<span class="org-sel-bom-text">${item.bom}</span>` : ''}
      </div>
      <input type="number" class="org-sel-qty" min="0" step="1" placeholder="qté" value="${qty}"
        onchange="updateOrgItemQty('${id}', this.value)">
      <button class="org-sel-remove" onclick="removeOrgItemFromOutil('${id}')" title="Retirer">×</button>
    </div>`;
  }).join('');

  return `
    <div class="entreprise-wrapper">
      <div class="entreprise-hero">
        <h2>🏢 Profil d'impact de votre organisation</h2>
        <p>Saisissez les quantités annuelles pour les postes sélectionnés, puis lancez le calcul.</p>
        <div class="entreprise-badges">
          <span class="badge badge-neutral">🌡️ Changement climatique</span>
          <span class="badge badge-neutral">🌿 Écosystèmes</span>
          <span class="badge badge-neutral">🏥 Santé humaine</span>
          <span class="badge badge-neutral">⛏️ Ressources</span>
          <span class="badge badge-neutral">325 postes · EF3.1</span>
        </div>
      </div>

      <div class="org-profile-section">
        <h3 class="org-profile-title">👤 Profil de l'organisation</h3>
        <div class="org-profile-grid">
          <div class="org-field">
            <label class="org-label">Nom de l'organisation</label>
            <input type="text" id="org-nom" placeholder="Ex : Agence Martin & Associés" class="org-input" value="${p.nom}">
          </div>
          <div class="org-field">
            <label class="org-label">Secteur d'activité</label>
            <select id="org-secteur" class="org-input">
              ${SECTEURS.map((s, i) => `<option value="${i === 0 ? '' : s}"${p.secteur === s ? ' selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="org-field">
            <label class="org-label">Nombre de salariés (ETP)</label>
            <input type="number" id="org-salaries" placeholder="Ex : 25" min="1" class="org-input" value="${p.salaries || ''}">
          </div>
          <div class="org-field">
            <label class="org-label">Surface des locaux (m²)</label>
            <input type="number" id="org-surface" placeholder="Ex : 500" min="0" class="org-input" value="${p.surface || ''}">
          </div>
          <div class="org-field">
            <label class="org-label">Type de chauffage principal</label>
            <select id="org-chauffage" class="org-input">
              <option value="">— Choisir —</option>
              ${['Gaz naturel','Fioul domestique','Électricité / PAC','Bois / Biomasse','Réseau de chaleur','Autre / Non concerné'].map(v => `<option value="${v}"${p.chauffage === v ? ' selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="org-field">
            <label class="org-label">Mode de travail dominant</label>
            <select id="org-travail" class="org-input">
              <option value="">— Choisir —</option>
              ${['100% présentiel','Hybride (2–3 j bureau / semaine)','Télétravail majoritaire'].map(v => `<option value="${v}"${p.travail === v ? ' selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="org-catalog-header">
        <h3 class="org-adder-title">📋 Postes sélectionnés
          ${itemCount > 0 ? `<span class="org-items-count-badge">${itemCount}</span>` : ''}
        </h3>
        <p class="org-catalog-hint">
          ${itemCount === 0
            ? `Aucun poste — <button class="org-link-btn" onclick="goToOrg('catalogue')">parcourez le catalogue</button> pour en ajouter.`
            : `Saisissez les quantités annuelles pour chaque poste.`}
        </p>
      </div>

      ${itemCount > 0 ? `
        <div class="org-selected-items-list">${itemsHtml}</div>
        <button id="btn-calc-entreprise" onclick="calcEntreprise()">🔬 Calculer mon profil d'impact</button>
      ` : `
        <div class="org-empty-state">
          <div class="org-empty-icon">📋</div>
          <p>Ajoutez des postes depuis le catalogue pour commencer votre analyse.</p>
          <button class="btn" onclick="goToOrg('catalogue')">Parcourir le catalogue →</button>
        </div>
      `}

      <div class="entreprise-disclaimer">
        <strong>Sources</strong> — Base ACV Harmonisée EF3.1 (AGRIBALYSE v3.2, BASE-IMPACTS v3.0, Ecoinvent v3.12). Méthode EF3.1 Commission Européenne.
        <br>Outil développé par <a href="mailto:clement.dalisson@gmail.com">Clément Dalisson</a>, Ingénieur Environnement (CentraleSupélec · Sciences Po · Bilan Carbone® BCM2).
      </div>
    </div>`;
}

function updateOrgItemQty(id, value) {
  if (state.orgItemsMap[id]) {
    state.orgItemsMap[id].qty = parseFloat(value) || 0;
  }
}

function removeOrgItemFromOutil(id) {
  delete state.orgItemsMap[id];
  updateOrgItemBadge();
  const row = document.querySelector(`.org-sel-row[data-item-id="${id}"]`);
  if (row) row.remove();
  if (Object.keys(state.orgItemsMap).length === 0) {
    renderEntrepriseSection();
  }
}

// ── Onglet Analyse ───────────────────────────────────────────────────
function renderOrgAnalyseSection() {
  if (!state.orgLastResults) {
    return `
      <div class="org-analyse-empty">
        <div class="org-empty-icon">📊</div>
        <h3>Aucune analyse disponible</h3>
        <p>Sélectionnez des postes dans le <button class="org-link-btn" onclick="goToOrg('catalogue')">catalogue</button>,
          saisissez vos quantités dans l'<button class="org-link-btn" onclick="goToOrg('outil')">outil</button>,
          puis lancez le calcul.</p>
      </div>`;
  }
  const { totals, bySecteur, pefBySecteur, profile, selectedItems } = state.orgLastResults;
  return `<div class="entreprise-wrapper">${renderEntrepriseResults(totals, bySecteur, pefBySecteur, profile, selectedItems)}</div>`;
}

function calcEntreprise() {
  // Sauvegarde profil depuis le DOM
  state.orgProfile = {
    nom: document.getElementById('org-nom')?.value?.trim() || '',
    secteur: document.getElementById('org-secteur')?.value || '',
    salaries: parseInt(document.getElementById('org-salaries')?.value) || null,
    surface: parseInt(document.getElementById('org-surface')?.value) || null,
    chauffage: document.getElementById('org-chauffage')?.value || '',
    travail: document.getElementById('org-travail')?.value || '',
  };
  // Mise à jour des quantités depuis le DOM
  document.querySelectorAll('.org-sel-qty').forEach(input => {
    const id = input.closest('.org-sel-row')?.dataset.itemId;
    if (id && state.orgItemsMap[id]) {
      state.orgItemsMap[id].qty = parseFloat(input.value) || 0;
    }
  });

  const IND_KEYS = Object.keys(EF31);
  const totals = {};
  const bySecteur = {};
  for (const k of IND_KEYS) totals[k] = 0;
  const selectedItems = [];
  let hasData = false;

  Object.entries(state.orgItemsMap).forEach(([id, { qty }]) => {
    if (!qty) return;
    const item = _orgById[id];
    if (!item) return;
    hasData = true;
    selectedItems.push({ item, qty });
    if (!bySecteur[item.s]) {
      bySecteur[item.s] = {};
      for (const k of IND_KEYS) bySecteur[item.s][k] = 0;
    }
    for (const k of IND_KEYS) {
      const v = item.imp[k];
      if (v != null && !isNaN(v)) {
        totals[k] += v * qty;
        bySecteur[item.s][k] += v * qty;
      }
    }
  });

  if (!hasData) {
    showToast('Veuillez saisir au moins une quantité.');
    return;
  }

  const pefBySecteur = {};
  Object.keys(bySecteur).forEach(s => { pefBySecteur[s] = calcPEF_entreprise(bySecteur[s]); });

  state.orgLastResults = {
    totals, bySecteur, pefBySecteur,
    profile: state.orgProfile,
    selectedItems,
  };

  goToOrg('analyse');
}

function renderEntrepriseResults(totals, byGroup, pefByGroup, profile, selectedItems) {
  const catData = Object.entries(DAMAGE_CATEGORIES).map(([key, cat]) => {
    const score = cat.indicators.reduce((sum, ind) => {
      const v = totals[ind];
      if (v == null) return sum;
      return sum + (v / EF31[ind].norm) * (EF31[ind].weight / 100) * 1000;
    }, 0);
    return { key, cat, score: Math.max(0, score) };
  });
  const catTotal = catData.reduce((sum, c) => sum + c.score, 0);
  catData.forEach(c => { c.pct = catTotal > 0 ? Math.round(c.score / catTotal * 100) : 0; });

  const dominant = catData.reduce((a, b) => a.score > b.score ? a : b);
  const gwpT = (totals.GWP || 0) / 1000;
  const gwpFlights = Math.round(gwpT / 0.7);

  const groupTotal = Object.values(pefByGroup).reduce((s, p) => s + (p.score || 0), 0);

  const profileTitle = [
    profile.nom || null,
    profile.secteur || null,
    profile.salaries ? `${profile.salaries} sal.` : null,
  ].filter(Boolean).join(' · ');

  const profileMeta = [
    profile.surface ? `${profile.surface} m²` : null,
    profile.chauffage || null,
    profile.travail || null,
  ].filter(Boolean).join(' · ');

  const inputLines = (selectedItems || []).map(({ item, qty }) => {
    const meta = SECTEUR_META[item.s] || { icon: '📦', color: '#718096' };
    return `<tr>
      <td>${item.n}</td>
      <td style="text-align:right">${qty.toLocaleString('fr-FR')} × ${item.uf}</td>
      <td><span style="font-size:0.72rem;color:${meta.color};font-weight:600">${meta.icon} ${item.s}</span></td>
    </tr>`;
  }).join('');

  const groupBars = Object.entries(pefByGroup)
    .filter(([, p]) => p && p.score > 0)
    .sort(([, pa], [, pb]) => pb.score - pa.score)
    .map(([secteur, p]) => {
      const meta = SECTEUR_META[secteur] || { icon: '📦', color: '#718096' };
      const pct = groupTotal > 0 ? Math.round(p.score / groupTotal * 100) : 0;
      return `
        <div class="scope-bar-row">
          <span class="scope-bar-label" style="color:${meta.color}">${meta.icon} ${secteur}</span>
          <div class="scope-bar-track"><div class="scope-bar-fill" style="width:${pct}%;background:${meta.color}"></div></div>
          <span class="scope-bar-val">${pct}%</span>
        </div>`;
    }).join('');

  return `
    <div class="entreprise-results-inner">

      <div class="result-header">
        <h3>Profil d'impact${profileTitle ? ' — ' + profileTitle : ''}</h3>
        ${profileMeta ? `<p class="result-profile-meta">${profileMeta}</p>` : ''}
        <p class="result-subtitle">Répartition relative des impacts environnementaux selon la méthode EF3.1 (Commission Européenne)</p>
      </div>

      <div class="result-main-layout">
        <div class="result-donut-wrap">
          <canvas id="entreprise-donut-chart"></canvas>
        </div>
        <div class="result-summary-panel">
          <div class="result-impact-legend">
            ${catData.map(c => `
              <div class="result-legend-item">
                <span class="legend-dot" style="background:${c.cat.color}"></span>
                <span class="legend-label">${c.cat.label}</span>
                <span class="legend-pct" style="color:${c.cat.color}">${c.pct}%</span>
              </div>`).join('')}
          </div>
          <div class="result-dominant-block">
            <div class="dominant-label">IMPACT DOMINANT</div>
            <div class="dominant-value" style="color:${dominant.cat.color}">${dominant.cat.label}</div>
            <div class="dominant-pct">${dominant.pct}% du profil d'impact</div>
          </div>
          <div class="result-gwp-block">
            <div class="gwp-label">🌡️ ÉQUIVALENT CARBONE TOTAL</div>
            <div class="gwp-value">${gwpT < 1 ? (gwpT * 1000).toFixed(0) + ' kg' : gwpT.toFixed(1) + ' t'} CO₂ eq.</div>
            ${gwpFlights > 0 ? `<div class="gwp-analogy">≈ ${gwpFlights} vol${gwpFlights > 1 ? 's' : ''} Paris–New York</div>` : ''}
          </div>
        </div>
      </div>

      <div class="result-scope-section">
        <h4>Contribution par secteur</h4>
        <div class="result-scope-bars">${groupBars}</div>
      </div>

      <div class="result-benchmark">
        <div class="benchmark-icon">📐</div>
        <div class="benchmark-content">
          <strong>Repères indicatifs</strong>
          <p>Ces résultats donnent une première estimation de votre profil d'impact relatif. Un référentiel sectoriel (PME françaises par secteur d'activité) est en cours de construction pour contextualiser ces données face au budget environnemental annuel d'organisations comparables.</p>
          <p style="font-size:0.78rem;color:var(--text-muted);margin-top:0.4rem">Pour une analyse certifiée et contextualisée : <a href="mailto:clement.dalisson@gmail.com" style="color:var(--eco)">clement.dalisson@gmail.com</a></p>
        </div>
      </div>

      <details class="result-hypotheses">
        <summary>🔍 Hypothèses de calcul — d'où viennent ces résultats ?</summary>
        <div class="hypotheses-inner">
          <p class="hyp-intro">Chaque résultat est calculé en multipliant vos <strong>données d'activité</strong> (quantités saisies) par des <strong>facteurs d'émission EF3.1</strong> issus de bases de données officielles européennes. Le score agrège les 16 indicateurs selon leurs poids EF3.1.</p>
          <div class="hyp-formula">
            Score (mPt) = Σᵢ [ Quantité × FE_i / Facteur_normalisation_i × Poids_i ] × 1000
          </div>
          <h5>Données saisies et contributions CO₂</h5>
          <div style="overflow-x:auto">
            <table class="hyp-table">
              <thead><tr><th>Poste d'activité</th><th>Quantité</th><th>Secteur</th></tr></thead>
              <tbody>${inputLines || '<tr><td colspan="4" style="text-align:center;color:var(--gray-400)">—</td></tr>'}</tbody>
            </table>
          </div>
          <h5 style="margin-top:1rem">Sources des facteurs d'émission</h5>
          <ul class="hyp-sources">
            <li><strong>Base ACV Harmonisée EF3.1</strong> — 10 542 entrées, 19 indicateurs EF3.1 par processus</li>
            <li><strong>AGRIBALYSE v3.2</strong> — Produits alimentaires, agricoles et agroalimentaires (INRAE / ADEME)</li>
            <li><strong>BASE-IMPACTS v3.0</strong> — Énergie, transport, bâtiment, matériaux (INRAE)</li>
            <li><strong>Ecoinvent v3.12</strong> — Équipements électroniques, mobilier, matériaux industriels</li>
            <li><strong>Méthode de calcul</strong> — Score = Σ(Quantité × FE_i / Normalisation_i × Poids_i) × 1000 mPt · EF3.1 Commission Européenne</li>
          </ul>
          <div class="hyp-warning">
            ⚠️ Les impacts des items marqués BOM sont calculés par décomposition matériaux. Certains proxys introduisent des incertitudes (cuir : hors élevage amont ; Li-ion : proxy plomb-acide). Pour un diagnostic certifié, des données primaires fournisseurs sont nécessaires.
          </div>
        </div>
      </details>

      <div class="result-detail-section">
        <button class="result-detail-toggle-btn" onclick="toggleEntrepriseDetail()">
          <span id="detail-toggle-label">📋 Voir le détail des 16 indicateurs EF3.1</span>
        </button>
        <div id="entreprise-detail-view" style="display:none">
          <div class="indicators-table" style="margin-top:1rem;overflow-x:auto">
            <table>
              <thead>
                <tr><th>Indicateur</th><th>Impact total</th><th>Unité</th><th>Score EF3.1 (mPt)</th></tr>
              </thead>
              <tbody>
                ${Object.entries(EF31).map(([key, meta]) => {
                  const tot = totals[key] || 0;
                  const pefContrib = tot > 0 ? (tot / meta.norm) * (meta.weight / 100) * 1000 : 0;
                  const dmg = DAMAGE_CATEGORIES[meta.damage];
                  return `<tr>
                    <td style="border-left:3px solid ${dmg ? dmg.color : '#ccc'};padding-left:8px"><strong>${meta.label}</strong></td>
                    <td style="font-family:monospace">${tot === 0 ? '—' : tot.toExponential(2)}</td>
                    <td style="color:#888;font-size:0.75rem">${meta.unit}</td>
                    <td style="font-weight:700;color:var(--navy)">${pefContrib === 0 ? '—' : pefContrib.toFixed(4)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  `;
}

function renderEntrepriseDonut(totals) {
  if (state.entrepriseDonutChart) {
    state.entrepriseDonutChart.destroy();
    state.entrepriseDonutChart = null;
  }
  const ctx = document.getElementById('entreprise-donut-chart');
  if (!ctx) return;

  const catData = Object.entries(DAMAGE_CATEGORIES).map(([key, cat]) => {
    const score = cat.indicators.reduce((sum, ind) => {
      const v = totals[ind];
      if (v == null) return sum;
      return sum + (v / EF31[ind].norm) * (EF31[ind].weight / 100) * 1000;
    }, 0);
    return { label: cat.label, score: Math.max(0, score), color: cat.color };
  });
  const total = catData.reduce((s, c) => s + c.score, 0);
  const pcts = catData.map(c => total > 0 ? Math.round(c.score / total * 100) : 0);

  state.entrepriseDonutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: catData.map(c => c.label),
      datasets: [{
        data: pcts,
        backgroundColor: catData.map(c => c.color + 'CC'),
        borderColor: catData.map(c => c.color),
        borderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label} : ${ctx.parsed}%`
          }
        }
      }
    }
  });
}

function toggleEntrepriseDetail() {
  const view = document.getElementById('entreprise-detail-view');
  const label = document.getElementById('detail-toggle-label');
  if (!view) return;
  const open = view.style.display === 'none';
  view.style.display = open ? 'block' : 'none';
  label.textContent = open ? '📋 Masquer le détail des 16 indicateurs' : '📋 Voir le détail des 16 indicateurs EF3.1';
}

function updateEntreprisePreview() {}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  // Main nav
  document.querySelectorAll('.nav-link[data-main]').forEach(l => {
    l.addEventListener('click', () => goToMain(l.dataset.main));
  });

  // Sub-nav perso
  document.querySelectorAll('.subnav-link').forEach(l => {
    l.addEventListener('click', () => goTo(l.dataset.section));
  });

  // Sub-nav organisation
  document.querySelectorAll('.subnav-org-link').forEach(l => {
    l.addEventListener('click', () => goToOrg(l.dataset.orgSection));
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

  // Brand → home
  const brand = document.querySelector('.nav-brand');
  if (brand) brand.addEventListener('click', () => goToMain('home'));

  // Articles → home puis scroll vers Actualités
  const navArticlesBtn = document.getElementById('nav-articles-btn');
  if (navArticlesBtn) {
    navArticlesBtn.addEventListener('click', () => {
      if (state.main !== 'home') goToMain('home');
      setTimeout(() => {
        const el = document.getElementById('home-news-list');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });
  }

  // Dropdown Outils
  const navToolsBtn = document.getElementById('nav-tools-btn');
  const navToolsDropdown = document.getElementById('nav-tools-dropdown');
  if (navToolsBtn && navToolsDropdown) {
    navToolsBtn.addEventListener('click', e => {
      e.stopPropagation();
      navToolsDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => navToolsDropdown.classList.remove('open'));
  }

  renderCatalogue();
  renderNews();
  updateNavBadge();
  updateOrgItemBadge();
  goToMain('home');

  // Article modal close
  document.getElementById('article-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeArticle();
  });
  document.getElementById('article-modal-close').addEventListener('click', closeArticle);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeArticle();
  });
});

/* ── Actualités ── */
function renderNews() {
  const list = document.getElementById('home-news-list');
  if (!list) return;
  list.innerHTML = ARTICLES.map(a => `
    <article class="news-card">
      <img class="news-card-img" src="${a.image}" alt="${a.imageAlt}" loading="lazy">
      <div class="news-card-body">
        <div class="news-card-date">${a.date}</div>
        <div class="news-card-titre" onclick="openArticle(${a.id})">${a.titre}</div>
        <p class="news-card-resume">${a.resume}</p>
        <button class="news-card-btn" onclick="openArticle(${a.id})">Lire l'article →</button>
      </div>
    </article>
  `).join('');
}

function openArticle(id) {
  const a = ARTICLES.find(x => x.id === id);
  if (!a) return;
  document.getElementById('article-modal-date').textContent = a.date;
  document.getElementById('article-modal-titre').textContent = a.titre;
  document.getElementById('article-modal-img').src = a.image;
  document.getElementById('article-modal-img').alt = a.imageAlt;
  let contenu = a.contenu;
  if (a.sources && a.sources.length) {
    const items = a.sources.map(s => `<li>${s}</li>`).join('');
    contenu += `<div class="article-sources-block"><strong>Sources</strong><ul>${items}</ul></div>`;
  }
  document.getElementById('article-modal-contenu').innerHTML = contenu;
  document.getElementById('article-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeArticle() {
  document.getElementById('article-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
