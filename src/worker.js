/**
 * _worker.js — Cloudflare Workers Entry Point
 *
 * Serves:
 *   - Static files from /dist (the built game)
 *   - /api/create-invoice → Creates Telegram Stars invoices
 *   - /api/webhook      → Telegram bot webhook (/start, payments)
 *   - /api/exchange     → Discord OAuth token exchange
 */

// ── Static asset manifest (injected by wrangler) ──
// wrangler will serve from the "assets" namespace

// ── CORS headers ──
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ── Helpers ──

async function tgApi(method, params, botToken) {
  const resp = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return resp.json();
}

async function updateFirebaseBalance(databaseURL, userId, credits) {
  const getUrl = `${databaseURL}/casino/players/${userId}/balance.json`;
  const getResp = await fetch(getUrl, { cf: { cacheTtl: 0 } });
  const currentBalance = getResp.ok ? (await getResp.json() || 1000) : 1000;
  const newBalance = currentBalance + credits;
  const putUrl = `${databaseURL}/casino/players/${userId}.json`;
  await fetch(putUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ balance: newBalance, lastActive: Date.now() }),
  });
  console.log(`💰 Firebase updated: ${userId} ${currentBalance} → ${newBalance}`);
  return newBalance;
}

// ── API handlers ──

async function handleCreateInvoice(request, env) {
  if (request.method === 'OPTIONS') return corsPreflight();
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { stars, credits, userId } = await request.json();
    const botToken = env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return new Response(JSON.stringify({ error: 'Bot not configured' }), { status: 500, headers: CORS_HEADERS });
    if (!stars || !credits || !userId) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: CORS_HEADERS });
    }

    const resp = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${credits} Casino Credits`,
        description: `Get ${credits} credits for Casino Night!`,
        payload: JSON.stringify({ userId, credits }),
        currency: 'XTR',
        prices: [{ label: `${credits} Credits`, amount: stars }],
        provider_token: '',
      }),
    });

    const data = await resp.json();
    if (!data.ok) {
      return new Response(JSON.stringify({ error: data.description }), { status: 400, headers: CORS_HEADERS });
    }
    return new Response(JSON.stringify({ result: data.result }), { headers: CORS_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
  }
}

async function handleWebhook(request, env) {
  if (request.method !== 'POST') return new Response('Use POST', { status: 405 });

  try {
    const update = await request.json();
    const botToken = env.TELEGRAM_BOT_TOKEN;
    const miniAppUrl = env.TG_MINI_APP_URL || 'https://casino.walusimbileon2.workers.dev';
    const databaseURL = env.FIREBASE_DATABASE_URL;

    if (!botToken) return new Response('Bot not configured', { status: 500 });

    // /start command
    if (update.message?.text?.startsWith('/start')) {
      const text = `🎰 Welcome to Casino Night!\n\nStep into the neon-lit world of slot machines, big wins, and friendly competition.\n\n• Spin the reels across 3 different machines\n• Compete on the live leaderboard\n• Chat with other players in real time\n• Buy more credits with Telegram Stars ⭐\n\nTap the button below to start playing!`;

      await tgApi('sendMessage', {
        chat_id: update.message.chat.id,
        text,
        reply_markup: {
          inline_keyboard: [[{ text: '🎰 Play Casino Night', web_app: { url: miniAppUrl } }]],
        },
      }, botToken);
      return new Response('OK');
    }

    // Successful payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      if (databaseURL) {
        await updateFirebaseBalance(databaseURL, JSON.parse(payment.invoice_payload).userId, payment.total_amount);
      }
      await tgApi('sendMessage', {
        chat_id: update.message.chat.id,
        text: `✅ ${payment.total_amount} credits added! Good luck at the slots! 🎰`,
      }, botToken);
      return new Response('OK');
    }

    // Pre-checkout query
    if (update.pre_checkout_query) {
      await tgApi('answerPreCheckoutQuery', {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      }, botToken);
      return new Response('OK');
    }

    return new Response('OK');
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Error', { status: 500 });
  }
}

async function handleExchange(request, env) {
  if (request.method === 'OPTIONS') return corsPreflight();
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { code } = await request.json();
    if (!code) return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400, headers: CORS_HEADERS });

    const clientId = env.DISCORD_CLIENT_ID;
    const clientSecret = env.DISCORD_CLIENT_SECRET;
    const redirectUri = env.DISCORD_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return new Response(JSON.stringify({ error: 'Discord env not configured' }), { status: 500, headers: CORS_HEADERS });
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
      return new Response(JSON.stringify({ error: 'Token exchange failed' }), { status: resp.status, headers: CORS_HEADERS });
    }
    return new Response(JSON.stringify({ access_token: data.access_token }), { headers: CORS_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS });
  }
}

// ── Main fetch handler ──

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route API endpoints
    if (path === '/api/create-invoice') return handleCreateInvoice(request, env);
    if (path === '/api/webhook') return handleWebhook(request, env);
    if (path === '/api/exchange') return handleExchange(request, env);

    // Everything else: serve static files
    return env.ASSETS.fetch(request);
  },
};
