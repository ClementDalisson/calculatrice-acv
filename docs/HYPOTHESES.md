# Hypothèses de calcul — Dalisson Environnement

Documentation des facteurs d'émission (FE) et hypothèses méthodologiques utilisés dans les deux calculatrices.

---

## Méthode générale

**Score PEF (mPt)** = Σᵢ [ Impact_brut_i / Facteur_normalisation_i × Poids_i ] × 1000

Chaque indicateur `i` est normalisé par l'impact annuel moyen d'un Européen, puis pondéré selon les poids EF3.1. La somme donne un score unique en millipoints (mPt).

---

## Table des 16 indicateurs EF3.1

| Code | Indicateur | Unité | Poids EF3.1 | Catégorie de dommage |
|---|---|---|---|---|
| GWP | Changement climatique | kg CO₂ eq. | 21,06 % | 🌡️ Climat |
| ODP | Appauvrissement couche d'ozone | kg CFC-11 eq. | 6,31 % | 🏥 Santé |
| AP | Acidification | mol H⁺ eq. | 6,20 % | 🌿 Écosystèmes |
| EP_Eau | Eutrophisation eaux douces | kg P eq. | 2,80 % | 🌿 Écosystèmes |
| EP_Marine | Eutrophisation marine | kg N eq. | 2,96 % | 🌿 Écosystèmes |
| EP_Terre | Eutrophisation terrestre | mol N eq. | 3,71 % | 🌿 Écosystèmes |
| POCF | Formation ozone photochimique | kg COVNM eq. | 4,78 % | 🏥 Santé |
| PM | Particules fines | incidence maladie | 8,96 % | 🏥 Santé |
| IR | Rayonnements ionisants | kBq U-235 eq. | 5,01 % | 🏥 Santé |
| LU | Utilisation des terres | pt EF | 7,94 % | 🌿 Écosystèmes |
| WU | Consommation d'eau | m³ monde dépr. | 8,51 % | ⛏️ Ressources |
| RU_Fossil | Ressources fossiles | MJ | 8,32 % | ⛏️ Ressources |
| RU_Metal | Ressources minérales | kg Sb eq. | 7,55 % | ⛏️ Ressources |
| HT_cancer | Toxicité humaine (cancer) | CTUh | 2,13 % | 🏥 Santé |
| HT_nc | Toxicité humaine (non-cancer) | CTUh | 1,84 % | 🏥 Santé |
| ETIC | Écotoxicité eau douce | CTUe | 1,92 % | 🌿 Écosystèmes |

> Source : Commission Européenne — Product Environmental Footprint Category Rules (EF3.1, 2021)

---

## Calculatrice personnelle — Hypothèses par objet

Les objets du catalogue sont construits à partir de facteurs d'émission des bases de données suivantes :

### Sources utilisées

| Catégorie | Source principale | Unité fonctionnelle |
|---|---|---|
| Alimentation | AGRIBALYSE v3.2 (ADEME/INRAE) | 1 kg produit consommé |
| Textile | Ecobalyse v8.5 (ADEME) + ADEME Base Textile | 1 article (masse variable) |
| Électronique | Ecobalyse v8.5 + Ecoinvent 3.9 | 1 appareil (cycle de vie) |
| Transport | BASE-IMPACTS v3.0 + ADEME Base Carbone 2023 | 100 km ou par trajet |
| Logement / Énergie | BASE-IMPACTS v3.0 | kWh ou m²/an |
| Mobilier | BASE-IMPACTS v3.0 + Ecoinvent 3.9 | 1 article |

### Hypothèses générales calculatrice personnelle

- Les impacts incluent la **fabrication, transport, usage et fin de vie** (cycle de vie complet) sauf mention contraire.
- La **complétude** indique le % des 16 indicateurs disponibles. Score PEF affiché seulement si complétude ≥ 50 %.
- Les quantités dans les profils d'empreinte sont des **valeurs moyennes** estimées pour chaque profil de consommation (sobre, moyen, élevé).

---

## Calculatrice organisation — Facteurs d'émission

### ⚡ Énergie & Chauffage

| Poste | Unité | GWP (kg CO₂/u) | Source |
|---|---|---|---|
| Gaz naturel | kWh PCI | 0,2763 | EF3.1 CE 2021 + BASE-IMPACTS v3.0 |
| Fioul domestique | litres | 3,15 | EF3.1 CE 2021 + BASE-IMPACTS v3.0 |
| Électricité réseau France | kWh | 0,0801 | RTE 2023 (mix national) |
| Fuites réfrigérant HFC-134a | kg | 1 430 | IPCC AR6 (GWP 100 ans) |

> Note électricité : FE GWP = 0,080 kg CO₂/kWh (RTE 2023, mix réseau France). Indicateur IR élevé (3,23 kBq U-235/kWh) dû à la part nucléaire.

### 🚗 Mobilité professionnelle

| Poste | Unité | GWP (kg CO₂/u) | Source |
|---|---|---|---|
| Véhicule diesel | 100 km parcourus | 12,4 | Ecoinvent 3.9 + EF3.1 |
| Véhicule électrique (usage) | 100 km parcourus | 1,44 | Ecoinvent 3.9 + EF3.1 |
| Train TGV / intercités | km·passager | 0,00385 | ADEME Base Carbone 2023 |
| Vol court-courrier (Europe) | passager·vol | 65,3 | ADEME Base Carbone 2023 |
| Vol long-courrier (intercont.) | passager·vol | 701,3 | ADEME Base Carbone 2023 |

> Note avion : facteurs **sans forçage radiatif** (traînées de condensation, NOx en altitude). Pour l'impact climatique réel, multiplier par ×2 est recommandé.
> Note train : dérivé principalement du mix électrique nucléaire français. IR élevé (0,09 kBq U-235/km) par rapport au GWP faible.

### 🛒 Achats & Équipements

| Poste | Unité | GWP (kg CO₂/u) | Source |
|---|---|---|---|
| Papier A4 (ramette 500 f.) | ramettes | 3,85 | BASE-IMPACTS v3.0 |
| Écran 24" (cycle de vie) | unités achetées | 216 | Ecobalyse v8.5 (ADEME) |
| Serveur rack 1U (fabrication) | unités achetées | 800 | Ecoinvent 3.9 |

> Note équipements : impacts en cycle de vie complet (fabrication + transport + usage + fin de vie). Forte contribution sur RU_Metal (minerais critiques) et ETIC (écotoxicité).

### 🏢 Services externalisés

| Poste | Unité | GWP (kg CO₂/u) | Source | Fiabilité |
|---|---|---|---|---|
| Nettoyage des locaux | m²/an | 10,2 | EXIOBASE 3.9.4 | ★★☆ ordre de grandeur |
| Services IT externalisés | k€ HT/an | 650 | EXIOBASE 3.9.4 | ★★☆ ordre de grandeur |
| Conseil / formation | k€ HT/an | 450 | EXIOBASE 3.9.4 | ★★☆ ordre de grandeur |

> ⚠️ Les FE services sont issus de la **méthode input-output EXIOBASE 3.9.4** (France 2019) — approche macro-économique qui agrège tous les impacts de la branche économique. Ce sont des ordres de grandeur. Pour une étude certifiée, remplacer par des données primaires fournisseurs.

### 🍽️ Alimentation

| Poste | Unité | GWP (kg CO₂/u) | Source |
|---|---|---|---|
| Repas restauration collective | repas/an | 2,2 | AGRIBALYSE v3.2 (panier moyen) |

> Hypothèse : repas moyen collectif (déjeuner équilibré, pas de menu végétarien spécifique). GWP 2,2 kg CO₂eq/repas = estimation ADEME panier alimentaire moyen.

---

## Agrégation en score EF3.1

Le **score de dommage** par catégorie est calculé en agrégeant les indicateurs correspondants :

```
Score_catégorie (mPt) = Σᵢ∈catégorie [ Impact_total_i / Norm_i × Poids_i ] × 1000
```

La **répartition en %** dans le graphique donut = score_catégorie / score_total × 100.

---

## Limites et précautions d'interprétation

1. **Complétude variable** : certains FE n'ont pas les 16 indicateurs (notamment WU, HT, ETIC pour les services). Les catégories Santé et Ressources peuvent être sous-estimées pour ces postes.

2. **Frontières du système** : la calculatrice organisation ne couvre pas les déplacements domicile-travail des salariés, ni les achats de matières premières spécifiques à votre activité.

3. **FE services = ordres de grandeur** : les facteurs EXIOBASE sont cohérents au niveau macro mais peuvent s'écarter d'un facteur 2 à 5 d'une organisation à l'autre selon l'intensité réelle des prestataires.

4. **Mises à jour des bases** : les FE sont fixés à la version de la base de données au moment de la création. AGRIBALYSE, Ecobalyse et BASE-IMPACTS sont mis à jour régulièrement par leurs producteurs.

---

## Références

- Commission Européenne — [EF3.1 Documentation](https://eplca.jrc.ec.europa.eu/LCDN/developerEF.xhtml)
- ADEME — [Ecobalyse](https://ecobalyse.beta.gouv.fr/) · [Base Carbone](https://bilans-ges.ademe.fr/)
- INRAE — [AGRIBALYSE](https://agribalyse.ademe.fr/) · [BASE-IMPACTS](https://base-impacts.ademe.fr/)
- RTE — Bilan électrique France 2023
- EXIOBASE — [www.exiobase.eu](https://www.exiobase.eu/)
- Ecoinvent — [www.ecoinvent.org](https://www.ecoinvent.org/)
