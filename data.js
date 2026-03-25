// ─────────────────────────────────────────────────────────────────────────────
// data.js — Données du catalogue ACV Grand Public
// Générées depuis catalogue_grand_public.py (Ecobalyse v8.5, BASE-IMPACTS v3.0)
// ─────────────────────────────────────────────────────────────────────────────

const EF31 = {
  GWP:       { norm: 7550,      weight: 21.06, unit: "kg CO₂ eq.",       label: "Changement climatique",          damage: "climat" },
  ODP:       { norm: 0.0536,    weight: 6.31,  unit: "kg CFC-11 eq.",     label: "Appauvrissement ozone",          damage: "sante" },
  AP:        { norm: 55.6,      weight: 6.20,  unit: "mol H⁺ eq.",        label: "Acidification",                  damage: "ecosystemes" },
  EP_Eau:    { norm: 1.61,      weight: 2.80,  unit: "kg P eq.",           label: "Eutrophisation eau douce",       damage: "ecosystemes" },
  EP_Marine: { norm: 19.5,      weight: 2.96,  unit: "kg N eq.",           label: "Eutrophisation marine",          damage: "ecosystemes" },
  EP_Terre:  { norm: 177,       weight: 3.71,  unit: "mol N eq.",          label: "Eutrophisation terrestre",       damage: "ecosystemes" },
  POCF:      { norm: 40.6,      weight: 4.78,  unit: "kg COVNM eq.",       label: "Formation ozone photochimique",  damage: "sante" },
  PM:        { norm: 5.95e-4,   weight: 8.96,  unit: "incidence",          label: "Particules fines (PM2.5)",       damage: "sante" },
  IR:        { norm: 4220,      weight: 5.01,  unit: "kBq U-235 eq.",      label: "Rayonnements ionisants",         damage: "sante" },
  LU:        { norm: 819000,    weight: 7.94,  unit: "pt sol",             label: "Utilisation des sols",           damage: "ecosystemes" },
  WU:        { norm: 11500,     weight: 8.51,  unit: "m³ dépriv.",         label: "Consommation eau",               damage: "ressources" },
  RU_Fossil: { norm: 65000,     weight: 8.32,  unit: "MJ",                 label: "Épuisement ressources fossiles", damage: "ressources" },
  RU_Metal:  { norm: 0.636,     weight: 7.55,  unit: "kg Sb eq.",          label: "Ressources minérales",           damage: "ressources" },
  HT_cancer: { norm: 1.69e-5,   weight: 2.13,  unit: "CTUh",              label: "Toxicité humaine — cancer",      damage: "sante" },
  HT_nc:     { norm: 1.25e-4,   weight: 1.84,  unit: "CTUh",              label: "Toxicité humaine — hors cancer", damage: "sante" },
  ETIC:      { norm: 56200,     weight: 1.92,  unit: "CTUe",               label: "Écotoxicité eau douce",          damage: "ecosystemes" },
};

const DAMAGE_CATEGORIES = {
  climat:      { label: "🌡️ Changement climatique", color: "#C53030", light: "#FFF5F5", indicators: ["GWP"] },
  ecosystemes: { label: "🌿 Écosystèmes",            color: "#276749", light: "#F0FFF4", indicators: ["AP","EP_Eau","EP_Marine","EP_Terre","ETIC","LU"] },
  sante:       { label: "🏥 Santé humaine",           color: "#744210", light: "#FFFFF0", indicators: ["IR","POCF","PM","HT_cancer","HT_nc","ODP"] },
  ressources:  { label: "🪨 Ressources",              color: "#44337A", light: "#FAF5FF", indicators: ["WU","RU_Fossil","RU_Metal"] },
};

const CAT_COLORS = {
  "Alimentation": { bg: "#FFF5F5", border: "#FC8181", icon: "🍽️" },
  "Textile":      { bg: "#FEFCBF", border: "#F6E05E", icon: "👗" },
  "Électronique": { bg: "#EBF8FF", border: "#63B3ED", icon: "💻" },
  "Transport":    { bg: "#F0F4F8", border: "#90CDF4", icon: "🚀" },
  "Emballage":    { bg: "#F5F5F5", border: "#CBD5E0", icon: "📦" },
  "Mobilier":     { bg: "#FAF5FF", border: "#D6BCFA", icon: "🏠" },
  "Logement":     { bg: "#FFFAF0", border: "#F6AD55", icon: "🏡" },
};

const CATALOGUE = [
  {
    id: 1,
    nom: "Steak haché bœuf",
    emoji: "🥩",
    uf: "200 g cuit (= 250 g cru)",
    categorie: "Alimentation",
    pef_mpt: 0.7715,
    completude: 100,
    impacts: {
      GWP: 8.40695, ODP: 3.37e-8, AP: 0.118413, EP_Eau: 2.334e-4,
      EP_Marine: 0.024990, EP_Terre: 0.52470, POCF: 0.012306, PM: 7.97e-7,
      IR: 0.08009, LU: 555.70, WU: 0.6675, RU_Fossil: 15.514,
      RU_Metal: 1.040e-5, HT_cancer: 3.36e-9, HT_nc: 1.230e-7, ETIC: 42.55
    },
    composition: [
      { qty: 0.250, composant: "Bœuf haché cru FR, 250g", fe: "Ecobalyse v8.5" },
      { qty: 0.015, composant: "Électricité cuisson, 0,015 kWh", fe: "BASE-IMPACTS v3.0" },
    ],
    hypotheses: "250g de bœuf haché cru (ratio cuisson 0,80) + 0,015 kWh cuisson à la poêle. Périmètre : élevage, abattage, transformation, distribution. Hors emballage.",
    sources: "Bœuf haché cru FR : Ecobalyse v8.5 (2025) / Électricité FR : BASE-IMPACTS v3.0",
  },
  {
    id: 2,
    nom: "Blanc de poulet",
    emoji: "🐔",
    uf: "200 g cuit (= 250 g cru)",
    categorie: "Alimentation",
    pef_mpt: 0.2046,
    completude: 100,
    impacts: {
      GWP: 1.17784, ODP: 2.21e-8, AP: 0.034925, EP_Eau: 1.452e-4,
      EP_Marine: 0.0077098, EP_Terre: 0.152863, POCF: 0.0045205, PM: 2.537e-7,
      IR: 0.019873, LU: 79.498, WU: 0.55635, RU_Fossil: 9.0755,
      RU_Metal: 4.954e-6, HT_cancer: 1.380e-9, HT_nc: 1.972e-8, ETIC: 39.273
    },
    composition: [
      { qty: 0.250, composant: "Blanc de poulet cru FR, 250g", fe: "Ecobalyse v8.5" },
      { qty: 0.012, composant: "Électricité cuisson, 0,012 kWh", fe: "BASE-IMPACTS v3.0" },
    ],
    hypotheses: "250g de blanc de poulet cru (ratio 0,80) + 0,012 kWh cuisson au four. Périmètre : élevage avicole, abattage, distribution. Hors emballage.",
    sources: "Blanc de poulet cru FR : Ecobalyse v8.5 (2025) / Électricité FR : BASE-IMPACTS v3.0",
  },
  {
    id: 3,
    nom: "Café expresso",
    emoji: "☕",
    uf: "1 tasse (7 g café, 25 ml)",
    categorie: "Alimentation",
    pef_mpt: 0.0102,
    completude: 100,
    impacts: {
      GWP: 0.058529, ODP: 7.12e-10, AP: 0.0010395, EP_Eau: 5.48e-6,
      EP_Marine: 5.934e-4, EP_Terre: 4.371e-3, POCF: 2.469e-4, PM: 7.35e-9,
      IR: 0.097345, LU: 2.8798, WU: 0.066487, RU_Fossil: 0.61236,
      RU_Metal: 2.830e-7, HT_cancer: 6.62e-11, HT_nc: 4.32e-9, ETIC: 1.7026
    },
    composition: [
      { qty: 0.007, composant: "Café moulu, 7g", fe: "Ecobalyse v8.5" },
      { qty: 0.030, composant: "Électricité machine, 0,03 kWh", fe: "BASE-IMPACTS v3.0" },
    ],
    hypotheses: "7g de café moulu + 0,03 kWh d'électricité (machine + chauffe-eau). Hors capsule/filtre. Culture café (Brésil/Vietnam), torréfaction, transport international inclus dans le FE café.",
    sources: "Café moulu par défaut FR : Ecobalyse v8.5 (2025) / Électricité FR : BASE-IMPACTS v3.0",
  },
  {
    id: 4,
    nom: "Verre de vin rouge",
    emoji: "🍷",
    uf: "1 verre (150 ml)",
    categorie: "Alimentation",
    pef_mpt: 0.0195,
    completude: 100,
    impacts: {
      GWP: 0.14576, ODP: 9.85e-9, AP: 0.0011665, EP_Eau: 1.261e-5,
      EP_Marine: 7.35e-4, EP_Terre: 3.0083e-3, POCF: 7.038e-4, PM: 1.315e-8,
      IR: 0.0081689, LU: 12.796, WU: 0.021413, RU_Fossil: 2.0291,
      RU_Metal: 3.192e-6, HT_cancer: 2.66e-10, HT_nc: 1.366e-8, ETIC: 1.944
    },
    composition: [
      { qty: 0.150, composant: "Vin rouge FR, 150ml", fe: "Ecobalyse v8.5" },
      { qty: 0.025, composant: "Électricité réfrigération, 0,025 kWh", fe: "BASE-IMPACTS v3.0" },
    ],
    hypotheses: "150ml de vin rouge français. Bouteille verre incluse dans le FE Ecobalyse. Viticulture FR, vinification, embouteillage, distribution inclus.",
    sources: "Vin rouge FR (2025) : Ecobalyse v8.5 / Électricité FR : BASE-IMPACTS v3.0",
  },
  {
    id: 5,
    nom: "Verre de lait",
    emoji: "🥛",
    uf: "1 verre (200 ml)",
    categorie: "Alimentation",
    pef_mpt: 0.0201,
    completude: 100,
    impacts: {
      GWP: 0.228962, ODP: 1.267e-9, AP: 0.0031000, EP_Eau: 1.016e-5,
      EP_Marine: 8.25e-4, EP_Terre: 0.013577, POCF: 3.658e-4, PM: 2.087e-8,
      IR: 0.0017390, LU: 12.229, WU: 0.023860, RU_Fossil: 0.40866,
      RU_Metal: 3.768e-7, HT_cancer: 1.094e-10, HT_nc: 2.824e-9, ETIC: 3.0177
    },
    composition: [
      { qty: 0.207, composant: "Lait FR, 207g", fe: "Ecobalyse v8.5" },
    ],
    hypotheses: "200ml de lait entier pasteurisé FR (densité 1,035 → 207g). Élevage laitier FR, pasteurisation, distribution inclus. Méthane entérique inclus dans GWP. Hors emballage.",
    sources: "Lait FR : Ecobalyse v8.5 (2025)",
  },
  {
    id: 6,
    nom: "T-shirt en coton",
    emoji: "👕",
    uf: "1 pièce (180 g) + 30 lavages",
    categorie: "Textile",
    pef_mpt: 0.3103,
    completude: 100,
    impacts: {
      GWP: 2.9096, ODP: 1.877e-7, AP: 0.025339, EP_Eau: 2.712e-4,
      EP_Marine: 0.017173, EP_Terre: 0.058138, POCF: 0.0087684, PM: 5.229e-7,
      IR: 0.65298, LU: 115.95, WU: 0.09053, RU_Fossil: 35.197,
      RU_Metal: 7.039e-6, HT_cancer: null, HT_nc: null, ETIC: null
    },
    composition: [
      { qty: 0.162, composant: "Fil de coton conventionnel, 162g (90%)", fe: "BASE-IMPACTS v3.0" },
      { qty: 0.018, composant: "Élasthane, 18g (10%)", fe: "Ecobalyse v8.5" },
      { qty: 0.180, composant: "30 lavages × 0,180 kg vêtement", fe: "Ecobalyse v8.5" },
      { qty: 0.180, composant: "Fin de vie (incinération), 180g", fe: "Ecobalyse v8.5" },
    ],
    hypotheses: "T-shirt 180g : 90% coton conventionnel + 10% élasthane. Confection = 0 (ADEME Textile). 30 lavages (durée de vie ~5 ans, 60°C). Fin de vie par incinération. LU très élevé à cause du coton conventionnel (irriguée, pesticides). WU du coton non dispo dans BASE-IMPACTS.",
    sources: "Fil coton conventionnel : BASE-IMPACTS v3.0 (ADEME Textile) / Élasthane : Ecobalyse v8.5 / Utilisation/FdV : Ecobalyse v8.5",
  },
  {
    id: 7,
    nom: "Jean en coton",
    emoji: "👖",
    uf: "1 pièce (600 g) + 60 lavages",
    categorie: "Textile",
    pef_mpt: 1.0059,
    completude: 100,
    impacts: {
      GWP: 9.6619, ODP: 6.305e-7, AP: 0.083893, EP_Eau: 8.913e-4,
      EP_Marine: 0.056799, EP_Terre: 0.19259, POCF: 0.029010, PM: 1.739e-6,
      IR: 2.1753, LU: 385.40, WU: 0.30179, RU_Fossil: 116.87,
      RU_Metal: 2.349e-5, HT_cancer: null, HT_nc: null, ETIC: null
    },
    composition: [
      { qty: 0.510, composant: "Fil de coton conventionnel, 510g (85%)", fe: "BASE-IMPACTS v3.0" },
      { qty: 0.030, composant: "Élasthane, 30g (5%)", fe: "Ecobalyse v8.5" },
      { qty: 0.060, composant: "Filament polyester, 60g (10%)", fe: "BASE-IMPACTS v3.0" },
      { qty: 0.600, composant: "60 lavages × 0,600 kg vêtement", fe: "Ecobalyse v8.5" },
      { qty: 0.600, composant: "Fin de vie (incinération), 600g", fe: "Ecobalyse v8.5" },
    ],
    hypotheses: "Jean 600g : 85% coton conv. + 10% polyester + 5% élasthane. Confection = 0 (ADEME). 60 lavages sur durée de vie (~7 ans). LU très élevé (coton). WU coton non disponible dans les données BASE-IMPACTS.",
    sources: "Fil coton/Polyester : BASE-IMPACTS v3.0 (ADEME Textile) / Élasthane, Utilisation, FdV : Ecobalyse v8.5",
  },
  {
    id: 8,
    nom: "Smartphone (iPhone 14)",
    emoji: "📱",
    uf: "1 unité neuve (cycle de vie complet)",
    categorie: "Électronique",
    pef_mpt: 7.635,
    completude: 92.1,
    impacts: {
      GWP: 61.0, ODP: 5.715e-9, AP: 0.5293, EP_Eau: 7.267e-4,
      EP_Marine: 0.1000, EP_Terre: 1.063, POCF: 0.2846,
      PM: 1.341e-5, IR: 16.52, LU: null, WU: 93.06,
      RU_Fossil: 226.2, RU_Metal: 7.391e-3, HT_cancer: 6.158e-8, HT_nc: 3.831e-6, ETIC: 700.5
    },
    composition: [
      { qty: 1, composant: "iPhone 14 (128GB) — GWP publié Apple EPD", fe: "Apple Environmental Report 2022" },
      { qty: 1, composant: "Autres indicateurs — proxy électronique grand public (TV remote GLO)", fe: "BASE-IMPACTS v3.0" },
      { qty: 1, composant: "WU, HT, ETIC — proxy batterie Li-ion NMC811 (mise à l'échelle GWP)", fe: "Ecobalyse v8.5" },
      { qty: 1, composant: "RU_Metal — proxy PCB assemblé finition Sn, Taiwan", fe: "BASE-IMPACTS v3.0" },
    ],
    hypotheses: "GWP = 61 kgCO₂eq : cycle de vie complet (fabrication 83%, transport 4%, usage 3 ans 12%, fin de vie 1%) selon Apple Environmental Report 2022. Les 14 autres indicateurs sont estimés par mise à l'échelle proportionnelle au GWP depuis des proxies électroniques disponibles dans BASE-IMPACTS v3.0 et Ecobalyse v8.5 : (1) indicateurs atmosphériques (ODP, AP, EP×3, POCF, PM, IR) → proxy télécommande TV (BASE-IMPACTS, 80g), (2) WU, HT×2, ETIC → proxy batterie Li-ion NMC811 (Ecobalyse), (3) RU_Metal → proxy PCB assemblé Taiwan (BASE-IMPACTS, élevé en métaux critiques). LU = null (impact négligeable pour l'électronique hors biomasse). Cette méthode suppose que la composition en procédés d'un iPhone est proportionnellement similaire aux proxies utilisés, ce qui est une approximation acceptable pour un usage pédagogique. Sources directes manquantes : pas d'ACV publique complète EF3.1 pour iPhone 14.",
    sources: "GWP : Apple iPhone 14 Environmental Report (Apple, 2022). Autres indicateurs : BASE-IMPACTS v3.0 (télécommande TV GLO, PCB Taiwan) / Ecobalyse v8.5 (Li-ion NMC811). Méthode : scaling proportionnel au GWP.",
  },
  {
    id: 9,
    nom: "Ordinateur portable (MacBook Air M1)",
    emoji: "💻",
    uf: "1 unité neuve (cycle de vie complet)",
    categorie: "Électronique",
    pef_mpt: 20.152,
    completude: 92.1,
    impacts: {
      GWP: 161.0, ODP: 1.508e-8, AP: 1.397, EP_Eau: 1.918e-3,
      EP_Marine: 0.2637, EP_Terre: 2.805, POCF: 0.7511,
      PM: 3.539e-5, IR: 43.61, LU: null, WU: 245.6,
      RU_Fossil: 597.0, RU_Metal: 1.951e-2, HT_cancer: 1.625e-7, HT_nc: 1.011e-5, ETIC: 1849.0
    },
    composition: [
      { qty: 1, composant: "MacBook Air M1 13\" 512GB — GWP publié Apple EPD", fe: "Apple Environmental Report 2021" },
      { qty: 1, composant: "Autres indicateurs — proxy électronique grand public (TV remote GLO)", fe: "BASE-IMPACTS v3.0" },
      { qty: 1, composant: "WU, HT, ETIC — proxy batterie Li-ion NMC811 (mise à l'échelle GWP)", fe: "Ecobalyse v8.5" },
      { qty: 1, composant: "RU_Metal — proxy PCB assemblé finition Sn, Taiwan", fe: "BASE-IMPACTS v3.0" },
    ],
    hypotheses: "GWP = 161 kgCO₂eq : cycle de vie complet (fabrication 77%, transport 5%, usage 3 ans 17%, fin de vie 1%) selon Apple Environmental Report 2021. Les 14 autres indicateurs sont estimés par mise à l'échelle proportionnelle au GWP depuis des proxies électroniques BASE-IMPACTS v3.0 et Ecobalyse v8.5 (même méthode que smartphone). MacBook Air M1 : châssis aluminium recyclé, puce Apple M1 (TSMC 5nm), 512GB SSD, batterie Li-ion, écran Retina 13\". Masse totale ≈ 1,29 kg. LU = null (électronique hors biomasse).",
    sources: "GWP : Apple MacBook Air M1 Environmental Report (Apple, 2021). Autres indicateurs : BASE-IMPACTS v3.0 (télécommande TV GLO, PCB Taiwan) / Ecobalyse v8.5 (Li-ion NMC811). Méthode : scaling proportionnel au GWP.",
  },
  {
    id: 10,
    nom: "Trajet voiture essence (100 km)",
    emoji: "🚗",
    uf: "100 km, 1 personne, essence",
    categorie: "Transport",
    pef_mpt: 1.2274,
    completude: 100,
    impacts: {
      GWP: 20.937, ODP: 4.499e-7, AP: 0.035632, EP_Eau: 8.916e-5,
      EP_Marine: 8.800e-3, EP_Terre: 0.085266, POCF: 0.059932, PM: 3.764e-7,
      IR: 0.078129, LU: 36.895, WU: 2.1000, RU_Fossil: 272.953,
      RU_Metal: 5.4060e-6, HT_cancer: 3.883e-9, HT_nc: 6.656e-8, ETIC: 165.448
    },
    composition: [
      { qty: 7.0, composant: "Essence E10 Euro6, 7 litres (7L/100km)", fe: "Ecobalyse v8.5" },
      { qty: 0.70, composant: "Infra/usure proxy (camion), 0,70 t⋅km", fe: "BASE-IMPACTS v3.0" },
    ],
    hypotheses: "Voiture essence moyenne FR, conso 7L/100km (ADEME 2023). FE Essence E10 Euro6 inclut combustion + production carburant. Infrastructure/usure approchée par proxy camion. EXCLU : fabrication véhicule (~+1 kgCO₂/100km) et infrastructure routière (~+0,5 kgCO₂/100km).",
    sources: "Essence (E10) Euro6 (par litre) : Ecobalyse v8.5 (2025) / Camion France (proxy) : BASE-IMPACTS v3.0",
  },
  {
    id: 11,
    nom: "Vol Paris → New York (aller)",
    emoji: "✈️",
    uf: "1 passager, économique, aller simple",
    categorie: "Transport",
    pef_mpt: 46.35,
    completude: 85.8,
    impacts: {
      GWP: 701.27, ODP: 6.50e-9, AP: 3.0255, EP_Eau: 8.877e-5,
      EP_Marine: 1.2597, EP_Terre: 13.785, POCF: 3.5047, PM: 1.174e-5,
      IR: 23.407, LU: 0.0, WU: null, RU_Fossil: 9708.2,
      RU_Metal: 3.583e-5, HT_cancer: null, HT_nc: null, ETIC: null
    },
    composition: [
      { qty: 584.0, composant: "Transport aérien long-courrier, 584 t⋅km (0,1t × 5840km)", fe: "BASE-IMPACTS v3.0" },
    ],
    hypotheses: "Distance CDG-JFK = 5840 km. Passager = 0,1t (80kg + 20kg bagage). t⋅km = 0,1 × 5840 = 584. FE inclut kérosène + flotte + infrastructure. ⚠️ FORÇAGE RADIATIF NON INCLUS — en ajoutant ×2 (ADEME), GWP réel ≈ 1400 kgCO₂eq. WU non dispo dans BASE-IMPACTS.",
    sources: "Transport aérien long-courrier (t⋅km) : BASE-IMPACTS v3.0 (flotte + utilisation + infra) — ⚠️ Sans forçage radiatif",
  },
  {
    id: 12,
    nom: "TGV Paris → Lyon (aller)",
    emoji: "🚆",
    uf: "1 passager, aller simple (~2h)",
    categorie: "Transport",
    pef_mpt: 0.1472,
    completude: 85.8,
    impacts: {
      GWP: 1.5502, ODP: 6.929e-15, AP: 1.390e-2, EP_Eau: 1.766e-9,
      EP_Marine: 5.013e-3, EP_Terre: 5.452e-2, POCF: 1.406e-2, PM: 1.713e-10,
      IR: 3.978e-1, LU: 0.0, WU: null, RU_Fossil: 18.891,
      RU_Metal: 1.189e-5, HT_cancer: null, HT_nc: null, ETIC: null
    },
    composition: [
      { qty: 41.1, composant: "Transport ferroviaire GLO, 41,1 t⋅km (0,08t × 514km)", fe: "BASE-IMPACTS v3.0" },
    ],
    hypotheses: "Paris-Lyon LGV = 514 km. Passager = 0,08t. t⋅km = 0,08 × 514 = 41,1. FE ferroviaire GLO (légèrement conservateur vs TGV FR électricité nucléaire). GWP réel TGV FR ≈ 3g CO₂/passager-km. Comparaison : voiture thermique ≈ 100g CO₂/passager-km → TGV 33× moins émetteur.",
    sources: "Transport ferroviaire GLO défaut (t⋅km) : BASE-IMPACTS v3.0",
  },
  {
    id: 13,
    nom: "Bouteille plastique PET (0,5L)",
    emoji: "🧴",
    uf: "1 bouteille vide de 0,5L",
    categorie: "Emballage",
    pef_mpt: 0.0145,
    completude: 100,
    impacts: {
      GWP: 0.13089, ODP: 1.60e-9, AP: 7.136e-4, EP_Eau: 3.107e-9,
      EP_Marine: 9.663e-5, EP_Terre: 1.062e-3, POCF: 5.56e-4, PM: 7.28e-9,
      IR: 0.0020916, LU: 0.0, WU: 0.0, RU_Fossil: 2.4893,
      RU_Metal: 7.99e-10, HT_cancer: 0.0, HT_nc: 0.0, ETIC: 0.0
    },
    composition: [
      { qty: 0.025, composant: "PET bouteille vierge (RER), 25g", fe: "BASE-IMPACTS v3.0" },
      { qty: 0.002, composant: "Acier étamé bouchon, 2g", fe: "BASE-IMPACTS v3.0" },
      { qty: 0.027, composant: "Transport distribution, 0,027 t⋅km (27g × 1000km)", fe: "BASE-IMPACTS v3.0" },
    ],
    hypotheses: "Bouteille PET 0,5L standard (25g PET) + bouchon acier 2g. Distribution 1000km en camion. PET vierge pétrosourcé → RU_Fossil élevé. Hors contenu (eau) et étiquette. Hors fin de vie.",
    sources: "PET bouteille vierge (RER) : BASE-IMPACTS v3.0 / Acier étamé : BASE-IMPACTS v3.0 / Camion France : BASE-IMPACTS v3.0",
  },
  {
    id: 14,
    nom: "Table en bois 4 places",
    emoji: "🪵",
    uf: "1 table neuve (durée de vie 20 ans)",
    categorie: "Mobilier",
    pef_mpt: 1.0364,
    completude: 100,
    impacts: {
      GWP: 18.458, ODP: 9.67e-9, AP: 0.053606, EP_Eau: 1.298e-5,
      EP_Marine: 0.020545, EP_Terre: 0.22042, POCF: 0.048776, PM: 4.643e-7,
      IR: -0.068491, LU: 0.0, WU: 0.0, RU_Fossil: 71.655,
      RU_Metal: -1.967e-5, HT_cancer: 0.0, HT_nc: 0.0, ETIC: 0.0
    },
    composition: [
      { qty: 15.0, composant: "Contreplaqué sylviculture durable (RER), 15 kg", fe: "BASE-IMPACTS v3.0" },
      { qty: 3.0,  composant: "Acier étamé 54% recyclage, 3 kg", fe: "BASE-IMPACTS v3.0" },
      { qty: 2.0,  composant: "Électricité fabrication atelier, 2 kWh", fe: "BASE-IMPACTS v3.0" },
      { qty: 0.18, composant: "Transport camion, 0,18 t⋅km (18kg × 10km)", fe: "BASE-IMPACTS v3.0" },
    ],
    hypotheses: "Table 4 places (~18kg total) : 15kg contreplaqué durable + 3kg acier (équerres, visserie) + 2 kWh élec atelier + transport 10km. IR légèrement négatif : effet du bois (stock carbone). WU non dispo pour contreplaqué dans BASE-IMPACTS.",
    sources: "Contreplaqué sylviculture durable (RER) : BASE-IMPACTS v3.0 / Acier/Électricité/Camion : BASE-IMPACTS v3.0",
  },
  {
    id: 16,
    nom: "Chauffage gaz naturel",
    emoji: "🔥",
    uf: "1 personne, 1 an (4 000 kWh = 14 400 MJ)",
    categorie: "Logement",
    pef_mpt: 57.493,
    completude: 100,
    impacts: {
      GWP: 1105.3, ODP: 4.848e-5, AP: 0.9053, EP_Eau: 4.530e-3,
      EP_Marine: 0.2704, EP_Terre: 2.987, POCF: 1.922, PM: 5.089e-6,
      IR: 5.487, LU: 380.5, WU: 24.88, RU_Fossil: 15699.0,
      RU_Metal: 1.081e-3, HT_cancer: 2.563e-7, HT_nc: 2.271e-6, ETIC: 828.8
    },
    composition: [
      { qty: 14400, composant: "Gaz de ville, 14 400 MJ (4 000 kWh × 3,6 MJ/kWh)", fe: "Ecobalyse v8.5" },
    ],
    hypotheses: "UF = 1 personne, 1 an. Hypothèse : 4 000 kWh/personne/an de gaz (foyer de 2 personnes partageant 8 000 kWh/an, cohérent ADEME 2023 pour logement moyen chauffé au gaz). 1 kWh = 3,6 MJ. FE 'Gaz de ville' (Ecobalyse v8.5) : inclut extraction, transport, distribution et combustion. LU non nul à cause des infrastructures gazières. WU faible pour le gaz naturel. RU_Fossil très élevé (le gaz est une ressource fossile : 15 699 MJ consommés = 4,38× l'énergie utile, rendement chaudière ~78%).",
    sources: "Gaz de ville (MJ) : Ecobalyse v8.5 (ADEME 2025) — FE par MJ × 14 400 MJ/pers/an",
  },
  {
    id: 17,
    nom: "Électricité logement",
    emoji: "⚡",
    uf: "1 personne, 1 an (2 250 kWh)",
    categorie: "Logement",
    pef_mpt: 121.253,
    completude: 85.6,
    impacts: {
      GWP: 180.2, ODP: 1.974e-6, AP: 0.4721, EP_Eau: 7.355e-5,
      EP_Marine: 0.1713, EP_Terre: 1.120, POCF: 0.4744, PM: 9.356e-6,
      IR: 7277.0, LU: 0.0, WU: null,
      RU_Fossil: 20955.0, RU_Metal: 1.093e-4, HT_cancer: null, HT_nc: null, ETIC: null
    },
    composition: [
      { qty: 2250, composant: "Mix électrique réseau France, 2 250 kWh", fe: "BASE-IMPACTS v3.0" },
    ],
    hypotheses: "UF = 1 personne, 1 an. Hypothèse : 2 250 kWh/personne/an (foyer de 2 personnes partageant 4 500 kWh/an, cohérent ADEME 2023). Mix électrique français 2011 (BASE-IMPACTS) : ~72% nucléaire, ~15% hydraulique, ~7% thermique, ~6% ENR. Le très fort IR (rayonnements ionisants = 7 277 kBqU235e) est la signature du nucléaire : il domine le score PEF mais correspond à des déchets radioactifs, pas à des émissions radioactives directes. GWP très bas (180 kgCO2e) car le nucléaire est décarboné. WU, HT, ETIC non disponibles dans BASE-IMPACTS v3.0.",
    sources: "Mix électrique réseau FR : BASE-IMPACTS v3.0 (INRAE/ELISA) — FE par kWh × 2 250 kWh/pers/an",
  },
  {
    id: 15,
    nom: "Canapé 2 places",
    emoji: "🛋️",
    uf: "1 canapé neuf (durée de vie 15 ans)",
    categorie: "Mobilier",
    pef_mpt: 23.13,
    completude: 100,
    impacts: {
      GWP: 272.89, ODP: 1.070e-5, AP: 0.91831, EP_Eau: 8.048e-3,
      EP_Marine: 0.18018, EP_Terre: 1.5357, POCF: 0.54041, PM: 1.090e-5,
      IR: 8.3026, LU: 59.998, WU: 0.0, RU_Fossil: 3429.5,
      RU_Metal: 1.890e-4, HT_cancer: 1.083e-7, HT_nc: 1.160e-6, ETIC: 164.14
    },
    composition: [
      { qty: 20.0, composant: "Mousse polyuréthane (complexe textile), 20 kg", fe: "BASE-IMPACTS v3.0" },
      { qty: 15.0, composant: "Contreplaqué sylviculture durable, 15 kg", fe: "BASE-IMPACTS v3.0" },
      { qty: 8.0,  composant: "Filament polyester (tissu revêtement), 8 kg", fe: "BASE-IMPACTS v3.0" },
      { qty: 5.0,  composant: "Acier étamé 54% recyclage (pieds, ressorts), 5 kg", fe: "BASE-IMPACTS v3.0" },
      { qty: 5.0,  composant: "Électricité fabrication atelier, 5 kWh", fe: "BASE-IMPACTS v3.0" },
      { qty: 0.48, composant: "Transport camion, 0,48 t⋅km (48kg × 10km)", fe: "BASE-IMPACTS v3.0" },
    ],
    hypotheses: "Canapé 2 places (~48kg) : 20kg mousse PU + 15kg contreplaqué + 8kg polyester (tissu) + 5kg acier + 5 kWh élec + transport. Mousse PU très pétrosourcée → RU_Fossil dominant. WU polyester non dispo dans BASE-IMPACTS. ODP élevé à cause de la mousse PU.",
    sources: "Mousse PU complexe, Contreplaqué, Polyester, Acier, Élec, Camion : BASE-IMPACTS v3.0 (ADEME)",
  },
];

// ── Profils de consommation annuelle ──────────────────────────────────────────
const PROFILES = [
  {
    label: "🌱 Sobre",
    subtitle: "Végétalien, mobilité douce, 0 vol",
    color: "#276749",
    // Végétalien : pas de viande, pas de volaille, pas de produits laitiers
    qtys: { 1:0, 2:0, 3:365, 4:26, 5:0, 6:2, 7:0.33, 8:0.2, 9:0.2, 10:5, 11:0, 12:3, 13:50, 14:0.05, 15:0.067, 16:0.5, 17:0.8 }
  },
  {
    label: "🥦 Végétarien urbain",
    subtitle: "Sans viande ni volaille, 1 vol/an, mobilité mixte",
    color: "#2B6CB0",
    // Végétarien lacto-ovo : pas de viande ni volaille, lait OK
    qtys: { 1:0, 2:0, 3:730, 4:78, 5:182, 6:4, 7:0.5, 8:0.25, 9:0.25, 10:30, 11:1, 12:4, 13:100, 14:0.05, 15:0.067, 16:0.75, 17:0.9 }
  },
  {
    label: "🇫🇷 Moyen français",
    subtitle: "Omnivore, voiture ~14 000 km/an, 1 vol tous les 2 ans",
    color: "#744210",
    qtys: { 1:104, 2:104, 3:730, 4:104, 5:365, 6:6, 7:1.5, 8:0.33, 9:0.25, 10:140, 11:0.5, 12:2, 13:200, 14:0.067, 15:0.083, 16:1.0, 17:1.0 }
  },
  {
    label: "🔥 Empreinte élevée",
    subtitle: "Fort consommateur : viande, SUV ~25 000 km/an, 2+ vols/an",
    color: "#C53030",
    qtys: { 1:260, 2:156, 3:1095, 4:260, 5:730, 6:15, 7:3, 8:0.5, 9:0.33, 10:250, 11:2, 12:2, 13:400, 14:0.1, 15:0.1, 16:2.0, 17:2.0 }
  }
];

// ── Référentiels capacité planétaire (périmètre catalogue) ───────────────────
// Le catalogue couvre ~50% de l'empreinte totale (alimentation partielle, transport,
// logement-énergie, textile léger, électronique, mobilier). Les services, la santé,
// l'administration, la construction des bâtiments, etc. ne sont pas couverts.
// Les références 1000 mPt (EU) et 300 mPt (cible 2050) sont pour l'empreinte TOTALE.
// Les valeurs ci-dessous sont ajustées à ×0,5 pour rester comparables au catalogue.
const PLANETARY = {
  EU_MOYENNE: 500,  // mPt — ~50% × 1 000 mPt (moyenne UE totale, périmètre catalogue)
  CIBLE_2050: 150,  // mPt — ~50% × 300 mPt (cible 1,5°C, périmètre catalogue)
  COVERAGE_NOTE: "Périmètre catalogue ≈ 50% de l'empreinte totale",
};

// ── Facteurs de coût externe environnemental (ECI) ───────────────────────────
// Source : CE Delft / JRC "Environmental Prices Handbook EU28" (2018)
// Signification : coût social du dommage environnemental par unité d'indicateur EF3.1
// Incertitude : facteur ×2–3 selon les études ; utiliser comme ordre de grandeur
const ECI = {
  GWP:       0.050,    // €/kg CO₂ eq.   — coût social carbone moyen
  ODP:       26100,    // €/kg CFC-11 eq. — dommage santé via rayonnement UV
  AP:        4.36,     // €/mol H⁺ eq.   — acidification : forêts, sols, eaux
  EP_Eau:    1230,     // €/kg P eq.      — eutrophisation eau douce
  EP_Marine: 6.08,     // €/kg N eq.      — eutrophisation marine
  EP_Terre:  0.104,    // €/mol N eq.     — eutrophisation terrestre
  POCF:      1.07,     // €/kg NMVOC eq.  — smog estival, santé respiratoire
  PM:        421000,   // €/incidence     — coût d'une maladie PM2.5
  IR:        0.0148,   // €/kBq U-235 eq. — déchets radioactifs
  LU:        2.47e-6,  // €/pt sol        — perte de biodiversité / sol
  WU:        0.0764,   // €/m³ dépriv.    — rareté de l'eau
  RU_Fossil: 0.0166,   // €/MJ            — épuisement fossiles (coût surplus futur)
  RU_Metal:  1560,     // €/kg Sb eq.     — épuisement minerais rares
  HT_cancer: 1670000,  // €/CTUh          — cancers liés aux émissions toxiques
  HT_nc:     77800,    // €/CTUh          — maladies non-cancéreuses
  ETIC:      0.00278,  // €/CTUe          — écotoxicité aquatique
};

// ── Articles & actualités ─────────────────────────────────────────────────────
const ARTICLES = [
  {
    id: 1,
    titre: "Bilan carbone, c'est bien. Bilan environnemental, c'est mieux — et la réglementation l'a compris.",
    date: "25 mars 2026",
    resume: "CSRD, OEF, RE2020, Digital Product Passport… Les textes réglementaires européens élargissent la focale bien au-delà du CO₂. Pourquoi le bilan environnemental complet s'impose aujourd'hui.",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    imageAlt: "Panorama montagne — réglementation environnementale européenne",
    contenu: `
      <p>Pendant des années, le "bilan carbone" a été <em>le</em> repère. Mais ce cadre commence à se fissurer. Non par idéologie, mais parce que les textes réglementaires européens et français, les uns après les autres, élargissent la focale. On ne vous demande plus seulement de compter vos tonnes de CO₂ — on vous demande de regarder votre empreinte sur l'eau, la biodiversité, les particules fines, l'acidification des sols. Bienvenue dans l'ère du bilan environnemental complet.</p>
      <h3>La CSRD/ESRS : cinq chapitres, cinq dimensions</h3>
      <p>Les cinq standards environnementaux (E1 à E5) couvrent : le climat, la pollution, l'eau, la biodiversité, et l'économie circulaire. Le carbone n'est qu'un indicateur parmi une vingtaine. La CSRD ne vous demande pas un bilan carbone : elle vous demande un bilan environnemental.</p>
      <h3>PEF/OEF : la méthodologie européenne d'ACV organisationnelle</h3>
      <p>La méthode OEF (Organisation Environmental Footprint) est une ACV organisationnelle multi-critères à part entière — 16 catégories d'impact. Elle s'intègre progressivement à l'ESPR applicable depuis juillet 2024 à la quasi-totalité des produits physiques sur le marché européen.</p>
      <h3>RE2020 et le CPR : le bâtiment en pointe</h3>
      <p>La RE2020 impose déjà une ACV complète des bâtiments neufs sur 50 ans. Le nouveau Règlement sur les Produits de Construction (CPR 2024/3110, applicable dès janvier 2026) rend ensuite obligatoire l'ensemble des indicateurs LCA d'ici 2030. Le bâtiment montre la voie aux autres secteurs.</p>
      <h3>Le Digital Product Passport</h3>
      <p>À partir de 2027, il faudra documenter l'empreinte environnementale complète d'un produit : carbone, eau, recyclabilité, composition. Le carbone sera présent — mais comme une ligne parmi d'autres dans un tableau de bord environnemental intégré.</p>
      <p>Le message réglementaire est cohérent : le bilan carbone seul ne suffit plus. Une entreprise peut réduire ses émissions de CO₂ tout en aggravant sa pression sur l'eau ou la biodiversité locale. C'est précisément pour ça que l'ACV organisationnelle multi-critères existe. Si vous souhaitez savoir où en est votre organisation, la calculatrice est accessible en ligne — et je suis disponible pour accompagner les organisations qui veulent aller plus loin.</p>
    `
  }
];
