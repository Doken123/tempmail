export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.searchParams.get('path');

  if (!path) {
    return new Response(JSON.stringify({ error: 'path required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const target = 'https://api.mail.tm/' + path;

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  headers.set('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const auth = request.headers.get('authorization');
  if (auth) headers.set('Authorization', auth);

  const fetchOpts = { method: request.method, headers: headers };

  if (request.method === 'POST') {
    const body = await request.text();
    if (body) fetchOpts.body = body;
  }

  try {
    const upstream = await fetch(target, fetchOpts);
    const data = await upstream.text();

    return new Response(data || '{}', {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
