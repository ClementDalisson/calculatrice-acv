// ─────────────────────────────────────────────────────────────────────────────
// auth.js — Authentification Supabase et persistance des données organisation
// Dépend des globals : state, showToast, createFocusTrap  (app.js)
//                      updateOrgItemBadge, renderEntrepriseSection  (app.js)
// ─────────────────────────────────────────────────────────────────────────────

/* ── Client Supabase ── */
const _supabase = window.supabase.createClient(
  'https://nudqonjkkgcahlbvukag.supabase.co',
  'sb_publishable_omw143FPjiWppaqokvT2Ww_GX9XuRvA'
);

/* ── Sauvegarde automatique (debounce 1.5 s) ── */
let _saveTimer = null;
function scheduleSave() {
  if (!state.authUser) return;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(saveOrgData, 1500);
}

/* ── Gestion de la modale auth ── */
let _authMode = 'login'; // 'login' | 'signup' | 'reset'

function openAuthModal() {
  _authMode = 'login';
  _syncAuthForm();
  const overlay = document.getElementById('auth-overlay');
  state._authOpener = document.activeElement;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('auth-email').focus();
  state._authTrap = createFocusTrap(overlay);
  document.addEventListener('keydown', state._authTrap);
}

function closeAuthModal() {
  document.getElementById('auth-overlay').classList.remove('open');
  document.body.style.overflow = '';
  if (state._authTrap) { document.removeEventListener('keydown', state._authTrap); state._authTrap = null; }
  document.getElementById('auth-form').reset();
  document.getElementById('auth-error').style.display = 'none';
  if (state._authOpener) { state._authOpener.focus(); state._authOpener = null; }
  if (window.location.hash.includes('type=recovery')) {
    history.replaceState(null, '', window.location.pathname);
  }
}

function switchAuthMode() {
  _authMode = _authMode === 'login' ? 'signup' : 'login';
  _syncAuthForm();
}

function _syncAuthForm() {
  const title      = document.getElementById('auth-title');
  const submit     = document.querySelector('.auth-submit-btn');
  const switchEl   = document.querySelector('.auth-switch');
  const forgotBtn  = document.getElementById('auth-forgot-btn');
  const emailField = document.getElementById('auth-email')?.closest('.auth-field');
  const passField  = document.getElementById('auth-password')?.closest('.auth-field');
  const passLabel  = passField?.querySelector('.auth-label');

  if (_authMode === 'reset') {
    title.textContent   = 'Nouveau mot de passe';
    submit.textContent  = 'Enregistrer le mot de passe';
    if (emailField) emailField.style.display = 'none';
    if (passLabel)  passLabel.textContent = 'Nouveau mot de passe';
    if (switchEl)   switchEl.style.display = 'none';
    if (forgotBtn)  forgotBtn.style.display = 'none';
    document.getElementById('auth-password').autocomplete = 'new-password';
  } else if (_authMode === 'login') {
    title.textContent   = 'Connexion';
    submit.textContent  = 'Se connecter';
    if (emailField) emailField.style.display = '';
    if (passLabel)  passLabel.textContent = 'Mot de passe';
    if (switchEl)   switchEl.style.display = '';
    if (forgotBtn)  forgotBtn.style.display = '';
    document.querySelector('.auth-switch-btn').textContent = 'Créer un compte';
    switchEl.childNodes[0].textContent = 'Pas encore de compte ? ';
    document.getElementById('auth-password').autocomplete = 'current-password';
  } else {
    title.textContent   = 'Créer un compte';
    submit.textContent  = 'Créer mon compte';
    if (emailField) emailField.style.display = '';
    if (passLabel)  passLabel.textContent = 'Mot de passe';
    if (switchEl)   switchEl.style.display = '';
    if (forgotBtn)  forgotBtn.style.display = 'none';
    document.querySelector('.auth-switch-btn').textContent = 'Se connecter';
    switchEl.childNodes[0].textContent = 'Déjà un compte ? ';
    document.getElementById('auth-password').autocomplete = 'new-password';
  }
  document.getElementById('auth-error').style.display = 'none';
}

/* ── Soumission du formulaire auth ── */
async function handleAuthSubmit(e) {
  e.preventDefault();
  const email     = document.getElementById('auth-email').value.trim();
  const password  = document.getElementById('auth-password').value;
  const errorEl   = document.getElementById('auth-error');
  const submitBtn = document.querySelector('.auth-submit-btn');

  submitBtn.disabled = true;
  submitBtn.textContent = '…';
  errorEl.style.display = 'none';

  try {
    let result;
    if (_authMode === 'reset') {
      result = await _supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      closeAuthModal();
      showToast('Mot de passe mis à jour. Vous êtes connecté.', 'info');
      state.authUser = result.data.user;
      updateNavAuth();
      await loadOrgData();
      return;
    } else if (_authMode === 'login') {
      result = await _supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await _supabase.auth.signUp({ email, password });
    }
    if (result.error) throw result.error;

    if (_authMode === 'signup' && !result.data.session) {
      closeAuthModal();
      showToast('Vérifiez votre email pour confirmer votre compte.', 'info');
      return;
    }

    state.authUser = result.data.user;
    closeAuthModal();
    updateNavAuth();
    await loadOrgData();
    showToast('Connecté en tant que ' + email, 'info');
  } catch (err) {
    errorEl.textContent = _translateAuthError(err.message);
    errorEl.style.display = 'block';
  } finally {
    _syncAuthForm();
    document.querySelector('.auth-submit-btn').disabled = false;
  }
}

function _translateAuthError(msg) {
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (msg.includes('Email not confirmed'))       return 'Veuillez confirmer votre email.';
  if (msg.includes('User already registered'))   return 'Cet email est déjà utilisé.';
  if (msg.includes('Password should be'))        return 'Le mot de passe doit faire au moins 6 caractères.';
  return msg;
}

/* ── Déconnexion ── */
async function logout() {
  await _supabase.auth.signOut();
  state.authUser = null;
  state.orgProfile = { nom: '', secteur: '', salaries: '', surface: '', chauffage: '', travail: '' };
  state.orgItemsMap = {};
  state.orgLastResults = null;
  updateNavAuth();
  renderEntrepriseSection();
  showToast('Déconnecté.', 'info');
}

function updateNavAuth() {
  const btn = document.getElementById('nav-auth-btn');
  if (!btn) return;
  if (state.authUser) {
    const label = state.authUser.email.split('@')[0];
    btn.textContent = '👤 ' + label;
    btn.title = state.authUser.email;
    btn.classList.add('connected');
    btn.onclick = logout;
  } else {
    btn.textContent = '🔐 Connexion';
    btn.title = '';
    btn.classList.remove('connected');
    btn.onclick = openAuthModal;
  }
}

/* ── Mot de passe oublié ── */
async function handleForgotPassword() {
  const email   = document.getElementById('auth-email').value.trim();
  const errorEl = document.getElementById('auth-error');
  if (!email) {
    errorEl.textContent = 'Saisissez votre email ci-dessus.';
    errorEl.style.display = 'block';
    document.getElementById('auth-email').focus();
    return;
  }
  const btn = document.getElementById('auth-forgot-btn');
  btn.disabled = true;
  const { error } = await _supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://clementdalisson.github.io/calculatrice-acv/',
  });
  btn.disabled = false;
  if (error) {
    errorEl.textContent = 'Erreur : ' + error.message;
    errorEl.style.display = 'block';
  } else {
    closeAuthModal();
    showToast('Email de réinitialisation envoyé à ' + email, 'info');
  }
}

/* ── Persistance Supabase ── */
async function saveOrgData() {
  if (!state.authUser) return;
  try {
    const { error } = await _supabase.from('org_data').upsert({
      user_id:    state.authUser.id,
      profile:    state.orgProfile,
      items_map:  state.orgItemsMap,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  } catch {
    showToast('Sauvegarde impossible — vérifiez votre connexion.', 'warning');
  }
}

async function loadOrgData() {
  if (!state.authUser) return;
  const btn = document.getElementById('nav-auth-btn');
  if (btn) { btn.textContent = '⏳ Chargement…'; btn.disabled = true; }
  try {
    const { data, error } = await _supabase
      .from('org_data')
      .select('profile, items_map')
      .eq('user_id', state.authUser.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    if (data) {
      state.orgProfile  = data.profile  || state.orgProfile;
      state.orgItemsMap = data.items_map || {};
      updateOrgItemBadge();
      if (state.main === 'organisation') renderEntrepriseSection();
    }
  } catch {
    showToast('Chargement impossible — vérifiez votre connexion.', 'warning');
  } finally {
    updateNavAuth();
    if (btn) btn.disabled = false;
  }
}
