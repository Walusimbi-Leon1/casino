import type { UserInfo, Player, ChatMessage } from './types';
import {
  initDiscord,
  authorizeDiscord,
  getUser,
  isInDiscord,
} from './discord';
import {
  getDatabase,
  ref,
  get,
} from 'firebase/database';
import {
  registerPlayer,
  heartbeat,
  updateBalance,
  listenPlayers,
  sendMessage,
  listenChat,
  cleanup,
} from './firebase';
import { spin, DEFAULT_BET } from './game';
import * as UI from './ui';
import { setMessages } from './chat';

// ── Bootstrap ───────────────────────────────────────

let user: UserInfo | null = null;
let playerBalance = 1000;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let playerUnsub: (() => void) | null = null;
let chatUnsub: (() => void) | null = null;

async function main(): Promise<void> {
  UI.setStatus('Connecting…');
  UI.showSplash();
  UI.setBet(DEFAULT_BET);

  // Wire callbacks
  UI.setCallbacks({
    onAuthorize: handleDiscordAuth,
    onSubmitName: handleNameSubmit,
    onSpin: handleSpin,
    onChatSend: handleChatSend,
  });

  // Try Discord SDK
  const discordOk = await initDiscord();
  if (!isInDiscord()) {
    // Browser mode — show name input
    UI.setStatus('Playing in browser — enter a name to start');
    UI.setSplashMode('browser');
    return;
  }

  if (discordOk && getUser()) {
    // Already authed
    await enterGame(getUser()!);
    return;
  }

  // In Discord iframe but needs authorize
  UI.setStatus('Authorizing with Discord…');
  UI.setSplashMode('discord');
}

// ── Auth handlers ───────────────────────────────────

async function handleDiscordAuth(): Promise<void> {
  UI.setStatus('Authorizing…');
  UI.showAuthButton(false);
  const ok = await authorizeDiscord();
  if (ok && getUser()) {
    await enterGame(getUser()!);
  } else {
    UI.setStatus('Discord auth failed — try browser mode instead');
    UI.setSplashMode('browser');
  }
}

async function handleNameSubmit(name: string): Promise<void> {
  const anonId = 'anon_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  user = { id: anonId, name };
  await enterGame(user);
}

// ── Enter game ──────────────────────────────────────

async function enterGame(u: UserInfo): Promise<void> {
  user = u;
  await registerPlayer(u);

  // Fetch current balance
  const db = getDatabase();
  const snap = await get(ref(db, `casino/players/${u.id}/balance`));
  playerBalance = snap.exists() ? snap.val() : 1000;

  UI.setPlayer(u, playerBalance);
  UI.showGame();

  // Start heartbeat
  heartbeatTimer = setInterval(() => {
    if (user) heartbeat(user.id);
  }, 5000);

  // Listen for live players
  playerUnsub = listenPlayers((players: Player[]) => {
    UI.renderLeaderboard(players);
  });

  // Listen for chat messages
  chatUnsub = listenChat((messages: ChatMessage[]) => {
    setMessages(messages);
    UI.renderChat();
  });

  // Cleanup on pagehide (Discord iframe lifecycle)
  window.addEventListener('pagehide', handleCleanup);
}

// ── Spin handler ────────────────────────────────────

let isSpinning = false;

async function handleSpin(): Promise<void> {
  if (!user || isSpinning || playerBalance < DEFAULT_BET) return;
  isSpinning = true;
  UI.setSpinning(true);

  // Deduct bet
  playerBalance -= DEFAULT_BET;
  UI.updateBalance(playerBalance);

  // Generate spin result
  const result = spin();
  const winCredits = result.winAmount * DEFAULT_BET;

  // Animate reels
  UI.animateSpin(result.symbols, result.winIndices, async () => {
    // Show result
    UI.showResult(winCredits, result.winType);

    // Update balance
    if (winCredits > 0) {
      playerBalance += winCredits;
      UI.updateBalance(playerBalance);
    }

    // Persist
    if (user) {
      const newBalance = await updateBalance(user.id, winCredits - DEFAULT_BET);
      playerBalance = newBalance;
      UI.updateBalance(newBalance);
    }

    isSpinning = false;
    UI.setSpinning(false);
  });
}

// ── Chat handler ────────────────────────────────────

async function handleChatSend(text: string): Promise<void> {
  if (!user) return;
  await sendMessage(user.id, user.name, text);
}

// ── Cleanup ─────────────────────────────────────────

function handleCleanup(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (playerUnsub) playerUnsub();
  if (chatUnsub) chatUnsub();
  if (user) cleanup(user.id);
}

// ── Start ───────────────────────────────────────────

main();
