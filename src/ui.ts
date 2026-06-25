import type { Player, UserInfo } from './types';
import { SYMBOLS } from './game';
import { getMessages } from './chat';

// ── DOM refs ────────────────────────────────────────

const $ = (id: string) => document.getElementById(id)!;

const splashScreen   = $('splash-screen') as HTMLDivElement;
const gameScreen     = $('game-screen') as HTMLDivElement;
const statusText     = $('status-text') as HTMLParagraphElement;
const authBtn        = $('auth-btn') as HTMLButtonElement;
const nameInput      = $('name-input') as HTMLInputElement;
const submitName     = $('submit-name') as HTMLButtonElement;
const playerNameEl   = $('player-name') as HTMLSpanElement;
const playerBalance  = $('player-balance') as HTMLSpanElement;
const betAmount      = $('bet-amount') as HTMLSpanElement;
const spinBtn        = $('spin-btn') as HTMLButtonElement;
const resultEl       = $('spin-result') as HTMLParagraphElement;
const rows           = [
  $('reel-row-0') as HTMLDivElement,
  $('reel-row-1') as HTMLDivElement,
  $('reel-row-2') as HTMLDivElement,
];
const leaderboardEl  = $('leaderboard') as HTMLDivElement;
const chatMessagesEl = $('chat-messages') as HTMLDivElement;
const chatInput      = $('chat-input') as HTMLInputElement;
const chatSendBtn    = $('chat-send') as HTMLButtonElement;

// ── State ───────────────────────────────────────────

let currentUser: UserInfo | null = null;
let isSpinning = false;

// ── Screen management ───────────────────────────────

export function showSplash(): void {
  splashScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
}

export function showGame(): void {
  splashScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
}

// ── Callback registry ───────────────────────────────

export let onAuthorize: (() => void) | null = null;
export let onSubmitName: ((name: string) => void) | null = null;
export let onSpin: (() => void) | null = null;
export let onChatSend: ((text: string) => void) | null = null;

export function setCallbacks(opts: {
  onAuthorize?: () => void;
  onSubmitName?: (name: string) => void;
  onSpin?: () => void;
  onChatSend?: (text: string) => void;
}): void {
  if (opts.onAuthorize) onAuthorize = opts.onAuthorize;
  if (opts.onSubmitName) onSubmitName = opts.onSubmitName;
  if (opts.onSpin) onSpin = opts.onSpin;
  if (opts.onChatSend) onChatSend = opts.onChatSend;
}

// ── Splash-screen wiring ────────────────────────────

export function setStatus(text: string): void {
  statusText.textContent = text;
}

export function showAuthButton(show: boolean): void {
  authBtn.classList.toggle('hidden', !show);
}

export function showNameInput(show: boolean): void {
  nameInput.classList.toggle('hidden', !show);
  submitName.classList.toggle('hidden', !show);
}

export function setSplashMode(mode: 'discord' | 'browser'): void {
  if (mode === 'discord') {
    showAuthButton(true);
    showNameInput(false);
    setTimeout(() => authBtn.click(), 1500);
  } else {
    showAuthButton(false);
    showNameInput(true);
  }
}

authBtn.addEventListener('click', () => onAuthorize?.());
submitName.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (name) onSubmitName?.(name);
});
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitName.click();
});

// ── Game-screen wiring ──────────────────────────────

export function setPlayer(user: UserInfo, balance: number): void {
  currentUser = user;
  playerNameEl.textContent = user.name;
  playerBalance.textContent = String(balance);
}

export function updateBalance(balance: number): void {
  playerBalance.textContent = String(balance);
}

export function setBet(amount: number): void {
  betAmount.textContent = String(amount);
}

export function setSpinning(spinning: boolean): void {
  isSpinning = spinning;
  spinBtn.disabled = spinning;
  spinBtn.textContent = spinning ? '🎰 Spinning…' : '🎰 SPIN!';
}

spinBtn.addEventListener('click', () => {
  if (!isSpinning) onSpin?.();
});

// ── Slot reels ──────────────────────────────────────

export function renderReels(symbols: string[][], winIndices: number[]): void {
  for (let row = 0; row < 3; row++) {
    const rowEl = rows[row];
    const isWinRow = row === 1; // centre row is the payline
    rowEl.innerHTML = '';
    for (let col = 0; col < 3; col++) {
      const cell = document.createElement('span');
      cell.className = 'reel-cell';
      cell.textContent = symbols[col][row];
      if (isWinRow && winIndices.includes(col)) {
        cell.classList.add('winning');
      }
      rowEl.appendChild(cell);
    }
  }
}

export function animateSpin(
  finalSymbols: string[][],
  winIndices: number[],
  onDone: () => void
): void {
  let phase = 0;
  const cycleInterval = 80;

  function getRandomReel(): string[] {
    const all = SYMBOLS.map((s) => s.emoji);
    return [
      all[Math.floor(Math.random() * all.length)],
      all[Math.floor(Math.random() * all.length)],
      all[Math.floor(Math.random() * all.length)],
    ];
  }

  const timer = setInterval(() => {
    phase++;
    const cols: string[][] = [[], [], []];
    cols[0] = phase < 7 ? getRandomReel() : finalSymbols[0];
    cols[1] = phase < 12 ? getRandomReel() : finalSymbols[1];
    cols[2] = phase < 17 ? getRandomReel() : finalSymbols[2];
    renderReels(cols, []);
    if (phase >= 17) {
      clearInterval(timer);
      renderReels(finalSymbols, winIndices);
      onDone();
    }
  }, cycleInterval);
}

// ── Spin result ─────────────────────────────────────

export function showResult(winAmount: number, winType: string | null): void {
  resultEl.textContent = winType || '';
  resultEl.className = winAmount > 0 ? 'spin-result win' : 'spin-result lose';
}

// ── Leaderboard ─────────────────────────────────────

export function renderLeaderboard(players: Player[]): void {
  if (players.length === 0) {
    leaderboardEl.innerHTML =
      '<p class="empty-state">No other players yet…</p>';
    return;
  }
  leaderboardEl.innerHTML = players
    .slice(0, 10)
    .map(
      (p, i) =>
        `<div class="lb-row ${p.id === currentUser?.id ? 'lb-me' : ''}">
          <span class="lb-rank">#${i + 1}</span>
          <span class="lb-name">${escHtml(p.name)}</span>
          <span class="lb-balance">💰 ${p.balance}</span>
        </div>`
    )
    .join('');
}

// ── Chat ────────────────────────────────────────────

export function renderChat(): void {
  const msgs = getMessages();
  chatMessagesEl.innerHTML = msgs
    .map(
      (m) =>
        `<div class="chat-msg ${m.userId === currentUser?.id ? 'chat-me' : ''}">
          <span class="chat-author">${escHtml(m.name)}</span>
          <span class="chat-text">${escHtml(m.text)}</span>
        </div>`
    )
    .join('');
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

chatSendBtn.addEventListener('click', () => {
  const text = chatInput.value.trim();
  if (text) {
    onChatSend?.(text);
    chatInput.value = '';
  }
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') chatSendBtn.click();
});

function escHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

