// lib/auth.js - Google OAuth2 token manager
// Uses refresh_token stored in env to get fresh access_token automatically

let cachedToken = null;
let tokenExpiry = 0;

export async function getAccessToken() {
  // Return cached token if still valid (with 5min buffer)
  if (cachedToken && Date.now() < tokenExpiry - 300000) {
    console.log('[Auth] Using cached access token');
    return cachedToken;
  }

  console.log('[Auth] Refreshing access token...');

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Auth] Token refresh failed: ${err}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;

  console.log('[Auth] New access token obtained, expires in', data.expires_in, 'seconds');
  return cachedToken;
}
