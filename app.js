// ============================================
// OXY TEMPMAIL - MAIL.TM via CF Function
// v6: GMAIL-STYLE UI
// ============================================

const API = '/proxy?path=';
const STORAGE_KEY = 'oxy_mailtm_accounts';
const ACTIVE_KEY = 'oxy_mailtm_active';

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

// Warna avatar Gmail-style
const AVATAR_COLORS = [
  '#d93025', '#e37400', '#f9ab00', '#1a73e8', '#9334e6',
  '#00897b', '#e91e63', '#5e35b1', '#3949ab', '#039be5',
  '#43a047', '#6d4c41', '#757575', '#c2185b', '#0097a7'
];

let currentAccount = null;
let refreshInterval = null;

// ===== HELPER =====
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function generateUsername() {
  const depan = NAMA_DEPAN[Math.floor(Math.random() * NAMA_DEPAN.length)];
  const belakang = NAMA_BELAKANG[Math.floor(Math.random() * NAMA_BELAKANG.length)];
  const angka = Math.floor(Math.random() * 90) + 10;
  const format = Math.floor(Math.random() * 3);
  let user;
  if (format === 0) user = depan + '.' + belakang + angka;
  else if (format === 1) user = depan + belakang + angka;
  else user = depan + '.' + belakang;
  return user.toLowerCase().replace(/[^a-z0-9.]/g, '');
}

function generatePassword() {
  return 'Px' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36).slice(-4);
}

function getAvatarColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name) {
  if (!name) return '?';
  // Ambil huruf pertama dari email/nama
  const cleaned = name.replace(/[^a-zA-Z]/g, '');
  return (cleaned[0] || '?').toUpperCase();
}

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  console.log('========== [OXY] APP START v6 GMAIL ==========');
  setupNav();

  const activeEmail = localStorage.getItem(ACTIVE_KEY);
  const accounts = getAccounts();
  if (activeEmail) {
    const found = accounts.find(a => a.email === activeEmail);
    if (found) {
      currentAccount = found;
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
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
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
  document.getElementById('btnRefreshTop').onclick = () => { loadInbox(); };
  document.getElementById('btnCopy').onclick = copyEmail;
  document.getElementById('btnChange').onclick = changeEmail;
  document.getElementById('btnSave').onclick = saveCurrentAccount;
  document.getElementById('btnDeleteAll').onclick = changeEmail;
}

// ===== BIKIN EMAIL =====
async function createEmail() {
  const status = document.getElementById('statusEmail');
  const btn = document.getElementById('btnCopy');
  btn.disabled = true;
  if (status) status.textContent = '⏳ Bikin email...';

  try {
    const domRes = await fetch(API + 'domains');
    const domText = await domRes.text();
    let domData;
    try { domData = JSON.parse(domText); } catch (e) { throw new Error('Domain bukan JSON'); }
    let domains = Array.isArray(domData) ? domData : (domData['hydra:member'] || []);
    if (!domains.length) throw new Error('Ga ada domain');
    const domain = domains[0].domain || domains[0].name;

    const user = generateUsername();
    const email = user + '@' + domain;
    const password = generatePassword();
    console.log('[OXY] Daftar:', email);

    const accRes = await fetch(API + 'accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: email, password: password })
    });
    const accText = await accRes.text();

    if (accRes.status === 429) throw new Error('Rate limit (429). Tunggu 1-2 jam.');
    if (!accRes.ok) throw new Error('Gagal daftar (' + accRes.status + ')');

    let accData;
    try { accData = JSON.parse(accText); } catch (e) { throw new Error('Response daftar bukan JSON'); }

    let token = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt > 1) await sleep(1000 * attempt);
      else await sleep(500);

      const tokRes = await fetch(API + 'token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: email, password: password })
      });
      const tokText = await tokRes.text();

      if (tokRes.ok) {
        try {
          const tokData = JSON.parse(tokText);
          if (tokData.token) { token = tokData.token; break; }
        } catch (e) {}
      }
    }

    if (!token) throw new Error('Token gagal. Klik Ubah lagi.');

    currentAccount = {
      email, password, token,
      id: accData.id,
      domain,
      note: '',
      createdAt: Date.now()
    };

    localStorage.setItem(ACTIVE_KEY, email);
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

  if (existing < 0) {
    const note = prompt('Kasih note buat akun ini (opsional):', '');
    if (note !== null) currentAccount.note = note.trim();
  }

  if (existing >= 0) {
    accounts[existing] = { ...accounts[existing], ...currentAccount };
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

function editNote(email) {
  const accounts = getAccounts();
  const acc = accounts.find(a => a.email === email);
  if (!acc) return;
  const newNote = prompt('Edit note buat ' + email + ':', acc.note || '');
  if (newNote === null) return;
  acc.note = newNote.trim();
  saveAccounts(accounts);
  if (currentAccount && currentAccount.email === email) currentAccount.note = acc.note;
  renderSavedList();
}

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
    const noteHtml = a.note
      ? '<div class="saved-item-note">📝 ' + escapeHtml(a.note) + '</div>'
      : '<div class="saved-item-note empty-note">Belum ada note — tap ✏️ buat nambah</div>';

    return '<div class="saved-item ' + (isActive ? 'active' : '') + '" onclick="switchAccount(\'' + a.email + '\')">' +
      '<div class="saved-item-info">' +
        '<div class="saved-item-email">' + escapeHtml(a.email) + '</div>' +
        noteHtml +
        '<div class="saved-item-meta">' + new Date(a.createdAt || Date.now()).toLocaleString('id-ID') + '</div>' +
      '</div>' +
      (isActive ? '<span class="saved-item-badge">AKTIF</span>' : '') +
      '<div class="saved-item-actions" onclick="event.stopPropagation()">' +
        '<button class="icon-action edit" onclick="editNote(\'' + a.email + '\')">✏️</button>' +
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

// ===== FORMAT WAKTU GMAIL-STYLE =====
function formatTime(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < 60 * 1000) return 'Baru aja';
    if (diff < 60 * 60 * 1000) {
      const min = Math.floor(diff / 60000);
      return min + ' mnt';
    }
    if (diff < oneDay) {
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return h + '.' + m;
    }
    // Lebih dari sehari
    const day = d.getDate().toString().padStart(2, '0');
    const month = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()];
    return day + ' ' + month;
  } catch (e) {
    return dateStr;
  }
}

// ===== INBOX GMAIL-STYLE =====
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
    badge.textContent = msgs.length;

    if (!msgs.length) {
      inbox.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>Kotak masuk kosong</p><span>Email yang masuk bakal muncul di sini</span></div>';
      return;
    }

    inbox.innerHTML = msgs.map(m => {
      const subj = m.subject || '';
      const from = (m.from && m.from.address) ? m.from.address : 'Unknown';
      const senderName = (m.from && m.from.name) ? m.from.name : from.split('@')[0];
      const initial = getInitial(senderName);
      const color = getAvatarColor(from);
      const timeStr = formatTime(m.createdAt);
      const codeMatch = subj.match(/\b\d{4,8}\b/);

      // Preview: kalau ada kode OTP, tampilin kodenya, kalau ngga tampilin subject
      let previewText = '';
      if (codeMatch) {
        previewText = 'Kode verifikasi: ' + codeMatch[0];
      } else {
        previewText = subj;
      }

      return '<div class="gmail-item" onclick="bacaEmail(\'' + m.id + '\')">' +
        '<div class="gmail-avatar" style="background:' + color + '">' + initial + '</div>' +
        '<div class="gmail-content">' +
          '<div class="gmail-row-top">' +
            '<span class="gmail-sender">' + escapeHtml(senderName) + '</span>' +
            '<span class="gmail-time">' + timeStr + '</span>' +
          '</div>' +
          '<div class="gmail-subject">' + escapeHtml(subj || '(tanpa subjek)') + '</div>' +
          '<div class="gmail-preview">' + escapeHtml(previewText) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (e) { console.error('[OXY]', e); }
}

// ===== BACA EMAIL GMAIL-STYLE =====
async function bacaEmail(id) {
  try {
    const res = await fetch(API + 'messages/' + id, {
      headers: { 'Authorization': 'Bearer ' + currentAccount.token }
    });
    const msg = await res.json();
    const body = msg.text || (msg.html ? stripHtml(msg.html.join('')) : '') || '(kosong)';
    const from = (msg.from && msg.from.address) ? msg.from.address : 'Unknown';
    const senderName = (msg.from && msg.from.name) ? msg.from.name : from.split('@')[0];
    const initial = getInitial(senderName);
    const color = getAvatarColor(from);
    const dateStr = new Date(msg.createdAt).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const modal = document.createElement('div');
    modal.className = 'gmail-modal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML =
      '<div class="gmail-modal-header">' +
        '<button class="gmail-back" onclick="this.closest(\'.gmail-modal\').remove()">←</button>' +
        '<div class="gmail-modal-title">Email</div>' +
        '<button class="gmail-trash" onclick="this.closest(\'.gmail-modal\').remove()">🗑️</button>' +
      '</div>' +
      '<div class="gmail-modal-body">' +
        '<h2 class="gmail-detail-subject">' + escapeHtml(msg.subject || '(tanpa subjek)') + '</h2>' +
        '<div class="gmail-detail-sender">' +
          '<div class="gmail-avatar gmail-avatar-lg" style="background:' + color + '">' + initial + '</div>' +
          '<div class="gmail-detail-meta">' +
            '<div class="gmail-detail-name">' + escapeHtml(senderName) + '</div>' +
            '<div class="gmail-detail-email">&lt;' + escapeHtml(from) + '&gt;</div>' +
          '</div>' +
          '<div class="gmail-detail-date">' + dateStr + '</div>' +
        '</div>' +
        '<div class="gmail-detail-body">' + linkify(body) + '</div>' +
      '</div>';
    document.body.appendChild(modal);
  } catch (e) { alert('Gagal: ' + e.message); }
}

// ===== LINKIFY =====
function linkify(text) {
  const escaped = escapeHtml(text);
  const urlRegex = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]}"'])/g;
  return escaped.replace(urlRegex, (url) => {
    return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="mail-link">' + url + '</a>';
  });
}

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
