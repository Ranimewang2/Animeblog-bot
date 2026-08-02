// lib/kv.js - Vercel KV storage handler with 24hr TTL

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvRequest(method, path, body = null) {
  if (!KV_URL || !KV_TOKEN || KV_URL.includes('WILL_BE_AUTO')) {
    console.log('[KV] Not configured yet - skipping duplicate check');
    return null;
  }
  try {
    const opts = {
      method,
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${KV_URL}${path}`, opts);
    const data = await res.json();
    return data?.result ?? null;
  } catch (e) {
    console.error('[KV] Error:', e.message);
    return null;
  }
}

// Check if topic was posted in last 24 hours
export async function wasRecentlyPosted(slug) {
  const result = await kvRequest('GET', `/get/post:${slug}`);
  return result !== null;
}

// Store posted topic with 24hr auto-delete
export async function markAsPosted(slug, metadata) {
  await kvRequest('POST', `/set/post:${slug}`, {
    value: JSON.stringify(metadata),
    ex: 86400, // 24 hours TTL
  });
  console.log(`[KV] Stored: post:${slug} (expires in 24hrs)`);
}

// Get all recently posted slugs (for dashboard)
export async function getRecentPosts() {
  const keys = await kvRequest('GET', '/keys/post:*');
  return keys || [];
}
