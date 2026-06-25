import { DiscordSDK } from '@discord/embedded-app-sdk';
import type { UserInfo } from './types';

// You'll need to create a Discord Application and put its Client ID here
const CLIENT_ID = '1519713772770562149';

let discordSdk: DiscordSDK | null = null;
let authUser: UserInfo | null = null;
let _isDiscord = false;

export function isInDiscord(): boolean {
  return _isDiscord;
}

export function getUser(): UserInfo | null {
  return authUser;
}

/** Attempt to initialise Discord SDK. Returns false in browser mode. */
export async function initDiscord(): Promise<boolean> {
  try {
    discordSdk = new DiscordSDK(CLIENT_ID);
    _isDiscord = true;
  } catch {
    _isDiscord = false;
    return false;
  }

  // ready() hangs forever outside Discord's iframe, so we add a timeout
  try {
    await withTimeout(discordSdk.ready(), 5000);
  } catch {
    _isDiscord = false;
    return false;
  }

  // Try silent authenticate first
  try {
    const auth = await discordSdk.commands.authenticate();
    if (auth) {
      authUser = { id: auth.user.id, name: auth.user.username };
      return true;
    }
  } catch {
    // Silent auth failed — will need authorize()
  }

  return false; // needs authorize
}

/** Show the Discord OAuth consent modal and exchange code for a token */
export async function authorizeDiscord(): Promise<boolean> {
  if (!discordSdk) return false;

  try {
    const { code } = await discordSdk.commands.authorize({
      client_id: CLIENT_ID,
      response_type: 'code',
      scope: ['identify'],
    });

    if (!code) return false;

    const resp = await fetch('/api/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!resp.ok) return false;

    const { access_token } = await resp.json();
    const auth = await discordSdk.commands.authenticate({ access_token });
    if (!auth) return false;

    authUser = { id: auth.user.id, name: auth.user.username };
    return true;
  } catch {
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}
