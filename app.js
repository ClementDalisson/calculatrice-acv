// ─────────────────────────────────────────────────────────────────────────────
// app.js — État global, utilitaires UI, initialisation, page d'accueil, articles
// Modules UI : ui-perso.js (calculatrice perso) | ui-org.js (organisation)
// Calculs : calc.js | Auth : auth.js | Navigation : router.js
// ─────────────────────────────────────────────────────────────────────────────

/* ── Toast notification ── */
function showToast(message, type = 'warning') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
  });
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3500);
}

/* ── Focus trap ── */
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function createFocusTrap(containerEl) {
  return function handler(e) {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(containerEl.querySelectorAll(FOCUSABLE));
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  };
}

/* ── State ── */
let state = {
  main: 'home',
  section: 'catalogue',
  subSection: 'catalogue',
  // Organisation
  orgSection: 'outil',
  orgItemsMap: {},    // { itemId: { qty: number } }
  orgProfile: { nom: '', secteur: '', salaries: '', surface: '', chauffage: '', travail: '' },
  orgSectorFilter: 'all',
  orgSearchQuery: '',
  orgLastResults: null,  // { totals, bySecteur, pefBySecteur, profile, selectedItems }
  authUser: null,
  // Perso
  entrepriseDonutChart: null,
  selectedIds: [],
  filterCat: 'all',
  detailId: null,
  detailChart: null,
  compareChart1: null,
  compareChart2: null,
  empreinteProfile: 2,
  empreinteGaugeChart: null,
  empreinteBreakdownChart: null,
};

// Barres de progression compactes pour les cartes du catalogue
// 4 barres = 4 catégories de dommage EF3.1, normalisées en % de ce produit (somme = 100%)
function renderTokenBars(obj) {
  const catEmoji = { climat: '🌡️', ecosystemes: '🌿', sante: '🏥', ressources: '⛏️💧' };

  // Sous-scores mPt par catégorie de dommage
  const catScores = Object.entries(DAMAGE_CATEGORIES).map(([dKey, dData]) => {
    let score = 0;
    dData.indicators.forEach(ind => {
      const meta = EF31[ind];
      const v = obj.impacts[ind];
      if (v !== null && v !== undefined) score += (v / meta.norm) * (meta.weight / 100) * 1000;
    });
    return { dKey, dData, score: Math.max(0, score) };
  });

  const total = catScores.reduce((sum, c) => sum + c.score, 0);

  const bars = total > 0 ? catScores.map(({ dKey, dData, score }) => {
    const pctW   = Math.max(2, (score / total) * 100).toFixed(1);
    const pctLbl = Math.round((score / total) * 100);
    const emoji  = catEmoji[dKey] || '🔵';
    const valFmt = score.toFixed(2) + ' mPt';
    return `<div class="tbr" title="${dData.label} : ${pctLbl}% (${valFmt})">
      <span class="tbr-emoji">${emoji}</span>
      <div class="tbr-track"><div class="tbr-fill" style="width:${pctW}%;background:${dData.color}"></div></div>
      <span class="tbr-val">${pctLbl}%</span>
    </div>`;
  }).join('') : '';

  // Score environnemental — entier mPt, sans barre
  const scoreChip = obj.completude >= 50
    ? `<div class="card-score-chip">📊 ${Math.round(obj.pef_mpt)} mPt</div>`
    : '';

  return `<div class="card-bars">${bars}${scoreChip}</div>`;
}

// Panneau de détail : 6 token-cards (CO₂, Eau, Minerais, Fossiles, Santé, Score)
function renderTokenRow(obj) {
  const healthVal = computeHealthScore(obj);
  const items = [
    { emoji: '🌡️', label: 'CO₂',         val: obj.impacts.GWP,                            type: 'co2',      title: 'Changement climatique (kg CO₂ eq.)' },
    { emoji: '💧', label: 'Eau',         val: obj.impacts.WU,                             type: 'eau_L',    title: 'Consommation d\'eau (litres)' },
    { emoji: '⛏️', label: 'Minerais',    val: obj.impacts.RU_Metal,                       type: 'minerais', title: 'Ressources minérales extraites (kg Sb eq.)' },
    { emoji: '⚡', label: 'Fossiles',    val: obj.impacts.RU_Fossil,                      type: 'fossile',  title: 'Ressources fossiles extraites (MJ surplus)' },
    { emoji: '🫁', label: 'Santé env.',  val: healthVal,                                  type: 'mpt',      title: 'Impacts santé humaine — sous-score EF3.1 (mPt)' },
    { emoji: '📊', label: 'Score env.',  val: obj.completude >= 50 ? obj.pef_mpt : null,  type: 'mpt',      title: 'Score environnemental total (somme des 16 indicateurs EF3.1, en mPt)' },
  ];
  return items.map(t => {
    const formatted = fmtTokenVal(t.val, t.type);
    if (formatted === null) return '';
    const isSynthesis = t.emoji === '📊';
    return `<div class="token-card${isSynthesis ? ' token-card-score' : ''}" title="${t.title}">
      <div class="tc-emoji">${t.emoji}</div>
      <div class="tc-val">${formatted}</div>
      <div class="tc-lbl">${t.label}</div>
    </div>`;
  }).join('');
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
  // Main nav
  document.querySelectorAll('.nav-link[data-main]').forEach(l => {
    l.addEventListener('click', () => goToMain(l.dataset.main));
  });

  // Sub-nav perso
  document.querySelectorAll('.subnav-link').forEach(l => {
    l.addEventListener('click', () => goTo(l.dataset.section));
  });

  // Sub-nav organisation
  document.querySelectorAll('.subnav-org-link').forEach(l => {
    l.addEventListener('click', () => goToOrg(l.dataset.orgSection));
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.addEventListener('click', () => setFilter(b.dataset.cat));
  });

  // Close detail
  document.getElementById('detail-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetail();
  });
  document.getElementById('detail-close-btn').addEventListener('click', closeDetail);

  // Clear compare
  document.getElementById('compare-clear-btn').addEventListener('click', clearCompare);

  // Keyboard — Escape ferme la modale active
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('detail-overlay').classList.contains('open')) closeDetail();
    else if (document.getElementById('article-overlay').classList.contains('open')) closeArticle();
    else if (document.getElementById('auth-overlay').classList.contains('open')) closeAuthModal();
  });

  // Brand → home
  const brand = document.querySelector('.nav-brand');
  if (brand) brand.addEventListener('click', () => goToMain('home'));

  // Articles → home puis scroll vers Actualités
  const navArticlesBtn = document.getElementById('nav-articles-btn');
  if (navArticlesBtn) {
    navArticlesBtn.addEventListener('click', () => {
      if (state.main !== 'home') goToMain('home');
      setTimeout(() => {
        const el = document.getElementById('home-news-list');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });
  }


  renderCatalogue();
  updateNavBadge();
  updateOrgItemBadge();
  // Initialisation : lire le hash pour restaurer l'état (lien direct, etc.)
  await loadArticles();
  hideEmptyHomeSections();
  await navigateFromHash(window.location.hash || '#home');

  // Article modal close
  document.getElementById('article-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeArticle();
  });
  document.getElementById('article-modal-close').addEventListener('click', closeArticle);

  // Auth modal
  document.getElementById('auth-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeAuthModal();
  });
  document.getElementById('auth-close-btn').addEventListener('click', closeAuthModal);
  document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);

  // Sauvegarde automatique du profil organisation quand un champ change
  function _syncAndSaveProfile() {
    const salariesRaw = parseInt(document.getElementById('org-salaries')?.value);
    const surfaceRaw  = parseInt(document.getElementById('org-surface')?.value);
    state.orgProfile = {
      nom:      document.getElementById('org-nom')?.value?.trim() || '',
      secteur:  document.getElementById('org-secteur')?.value || '',
      salaries: isNaN(salariesRaw) ? null : salariesRaw,
      surface:  isNaN(surfaceRaw)  ? null : surfaceRaw,
      chauffage: document.getElementById('org-chauffage')?.value || '',
      travail:  document.getElementById('org-travail')?.value || '',
    };
    scheduleSave();
  }
  document.getElementById('sec-entreprise').addEventListener('input', e => {
    if (e.target.matches('.org-input')) _syncAndSaveProfile();
  });
  document.getElementById('sec-entreprise').addEventListener('change', e => {
    if (e.target.matches('.org-input')) _syncAndSaveProfile();
  });

  // Écouter les changements d'état auth (inclut PASSWORD_RECOVERY)
  _supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      _authMode = 'reset';
      _syncAuthForm();
      const overlay = document.getElementById('auth-overlay');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      document.getElementById('auth-password').focus();
      state._authTrap = createFocusTrap(overlay);
      document.addEventListener('keydown', state._authTrap);
    } else if (event === 'SIGNED_IN' && session) {
      state.authUser = session.user;
      updateNavAuth();
      loadOrgData();
    } else if (event === 'SIGNED_OUT') {
      state.authUser = null;
      updateNavAuth();
    }
  });

  // Vérifier session existante au démarrage
  _supabase.auth.getSession().then(({ data }) => {
    if (data.session) {
      state.authUser = data.session.user;
      updateNavAuth();
      loadOrgData();
    }
  });
});

/* ── Masquer les rubriques vides de la page d'accueil ── */
function hideEmptyHomeSections() {
  document.querySelectorAll('#sec-home .home-section').forEach(section => {
    // Sélectionner toutes les cartes de contenu (pas le titre)
    const cards = section.querySelectorAll('.home-ref-card, .home-tool-card, .home-expertise-card, .home-about-profile, .home-placeholder-card');
    if (cards.length === 0) return;
    const allPlaceholders = Array.from(cards).every(c => c.classList.contains('home-placeholder-card'));
    if (allPlaceholders) section.style.display = 'none';
  });
}

/* ── Actualités ── */
let _articles = [];

async function loadArticles() {
  const list = document.getElementById('home-news-list');
  if (list) list.innerHTML = '<p style="color:var(--text-muted);padding:1rem">Chargement…</p>';
  try {
    const res = await fetch('content/articles/index.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    _articles = await res.json();
  } catch {
    _articles = [];
    if (list) {
      const section = list.closest('.home-section');
      if (section) section.style.display = 'none';
    }
    return;
  }
  renderNews();
}

function renderNews() {
  const list = document.getElementById('home-news-list');
  if (!list) return;
  const section = list.closest('.home-section');
  if (!_articles.length) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';
  list.innerHTML = _articles.map(a => `
    <article class="news-card">
      <img class="news-card-img" src="${a.image || ''}" alt="${a.imageAlt || ''}" loading="lazy">
      <div class="news-card-body">
        <div class="news-card-date">${a.date}</div>
        <div class="news-card-titre" onclick="openArticle('${a.id}')">${a.titre}</div>
        <p class="news-card-resume">${a.resume}</p>
        <button class="news-card-btn" onclick="openArticle('${a.id}')">Lire l'article →</button>
      </div>
    </article>
  `).join('');
}

function openArticle(id, { pushHash = true } = {}) {
  const a = _articles.find(x => x.id === id);
  if (!a) return;
  state._articleOpener = document.activeElement;
  document.getElementById('article-modal-date').textContent = a.date;
  document.getElementById('article-modal-titre').textContent = a.titre;
  document.getElementById('article-modal-img').src = a.image;
  document.getElementById('article-modal-img').alt = a.imageAlt;
  let contenu = a.contenu;
  if (a.sources && a.sources.length) {
    const items = a.sources.map(s => `<li>${s}</li>`).join('');
    contenu += `<div class="article-sources-block"><strong>Sources</strong><ul>${items}</ul></div>`;
  }
  document.getElementById('article-modal-contenu').innerHTML = contenu;
  const articleOverlay = document.getElementById('article-overlay');
  articleOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('article-modal-close').focus();
  state._articleTrap = createFocusTrap(articleOverlay);
  document.addEventListener('keydown', state._articleTrap);
  if (pushHash) _setHash('#articles/' + id);
}

function closeArticle() {
  document.getElementById('article-overlay').classList.remove('open');
  document.body.style.overflow = '';
  if (state._articleTrap) { document.removeEventListener('keydown', state._articleTrap); state._articleTrap = null; }
  if (state._articleOpener) { state._articleOpener.focus(); state._articleOpener = null; }
  // Revenir au hash #home si on était sur un article
  if (window.location.hash.startsWith('#articles/')) _setHash('#home');
}
