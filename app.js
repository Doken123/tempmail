// ============================================
// OXY TEMPMAIL - SIMPLE FIX v3
// Generate langsung, ga ada async ribet
// ============================================

const API = 'https://www.1secmail.com/api/v1/';
const DOMAINS = ['1secmail.com', '1secmail.net', '1secmail.org', 'esiix.com', 'xojxe.com', 'yoggm.com', 'tanks7.com', 'dto1.com', 'wwjmp.com'];

let currentAccount = null;
let refreshInterval = null;

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  console.log('[OXY] DOM loaded, mulai setup');
  setupNav();
  // Delay dikit biar DOM stabil
  setTimeout(() => {
    createEmail();
  }, 100);
});

// ===== NAVIGASI =====
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
    loadInbox();
    const s = document.getElementById('statusEmail');
    s.textContent = '🔄 Refresh...';
    setTimeout(() => s.textContent = '', 1500);
  };

  const btnCopy = document.getElementById('btnCopy');
  if (btnCopy) btnCopy.onclick = copyEmail;

  const btnChange = document.getElementById('btnChange');
  if (btnChange) btnChange.onclick = changeEmail;

  const btnDelete = document.getElementById('btnDeleteAll');
  if (btnDelete) btnDelete.onclick = changeEmail;
}

// ===== BIKIN EMAIL BARU (SIMPLE, GA PAKE ASYNC) =====
function createEmail() {
  console.log('[OXY] createEmail dipanggil');

  try {
    const status = document.getElementById('statusEmail');
    const display = document.getElementById('emailDisplay');

    if (!display) {
      console.error('[OXY] Element emailDisplay ga ketemu!');
      return;
    }

    const user = Math.random().toString(36).substring(2, 12).toLowerCase();
    const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
    const email = user + '@' + domain;

    currentAccount = { email, user, domain };
    console.log('[OXY] Akun baru:', currentAccount);

    display.textContent = email;
    document.getElementById('activeDomain').textContent = domain;
    document.getElementById('accountSelect').innerHTML = '<option>' + email + '</option>';

    if (status) status.textContent = '✅ Email siap! Cek Kotak masuk...';

    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(loadInbox, 5000);
    setTimeout(loadInbox, 1500);

  } catch (e) {
    console.error('[OXY] Error createEmail:', e);
    alert('Error: ' + e.message);
  }
}

// ===== LOAD INBOX =====
async function loadInbox() {
  if (!currentAccount) return;
  const inbox = document.getElementById('inboxList');
  const badge = document.getElementById('inboxCountBadge');

  try {
    const url = API + '?action=getMessages&login=' + encodeURIComponent(currentAccount.user) + '&domain=' + encodeURIComponent(currentAccount.domain);
    console.log('[OXY] Fetch:', url);

    const res = await fetch(url);
    const msgs = await res.json();
    console.log('[OXY] Hasil:', msgs);

    badge.textContent = msgs.length || 0;

    if (!Array.isArray(msgs) || msgs.length === 0) {
      inbox.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>Kotak masuk kosong</p><span>Email yang masuk bakal muncul di sini</span></div>';
      return;
    }

    inbox.innerHTML = msgs.map(m => {
      const subj = m.subject || '';
      const codeMatch = subj.match(/\b\d{4,8}\b/);
      const preview = codeMatch ? 'Kode: <span class="code">' + codeMatch[0] + '</span>' : subj;

      return '<div class="mail-item" onclick="bacaEmail(' + m.id + ')">' +
        '<div class="mail-top">' +
          '<div class="mail-from">' + escapeHtml(m.from) + '</div>' +
          '<div class="mail-date">' + escapeHtml(m.date) + '</div>' +
        '</div>' +
        '<div class="mail-subject">' + escapeHtml(subj || '(tanpa subjek)') + '</div>' +
        '<div class="mail-preview">' + preview + '</div>' +
      '</div>';
    }).join('');

  } catch (e) {
    console.error('[OXY] Error loadInbox:', e);
  }
}

// ===== BACA EMAIL =====
async function bacaEmail(id) {
  try {
    const url = API + '?action=readMessage&login=' + encodeURIComponent(currentAccount.user) + '&domain=' + encodeURIComponent(currentAccount.domain) + '&id=' + id;
    const res = await fetch(url);
    const msg = await res.json();
    const body = msg.textBody || stripHtml(msg.htmlBody) || '(kosong)';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = '<div class="modal-content">' +
      '<div class="modal-handle"></div>' +
      '<h3>' + escapeHtml(msg.subject || '(tanpa subjek)') + '</h3>' +
      '<div class="modal-meta">Dari: ' + escapeHtml(msg.from) + '</div>' +
      '<div class="modal-body">' + escapeHtml(body) + '</div>' +
      '<button class="modal-close" onclick="this.closest(\'.modal\').remove()">TUTUP</button>' +
    '</div>';
    document.body.appendChild(modal);
  } catch (e) {
    alert('Gagal baca email: ' + e.message);
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
  if (refreshInterval) clearInterval(refreshInterval);
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
