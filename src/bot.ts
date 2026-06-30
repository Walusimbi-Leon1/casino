/**
 * bot.ts — Telegram Bot API helpers (called from the Mini App frontend)
 *
 * These proxy through Cloudflare Functions to avoid exposing the bot token.
 */

const BOT_HOST = ''; // Set via Vite env or leave empty for same-origin

/**
 * Create a Telegram Stars invoice link via the Cloudflare Function.
 * Returns the invoice URL that can be opened with Telegram.WebApp.openInvoice().
 */
export async function createInvoiceLink(
  stars: number,
  credits: number,
  userId: string
): Promise<string | null> {
  try {
    const resp = await fetch(`${BOT_HOST}/api/create-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stars, credits, userId }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error('Invoice creation failed:', err);
      return null;
    }
    const data = await resp.json();
    console.log('Invoice created:', data.result);
    return data.result;
  } catch (e) {
    console.error('Invoice creation error:', e);
    return null;
  }
}
