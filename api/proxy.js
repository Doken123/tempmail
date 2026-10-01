export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = req.query.path;
  if (!path) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ error: 'path required' });
  }

  const target = 'https://api.mail.tm/' + path;

  try {
    const fetchOpts = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (req.headers.authorization) {
      fetchOpts.headers['Authorization'] = req.headers.authorization;
    }

    // Handle body POST — Vercel kadang belom parse
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
      }
      if (body) {
        fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
      }
    }

    const upstream = await fetch(target, fetchOpts);
    const data = await upstream.text();

    console.log('[PROXY]', req.method, path, '->', upstream.status);

    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(data || '{}');

  } catch (e) {
    console.error('[PROXY ERROR]', e);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: e.message });
  }
}
