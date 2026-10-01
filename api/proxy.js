export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = req.query.path;
  if (!path) return res.status(400).json({ error: 'path required' });

  const target = 'https://api.mail.tm/' + path;

  try {
    const fetchOpts = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (req.headers.authorization) {
      fetchOpts.headers['Authorization'] = req.headers.authorization;
    }
    if (req.method === 'POST' && req.body) {
      fetchOpts.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(target, fetchOpts);
    const data = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
