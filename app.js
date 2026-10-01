// ============================================
// OXY TEMPMAIL - 1SECMAIL FINAL
// Ga butuh proxy, langsung, domain reliable
// ============================================

const API = 'https://www.1secmail.com/api/v1/';
const STORAGE_KEY = 'oxy_1secmail_account';

// Domain paling reliable (urut dari yang sering idup)
const DOMAINS = ['1secmail.com', '1secmail.net', '1secmail.org'];

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

function createEmail() {
  const status = document.getElementById('statusEmail');
  const btn = document.getElementById('btnCopy');
  btn.disabled = true;
  if (status) status.textContent = '⏳ Bikin email...';

  try {
    const user = Math.random().toString(36).substring(2, 12).toLowerCase();
    const domain = DOMAINS[0]; // Pake 1secmail.com, paling reliable
    const email = user + '@' + domain;

    currentAccount = { email, user, domain };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentAccount));
    console.log('[OXY] ✅ Email:', currentAccount.email);

    applyAccount();
    if (status) status.textContent = '✅ Email siap! Tunggu kode 1-5 menit...';

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
  // Polling 15 detik — biar ga kena rate limit
  refreshInterval = setInterval(loadInbox, 15000);
  setTimeout(loadInbox, 3000);
}

async function loadInbox() {
  if (!currentAccount) return;
  const inbox = document.getElementById('inboxList');
  const badge = document.getElementById('inboxCountBadge');

  try {
    const url = API + '?action=getMessages&login=' + encodeURIComponent(currentAccount.user) + '&domain=' + encodeURIComponent(currentAccount.domain);
    console.log('[OXY] Fetch:', url);

    const res = await fetch(url);
    const msgs = await res.json();
    console.log('[OXY] 📥 Inbox:', msgs);

    badge.textContent = Array.isArray(msgs) ? msgs.length : 0;

    if (!Array.isArray(msgs) || msgs.length === 0) {
      inbox.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>Kotak masuk kosong</p><span>Kode biasanya masuk 1-5 menit. Sabar...</span></div>';
      return;
    }

    inbox.innerHTML = msgs.map(m => {
      const subj = m.subject || '';
      const from = m.from || 'Unknown';
      const codeMatch = subj.match(/\b\d{4,8}\b/);
      const preview = codeMatch ? 'Kode: <span class="code">' + codeMatch[0] + '</span>' : subj;

      return '<div class="mail-item" onclick="bacaEmail(' + m.id + ')">' +
        '<div class="mail-top">' +
          '<div class="mail-from">' + escapeHtml(from) + '</div>' +
          '<div class="mail-date">' + escapeHtml(m.date || '') + '</div>' +
        '</div>' +
        '<div class="mail-subject">' + escapeHtml(subj || '(tanpa subjek)') + '</div>' +
        '<div class="mail-preview">' + preview + '</div>' +
      '</div>';
    }).join('');

  } catch (e) {
    console.error('[OXY] ❌ Error loadInbox:', e);
  }
}

async function bacaEmail(id) {
  try {
    const url = API + '?action=readMessage&login=' + encodeURIComponent(currentAccount.user) + '&domain=' + encodeURIComponent(currentAccount.domain) + '&id=' + id;
    const res = await fetch(url);
    const msg = await res.json();
    const body = msg.textBody || stripHtml(msg.htmlBody) || '(kosong)';
    const from = msg.from || 'Unknown';

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
  document.getElementById('inboxList').innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>Kotak masuk kosong</p><span>Kode biasanya masuk 1-5 menit. Sabar...</span></div>';
  document.getElementById('inboxCountBadge').textContent = '0';

  createEmail();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
