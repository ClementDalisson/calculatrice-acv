# CLAUDE.md — Guide de navigation pour Claude Code

Site statique publié sur GitHub Pages. Aucun build requis (HTML/CSS/JS vanilla).
Supabase pour l'auth et la persistance des données organisation.

---

## Architecture

```
index.html          → Structure HTML complète (938 lignes)
style.css           → Tous les styles (2838 lignes)

app.js              → État global, utilitaires, init, accueil, articles (341 lignes)
ui-perso.js         → Calculatrice personnelle : catalogue, détail, comparaison, empreinte, méthode (754 lignes)
ui-org.js           → Mode organisation : catalogue, outil de saisie, analyse (846 lignes)

data.js             → Données calculatrice personnelle : EF31, CATALOGUE, DAMAGE_CATEGORIES... (478 lignes)
org_catalogue.js    → Données catalogue organisation (145 KB, auto-généré — NE PAS LIRE sauf nécessité)
calc.js             → Fonctions de calcul pures, sans DOM (197 lignes)
router.js           → Navigation hash-based : goTo, goToMain, goToOrg, navigateFromHash (160 lignes)
auth.js             → Auth Supabase + persistance données organisation (245 lignes)

content/articles/   → Articles JSON + index.json auto-généré
docs/HYPOTHESES.md  → Documentation méthode EF3.1 et hypothèses
scripts/            → Script de rebuild de l'index d'articles
tests/              → Tests unitaires calc.js
```

**Ordre de chargement des scripts** (index.html, lignes 930-937) :
`data.js` → `org_catalogue.js` → `calc.js` → `router.js` → `auth.js` → `app.js` → `ui-perso.js` → `ui-org.js`

---

## Variables globales (scope partagé)

| Variable | Définie dans | Contenu |
|---|---|---|
| `state` | app.js | État mutable de l'app (section active, sélections, profil org…) |
| `EF31` | data.js | 16 indicateurs EF3.1 : norm, weight, unit, label, damage |
| `CATALOGUE` | data.js | ~17 objets du quotidien avec impacts complets |
| `DAMAGE_CATEGORIES` | data.js | 4 catégories de dommage (climat, ecosystemes, sante, ressources) |
| `ECI` | data.js | Émissions calculatrice personnelle (énergie, transport…) |
| `CAT_COLORS` | data.js | Couleurs par catégorie |
| `ORG_CATALOGUE` | org_catalogue.js | 325 items organisation (auto-généré, ne pas éditer) |
| `_supabase` | auth.js | Client Supabase |

Fonctions utilitaires globales : `showToast`, `createFocusTrap` (app.js) · `fmt`, `fmtPef`, `calcPEF`, `computeHealthScore` (calc.js) · `goTo`, `goToMain`, `goToOrg` (router.js)

---

## Où regarder selon la tâche

| Tâche | Fichier(s) à lire |
|---|---|
| Ajouter/modifier un objet au catalogue perso | `data.js` (section CATALOGUE) |
| Bug UI calculatrice personnelle | `ui-perso.js` |
| Bug UI mode organisation | `ui-org.js` |
| Modifier la navigation | `router.js` |
| Auth / sauvegarde données | `auth.js` |
| Calculs EF3.1, score PEF | `calc.js` |
| Structure HTML (sections, overlays) | `index.html` |
| Styles, responsive, dark mode | `style.css` |
| Ajouter un article | `content/articles/` (créer JSON, puis `node scripts/build-articles.js`) |
| Page d'accueil / actualités | `app.js` (sections `hideEmptyHomeSections`, `loadArticles`, `renderNews`) |
| Init et event listeners globaux | `app.js` (section `DOMContentLoaded`) |

---

## Méthode EF3.1 (contexte clé)

**Score PEF (mPt)** = Σᵢ [ impact_i / norm_i × weight_i ] × 1000

- 16 indicateurs, regroupés en 4 catégories de dommage
- `norm` = impact annuel moyen d'un Européen · `weight` en % (somme = 100%)
- 1 Pt = impact annuel moyen d'un Européen · résultats en **milli**points

---

## Règles importantes

- `org_catalogue.js` est **auto-généré** par `gen_org_catalogue.py` (hors dépôt). Ne jamais éditer manuellement — régénérer depuis le script si besoin.
- Le site est **statique** : pas de bundler, pas de node_modules. Déploiement automatique via GitHub Pages.
- Tests : `node tests/calc.test.js` (pas de framework, assertions manuelles).
- Articles : modifier `content/articles/index.json` manuellement ou via `node scripts/build-articles.js`.
