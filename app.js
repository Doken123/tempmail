// ============================================
// OXY TEMPMAIL - FINAL FIX
// Domain yang aktif & testing langsung
// ============================================

const API = 'https://www.1secmail.com/api/v1/';

// Domain aktif (wwjmp.com & beberapa sering down, ini yang biasanya hidup)
const DOMAINS = ['1secmail.com', '1secmail.net', '1secmail.org', 'esiix.com', 'xojxe.com', 'yoggm.com', 'tanks7.com', 'dto1.com'];

let currentAccount = null;
let refreshInterval = null;

// ===== INIT: auto generate pas buka =====
window.addEventListener('DOMContentLoaded', () => {
  setupNav();
  generateEmail();
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

  document.getElementById('btnRefresh').onclick = loadInbox;
  document.getElementById('btnCopy').onclick = copyEmail;
  document.getElementById('btnChange').onclick = changeEmail;
  document.getElementById('btnDeleteAll').onclick = changeEmail;
}

// ===== GENERATE EMAIL =====
async function generateEmail() {
  const status = document.getElementById('statusEmail');
  const btn = document.getElementById('btnCopy');
  btn.disabled = true;
  status.textContent = '⏳ Bikin email...';

  try {
    // Coba domain satu-satu sampai dapet yang valid
    let email = null, user = null, domain = null;

    for (const d of DOMAINS) {
      const u = Math.random().toString(36).substring(2, 12).toLowerCase();
      const testEmail = `${u}@${d}`;
      email = testEmail; user = u; domain = d;
      break; // 1secmail ga butuh verifikasi, langsung pakai
    }

    currentAccount = { email, user, domain };
    console.log('[OXY] Akun:', currentAccount);

    document.getElementById('emailDisplay').textContent = email;
    document.getElementById('activeDomain').textContent = domain;
    document.getElementById('accountSelect').innerHTML = `<option>${email}</option>`;
    btn.disabled = false;
    status.textContent = '✅ Email siap! Cek Kotak masuk...';

    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(loadInbox, 5000);
    setTimeout(loadInbox, 1000);

  } catch (e) {
    status.textContent = '❌ Error: ' + e.message;
  }
}

// ===== LOAD INBOX =====
async function loadInbox() {
  if (!currentAccount) return;
  const inbox = document.getElementById('inboxList');
  const badge = document.getElementById('inboxCountBadge');

  try {
    const url = `${API}?action=getMessages&login=${encodeURIComponent(currentAccount.user)}&domain=${encodeURIComponent(currentAccount.domain)}`;
    const res = await fetch(url);
    const msgs = await res.json();
    console.log('[OXY] Inbox:', msgs);

    badge.textContent = msgs.length;

    if (!Array.isArray(msgs) || msgs.length === 0) {
      inbox.innerHTML = `
        <div class="empty">
          <div class="empty-icon">📭</div>
          <p>Kotak masuk kosong</p>
          <span>Email yang masuk bakal muncul di sini</span>
        </div>`;
      return;
    }

    inbox.innerHTML = msgs.map(m => {
      const preview = extractCode(m.subject || '') || m.subject || '';
      return `
        <div class="mail-item" onclick="bacaEmail(${m.id})">
          <div class="mail-top">
            <div class="mail-from">${escapeHtml(m.from)}</div>
            <div class="mail-date">${escapeHtml(m.date)}</div>
          </div>
          <div class="mail-subject">${escapeHtml(m.subject || '(tanpa subjek)')}</div>
          <div class="mail-preview">${escapeHtml(preview)}</div>
        </div>
      `;
    }).join('');

  } catch (e) {
    console.error('[OXY] Error:', e);
  }
}

// ===== BACA EMAIL =====
async function bacaEmail(id) {
  try {
    const url = `${API}?action=readMessage&login=${encodeURIComponent(currentAccount.user)}&domain=${encodeURIComponent(currentAccount.domain)}&id=${id}`;
    const res = await fetch(url);
    const msg = await res.json();
    const body = msg.textBody || stripHtml(msg.htmlBody) || '(kosong)';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-handle"></div>
        <h3>${escapeHtml(msg.subject || '(tanpa subjek)')}</h3>
        <div class="modal-meta">Dari: ${escapeHtml(msg.from)}</div>
        <div class="modal-body">${escapeHtml(body)}</div>
        <button class="modal-close" onclick="this.closest('.modal').remove()">TUTUP</button>
      </div>
    `;
    document.body.appendChild(modal);
  } catch (e) {
    alert('Gagal baca email: ' + e.message);
  }
}

// ===== UTIL =====
function extractCode(text) {
  const match = text.match(/\b\d{4,8}\b/);
  if (!match) return null;
  return `<span class="code">${match[0]}</span>`;
}

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function copyEmail() {
  const val = document.getElementById('emailDisplay').textContent;
  if (val === '—') return;
  navigator.clipboard.writeText(val);
  const s = document.getElementById('statusEmail');
  s.textContent = '📋 Email dicopy!';
  setTimeout(() => s.textContent = '', 2000);
}

function changeEmail() {
  if (refreshInterval) clearInterval(refreshInterval);
  currentAccount = null;
  document.getElementById('emailDisplay').textContent = '—';
  document.getElementById('statusEmail').textContent = '';
  document.getElementById('inboxList').innerHTML = `
    <div class="empty">
      <div class="empty-icon">📭</div>
      <p>Kotak masuk kosong</p>
      <span>Email yang masuk bakal muncul di sini</span>
    </div>`;
  document.getElementById('inboxCountBadge').textContent = '0';
  generateEmail();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
