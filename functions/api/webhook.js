/**
 * Cloudflare Pages Function — Telegram Bot Webhook
 *
 * Handles:
 *   - /start command → Welcome message with Mini App launch button
 *   - Successful Stars payments → Credit user's Firebase balance
 *
 * Environment variables (set in Cloudflare Dashboard):
 *   TELEGRAM_BOT_TOKEN  — Telegram bot token
 *   FIREBASE_DATABASE_URL — Full Firebase RTDB URL (e.g. https://xxx.firebaseio.com)
 *   FIREBASE_API_KEY      — Firebase API key (for auth, optional)
 *   TG_MINI_APP_URL       — Mini App URL (defaults to casino-8ia.pages.dev)
 */

const TG_API = 'https://api.telegram.org/bot';

/** Send a Telegram API request */
async function tgApi(method, params, botToken) {
  const resp = await fetch(`${TG_API}${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return resp.json();
}

/** Update Firebase via its REST API */
async function updateFirebaseBalance(databaseURL, userId, credits) {
  // Read current balance
  const getUrl = `${databaseURL}/casino/players/${userId}/balance.json`;
  const getResp = await fetch(getUrl);
  const currentBalance = getResp.ok ? (await getResp.json() || 1000) : 1000;
  const newBalance = currentBalance + credits;

  // Write new balance
  const putUrl = `${databaseURL}/casino/players/${userId}.json`;
  await fetch(putUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      balance: newBalance,
      lastActive: Date.now(),
    }),
  });

  console.log(`💰 Firebase updated: ${userId} balance ${currentBalance} → ${newBalance}`);
  return newBalance;
}

/** Handle /start command — send welcome + Mini App button */
async function handleStart(chatId, botToken, miniAppUrl) {
  const text = `🎰 Welcome to Casino Night!

Step into the neon-lit world of slot machines, big wins, and friendly competition.

• Spin the reels across 3 different machines
• Compete on the live leaderboard
• Chat with other players in real time
• Buy more credits with Telegram Stars ⭐

Tap the button below to start playing!`;

  await tgApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        {
          text: '🎰 Play Casino Night',
          web_app: { url: miniAppUrl },
        },
      ]],
    },
  }, botToken);
}

/** Handle successful Stars payment — credit user via Firebase REST API */
async function handlePayment(payload, stars, botToken, databaseURL) {
  try {
    const { userId, credits } = JSON.parse(payload);
    if (!userId || !credits) {
      console.error('Invalid payment payload:', payload);
      return;
    }
    await updateFirebaseBalance(databaseURL, userId, credits);
    console.log(`💳 Payment processed: ${stars}⭐ → ${credits}cr for ${userId}`);
  } catch (e) {
    console.error('Payment handling error:', e);
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response('Use POST', { status: 405 });
  }

  try {
    const update = await request.json();
    const botToken = env.TELEGRAM_BOT_TOKEN;
    const miniAppUrl = env.TG_MINI_APP_URL || 'https://casino-8ia.pages.dev';
    const databaseURL = env.FIREBASE_DATABASE_URL;

    if (!botToken) {
      return new Response('Bot not configured', { status: 500 });
    }

    // ── Handle /start command ──
    if (update.message?.text?.startsWith('/start')) {
      await handleStart(update.message.chat.id, botToken, miniAppUrl);
      return new Response('OK');
    }

    // ── Handle successful payment ──
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      if (databaseURL) {
        await handlePayment(payment.invoice_payload, payment.total_amount, botToken, databaseURL);
      }
      const chatId = update.message.chat.id;
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: `✅ ${payment.total_amount} credits added! Good luck at the slots! 🎰`,
      }, botToken);
      return new Response('OK');
    }

    // ── Pre-checkout query (must answer to allow payment) ──
    if (update.pre_checkout_query) {
      await tgApi('answerPreCheckoutQuery', {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      }, botToken);
      return new Response('OK');
    }

    return new Response('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('Error', { status: 500 });
  }
}
