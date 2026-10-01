const API = 'https://api.mail.tm';
let currentAccount = null;
let refreshInterval = null;

async function generateEmail() {
  const status = document.getElementById('status');
  const btn = document.getElementById('btnGenerate');
  btn.disabled = true;
  status.textContent = '⏳ Bikin email baru...';

  try {
    const domRes = await fetch(`${API}/domains`);
    const domData = await domRes.json();
    const domain = domData['hydra:member'][0].domain;

    const user = Math.random().toString(36).substring(2, 12);
    const email = `${user}@${domain}`;
    const password = Math.random().toString(36).substring(2, 16);

    const accRes = await fetch(`${API}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: email, password })
    });

    if (!accRes.ok) throw new Error('Gagal bikin akun');
    const accData = await accRes.json();

    const tokRes = await fetch(`${API}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: email, password })
    });
    const tokData = await tokRes.json();

    currentAccount = { email, password, token: tokData.token, id: accData.id };

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
    const res = await fetch(`${API}/messages`, {
      headers: { Authorization: `Bearer ${currentAccount.token}` }
    });

    if (res.status === 401) {
      inbox.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Token expired</p><span>Generate ulang</span></div>';
      return;
    }

    const data = await res.json();
    const msgs = data['hydra:member'] || [];

    badge.textContent = msgs.length;

    if (msgs.length === 0) {
      inbox.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada email masuk</p><span>Tunggu bentar...</span></div>';
      return;
    }

    inbox.innerHTML = msgs.map(m => {
      const initial = (m.from.address[0] || '?').toUpperCase();
      return `
        <div class="mail-item" onclick="bacaEmail('${m.id}')">
          <div class="mail-avatar">${initial}</div>
          <div class="mail-content">
            <div class="mail-from">${escapeHtml(m.from.address)}</div>
            <div class="mail-subject">${escapeHtml(m.subject || '(tanpa subjek)')}</div>
            <div class="mail-date">${new Date(m.createdAt).toLocaleString('id-ID')}</div>
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
    const res = await fetch(`${API}/messages/${id}`, {
      headers: { Authorization: `Bearer ${currentAccount.token}` }
    });
    const msg = await res.json();
    const body = msg.text || (msg.html ? msg.html.join('') : '(kosong)');

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
      <div class="modal-content">
        <h3>${escapeHtml(msg.subject || '(tanpa subjek)')}</h3>
        <div class="modal-meta">Dari: ${escapeHtml(msg.from.address)}</div>
        <div class="modal-body">${escapeHtml(body)}</div>
        <button class="modal-close" onclick="this.closest('.modal').remove()">TUTUP</button>
      </div>
    `;
    document.body.appendChild(modal);

  } catch (e) {
    alert('Gagal baca email: ' + e.message);
  }
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