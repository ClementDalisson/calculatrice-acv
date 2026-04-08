// ─────────────────────────────────────────────────────────────────────────────
// router.js — Navigation entre sections
// Dépend des globals : state  (app.js)
//                      renderCatalogue, renderCompare, renderEmpreinte,
//                      renderMethodologie, renderEntrepriseSection  (app.js)
// ─────────────────────────────────────────────────────────────────────────────

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const _SITE = 'Dalisson Environnement';
const _MAIN_TITLES = {
  home:         _SITE,
  perso:        'Calculatrice personnelle — ' + _SITE,
  organisation: 'Bilan organisation — ' + _SITE,
  contact:      'Contact — ' + _SITE,
  methode:      'Méthode EF3.1 — ' + _SITE,
};
const _SUB_TITLES = {
  catalogue: 'Catalogue — ' + _SITE,
  compare:   'Comparaison — ' + _SITE,
  empreinte: 'Empreinte annuelle — ' + _SITE,
};
const _ORG_TITLES = {
  catalogue: 'Catalogue organisation — ' + _SITE,
  outil:     'Saisie des données — ' + _SITE,
  analyse:   'Résultats organisation — ' + _SITE,
};

function showOnly(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('sec-' + section);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

/* ── Hash helpers ── */
let _suppressHashChange = false;

function _setHash(hash) {
  _suppressHashChange = true;
  window.location.hash = hash;
  // laisser l'événement hashchange se déclencher puis relâcher le verrou
  setTimeout(() => { _suppressHashChange = false; }, 50);
}

function _buildHash(main, sub) {
  if (main === 'home') return '#home';
  if (sub) return '#' + main + '/' + sub;
  return '#' + main;
}

function goToMain(main, { pushHash = true } = {}) {
  state.main = main;
  document.title = _MAIN_TITLES[main] || _SITE;
  document.querySelectorAll('.nav-link[data-main]').forEach(l => {
    l.classList.toggle('active', l.dataset.main === main);
  });
  const subnav    = document.getElementById('subnav');
  const subnavOrg = document.getElementById('subnav-org');
  if (subnav)    subnav.style.display    = main === 'perso'        ? '' : 'none';
  if (subnavOrg) subnavOrg.style.display = main === 'organisation' ? '' : 'none';

  if (main === 'home') {
    showOnly('home');
    if (pushHash) _setHash('#home');
  } else if (main === 'perso') {
    goTo(state.subSection || 'catalogue', { pushHash });
  } else if (main === 'organisation') {
    showOnly('entreprise');
    goToOrg(state.orgSection || 'outil', { pushHash });
  } else if (main === 'contact') {
    showOnly('contact');
    if (pushHash) _setHash('#contact');
  } else if (main === 'methode') {
    showOnly('methode');
    renderMethodologie();
    if (pushHash) _setHash('#methode');
  }
}

function goTo(section, { pushHash = true } = {}) {
  state.section = section;
  if (['catalogue', 'compare', 'empreinte'].includes(section)) {
    state.subSection = section;
    document.title = _SUB_TITLES[section] || _MAIN_TITLES.perso;
  }
  showOnly(section);
  document.querySelectorAll('.subnav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.section === section);
  });
  if (section === 'compare')   renderCompare();
  if (section === 'empreinte') renderEmpreinte();
  updateNavBadge();
  if (pushHash) _setHash(_buildHash('perso', section));
}

function updateNavBadge() {
  const badge = document.getElementById('compare-badge');
  badge.textContent = state.selectedIds.length;
  badge.style.display = state.selectedIds.length > 0 ? 'inline' : 'none';
}

function goToOrg(section, { pushHash = true } = {}) {
  state.orgSection = section;
  document.title = _ORG_TITLES[section] || _MAIN_TITLES.organisation;
  document.querySelectorAll('.subnav-org-link').forEach(l => {
    l.classList.toggle('active', l.dataset.orgSection === section);
  });
  renderEntrepriseSection();
  if (pushHash) _setHash(_buildHash('organisation', section));
}

function updateOrgItemBadge() {
  const badge = document.getElementById('org-items-badge');
  if (!badge) return;
  const count = Object.keys(state.orgItemsMap).length;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline' : 'none';
}

/* ── Router : lire le hash et naviguer ── */
async function navigateFromHash(hash) {
  if (!hash || hash === '#' || hash === '#home') {
    goToMain('home', { pushHash: false });
    return;
  }

  const path = hash.replace(/^#/, '');
  const parts = path.split('/');
  const main = parts[0];
  const sub  = parts[1] || null;

  if (main === 'articles') {
    // Aller sur home d'abord, puis ouvrir l'article
    if (state.main !== 'home') goToMain('home', { pushHash: false });
    // Attendre que les articles soient chargés si nécessaire
    if (!_articles.length) await loadArticles();
    if (sub) openArticle(sub, { pushHash: false });
    return;
  }

  const validMains = ['home', 'perso', 'organisation', 'contact', 'methode'];
  if (!validMains.includes(main)) {
    goToMain('home', { pushHash: false });
    return;
  }

  if (main === 'perso') {
    state.subSection = sub || 'catalogue';
    goToMain('perso', { pushHash: false });
  } else if (main === 'organisation') {
    state.orgSection = sub || 'outil';
    goToMain('organisation', { pushHash: false });
  } else {
    goToMain(main, { pushHash: false });
  }
}

/* ── Écoute du bouton Retour/Avant du navigateur ── */
window.addEventListener('hashchange', () => {
  if (_suppressHashChange) return;
  navigateFromHash(window.location.hash);
});
