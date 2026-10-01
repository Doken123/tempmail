// ============================================
// OXY TEMPMAIL - FIXED VERSION (1secmail)
// Ganti file app.js lama lu sama ini semua
// ============================================

const API = 'https://www.1secmail.com/api/v1/';
const DOMAINS = ['1secmail.com', '1secmail.org', '1secmail.net', 'wwjmp.com', 'esiix.com'];

let currentAccount = null;
let refreshInterval = null;

async function generateEmail() {
  const status = document.getElementById('status');
  const btn = document.getElementById('btnGenerate');
  btn.disabled = true;
  status.textContent = '⏳ Bikin email baru...';

  try {
    const user = Math.random().toString(36).substring(2, 12).toLowerCase();
    const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
    const email = `${user}@${domain}`;

    currentAccount = { email, user, domain };

    document.getElementById('emailAddr').value = email;
    document.getElementById('emailBox').classList.remove('hidden');
    status.textContent = '✅ Email siap! Tunggu email masuk...';

    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(loadInbox, 5000);
    loadInbox();

  } catch (e) {
    status.textContent = '❌ Error: ' + e.message;
  } finally {
    btn.disabled = false;
  }
}

async function loadInbox() {
  if (!currentAccount) return;
  const inbox = document.getElementById('inbox');
  const badge = document.getElementById('inboxCount');

  try {
    const url = `${API}?action=getMessages&login=${currentAccount.user}&domain=${currentAccount.domain}`;
    const res = await fetch(url);
    const msgs = await res.json();

    badge.textContent = msgs.length;

    if (msgs.length === 0) {
      inbox.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada email masuk</p><span>Tunggu bentar...</span></div>';
      return;
    }

    inbox.innerHTML = msgs.map(m => {
      const initial = (m.from[0] || '?').toUpperCase();
      return `
        <div class="mail-item" onclick="bacaEmail(${m.id})">
          <div class="mail-avatar">${initial}</div>
          <div class="mail-content">
            <div class="mail-from">${escapeHtml(m.from)}</div>
            <div class="mail-subject">${escapeHtml(m.subject || '(tanpa subjek)')}</div>
            <div class="mail-date">${escapeHtml(m.date)}</div>
          </div>
        </div>
      `;
    }).join('');

  } catch (e) {
    console.error(e);
  }
}

async function bacaEmail(id) {
  try {
    const url = `${API}?action=readMessage&login=${currentAccount.user}&domain=${currentAccount.domain}&id=${id}`;
    const res = await fetch(url);
    const msg = await res.json();
    const body = msg.textBody || stripHtml(msg.htmlBody) || '(kosong)';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
      <div class="modal-content">
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

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function copyEmail() {
  const val = document.getElementById('emailAddr').value;
  navigator.clipboard.writeText(val);
  const status = document.getElementById('status');
  status.textContent = '📋 Email dicopy!';
  setTimeout(() => status.textContent = '', 2000);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

document.getElementById('btnGenerate').onclick = generateEmail;
document.getElementById('btnCopy').onclick = copyEmail;
document.getElementById('btnRefresh').onclick = loadInbox;
