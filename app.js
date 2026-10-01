// ============================================
// OXY TEMPMAIL - MAIL.TM via CF Function + SAVE AKUN
// v3: username pake nama orang normal
// ============================================

const API = '/proxy?path=';
const STORAGE_KEY = 'oxy_mailtm_accounts';
const ACTIVE_KEY = 'oxy_mailtm_active';

// ===== DAFTAR NAMA (campur Indonesia + English) =====
const NAMA_DEPAN = [
  'budi', 'andi', 'agus', 'ahmad', 'dian', 'dewi', 'rina', 'siti',
  'rizky', 'fajar', 'putri', 'maya', 'indah', 'wawan', 'hendra', 'yudi',
  'tono', 'anto', 'bagus', 'dimas', 'ega', 'feri', 'gita', 'hadi',
  'irfan', 'joko', 'kurnia', 'lina', 'made', 'nanda', 'okta', 'putra',
  'rahma', 'sari', 'tari', 'umi', 'vina', 'wati', 'yanti', 'zainal',
  'adam', 'brian', 'charles', 'david', 'edward', 'frank', 'george', 'henry',
  'ivan', 'jack', 'kevin', 'leo', 'michael', 'nathan', 'oscar', 'peter',
  'ryan', 'steven', 'thomas', 'victor', 'william', 'alice', 'bella', 'clara',
  'diana', 'emma', 'fiona', 'grace', 'hannah', 'isabella', 'jessica', 'kate'
];

const NAMA_BELAKANG = [
  'santoso', 'wijaya', 'kurniawan', 'setiawan', 'susanto', 'hidayat', 'fauzi',
  'pratama', 'ramadhan', 'nugroho', 'saputra', 'wibowo', 'hartono', 'gunawan',
  'kusuma', 'maulana', 'putra', 'permana', 'firmansyah', 'arifin', 'rahman',
  'siregar', 'nasution', 'simanjuntak', 'situmorang', 'manurung', 'hutapea',
  'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller',
  'davis', 'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'wilson',
  'anderson', 'thomas', 'taylor', 'moore', 'jackson', 'martin', 'lee',
  'perez', 'thompson', 'white', 'harris', 'sanchez', 'clark', 'ramirez'
];

let currentAccount = null;
let refreshInterval = null;

// ===== GENERATE USERNAME NORMAL =====
function generateUsername() {
  const depan = NAMA_DEPAN[Math.floor(Math.random() * NAMA_DEPAN.length)];
  const belakang = NAMA_BELAKANG[Math.floor(Math.random() * NAMA_BELAKANG.length)];
  const angka = Math.floor(Math.random() * 90) + 10; // 10-99
  
  // Format variasi biar keliatan natural
  const format = Math.floor(Math.random() * 3);
  let user;
  if (format === 0) {
    user = depan + '.' + belakang + angka;         // budi.santoso84
  } else if (format === 1) {
    user = depan + belakang + angka;                // budisantoso84
  } else {
    user = depan + '.' + belakang;                  // budi.santoso
  }
  
  return user.toLowerCase().replace(/[^a-z0-9.]/g, '');
}

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  console.log('========== [OXY] APP START v3 ==========');
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

// ===== STORAGE =====
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
    const domRes = await fetch(API + 'domains');
    const domText = await domRes.text();
    let domData;
    try { domData = JSON.parse(domText); } catch (e) {
      throw new Error('Response domain bukan JSON');
    }

    let domains = Array.isArray(domData) ? domData : (domData['hydra:member'] || []);
    if (!domains.length) throw new Error('Ga ada domain aktif');
    const domain = domains[0].domain || domains[0].name;
    console.log('[OXY] Domain:', domain);

    // USERNAME PAKE NAMA ORANG
    const user = generateUsername();
    const email = user + '@' + domain;
    const password = 'pass' + Math.random().toString(36).substring(2, 10) + 'X';
    console.log('[OXY] Daftar:', email);

    const accRes = await fetch(API + 'accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: email, password: password })
    });
    const accText = await accRes.text();
    console.log('[OXY] Daftar:', accRes.status, accText.substring(0, 100));

    if (!accRes.ok) {
      throw new Error('Gagal daftar (' + accRes.status + '): ' + accText.substring(0, 80));
    }

    let accData;
    try { accData = JSON.parse(accText); } catch (e) {
      throw new Error('Response daftar bukan JSON');
    }

    const tokRes = await fetch(API + 'token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: email, password: password })
    });
    const tokText = await tokRes.text();
    let tokData;
    try { tokData = JSON.parse(tokText); } catch (e) {
      throw new Error('Response token bukan JSON');
    }
    if (!tokData.token) throw new Error('Token gagal');

    currentAccount = {
      email: email,
      password: password,
      token: tokData.token,
      id: accData.id,
      domain: domain,
      createdAt: Date.now()
    };

    localStorage.setItem(ACTIVE_KEY, email);
    console.log('[OXY] ✅ Sukses:', email);

    applyAccount();
    if (status) status.textContent = '✅ Email siap!';
    startRefresh();
  } catch (e) {
    console.error('[OXY] ❌', e);
    if (status) status.textContent = '❌ ' + e.message;
  } finally { btn.disabled = false; }
}

// ===== SIMPAN AKUN =====
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

// ===== RENDER DAFTAR =====
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

function switchAccount(email) {
  const accounts = getAccounts();
  const found = accounts.find(a => a.email === email);
  if (!found) return;
  currentAccount = found;
  localStorage.setItem(ACTIVE_KEY, email);
  console.log('[OXY] Ganti:', email);
  applyAccount();
  renderSavedList();
  startRefresh();
  document.querySelector('[data-page="pageEmail"]').click();
}

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

function applyAccount() {
  if (!currentAccount) return;
  document.getElementById('emailDisplay').textContent = currentAccount.email;
  document.getElementById('activeDomain').textContent = currentAccount.domain || '-';
  document.getElementById('accountSelect').innerHTML = '<option>' + currentAccount.email + '</option>';

  const accounts = getAccounts();
  const isSaved = accounts.some(a => a.email === currentAccount.email);
  const btnSave = document.getElementById('btnSave');
  btnSave.textContent = isSaved ? '✅ Akun tersimpan' : '💾 Simpan akun ini';
  btnSave.disabled = false;
}

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
      localStorage.removeItem(ACTIVE_KEY);
      createEmail();
      return;
    }

    const data = await res.json();
    let msgs = Array.isArray(data) ? data : (data['hydra:member'] || []);
    console.log('[OXY] 📥 Inbox:', msgs.length);

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
  } catch (e) { console.error('[OXY] ❌', e); }
}

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
  } catch (e) { alert('Gagal: ' + e.message); }
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
