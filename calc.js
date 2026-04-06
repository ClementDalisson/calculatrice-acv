// ─────────────────────────────────────────────────────────────────────────────
// calc.js — Fonctions de calcul pures (sans accès au DOM)
// Dépend des globals : EF31, DAMAGE_CATEGORIES, CATALOGUE, ECI  (data.js)
// ─────────────────────────────────────────────────────────────────────────────

/* ── Formatage des valeurs ── */

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
      if (abs < 1e-6) return (abs * 1e9).toFixed(1) + ' µg';
      if (abs < 1e-3) return (abs * 1e6).toFixed(1) + ' mg';
      if (abs < 1)    return (abs * 1e3).toFixed(2) + ' g';
      return abs.toFixed(2) + ' kg';
    case 'fossile':
      if (abs < 1)    return abs.toFixed(2) + ' MJ';
      if (abs < 1000) return abs.toFixed(0) + ' MJ';
      return (abs / 1000).toFixed(1) + ' GJ';
    case 'eau_L':
      { const L = val * 1000;
        if (L < 1)     return L.toFixed(2) + ' L';
        if (L < 100)   return L.toFixed(1) + ' L';
        if (L < 10000) return Math.round(L) + ' L';
        return (L / 1000).toFixed(0) + ' m³'; }
    case 'mpt':
      if (abs < 0.001) return val.toFixed(5) + ' mPt';
      if (abs < 0.1)   return val.toFixed(3) + ' mPt';
      if (abs < 10)    return val.toFixed(2) + ' mPt';
      return val.toFixed(1) + ' mPt';
  }
}

/* ── Recherche dans le catalogue ── */

function getObj(id) { return CATALOGUE.find(o => o.id === id); }

/* ── Coût externe environnemental ── */

// Coût externe total d'un objet (en €)
function computeExtCost(obj) {
  let total = 0;
  Object.entries(ECI).forEach(([ind, factor]) => {
    const v = obj.impacts[ind];
    if (v !== null && v !== undefined) total += v * factor;
  });
  return total;
}

/* ── Sous-scores santé / PEF ── */

// Sous-score santé (catégorie "sante" EF3.1, en mPt)
function computeHealthScore(obj) {
  let score = 0;
  DAMAGE_CATEGORIES.sante.indicators.forEach(ind => {
    const meta = EF31[ind];
    const v = obj.impacts[ind];
    if (v !== null && v !== undefined) score += (v / meta.norm) * (meta.weight / 100) * 1000;
  });
  return score;
}

// Maxima du catalogue (référence 100% pour les barres de progression) — mémoïsé
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

/* ── Profils personnels ── */

// Totaux annuels (jetons) d'un profil
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

// Score PEF total d'un profil (mPt)
function computeProfilePef(profile) {
  let total = 0;
  CATALOGUE.forEach(obj => {
    const qty = profile.qtys[obj.id] || 0;
    if (qty === 0 || obj.completude < 50) return;
    total += obj.pef_mpt * qty;
  });
  return total;
}

// Score PEF par catégorie de dommage pour un profil
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

// Items triés par contribution PEF décroissante pour un profil
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

/* ── Calcul PEF organisation ── */

// Score PEF à partir d'impacts bruts EF3.1 (16 indicateurs)
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

// ─────────────────────────────────────────────────────────────────────────────
// Support Node.js (tests) — chargement via vm.createContext dans tests/
// Les fonctions ci-dessus restent des globals dans le navigateur.
// ─────────────────────────────────────────────────────────────────────────────
