// ============================================
// OXY TEMPMAIL - MAIL.TM via CF Function + SAVE AKUN
// v2: error detail + username unik
// ============================================

const API = '/proxy?path=';
const STORAGE_KEY = 'oxy_mailtm_accounts';
const ACTIVE_KEY = 'oxy_mailtm_active';

let currentAccount = null;
let refreshInterval = null;

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  console.log('========== [OXY] APP START v2 ==========');
  setupNav();

  const activeEmail = localStorage.getItem(ACTIVE_KEY);
  const accounts = getAccounts();
  if (activeEmail) {
    const found = accounts.find(a => a.email === activeEmail);
    if (found) {
      currentAccount = found;
      console.log('[OXY] Load akun aktif:', found.email);
      applyAccount();
      renderSavedList();
      startRefresh();
      return;
    }
  }

  renderSavedList();
  createEmail();
});

// ===== STORAGE HELPERS =====
function getAccounts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) { return []; }
}

function saveAccounts(accounts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

// ===== NAV =====
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      const pageId = btn.dataset.page;
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(pageId).classList.add('active');
      btn.classList.add('active');
      const titles = { pageEmail: 'Email', pageInbox: 'Kotak masuk', pageSaved: 'Tersimpan', pageManage: 'Kelola' };
      document.getElementById('headerTitle').textContent = titles[pageId];

      if (pageId === 'pageSaved') renderSavedList();
      if (pageId === 'pageInbox') loadInbox();
    };
  });

  document.getElementById('btnMenu').onclick = () => document.querySelector('[data-page="pageManage"]').click();

  document.getElementById('btnRefreshTop').onclick = () => {
    loadInbox();
    const s = document.getElementById('statusEmail');
    s.textContent = '🔄 Refresh...';
    setTimeout(() => s.textContent = '', 1500);
  };

  document.getElementById('btnCopy').onclick = copyEmail;
  document.getElementById('btnChange').onclick = changeEmail;
  document.getElementById('btnSave').onclick = saveCurrentAccount;
  document.getElementById('btnDeleteAll').onclick = changeEmail;
}

// ===== BIKIN EMAIL BARU =====
async function createEmail() {
  const status = document.getElementById('statusEmail');
  const btn = document.getElementById('btnCopy');
  btn.disabled = true;
  if (status) status.textContent = '⏳ Bikin email...';

  try {
    // 1. Ambil domain
    const domRes = await fetch(API + 'domains');
    const domText = await domRes.text();
    console.log('[OXY] Domains raw:', domText.substring(0, 200));

    let domData;
    try { domData = JSON.parse(domText); } catch (e) {
      throw new Error('Domain response bukan JSON: ' + domText.substring(0, 80));
    }

    let domains = Array.isArray(domData) ? domData : (domData['hydra:member'] || []);
    if (!domains.length) throw new Error('Ga ada domain aktif');

    const domain = domains[0].domain || domains[0].name;
    if (!domain) throw new Error('Domain ga valid');
    console.log('[OXY] Domain:', domain);

    // 2. Username UNIK: random + timestamp
    const ts = Date.now().toString(36).slice(-5);
    const rnd = Math.random().toString(36).substring(2, 8);
    const user = (rnd + ts).toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = user + '@' + domain;
    const password = 'oxy' + Math.random().toString(36).substring(2, 14) + 'X';
    console.log('[OXY] Coba daftar:', email);

    // 3. Daftar akun
    const accRes = await fetch(API + 'accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: email, password: password })
    });

    const accText = await accRes.text();
    console.log('[OXY] Daftar status:', accRes.status, 'body:', accText.substring(0, 200));

    if (!accRes.ok) {
      throw new Error('Gagal daftar (' + accRes.status + '): ' + accText.substring(0, 100));
    }

    let accData;
    try { accData = JSON.parse(accText); } catch (e) {
      throw new Error('Response daftar bukan JSON');
    }

    // 4. Login dapet token
    const tokRes = await fetch(API + 'token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: email, password: password })
    });
    const tokText = await tokRes.text();
    console.log('[OXY] Token status:', tokRes.status, 'body:', tokText.substring(0, 200));

    let tokData;
    try { tokData = JSON.parse(tokText); } catch (e) {
      throw new Error('Response token bukan JSON');
    }

    if (!tokData.token) throw new Error('Token gagal: ' + tokText.substring(0, 80));

    currentAccount = {
      email: email,
      password: password,
      token: tokData.token,
      id: accData.id,
      domain: domain,
      createdAt: Date.now()
    };

    localStorage.setItem(ACTIVE_KEY, email);
    console.log('[OXY] ✅ Email baru sukses:', email);

    applyAccount();
    if (status) status.textContent = '✅ Email siap!';
    startRefresh();
  } catch (e) {
    console.error('[OXY] ❌ Error:', e);
    if (status) status.textContent = '❌ ' + e.message;
  } finally { btn.disabled = false; }
}

// ===== SIMPAN AKUN AKTIF =====
function saveCurrentAccount() {
  if (!currentAccount) return;
  const status = document.getElementById('statusEmail');
  const accounts = getAccounts();

  const existing = accounts.findIndex(a => a.email === currentAccount.email);
  if (existing >= 0) {
    accounts[existing] = currentAccount;
    if (status) status.textContent = '💾 Akun diupdate!';
  } else {
    accounts.push(currentAccount);
    if (status) status.textContent = '💾 Akun disimpan!';
  }

  saveAccounts(accounts);
  localStorage.setItem(ACTIVE_KEY, currentAccount.email);
  renderSavedList();
  setTimeout(() => { if (status) status.textContent = ''; }, 2000);
}

// ===== RENDER DAFTAR TERSIMPAN =====
function renderSavedList() {
  const list = document.getElementById('savedList');
  if (!list) return;
  const accounts = getAccounts();
  const countEl = document.getElementById('savedCount');
  if (countEl) countEl.textContent = accounts.length;

  if (!accounts.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">💾</div><p>Belum ada akun tersimpan</p><span>Klik "Simpan akun ini" di halaman Email</span></div>';
    return;
  }

  list.innerHTML = accounts.map(a => {
    const isActive = currentAccount && currentAccount.email === a.email;
    return '<div class="saved-item ' + (isActive ? 'active' : '') + '" onclick="switchAccount(\'' + a.email + '\')">' +
      '<div class="saved-item-info">' +
        '<div class="saved-item-email">' + escapeHtml(a.email) + '</div>' +
        '<div class="saved-item-meta">' + new Date(a.createdAt || Date.now()).toLocaleString('id-ID') + '</div>' +
      '</div>' +
      (isActive ? '<span class="saved-item-badge">AKTIF</span>' : '') +
      '<div class="saved-item-actions" onclick="event.stopPropagation()">' +
        '<button class="icon-action" onclick="deleteAccount(\'' + a.email + '\')">🗑️</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ===== GANTI AKUN =====
function switchAccount(email) {
  const accounts = getAccounts();
  const found = accounts.find(a => a.email === email);
  if (!found) return;

  currentAccount = found;
  localStorage.setItem(ACTIVE_KEY, email);
  console.log('[OXY] Ganti ke akun:', email);

  applyAccount();
  renderSavedList();
  startRefresh();
  document.querySelector('[data-page="pageEmail"]').click();
}

// ===== HAPUS AKUN =====
function deleteAccount(email) {
  if (!confirm('Hapus akun ' + email + '?')) return;

  let accounts = getAccounts();
  accounts = accounts.filter(a => a.email !== email);
  saveAccounts(accounts);

  if (currentAccount && currentAccount.email === email) {
    currentAccount = null;
    localStorage.removeItem(ACTIVE_KEY);
    createEmail();
  }

  renderSavedList();
}

// ===== TAMPILIN AKUN =====
function applyAccount() {
  if (!currentAccount) return;
  document.getElementById('emailDisplay').textContent = currentAccount.email;
  document.getElementById('activeDomain').textContent = currentAccount.domain || '-';
  document.getElementById('accountSelect').innerHTML = '<option>' + currentAccount.email + '</option>';

  const accounts = getAccounts();
  const isSaved = accounts.some(a => a.email === currentAccount.email);
  const btnSave = document.getElementById('btnSave');
  if (isSaved) {
    btnSave.textContent = '✅ Akun tersimpan';
  } else {
    btnSave.textContent = '💾 Simpan akun ini';
  }
  btnSave.disabled = false;
}

// ===== REFRESH =====
function startRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(loadInbox, 5000);
  setTimeout(loadInbox, 1000);
}

// ===== LOAD INBOX =====
async function loadInbox() {
  if (!currentAccount) return;
  const inbox = document.getElementById('inboxList');
  const badge = document.getElementById('inboxCountBadge');

  try {
    const res = await fetch(API + 'messages', {
      headers: { 'Authorization': 'Bearer ' + currentAccount.token }
    });

    if (res.status === 401) {
      console.log('[OXY] Token expired');
      localStorage.removeItem(ACTIVE_KEY);
      createEmail();
      return;
    }

    const data = await res.json();
    let msgs = Array.isArray(data) ? data : (data['hydra:member'] || []);
    console.log('[OXY] 📥 Inbox count:', msgs.length);

    badge.textContent = msgs.length;

    if (!msgs.length) {
      inbox.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>Kotak masuk kosong</p><span>Email yang masuk bakal muncul di sini</span></div>';
      return;
    }

    inbox.innerHTML = msgs.map(m => {
      const subj = m.subject || '';
      const from = (m.from && m.from.address) ? m.from.address : 'Unknown';
      const codeMatch = subj.match(/\b\d{4,8}\b/);
      const preview = codeMatch ? 'Kode: <span class="code">' + codeMatch[0] + '</span>' : subj;

      return '<div class="mail-item" onclick="bacaEmail(\'' + m.id + '\')">' +
        '<div class="mail-top">' +
          '<div class="mail-from">' + escapeHtml(from) + '</div>' +
          '<div class="mail-date">' + new Date(m.createdAt).toLocaleString('id-ID') + '</div>' +
        '</div>' +
        '<div class="mail-subject">' + escapeHtml(subj || '(tanpa subjek)') + '</div>' +
        '<div class="mail-preview">' + preview + '</div>' +
      '</div>';
    }).join('');

  } catch (e) {
    console.error('[OXY] ❌ Error loadInbox:', e);
  }
}

// ===== BACA EMAIL =====
async function bacaEmail(id) {
  try {
    const res = await fetch(API + 'messages/' + id, {
      headers: { 'Authorization': 'Bearer ' + currentAccount.token }
    });
    const msg = await res.json();
    const body = msg.text || (msg.html ? stripHtml(msg.html.join('')) : '') || '(kosong)';
    const from = (msg.from && msg.from.address) ? msg.from.address : 'Unknown';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = '<div class="modal-content">' +
      '<div class="modal-handle"></div>' +
      '<h3>' + escapeHtml(msg.subject || '(tanpa subjek)') + '</h3>' +
      '<div class="modal-meta">Dari: ' + escapeHtml(from) + '</div>' +
      '<div class="modal-body">' + escapeHtml(body) + '</div>' +
      '<button class="modal-close" onclick="this.closest(\'.modal\').remove()">TUTUP</button>' +
    '</div>';
    document.body.appendChild(modal);
  } catch (e) {
    console.error('[OXY] Error bacaEmail:', e);
    alert('Gagal baca: ' + e.message);
  }
}

// ===== UTIL =====
function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function copyEmail() {
  if (!currentAccount) return;
  navigator.clipboard.writeText(currentAccount.email);
  const s = document.getElementById('statusEmail');
  s.textContent = '📋 Email dicopy!';
  setTimeout(() => s.textContent = '', 2000);
}

function changeEmail() {
  console.log('[OXY] Bikin email baru...');
  if (refreshInterval) clearInterval(refreshInterval);
  currentAccount = null;
  localStorage.removeItem(ACTIVE_KEY);

  document.getElementById('emailDisplay').textContent = '—';
  document.getElementById('statusEmail').textContent = '';
  document.getElementById('inboxList').innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>Kotak masuk kosong</p><span>Email yang masuk bakal muncul di sini</span></div>';
  document.getElementById('inboxCountBadge').textContent = '0';

  createEmail();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
