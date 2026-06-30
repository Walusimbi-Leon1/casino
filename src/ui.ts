import type { Player, UserInfo, MachineConfig } from './types';
import { getMessages } from './chat';

// ── DOM refs ────────────────────────────────────────

const $ = (id: string) => document.getElementById(id)!;

const splashScreen    = $('splash-screen') as HTMLDivElement;
const gameScreen      = $('game-screen') as HTMLDivElement;
const statusText      = $('status-text') as HTMLParagraphElement;
const authBtn         = $('auth-btn') as HTMLButtonElement;
const nameInput       = $('name-input') as HTMLInputElement;
const submitName      = $('submit-name') as HTMLButtonElement;
const playerNameEl    = $('player-name') as HTMLSpanElement;
const playerBalance   = $('player-balance') as HTMLSpanElement;
const betDisplay      = $('bet-amount') as HTMLSpanElement;
const spinBtn         = $('spin-btn') as HTMLButtonElement;
const resultEl        = $('spin-result') as HTMLParagraphElement;
const reelContainer   = $('reel-container') as HTMLDivElement;
const leaderboardEl   = $('leaderboard') as HTMLDivElement;
const chatMessagesEl  = $('chat-messages') as HTMLDivElement;
const chatInput       = $('chat-input') as HTMLInputElement;
const chatSendBtn     = $('chat-send') as HTMLButtonElement;
const machineSelector = $('machine-selector') as HTMLDivElement;
const volumeSlider    = $('volume-slider') as HTMLInputElement;
const volumeLabel     = $('volume-label') as HTMLSpanElement;
const betDownBtn      = $('bet-down') as HTMLButtonElement;
const betUpBtn        = $('bet-up') as HTMLButtonElement;
const jackpotBanner   = $('jackpot-banner') as HTMLDivElement;
const buyCreditsBtn   = $('buy-credits-btn') as HTMLButtonElement;
const closeBtn        = $('close-btn') as HTMLButtonElement;
const pricingModal    = $('pricing-modal') as HTMLDivElement;

// ── State ───────────────────────────────────────────

let currentUser: UserInfo | null = null;
let isSpinning = false;
let currentMachine: MachineConfig | null = null;
let currentBet = 10;

// ── Callback registry ───────────────────────────────

export let onAuthorize: (() => void) | null = null;
export let onSubmitName: ((name: string) => void) | null = null;
export let onSpin: (() => void) | null = null;
export let onChatSend: ((text: string) => void) | null = null;
export let onMachineChange: ((machineId: string) => void) | null = null;
export let onBetChange: ((bet: number) => void) | null = null;
export let onVolumeChange: ((volume: number) => void) | null = null;
export let onBuyCredits: (() => void) | null = null;

export function setCallbacks(opts: {
  onAuthorize?: () => void;
  onSubmitName?: (name: string) => void;
  onSpin?: () => void;
  onChatSend?: (text: string) => void;
  onMachineChange?: (machineId: string) => void;
  onBetChange?: (bet: number) => void;
  onVolumeChange?: (volume: number) => void;
  onBuyCredits?: () => void;
}): void {
  if (opts.onAuthorize) onAuthorize = opts.onAuthorize;
  if (opts.onSubmitName) onSubmitName = opts.onSubmitName;
  if (opts.onSpin) onSpin = opts.onSpin;
  if (opts.onChatSend) onChatSend = opts.onChatSend;
  if (opts.onMachineChange) onMachineChange = opts.onMachineChange;
  if (opts.onBetChange) onBetChange = opts.onBetChange;
  if (opts.onVolumeChange) onVolumeChange = opts.onVolumeChange;
  if (opts.onBuyCredits) onBuyCredits = opts.onBuyCredits;
}

// ── Screen management ───────────────────────────────

export function showSplash(): void {
  splashScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
}

export function showGame(): void {
  splashScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
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

export function setSplashMode(mode: 'discord' | 'browser' | 'telegram'): void {
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

// ── Machine Selector ────────────────────────────────

export function renderMachineSelector(machines: MachineConfig[], activeId: string): void {
  machineSelector.innerHTML = machines
    .map(
      (m) =>
        `<button class="machine-btn ${m.id === activeId ? 'active' : ''}" data-machine="${m.id}">
          <span class="machine-name">${m.name}</span>
          <span class="machine-desc">${m.description}</span>
        </button>`
    )
    .join('');

  machineSelector.querySelectorAll('.machine-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.machine!;
      onMachineChange?.(id);
    });
  });
}

export function setActiveMachine(machineId: string): void {
  machineSelector.querySelectorAll('.machine-btn').forEach((btn) => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.machine === machineId);
  });
}

// ── Volume ──────────────────────────────────────────

export function setupVolume(): void {
  volumeSlider.addEventListener('input', () => {
    const v = parseFloat(volumeSlider.value);
    volumeLabel.textContent = Math.round(v * 100) + '%';
    onVolumeChange?.(v);
  });
}

export function setVolume(v: number): void {
  volumeSlider.value = String(v);
  volumeLabel.textContent = Math.round(v * 100) + '%';
}

// ── Bet ─────────────────────────────────────────────

export function renderBet(bet: number, min: number, max: number): void {
  currentBet = bet;
  betDisplay.textContent = String(bet);
  betDownBtn.disabled = bet <= min;
  betUpBtn.disabled = bet >= max;
}

betDownBtn.addEventListener('click', () => onBetChange?.(currentBet - 5));
betUpBtn.addEventListener('click', () => onBetChange?.(currentBet + 5));

// ── Jackpot banner flash ────────────────────────────

export function flashJackpot(): void {
  jackpotBanner.classList.remove('hidden');
  jackpotBanner.classList.add('jackpot-flash');
  setTimeout(() => {
    jackpotBanner.classList.add('hidden');
    jackpotBanner.classList.remove('jackpot-flash');
  }, 3000);
}

// ── Game-screen wiring ──────────────────────────────

export function setPlayer(user: UserInfo, balance: number): void {
  currentUser = user;
  playerNameEl.textContent = user.name;
  playerBalance.textContent = String(balance);
}

export function updateBalance(balance: number): void {
  playerBalance.textContent = String(balance);
}

export function setSpinning(spinning: boolean): void {
  isSpinning = spinning;
  spinBtn.disabled = spinning;
  spinBtn.textContent = spinning ? '🎰 Spinning…' : '🎰 SPIN!';
}

spinBtn.addEventListener('click', () => {
  if (!isSpinning) onSpin?.();
});

// ── Telegram: Buy Credits ───────────────────────────

export function showBuyCredits(show: boolean): void {
  buyCreditsBtn.classList.toggle('hidden', !show);
}

buyCreditsBtn.addEventListener('click', () => {
  onBuyCredits?.();
});

// ── Telegram: Close button ──────────────────────────

export function showCloseButton(show: boolean): void {
  closeBtn.classList.toggle('hidden', !show);
}

closeBtn.addEventListener('click', () => {
  import('./telegram').then((tg) => tg.closeTelegramApp());
});

// ── Pricing Modal ───────────────────────────────────

export interface PriceOption {
  stars: number;
  credits: number;
  label: string;
}

const PRICE_OPTIONS: PriceOption[] = [
  { stars: 5,  credits: 1000,  label: '💰 1,000 credits — ⭐5' },
  { stars: 25, credits: 6000,  label: '🔥 6,000 credits — ⭐25' },
  { stars: 50, credits: 13000, label: '💎 13,000 credits — ⭐50' },
  { stars: 150, credits: 50000, label: '👑 50,000 credits — ⭐150 (BEST)' },
];

/**
 * Show the pricing modal and return the selected option.
 * Returns undefined if user cancels.
 */
export function showPricingModal(): Promise<PriceOption | undefined> {
  return new Promise((resolve) => {
    pricingModal.innerHTML = `
      <div class="pricing-overlay">
        <div class="pricing-card">
          <h2>⭐ Buy Credits</h2>
          <p class="pricing-sub">Get more credits to keep spinning!</p>
          <div class="pricing-options">
            ${PRICE_OPTIONS.map(
              (opt, i) =>
                `<button class="pricing-btn" data-index="${i}">
                  <span class="price-label">${opt.label}</span>
                  <span class="price-stars">⭐ ${opt.stars}</span>
                </button>`
            ).join('')}
          </div>
          <button class="pricing-cancel btn btn-sm">Cancel</button>
        </div>
      </div>
    `;
    pricingModal.classList.remove('hidden');

    // Wire up buttons
    pricingModal.querySelectorAll('.pricing-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.index!);
        pricingModal.classList.add('hidden');
        resolve(PRICE_OPTIONS[idx]);
      });
    });
    pricingModal.querySelector('.pricing-cancel')?.addEventListener('click', () => {
      pricingModal.classList.add('hidden');
      resolve(undefined);
    });
  });
}

// ── Slot reels ──────────────────────────────────────

export function renderReels(
  symbols: string[][],
  winningCells: string[],
  columns: number,
  rows: number
): void {
  reelContainer.innerHTML = '';
  for (let r = 0; r < rows; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'reel-row';
    for (let c = 0; c < columns; c++) {
      const cell = document.createElement('span');
      cell.className = 'reel-cell';
      const emoji = symbols[c]?.[r] ?? '—';
      cell.textContent = emoji;
      const key = `${c}-${r}`;
      if (winningCells.includes(key)) cell.classList.add('winning');
      if (r === 1 && c === 0) cell.classList.add('payline-marker');
      rowEl.appendChild(cell);
    }
    reelContainer.appendChild(rowEl);
  }
}

export function animateSpin(
  finalSymbols: string[][],
  winningCells: string[],
  columns: number,
  rows: number,
  onDone: () => void
): void {
  const allEmojis: string[] = [];
  finalSymbols.forEach((col) => col.forEach((s) => allEmojis.push(s)));

  let phase = 0;
  const cycleInterval = 80;
  const stopPhase = columns === 5
    ? [6, 10, 14, 18, 22]
    : columns === 4
    ? [6, 10, 14, 18]
    : [7, 12, 17];

  const maxPhase = stopPhase[stopPhase.length - 1];

  function getRandomCol(): string[] {
    const col: string[] = [];
    for (let r = 0; r < rows; r++) {
      col.push(allEmojis[Math.floor(Math.random() * allEmojis.length)]);
    }
    return col;
  }

  const timer = setInterval(() => {
    phase++;
    for (let c = 0; c < columns; c++) {
      if (phase <= stopPhase[c]) finalSymbols[c] = getRandomCol();
    }
    renderReels(finalSymbols, [], columns, rows);
    if (phase >= maxPhase) {
      clearInterval(timer);
      renderReels(finalSymbols, winningCells, columns, rows);
      onDone();
    }
  }, cycleInterval);
}

// ── Spin result ─────────────────────────────────────

export function showResult(winAmount: number, winType: string | null, paylineName: string | null): void {
  if (winAmount <= 0) {
    resultEl.textContent = 'No luck! Try again 💪';
    resultEl.className = 'spin-result lose';
    return;
  }
  const paylineStr = paylineName ? ` (${paylineName})` : '';
  resultEl.textContent = `${winType}${paylineStr}`;
  resultEl.className = 'spin-result win';
}

// ── Leaderboard ─────────────────────────────────────

export function renderLeaderboard(players: Player[]): void {
  if (players.length === 0) {
    leaderboardEl.innerHTML = '<p class="empty-state">No other players yet…</p>';
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
  if (text) { onChatSend?.(text); chatInput.value = ''; }
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') chatSendBtn.click();
});

function escHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
