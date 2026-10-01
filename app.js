// ============================================
// OXY TEMPMAIL - FIXED V2 (1secmail)
// Fix: parsing user/domain, delay, retry, error handling
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
    // Username: harus lowercase, alphanumeric
    const user = Math.random().toString(36).substring(2, 12).toLowerCase().replace(/[^a-z0-9]/g, '');
    const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
    const email = `${user}@${domain}`;

    // Simpan terpisah biar ga salah parsing
    currentAccount = {
      email: email,
      user: user,      // <-- PENTING: cuma bagian sebelum @
      domain: domain   // <-- PENTING: cuma bagian setelah @
    };

    console.log('[OXY] Akun baru:', currentAccount); // debug

    document.getElementById('emailAddr').value = email;
    document.getElementById('emailBox').classList.remove('hidden');
    status.textContent = '✅ Email siap! Tunggu 5-10 detik...';

    if (refreshInterval) clearInterval(refreshInterval);
    // Refresh tiap 8 detik biar ga kena rate limit
    refreshInterval = setInterval(loadInbox, 8000);
    setTimeout(loadInbox, 2000);

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
  const status = document.getElementById('status');

  try {
    const url = `${API}?action=getMessages&login=${encodeURIComponent(currentAccount.user)}&domain=${encodeURIComponent(currentAccount.domain)}`;
    console.log('[OXY] Fetch inbox:', url); // debug

    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const msgs = await res.json();
    console.log('[OXY] Hasil inbox:', msgs); // debug

    badge.textContent = msgs.length;

    if (msgs.length === 0) {
      inbox.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada email masuk</p><span>Tunggu bentar, 1secmail suka delay</span></div>';
      return;
    }

    status.textContent = `📬 ${msgs.length} email masuk!`;

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
    console.error('[OXY] Error inbox:', e);
    status.textContent = '⚠️ Error ambil inbox: ' + e.message;
  }
}

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
