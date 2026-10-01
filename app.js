// ============================================
// OXY TEMPMAIL - TEMPMAIL.LOL VIA PROXY
// ============================================

const API = '/api/proxy?path=';
const STORAGE_KEY = 'oxy_tempmail_lol';

let currentAccount = null;
let refreshInterval = null;

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

  document.getElementById('btnMenu').onclick = () => document.querySelector('[data-page="pageManage"]').click();

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

async function createEmail() {
  const status = document.getElementById('statusEmail');
  const btn = document.getElementById('btnCopy');
  btn.disabled = true;
  if (status) status.textContent = '⏳ Bikin email...';

  try {
    const res = await fetch(API + 'generate');
    const data = await res.json();
    console.log('[OXY] Generate response:', data);

    if (!data.address || !data.token) throw new Error('Ga dapet email dari server');

    currentAccount = {
      email: data.address,
      token: data.token,
      domain: data.address.split('@')[1] || '-'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentAccount));
    console.log('[OXY] ✅ Email:', currentAccount.email);

    applyAccount();
    if (status) status.textContent = '✅ Email siap! Cek Kotak masuk...';

    startRefresh();

  } catch (e) {
    console.error('[OXY] ❌ Error:', e);
    if (status) status.textContent = '❌ ' + e.message;
  } finally {
    btn.disabled = false;
  }
}

function applyAccount() {
  if (!currentAccount) return;
  document.getElementById('emailDisplay').textContent = currentAccount.email;
  document.getElementById('activeDomain').textContent = currentAccount.domain || '-';
  document.getElementById('accountSelect').innerHTML = '<option>' + currentAccount.email + '</option>';
}

function startRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(loadInbox, 5000);
  setTimeout(loadInbox, 1500);
}

async function loadInbox() {
  if (!currentAccount || !currentAccount.token) return;
  const inbox = document.getElementById('inboxList');
  const badge = document.getElementById('inboxCountBadge');

  try {
    const res = await fetch(API + 'auth/' + currentAccount.token);
    const data = await res.json();
    console.log('[OXY] Inbox response:', data);

    const msgs = data.email || data.emails || [];
    badge.textContent = msgs.length;

    if (!msgs.length) {
      inbox.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>Kotak masuk kosong</p><span>Email yang masuk bakal muncul di sini</span></div>';
      return;
    }

    msgs.forEach(m => console.log('[OXY] 📧', m.from, '-', m.subject));

    inbox.innerHTML = msgs.map((m, i) => {
      const subj = m.subject || '';
      const from = m.from || 'Unknown';
      const codeMatch = subj.match(/\b\d{4,8}\b/);
      const preview = codeMatch ? 'Kode: <span class="code">' + codeMatch[0] + '</span>' : (m.body || '').substring(0, 60);

      return '<div class="mail-item" onclick="bacaEmail(' + i + ')">' +
        '<div class="mail-top">' +
          '<div class="mail-from">' + escapeHtml(from) + '</div>' +
          '<div class="mail-date">' + escapeHtml(m.date || '') + '</div>' +
        '</div>' +
        '<div class="mail-subject">' + escapeHtml(subj || '(tanpa subjek)') + '</div>' +
        '<div class="mail-preview">' + preview + '</div>' +
      '</div>';
    }).join('');

    // Simpen list buat dibaca detail
    window.__currentMails = msgs;

  } catch (e) {
    console.error('[OXY] ❌ Error loadInbox:', e);
  }
}

async function bacaEmail(idx) {
  try {
    const m = window.__currentMails && window.__currentMails[idx];
    if (!m) throw new Error('Email ga ketemu');

    const body = m.body || m.html || '(kosong)';
    const from = m.from || 'Unknown';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = '<div class="modal-content">' +
      '<div class="modal-handle"></div>' +
      '<h3>' + escapeHtml(m.subject || '(tanpa subjek)') + '</h3>' +
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
