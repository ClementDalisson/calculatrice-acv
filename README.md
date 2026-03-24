# Dalisson Environnement — Calculatrice ACV EF3.1

Site statique d'analyse d'impact environnemental multi-critères, publié sur **GitHub Pages**.

🔗 **[Site en ligne](https://clementdalisson.github.io/calculatrice-acv/)**

---

## Navigation du dépôt

| Fichier / Dossier | Rôle |
|---|---|
| `index.html` | Structure HTML — navigation, sections, overlays |
| `app.js` | Logique JavaScript — calculatrices, graphiques, navigation |
| `style.css` | Styles CSS |
| `data.js` | Catalogue d'objets + facteurs d'émission de la calculatrice personnelle |
| `docs/HYPOTHESES.md` | **Documentation complète des hypothèses de calcul et FE** |
| `docs/DATA_SOURCES.md` | Guide des bases de données utilisées |

---

## Outils disponibles

### 🌍 Calculatrice personnelle
Catalogue de ~17 objets du quotidien avec leurs impacts EF3.1 complets :
alimentation, textile, transport, électronique, mobilier, logement.

Fonctionnalités :
- Catalogue filtrable par catégorie
- Comparaison jusqu'à 5 objets (tableau + graphique radar)
- Empreinte annuelle par profil de consommation (3 profils)
- Fiche détaillée : 16 indicateurs, score PEF, composition hypothétique

### 🏢 Calculatrice organisation
Profil d'impact multi-critères pour organisations. Saisie de données d'activité annuelles → répartition par catégorie de dommage EF3.1.

Postes d'activité couverts :
- ⚡ Énergie & Chauffage (gaz, fioul, électricité, réfrigérants)
- 🚗 Mobilité professionnelle (diesel, électrique, train, avion court/long)
- 🛒 Achats & Équipements (papier, écrans, serveurs)
- 🏢 Services externalisés (nettoyage, IT, conseil)
- 🍽️ Alimentation (restauration collective)

---

## Méthode EF3.1

**Product Environmental Footprint**, méthode officielle de la Commission Européenne (2021).

**Formule du score PEF :**
```
Score PEF (mPt) = Σᵢ [ Impact_brut_i / Facteur_normalisation_i × Poids_i ] × 1000
```

**4 catégories de dommage :**

| Catégorie | Indicateurs | Poids total |
|---|---|---|
| 🌡️ Changement climatique | GWP | ~21 % |
| 🌿 Écosystèmes | AP, EP×3, ETIC, LU | ~25 % |
| 🏥 Santé humaine | PM, ODP, IR, POCF, HT×2 | ~28 % |
| ⛏️ Ressources | WU, RU_Fossil, RU_Metal | ~24 % |

> 1 Pt = impact annuel moyen d'un Européen.
> Exemples : café expresso ≈ 0,01 mPt · steak 200 g ≈ 0,77 mPt · vol Paris–New York ≈ 46 mPt

---

## Sources de données

| Source | Version | Couverture | Utilisation |
|---|---|---|---|
| AGRIBALYSE | v3.2 | 2 452 produits alimentaires | Calculatrice personnelle |
| BASE-IMPACTS | v3.0 | 1 608 procédés (matériaux, énergie, transport) | Calculatrice personnelle + organisation |
| Ecobalyse (ADEME) | v8.5 | 863 produits (textile, numérique, mobilité) | Calculatrice personnelle |
| ADEME Base Empreinte | sept. 2025 | 91 produits textile | Calculatrice personnelle |
| ADEME Base Carbone | 2023 | Transport, énergie | Calculatrice organisation |
| EXIOBASE | v3.9.4 | Services économiques (input-output France 2019) | Calculatrice organisation — services |
| Ecoinvent | v3.9 | Procédés industriels | Calculatrice organisation — équipements |

📄 **[Documentation détaillée des hypothèses → docs/HYPOTHESES.md](docs/HYPOTHESES.md)**

---

## Structure technique

```
site_calculatrice_acv/
├── index.html          # HTML
├── app.js              # JavaScript (navigation + calculatrices)
├── data.js             # Données catalogue (CATALOGUE, EF31, DAMAGE_CATEGORIES...)
├── style.css           # Styles
├── docs/
│   ├── HYPOTHESES.md   # Hypothèses de calcul détaillées
│   └── DATA_SOURCES.md # Guide des bases de données
└── README.md           # Ce fichier
```

---

## Contact

**Clément Dalisson** — Ingénieur Environnement
CentraleSupélec · Sciences Po Paris · Certifié Bilan Carbone® BCM2
📩 [clement.dalisson@gmail.com](mailto:clement.dalisson@gmail.com)
