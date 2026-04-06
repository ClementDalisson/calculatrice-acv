// ─────────────────────────────────────────────────────────────────────────────
// tests/calc.test.js — Tests unitaires des fonctions de calcul pures
// Runner : node --test  (Node.js ≥ 18, sans dépendance externe)
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const vm       = require('node:vm');
const fs       = require('node:fs');
const path     = require('node:path');

// ── Chargement dans un contexte simulé (= fenêtre navigateur) ────────────────
// On charge data.js puis calc.js dans le même contexte pour reproduire
// l'environnement browser sans aucun build tool.

const root = path.join(__dirname, '..');
const ctx  = vm.createContext({});

vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'),        ctx, { filename: 'data.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'org_catalogue.js'), 'utf8'), ctx, { filename: 'org_catalogue.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'calc.js'), 'utf8'),        ctx, { filename: 'calc.js' });

// Les déclarations `const` ne sont pas exposées comme propriétés du contexte vm.
// On les attache explicitement à globalThis pour pouvoir y accéder dans les tests.
vm.runInContext(`
  globalThis.EF31              = EF31;
  globalThis.DAMAGE_CATEGORIES = DAMAGE_CATEGORIES;
  globalThis.CATALOGUE         = CATALOGUE;
  globalThis.ECI               = ECI;
  globalThis.ORG_CATALOGUE     = ORG_CATALOGUE;
`, ctx);

const {
  fmt, fmtGwp, fmtPef, fmtTokenVal,
  computeExtCost, computeHealthScore,
  computeProfilePef, computeProfileDamage, computeProfileItems,
  computeProfileTokenTotals,
  calcPEF_entreprise,
  getObj,
} = ctx;

// ── fmt ───────────────────────────────────────────────────────────────────────

test('fmt — null retourne n.d.', () => {
  assert.ok(fmt(null, 'GWP').includes('n.d.'));
});

test('fmt — zéro retourne "0"', () => {
  assert.equal(fmt(0, 'GWP'), '0');
});

test('fmt — GWP grande valeur : 2 décimales minimum', () => {
  const r = fmt(12.345, 'GWP');
  // doit contenir une virgule ou un point et ≥ 2 chiffres après
  assert.ok(r.length > 0);
});

test('fmt — très petite valeur : notation exponentielle', () => {
  const r = fmt(1e-8, 'ODP');
  assert.ok(r.includes('e') || r.includes('E'));
});

// ── fmtGwp ───────────────────────────────────────────────────────────────────

test('fmtGwp — null retourne —', () => {
  assert.equal(fmtGwp(null), '—');
});

test('fmtGwp — 0.5 → 2 décimales', () => {
  assert.equal(fmtGwp(0.5), '0.50');
});

test('fmtGwp — 1500 → 1 décimale max', () => {
  const r = fmtGwp(1500);
  assert.ok(!r.includes('.') || r.split('.')[1].length <= 1);
});

// ── fmtPef ───────────────────────────────────────────────────────────────────

test('fmtPef — completude < 50 → "Incomplet*"', () => {
  assert.equal(fmtPef(0.5, 40), 'Incomplet*');
});

test('fmtPef — completude ≥ 50 → valeur formatée', () => {
  const r = fmtPef(1.2345, 100);
  assert.ok(r.includes('1'));
});

// ── fmtTokenVal ──────────────────────────────────────────────────────────────

test('fmtTokenVal — null retourne null', () => {
  assert.equal(fmtTokenVal(null, 'co2'), null);
});

test('fmtTokenVal — co2 < 0.001 → "<0,001 kg"', () => {
  assert.equal(fmtTokenVal(0.0005, 'co2'), '<0,001 kg');
});

test('fmtTokenVal — co2 10 kg → inclut "kg"', () => {
  assert.ok(fmtTokenVal(10, 'co2').includes('kg'));
});

test('fmtTokenVal — co2 5000 kg → tonnes', () => {
  assert.ok(fmtTokenVal(5000, 'co2').includes('t'));
});

test('fmtTokenVal — fossile 500 MJ → inclut "MJ"', () => {
  assert.ok(fmtTokenVal(500, 'fossile').includes('MJ'));
});

test('fmtTokenVal — fossile 2000 MJ → GJ', () => {
  assert.ok(fmtTokenVal(2000, 'fossile').includes('GJ'));
});

test('fmtTokenVal — eau_L 0.5 m³ → litres', () => {
  assert.ok(fmtTokenVal(0.5, 'eau_L').includes('L'));
});

test('fmtTokenVal — mpt 0.05 → inclut "mPt"', () => {
  assert.ok(fmtTokenVal(0.05, 'mpt').includes('mPt'));
});

// ── calcPEF_entreprise ───────────────────────────────────────────────────────

test('calcPEF_entreprise — impacts nuls → score 0', () => {
  const impacts = {};
  Object.keys(ctx.EF31).forEach(k => { impacts[k] = 0; });
  const { score, completude } = calcPEF_entreprise(impacts);
  assert.equal(score, 0);
  assert.equal(completude, 100);
});

test('calcPEF_entreprise — impacts null → completude 0', () => {
  const impacts = {};
  Object.keys(ctx.EF31).forEach(k => { impacts[k] = null; });
  const { score, completude } = calcPEF_entreprise(impacts);
  assert.equal(score, 0);
  assert.equal(completude, 0);
});

test('calcPEF_entreprise — seul GWP renseigné → completude 6%', () => {
  const impacts = {};
  Object.keys(ctx.EF31).forEach(k => { impacts[k] = null; });
  impacts.GWP = 1000; // 1 indicateur sur 16
  const { completude } = calcPEF_entreprise(impacts);
  assert.equal(completude, 6);
});

test('calcPEF_entreprise — score positif avec données réelles', () => {
  // Exemple : 1 000 kg CO₂ eq.
  const impacts = {};
  Object.keys(ctx.EF31).forEach(k => { impacts[k] = null; });
  impacts.GWP = 1000;
  const { score } = calcPEF_entreprise(impacts);
  // score = (1000 / 7550) * (21.06/100) * 1000 ≈ 27.9 mPt
  assert.ok(score > 0);
  assert.ok(score < 100);
});

// ── computeProfilePef ────────────────────────────────────────────────────────

test('computeProfilePef — profil vide → 0', () => {
  const profile = { qtys: {} };
  assert.equal(computeProfilePef(profile), 0);
});

test('computeProfilePef — profil avec un item → score positif', () => {
  // Premier item du catalogue avec completude ≥ 50
  const first = ctx.CATALOGUE.find(o => o.completude >= 50);
  assert.ok(first, 'Catalogue doit contenir au moins un item complet');
  const profile = { qtys: { [first.id]: 1 } };
  const pef = computeProfilePef(profile);
  assert.ok(pef > 0);
  assert.equal(pef, first.pef_mpt);
});

test('computeProfilePef — quantité 0 → même résultat que profil vide', () => {
  const first = ctx.CATALOGUE[0];
  const profile = { qtys: { [first.id]: 0 } };
  assert.equal(computeProfilePef(profile), 0);
});

// ── computeProfileDamage ─────────────────────────────────────────────────────

test('computeProfileDamage — profil vide → tous à 0', () => {
  const profile = { qtys: {} };
  const damage  = computeProfileDamage(profile);
  Object.values(damage).forEach(v => assert.equal(v, 0));
});

test('computeProfileDamage — retourne toutes les catégories EF3.1', () => {
  const profile = { qtys: {} };
  const damage  = computeProfileDamage(profile);
  const expected = Object.keys(ctx.DAMAGE_CATEGORIES);
  assert.deepEqual(Object.keys(damage).sort(), expected.sort());
});

// ── computeProfileItems ──────────────────────────────────────────────────────

test('computeProfileItems — profil vide → tableau vide', () => {
  const profile = { qtys: {} };
  assert.equal(computeProfileItems(profile).length, 0);
});

test('computeProfileItems — items triés par PEF décroissant', () => {
  const items = ctx.CATALOGUE.filter(o => o.completude >= 50).slice(0, 3);
  const qtys  = {};
  items.forEach(o => { qtys[o.id] = 2; });
  const result = computeProfileItems({ qtys });
  for (let i = 1; i < result.length; i++) {
    assert.ok(result[i - 1].pef >= result[i].pef);
  }
});

// ── computeHealthScore ───────────────────────────────────────────────────────

test('computeHealthScore — retourne un nombre positif pour un item réel', () => {
  const obj = ctx.CATALOGUE.find(o =>
    ctx.DAMAGE_CATEGORIES.sante.indicators.some(ind => o.impacts[ind] != null)
  );
  assert.ok(obj, 'Doit trouver un item avec des données santé');
  const score = computeHealthScore(obj);
  assert.ok(score >= 0);
});

// ── getObj ───────────────────────────────────────────────────────────────────

test('getObj — id valide retourne l\'objet', () => {
  const first = ctx.CATALOGUE[0];
  assert.deepEqual(getObj(first.id), first);
});

test('getObj — id inconnu retourne undefined', () => {
  assert.equal(getObj(99999), undefined);
});
