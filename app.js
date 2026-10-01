// ============================================
// OXY TEMPMAIL - MAIL.TM via Cloudflare Pages Function
// API: /proxy?path=  (folder functions/proxy.js)
// ============================================

const API = '/proxy?path=';
const STORAGE_KEY = 'oxy_mailtm_cf';

let currentAccount = null;
let refreshInterval = null;

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  console.log('========== [OXY] APP START ==========');
  setupNav();

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const acc = JSON.parse(saved);
      currentAccount = acc;
      console.log('[OXY] Load akun lama:', acc.email);
      applyAccount();
      startRefresh();
    } catch (e) {
      console.error('[OXY] Storage rusak:', e);
      createEmail();
    }
  } else {
    createEmail();
  }
});

// ===== NAV =====
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      const pageId = btn.dataset.page;
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(pageId).classList.add('active');
      btn.classList.add('active');
      const titles = { pageEmail: 'Email', pageInbox: 'Kotak masuk', pageManage: 'Kelola' };
      document.getElementById('headerTitle').textContent = titles[pageId];
    };
  });

  document.getElementById('btnMenu').onclick = () => {
    document.querySelector('[data-page="pageManage"]').click();
  };

  document.getElementById('btnRefreshTop').onclick = () => {
    console.log('[OXY] Manual refresh');
    loadInbox();
    const s = document.getElementById('statusEmail');
    s.textContent = '🔄 Refresh...';
    setTimeout(() => s.textContent = '', 1500);
  };

  document.getElementById('btnCopy').onclick = copyEmail;
  document.getElementById('btnChange').onclick = changeEmail;
  document.getElementById('btnDeleteAll').onclick = changeEmail;
}

// ===== BIKIN EMAIL BARU =====
async function createEmail() {
  const status = document.getElementById('statusEmail');
  const btn = document.getElementById('btnCopy');
  btn.disabled = true;
  if (status) status.textContent = '⏳ Bikin email...';

  try {
    // 1. Ambil domain aktif — handle 2 format (array langsung & hydra:member)
    const domRes = await fetch(API + 'domains');
    const domData = await domRes.json();
    console.log('[OXY] Raw domains:', domData);

    let domains = [];
    if (Array.isArray(domData)) {
      domains = domData;
    } else if (domData['hydra:member'] && Array.isArray(domData['hydra:member'])) {
      domains = domData['hydra:member'];
    } else if (domData.domains && Array.isArray(domData.domains)) {
      domains = domData.domains;
    }

    if (!domains.length) throw new Error('Ga ada domain aktif');
    const domain = domains[0].domain || domains[0].name;
    if (!domain) throw new Error('Domain ga valid: ' + JSON.stringify(domains[0]));
    console.log('[OXY] Domain:', domain);

    // 2. Generate user & password
    const user = Math.random().toString(36).substring(2, 12).toLowerCase();
    const email = user + '@' + domain;
    const password = Math.random().toString(36).substring(2, 16);

    // 3. Daftar akun
    const accRes = await fetch(API + 'accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: email, password })
    });
    if (!accRes.ok) {
      const err = await accRes.text();
      throw new Error('Gagal daftar: ' + err.substring(0, 80));
    }
    const accData = await accRes.json();
    console.log('[OXY] ✅ Akun:', email);

    // 4. Login dapet token
    const tokRes = await fetch(API + 'token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: email, password })
    });
    const tokData = await tokRes.json();
    if (!tokData.token) throw new Error('Token gagal');
    console.log('[OXY] ✅ Token OK');

    currentAccount = {
      email: email,
      password: password,
      token: tokData.token,
      id: accData.id,
      domain: domain
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentAccount));

    applyAccount();
    if (status) status.textContent = '✅ Email siap!';

    startRefresh();

  } catch (e) {
    console.error('[OXY] ❌ Error:', e);
    if (status) status.textContent = '❌ ' + e.message;
  } finally {
    btn.disabled = false;
  }
}

// ===== TAMPILIN AKUN =====
function applyAccount() {
  if (!currentAccount) return;
  document.getElementById('emailDisplay').textContent = currentAccount.email;
  document.getElementById('activeDomain').textContent = currentAccount.domain || '-';
  document.getElementById('accountSelect').innerHTML = '<option>' + currentAccount.email + '</option>';
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
      localStorage.removeItem(STORAGE_KEY);
      createEmail();
      return;
    }

    const data = await res.json();
    let msgs = [];
    if (Array.isArray(data)) {
      msgs = data;
    } else if (data['hydra:member'] && Array.isArray(data['hydra:member'])) {
      msgs = data['hydra:member'];
    }
    console.log('[OXY] 📥 Inbox count:', msgs.length);

    badge.textContent = msgs.length;

    if (!msgs.length) {
      inbox.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>Kotak masuk kosong</p><span>Email yang masuk bakal muncul di sini</span></div>';
      return;
    }

    msgs.forEach(m => console.log('[OXY] 📧', m.from && m.from.address, '-', m.subject));

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
  console.log('[OXY] Ganti email...');
  if (refreshInterval) clearInterval(refreshInterval);
  localStorage.removeItem(STORAGE_KEY);
  currentAccount = null;

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
