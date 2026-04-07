#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// scripts/build-articles.js
// Lit tous les fichiers JSON dans content/articles/ (sauf _template et index)
// et génère content/articles/index.json trié par date décroissante.
//
// Usage : node scripts/build-articles.js
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const fs   = require('node:fs');
const path = require('node:path');

const dir     = path.join(__dirname, '..', 'content', 'articles');
const outFile = path.join(dir, 'index.json');

const files = fs.readdirSync(dir).filter(
  f => f.endsWith('.json') && !f.startsWith('_') && f !== 'index.json'
);

if (files.length === 0) {
  console.warn('⚠️  Aucun article trouvé dans content/articles/');
  fs.writeFileSync(outFile, '[]');
  process.exit(0);
}

const articles = [];
const errors   = [];

for (const file of files) {
  try {
    const raw     = fs.readFileSync(path.join(dir, file), 'utf8');
    const article = JSON.parse(raw);

    // Validation des champs obligatoires
    const required = ['id', 'titre', 'dateISO', 'date', 'resume', 'contenu'];
    const missing  = required.filter(k => !article[k]);
    if (missing.length) {
      errors.push(`${file} : champs manquants → ${missing.join(', ')}`);
      continue;
    }

    articles.push(article);
  } catch (e) {
    errors.push(`${file} : ${e.message}`);
  }
}

if (errors.length) {
  console.error('❌ Erreurs détectées :');
  errors.forEach(e => console.error('   ' + e));
  process.exit(1);
}

// Tri par date décroissante (plus récent en premier)
articles.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));

fs.writeFileSync(outFile, JSON.stringify(articles, null, 2));
console.log(`✅ ${articles.length} article(s) indexé(s) → content/articles/index.json`);
articles.forEach(a => console.log(`   • [${a.dateISO}] ${a.titre}`));
