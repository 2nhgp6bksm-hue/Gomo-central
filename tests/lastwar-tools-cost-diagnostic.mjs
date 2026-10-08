// Read-only public API metadata diagnostic. No API key, no paid endpoints.
const base = 'https://api.lastwar.tools';
const paths = ['/openapi.json', '/docs/openapi.json'];
let found = false;
for (const path of paths) {
  try {
    const res = await fetch(new URL(path, base), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.log(JSON.stringify({ path, status: res.status, result: 'unavailable' }));
      continue;
    }
    const doc = await res.json();
    const op = doc?.paths?.['/alliance/{alliance_id}/members']?.get;
    if (!op) {
      console.log(JSON.stringify({ path, status: res.status, result: 'operation_missing' }));
      continue;
    }
    const costFields = [];
    function scan(obj, location = 'operation', depth = 0) {
      if (!obj || typeof obj !== 'object' || depth > 8) return;
      for (const [key, value] of Object.entries(obj)) {
        if (/cost|token|credit|price/i.test(key)) {
          costFields.push({ field: location + '.' + key, value: typeof value === 'object' ? '[object]' : String(value).slice(0,100) });
        }
        if (value && typeof value === 'object') scan(value, location + '.' + key, depth + 1);
      }
    }
    scan(op);
    console.log(JSON.stringify({ path, status: res.status, operation_found: true, cost_fields: costFields }));
    found = true;
    break;
  } catch (err) {
    console.log(JSON.stringify({ path, result: 'fetch_error', error: String(err).slice(0,200) }));
  }
}
console.log(JSON.stringify({
  conclusion: found ? 'public_openapi_checked' : 'public_openapi_not_available',
  paid_requests: 0,
  api_key_used: false,
  alliance_members_requests: 0,
}));
