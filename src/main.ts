import type { UserInfo, Player, ChatMessage, MachineConfig } from './types';
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
import { spin, MACHINES, STARTING_BALANCE } from './game';
import * as Sound from './sound';
import * as UI from './ui';
import { setMessages } from './chat';

// ── Bootstrap ───────────────────────────────────────

let user: UserInfo | null = null;
let playerBalance = STARTING_BALANCE;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let playerUnsub: (() => void) | null = null;
let chatUnsub: (() => void) | null = null;

// Machine state
let selectedMachine: MachineConfig = MACHINES[0]; // Classic 3-reel
let currentBet = selectedMachine.defaultBet;

async function main(): Promise<void> {
  UI.setStatus('Connecting…');
  UI.showSplash();

  // Wire callbacks
  UI.setCallbacks({
    onAuthorize: handleDiscordAuth,
    onSubmitName: handleNameSubmit,
    onSpin: handleSpin,
    onChatSend: handleChatSend,
    onMachineChange: handleMachineChange,
    onBetChange: handleBetChange,
    onVolumeChange: (v) => Sound.setVolume(v),
  });

  // Setup volume control
  UI.setupVolume();
  UI.setVolume(Sound.getVolume());

  // Render machine selector (will appear after entering game)
  UI.renderMachineSelector(MACHINES, selectedMachine.id);

  // Try Discord SDK
  const discordOk = await initDiscord();
  if (!isInDiscord()) {
    UI.setStatus('Playing in browser — enter a name to start');
    UI.setSplashMode('browser');
    return;
  }

  if (discordOk && getUser()) {
    await enterGame(getUser()!);
    return;
  }

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

  const db = getDatabase();
  const snap = await get(ref(db, `casino/players/${u.id}/balance`));
  playerBalance = snap.exists() ? snap.val() : STARTING_BALANCE;

  UI.setPlayer(u, playerBalance);
  UI.renderBet(currentBet, selectedMachine.minBet, selectedMachine.maxBet);
  UI.showGame();
  UI.setActiveMachine(selectedMachine.id);

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

  window.addEventListener('pagehide', handleCleanup);
}

// ── Machine selector handler ────────────────────────

function handleMachineChange(machineId: string): void {
  const machine = MACHINES.find((m) => m.id === machineId);
  if (!machine) return;
  selectedMachine = machine;

  // Clamp current bet to new machine's range
  currentBet = Math.max(machine.minBet, Math.min(machine.maxBet, currentBet));

  UI.setActiveMachine(machineId);
  UI.renderBet(currentBet, machine.minBet, machine.maxBet);

  // Clear reels and result
  UI.renderReels([], [], machine.columns, machine.rows);
  UI.showResult(0, null, null);

  Sound.playCoin();
}

// ── Bet handler ─────────────────────────────────────

function handleBetChange(newBet: number): void {
  currentBet = Math.max(
    selectedMachine.minBet,
    Math.min(selectedMachine.maxBet, newBet)
  );
  UI.renderBet(currentBet, selectedMachine.minBet, selectedMachine.maxBet);
  Sound.playCoin();
}

// ── Spin handler ────────────────────────────────────

let isSpinning = false;

async function handleSpin(): Promise<void> {
  if (!user || isSpinning || playerBalance < currentBet) {
    if (playerBalance < currentBet) {
      Sound.playNoBet();
      UI.showResult(0, 'Not enough credits! 💸', null);
    }
    return;
  }
  isSpinning = true;
  UI.setSpinning(true);

  // Deduct bet
  playerBalance -= currentBet;
  UI.updateBalance(playerBalance);

  Sound.playLever();
  Sound.startSpinSound();

  // Generate spin result
  const result = spin(selectedMachine);
  const winCredits = result.winAmount * currentBet;

  const { columns, rows } = selectedMachine;

  // Animate reels
  UI.animateSpin(result.symbols, result.winningCells, columns, rows, async () => {
    Sound.stopSpinSound();

    // Staggered reel-stop sounds
    for (let i = 0; i < columns; i++) {
      setTimeout(() => Sound.playReelStop(), i * 100);
    }

    // Show result
    UI.showResult(winCredits, result.winType, result.paylineName);

    // Play appropriate sound
    if (winCredits > 0) {
      if (winCredits >= currentBet * 50) {
        Sound.playBigWin();
        UI.flashJackpot();
      } else {
        Sound.playWin(winCredits / currentBet);
      }
    } else {
      Sound.playLose();
    }

    // Update balance
    if (winCredits > 0) {
      playerBalance += winCredits;
      UI.updateBalance(playerBalance);
      Sound.playCoin();
    }

    // Persist
    if (user) {
      const newBalance = await updateBalance(user.id, winCredits - currentBet);
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
  Sound.stopSpinSound();
  if (user) cleanup(user.id);
}

// ── Start ───────────────────────────────────────────

main();
