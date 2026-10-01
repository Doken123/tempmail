export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = req.query.path;
  if (!path) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ error: 'path required' });
  }

  // Coba MAIL.TM dulu (target utama)
  const target = 'https://api.mail.tm/' + path;

  try {
    const fetchOpts = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    if (req.headers.authorization) {
      fetchOpts.headers['Authorization'] = req.headers.authorization;
    }

    if (req.method === 'POST' && req.body) {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
      }
      fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    console.log('[PROXY]', req.method, target);

    const upstream = await fetch(target, fetchOpts);
    const data = await upstream.text();

    console.log('[PROXY] RES', upstream.status, 'len:', data.length, 'preview:', data.substring(0, 150));

    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(data || '{}');
  } catch (e) {
    console.error('[PROXY ERROR]', e.message);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: e.message });
  }
}
