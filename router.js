// ─────────────────────────────────────────────────────────────────────────────
// router.js — Navigation entre sections
// Dépend des globals : state  (app.js)
//                      renderCatalogue, renderCompare, renderEmpreinte,
//                      renderMethodologie, renderEntrepriseSection  (app.js)
// ─────────────────────────────────────────────────────────────────────────────

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
  const subnav    = document.getElementById('subnav');
  const subnavOrg = document.getElementById('subnav-org');
  if (subnav)    subnav.style.display    = main === 'perso'        ? '' : 'none';
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
  if (section === 'compare')   renderCompare();
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
