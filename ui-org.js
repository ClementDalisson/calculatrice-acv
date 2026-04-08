// ─────────────────────────────────────────────────────────────────────────────
// ui-org.js — Mode organisation (catalogue, outil de saisie, analyse)
// Dépend de : org_catalogue.js (ORG_CATALOGUE) | calc.js | auth.js | app.js (state, showToast)
// ─────────────────────────────────────────────────────────────────────────────

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

const CATEGORIE_EMOJI = {
  'Bureau & plan de travail':       '🗂️',
  'Sièges':                         '🪑',
  'Rangement':                      '🗄️',
  'Cloisons & aménagement':         '🧱',
  'Accueil & espaces communs':      '🛋️',
  'Postes de travail':              '💻',
  'Impression':                     '🖨️',
  'Réseau & serveurs':              '📡',
  'Stockage & périphériques':       '💾',
  'Logiciels & abonnements':        '🔑',
  'Téléphonie fixe':                '☎️',
  'Téléphonie mobile':              '📱',
  'Visioconférence':                '📹',
  'Projection & affichage':         '📽️',
  'Papier & supports':              '📄',
  'Classement & rangement papier':  '📁',
  'Écriture & dessin':              '✏️',
  'Accessoires & petits matériels': '📎',
  'Cuisine & cafétéria':            '☕',
  'Confort & bien-être':            '🌡️',
  'Éclairage intérieur':            '💡',
  'Éclairage extérieur':            '🔦',
  'Gestion de l\'éclairage':        '🎛️',
  'Chauffage':                      '🔥',
  'Climatisation':                  '❄️',
  'Ventilation':                    '🌬️',
  'Régulation':                     '⚙️',
  'Électricité':                    '⚡',
  'Gaz':                            '💨',
  'Fioul':                          '🛢️',
  'Énergies renouvelables':         '☀️',
  'Carburants':                     '⛽',
  'Eau potable':                    '💧',
  'Gestion des eaux':               '🚿',
  'Véhicules de flotte':            '🚗',
  'Infrastructure mobilité':        '🚲',
  'Transports en commun & partagés':'🚌',
  'Hébergement':                    '🏨',
  'Structure & enveloppe':          '🏗️',
  'Sécurité & contrôle d\'accès':   '🔐',
  'Sécurité incendie':              '🧯',
  'Ascenseurs & circulations':      '🛗',
  'Produits de nettoyage':          '🧴',
  'Matériel de nettoyage':          '🧹',
  'Consommables hygiène':           '🧻',
  'Déchets courants':               '♻️',
  'Déchets de chantier':            '🗑️',
  'Tenues de travail':              '👔',
  'Protection individuelle':        '🦺',
  'Emballages':                     '📦',
  'Matériel de manutention':        '🏋️',
  'Services de livraison':          '🚚',
  'Supports imprimés':              '📰',
  'Supports numériques':            '📲',
  'Goodies & cadeaux d\'affaires':  '🎁',
  'Sécurité':                       '🔒',
  'Numérique & informatique':       '🖥️',
  'Boissons & pauses':              '🥤',
  'Conditionnement':                '🥡',
  'Matériel':                       '🌳',
  'Santé & social':                 '🏥',
  'Production & industrie':         '🏭',
  'Collectivités':                  '🏛️',
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
    const emoji = CATEGORIE_EMOJI[it.c] || meta.icon;
    const inMap = !!state.orgItemsMap[it.id];
    return `
      <div class="card${inMap ? ' selected' : ''}" data-item-id="${it.id}"
           style="border-left: 4px solid ${meta.color}">
        <span class="card-cat-tag">${it.s}</span>
        <div class="card-emoji">${emoji}</div>
        <div class="card-body">
          <div class="card-name">${it.n}</div>
          <div class="card-uf">${it.uf}</div>
          ${renderOrgTokenBars(it)}
        </div>
        <button class="card-select-btn" onclick="toggleOrgCatalogueItem('${it.id}')">
          ${inMap ? '✓' : '+'}
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
  const card = document.querySelector(`.card[data-item-id="${id}"]`);
  if (card) {
    const inMap = !!state.orgItemsMap[id];
    card.classList.toggle('selected', inMap);
    const btn = card.querySelector('.card-select-btn');
    if (btn) btn.textContent = inMap ? '✓' : '+';
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
  if (!state.orgItemsMap[id]) return;
  const num = parseFloat(value);
  const input = document.querySelector(`.org-sel-row[data-item-id="${id}"] .org-sel-qty`);
  if (isNaN(num) || num < 0) {
    if (input) input.classList.add('org-sel-qty--error');
    showToast('La quantité doit être un nombre positif.');
    state.orgItemsMap[id].qty = 0;
  } else {
    if (input) input.classList.remove('org-sel-qty--error');
    state.orgItemsMap[id].qty = num;
    scheduleSave();
  }
}

function removeOrgItemFromOutil(id) {
  delete state.orgItemsMap[id];
  scheduleSave();
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
  const salariesRaw = parseInt(document.getElementById('org-salaries')?.value);
  const surfaceRaw  = parseInt(document.getElementById('org-surface')?.value);

  const salariesEl = document.getElementById('org-salaries');
  const surfaceEl  = document.getElementById('org-surface');

  let profileValid = true;

  if (salariesEl && salariesEl.value !== '' && (isNaN(salariesRaw) || salariesRaw <= 0)) {
    salariesEl.classList.add('org-input--error');
    showToast('Le nombre de salariés doit être un entier supérieur à 0.');
    profileValid = false;
  } else if (salariesEl) {
    salariesEl.classList.remove('org-input--error');
  }

  if (surfaceEl && surfaceEl.value !== '' && (isNaN(surfaceRaw) || surfaceRaw < 0)) {
    surfaceEl.classList.add('org-input--error');
    showToast('La surface doit être un nombre positif.');
    profileValid = false;
  } else if (surfaceEl) {
    surfaceEl.classList.remove('org-input--error');
  }

  if (!profileValid) return;

  state.orgProfile = {
    nom: document.getElementById('org-nom')?.value?.trim() || '',
    secteur: document.getElementById('org-secteur')?.value || '',
    salaries: isNaN(salariesRaw) ? null : salariesRaw,
    surface:  isNaN(surfaceRaw)  ? null : surfaceRaw,
    chauffage: document.getElementById('org-chauffage')?.value || '',
    travail: document.getElementById('org-travail')?.value || '',
  };
  scheduleSave();
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
  const gwpPerEmployee = (profile.salaries > 0) ? gwpT / profile.salaries : null;

  const pefTotal = catTotal; // en milli-points (mPt)

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
          <div class="result-pef-block">
            <div class="gwp-label">🌿 SCORE ENVIRONNEMENTAL TOTAL</div>
            <div class="result-pef-value">${pefTotal.toFixed(1)} <span class="result-pef-unit">mPt EF3.1</span></div>
            <div class="gwp-analogy">Score agrégé sur 16 indicateurs EF3.1</div>
            ${profile.salaries > 0 ? (() => {
              const pefPerEmp = pefTotal / profile.salaries;
              const pct = Math.round(pefPerEmp / 150 * 100);
              const color = pct <= 100 ? 'var(--eco)' : pct <= 200 ? '#D69E2E' : 'var(--climat)';
              return `<div class="pef-per-emp" style="margin-top:0.5rem;font-size:0.82rem;font-weight:600;color:${color}">≈ ${pefPerEmp.toFixed(1)} mPt / salarié · ${pct}% de la cible 2050 (150 mPt / pers.)</div>`;
            })() : `<div style="margin-top:0.4rem;font-size:0.78rem;color:var(--text-muted)">Renseignez le nombre de salariés pour voir l'impact par personne</div>`}
          </div>
          <div class="result-gwp-block">
            <div class="gwp-label">🌡️ ÉQUIVALENT CARBONE TOTAL</div>
            <div class="gwp-value">${gwpT < 1 ? (gwpT * 1000).toFixed(0) + ' kg' : gwpT.toFixed(1) + ' t'} CO₂ eq.</div>
            ${gwpFlights > 0 ? `<div class="gwp-analogy">≈ ${gwpFlights} vol${gwpFlights > 1 ? 's' : ''} Paris–New York</div>` : ''}
            ${gwpPerEmployee !== null ? `<div class="gwp-analogy" style="margin-top:0.25rem;font-weight:600;color:var(--climat)">≈ ${gwpPerEmployee < 1 ? (gwpPerEmployee * 1000).toFixed(0) + ' kg' : gwpPerEmployee.toFixed(1) + ' t'} CO₂ / salarié / an</div>` : ''}
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

