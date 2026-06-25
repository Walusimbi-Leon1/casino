/**
 * Cloudflare Pages Function — Discord OAuth token exchange.
 *
 * Environment variables (set in Cloudflare Dashboard):
 *   DISCORD_CLIENT_ID      — Your Discord Application Client ID
 *   DISCORD_CLIENT_SECRET  — Your Discord Application Client Secret
 *   DISCORD_REDIRECT_URI   — Must match the OAuth2 redirect URL in Discord Developer Portal
 *                            (typically your Pages domain, e.g. https://casino.pages.dev/)
 */

export async function onRequest(context) {
  const { request, env } = context;

  // CORS for the static site origin
  const origin = request.headers.get('Origin') || '*';

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { code } = await request.json();
    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clientId = env.DISCORD_CLIENT_ID;
    const clientSecret = env.DISCORD_CLIENT_SECRET;
    const redirectUri = env.DISCORD_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured — missing Discord env vars' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const resp = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = await resp.json();

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: 'Token exchange failed', detail: data }),
        {
          status: resp.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ access_token: data.access_token }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
