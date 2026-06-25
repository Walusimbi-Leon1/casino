import type { SymbolConfig, SpinResult } from './types';

// ── Symbol Definitions ──────────────────────────────

export const SYMBOLS: SymbolConfig[] = [
  { emoji: '🍒', name: 'Cherry',  weight: 30, payout3: 5,   payout2: 2 },
  { emoji: '🍋', name: 'Lemon',   weight: 20, payout3: 8,   payout2: 1 },
  { emoji: '🍊', name: 'Orange',  weight: 15, payout3: 12,  payout2: 1 },
  { emoji: '🍇', name: 'Grape',   weight: 15, payout3: 16,  payout2: 0 },
  { emoji: '🔔', name: 'Bell',    weight: 10, payout3: 25,  payout2: 0 },
  { emoji: '💎', name: 'Diamond', weight: 7,  payout3: 50,  payout2: 0 },
  { emoji: '7️⃣', name: 'Seven',   weight: 3,  payout3: 100, payout2: 0 },
];

export const STARTING_BALANCE = 1000;
export const DEFAULT_BET = 10;

// ── Core Logic ──────────────────────────────────────

function weightedRandom(): string {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym.emoji;
  }
  return SYMBOLS[0].emoji;
}

function makeColumn(): string[] {
  return [weightedRandom(), weightedRandom(), weightedRandom()];
}

/**
 * Spin the reels and return a 3×3 grid plus win info.
 * Winning is based on the centre row (index 1 of each column).
 */
export function spin(): SpinResult {
  const symbols: string[][] = [makeColumn(), makeColumn(), makeColumn()];
  const centre = [symbols[0][1], symbols[1][1], symbols[2][1]];

  let winAmount = 0;
  let winType: string | null = null;
  const winIndices: number[] = [];

  // Check 3-of-a-kind
  if (centre[0] === centre[1] && centre[1] === centre[2]) {
    const sym = SYMBOLS.find((s) => s.emoji === centre[0])!;
    winAmount = sym.payout3;
    winType = `Three ${sym.name}s! ×${sym.payout3}`;
    winIndices.push(0, 1, 2);
  } else {
    // Check pairs
    const counts = new Map<string, number[]>();
    centre.forEach((emoji, idx) => {
      const arr = counts.get(emoji) || [];
      arr.push(idx);
      counts.set(emoji, arr);
    });

    for (const [emoji, indices] of counts) {
      if (indices.length >= 2) {
        const sym = SYMBOLS.find((s) => s.emoji === emoji)!;
        if (sym.payout2 > 0) {
          winAmount = sym.payout2;
          winType = `Two ${sym.name}s! ×${sym.payout2}`;
          winIndices.push(...indices);
        }
        break;
      }
    }
  }

  // No win
  if (winAmount === 0) {
    winType = 'No luck! Try again 💪';
  }

  return { symbols, winAmount, winType, winIndices };
}

/** Get the centre-row emojis from a 3×3 grid */
export function getCentreRow(symbols: string[][]): string[] {
  return [symbols[0][1], symbols[1][1], symbols[2][1]];
}
