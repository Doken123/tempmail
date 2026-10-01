// ============================================
// OXY TEMPMAIL - GUERRILLA MAIL (FULL DEBUG)
// ============================================

const API = 'https://api.guerrillamail.com/ajax.php';
const STORAGE_KEY = 'oxy_guerrilla_account';

let currentAccount = null;
let refreshInterval = null;
let sidToken = null;

window.addEventListener('DOMContentLoaded', () => {
  console.log('========== [OXY] APP START ==========');
  console.log('[OXY] Guerrilla Mail version');

  setupNav();

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const acc = JSON.parse(saved);
      currentAccount = acc;
      sidToken = acc.sid_token;
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
    const url = API + '?f=get_email_address&lang=id&agent=oxy-tempmail';
    console.log('[OXY] Fetch URL:', url);

    const res = await fetch(url);
    console.log('[OXY] Response status:', res.status);

    const data = await res.json();
    console.log('[OXY] Response data:', data);

    if (!data.email_addr) throw new Error('Ga dapet email');

    currentAccount = {
      email: data.email_addr,
      sid_token: data.sid_token
    };
    sidToken = data.sid_token;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentAccount));
    console.log('[OXY] ✅ Email baru:', currentAccount.email);

    applyAccount();
    if (status) status.textContent = '✅ Email siap! Cek Kotak masuk...';

    startRefresh();

  } catch (e) {
    console.error('[OXY] ❌ Error createEmail:', e);
    if (status) status.textContent = '❌ ' + e.message;
  } finally {
    btn.disabled = false;
  }
}

function applyAccount() {
  if (!currentAccount) return;
  const email = currentAccount.email;
  const domain = email.split('@')[1] || '-';
  document.getElementById('emailDisplay').textContent = email;
  document.getElementById('activeDomain').textContent = domain;
  document.getElementById('accountSelect').innerHTML = '<option>' + email + '</option>';
}

function startRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(loadInbox, 5000);
  setTimeout(loadInbox, 1500);
}

async function loadInbox() {
  if (!currentAccount || !sidToken) return;
  const inbox = document.getElementById('inboxList');
  const badge = document.getElementById('inboxCountBadge');

  try {
    const url = API + '?f=check_email&seq=0&sid_token=' + encodeURIComponent(sidToken);
    const res = await fetch(url);
    const data = await res.json();

    const msgs = data.list || [];
    console.log('[OXY] 📥 Inbox count:', msgs.length);

    badge.textContent = msgs.length;

    if (msgs.length === 0) {
      inbox.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>Kotak masuk kosong</p><span>Email yang masuk bakal muncul di sini</span></div>';
      return;
    }

    msgs.forEach(m => console.log('[OXY] 📧 Mail:', m.mail_from, '-', m.mail_subject));

    inbox.innerHTML = msgs.map(m => {
      const subj = m.mail_subject || '';
      const from = m.mail_from || 'Unknown';
      const codeMatch = subj.match(/\b\d{4,8}\b/);
      const preview = codeMatch ? 'Kode: <span class="code">' + codeMatch[0] + '</span>' : subj;

      return '<div class="mail-item" onclick="bacaEmail(\'' + m.mail_id + '\')">' +
        '<div class="mail-top">' +
          '<div class="mail-from">' + escapeHtml(from) + '</div>' +
          '<div class="mail-date">' + escapeHtml(m.mail_date || '') + '</div>' +
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
    const url = API + '?f=fetch_email&email_id=' + id + '&sid_token=' + encodeURIComponent(sidToken);
    const res = await fetch(url);
    const msg = await res.json();
    console.log('[OXY] 📨 Email detail:', msg);

    const body = msg.mail_body || '(kosong)';
    const from = msg.mail_from || 'Unknown';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = '<div class="modal-content">' +
      '<div class="modal-handle"></div>' +
      '<h3>' + escapeHtml(msg.mail_subject || '(tanpa subjek)') + '</h3>' +
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
  sidToken = null;

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
