/**
 * Cloudflare Pages Function — Telegram Stars Invoice Creator
 *
 * Creates a Telegram Stars invoice link for buying in-game credits.
 * Called from the Mini App frontend.
 *
 * Environment variables:
 *   TELEGRAM_BOT_TOKEN — Telegram bot token
 *   TG_WEBHOOK_HOST    — Public URL of this Pages site (for the invoice payload)
 */

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '*';

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
    const { stars, credits, userId } = await request.json();
    const botToken = env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return new Response(JSON.stringify({ error: 'Bot not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!stars || !credits || !userId) {
      return new Response(JSON.stringify({ error: 'Missing fields: stars, credits, userId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create the invoice via Telegram Bot API
    const title = `${credits} Casino Credits`;
    const description = `Get ${credits} credits to play at Casino Night!`;
    const payload = JSON.stringify({ userId, credits }); // sent back in the webhook
    const currency = 'XTR'; // Telegram Stars
    const prices = [{ label: `${credits} Credits`, amount: stars }];

    const resp = await fetch(
      `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          payload,
          currency,
          prices,
          provider_token: '', // required but empty for Stars
        }),
      }
    );

    const data = await resp.json();

    if (!data.ok) {
      console.error('Telegram API error:', data);
      return new Response(JSON.stringify({ error: data.description || 'Invoice creation failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ result: data.result }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
      },
    });
  } catch (err) {
    console.error('Invoice error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
