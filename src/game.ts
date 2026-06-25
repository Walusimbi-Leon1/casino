import type { MachineConfig, SymbolConfig, SpinResult, Payline } from './types';

// ── Symbol Definitions ──────────────────────────────

const CLASSIC_SYMBOLS: SymbolConfig[] = [
  { emoji: '🍒', name: 'Cherry',  weight: 30, payouts: { 2: 2,  3: 5,  4: 20  } },
  { emoji: '🍋', name: 'Lemon',   weight: 20, payouts: { 2: 1,  3: 8,  4: 30  } },
  { emoji: '🍊', name: 'Orange',  weight: 15, payouts: { 3: 12, 4: 40  } },
  { emoji: '🍇', name: 'Grape',   weight: 15, payouts: { 3: 16, 4: 50  } },
  { emoji: '🔔', name: 'Bell',    weight: 10, payouts: { 3: 25, 4: 80  } },
  { emoji: '💎', name: 'Diamond', weight: 7,  payouts: { 3: 50, 4: 150 } },
  { emoji: '7️⃣', name: 'Seven',   weight: 3,  payouts: { 3: 100, 4: 300 } },
];

const JACKPOT_SYMBOLS: SymbolConfig[] = [
  { emoji: '🍒', name: 'Cherry',  weight: 25, payouts: { 2: 2,  3: 4,  4: 15,  5: 50   } },
  { emoji: '🍋', name: 'Lemon',   weight: 20, payouts: { 2: 1,  3: 6,  4: 25,  5: 80   } },
  { emoji: '🍊', name: 'Orange',  weight: 15, payouts: { 3: 10, 4: 35,  5: 120  } },
  { emoji: '🍇', name: 'Grape',   weight: 12, payouts: { 3: 14, 4: 45,  5: 160  } },
  { emoji: '🔔', name: 'Bell',    weight: 10, payouts: { 3: 20, 4: 65,  5: 200  } },
  { emoji: '💎', name: 'Diamond', weight: 5,  payouts: { 3: 40, 4: 120, 5: 400  } },
  { emoji: '7️⃣', name: 'Seven',   weight: 2,  payouts: { 3: 80, 4: 250, 5: 1000 } },
  { emoji: '⭐', name: 'Star',    weight: 1,  payouts: { 3: 200, 4: 500, 5: 2500 } },
];

const LUCKY_SYMBOLS: SymbolConfig[] = [
  { emoji: '🍒', name: 'Cherry',  weight: 22, payouts: { 2: 3,  3: 8,  4: 25  } },
  { emoji: '🍋', name: 'Lemon',   weight: 18, payouts: { 2: 1,  3: 10, 4: 35  } },
  { emoji: '🍊', name: 'Orange',  weight: 14, payouts: { 3: 14, 4: 45  } },
  { emoji: '🍇', name: 'Grape',   weight: 12, payouts: { 3: 18, 4: 55  } },
  { emoji: '🔔', name: 'Bell',    weight: 10, payouts: { 3: 28, 4: 90  } },
  { emoji: '💎', name: 'Diamond', weight: 6,  payouts: { 3: 60, 4: 180 } },
  { emoji: '7️⃣', name: 'Seven',   weight: 3,  payouts: { 3: 120, 4: 350 } },
  { emoji: '🍀', name: 'Clover',  weight: 15, payouts: { 2: 2,  3: 6,  4: 20  } },
];

// ── Paylines ────────────────────────────────────────

const CENTRE_PAYLINE: Payline[] = [
  { name: 'Centre', cells: [1, 1, 1] },
];

const FIVE_COL_PAYLINES: Payline[] = [
  { name: 'Centre', cells: [1, 1, 1, 1, 1] },
  { name: 'Top',    cells: [0, 0, 0, 0, 0] },
  { name: 'Bottom', cells: [2, 2, 2, 2, 2] },
];

const FOUR_COL_PAYLINES: Payline[] = [
  { name: 'Centre', cells: [1, 1, 1, 1] },
  { name: 'Top',    cells: [0, 0, 0, 0] },
  { name: 'Bottom', cells: [2, 2, 2, 2] },
];

function buildPaylines(cols: number, rows: number): Payline[] {
  // For 5 cols: 3 paylines (top, centre, bottom)
  if (cols === 5) return FIVE_COL_PAYLINES;
  // For 4 cols: 3 paylines
  if (cols === 4) {
    return FOUR_COL_PAYLINES;
  }
  // For 3 cols: 1 payline (centre)
  return CENTRE_PAYLINE;
}

// ── Machine Configs ─────────────────────────────────

export const MACHINES: MachineConfig[] = [
  {
    id: 'classic',
    name: '🎰 Classic',
    description: '3 reels — old-school Vegas vibe',
    columns: 3,
    rows: 3,
    paylines: buildPaylines(3, 3),
    symbols: CLASSIC_SYMBOLS,
    defaultBet: 10,
    minBet: 5,
    maxBet: 50,
  },
  {
    id: 'lucky',
    name: '🍀 Lucky 4',
    description: '4 reels with Lucky Clover wilds — more ways to win',
    columns: 4,
    rows: 3,
    paylines: buildPaylines(4, 3),
    symbols: LUCKY_SYMBOLS,
    defaultBet: 15,
    minBet: 5,
    maxBet: 100,
  },
  {
    id: 'jackpot',
    name: '⭐ Jackpot 5',
    description: '5 reels, 3 paylines, Star jackpot — BIG risk, BIG reward',
    columns: 5,
    rows: 3,
    paylines: buildPaylines(5, 3),
    symbols: JACKPOT_SYMBOLS,
    defaultBet: 25,
    minBet: 10,
    maxBet: 200,
  },
];

// ── Core Engine ─────────────────────────────────────

function pickRandom(symbols: SymbolConfig[]): string {
  const total = symbols.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const sym of symbols) {
    r -= sym.weight;
    if (r <= 0) return sym.emoji;
  }
  return symbols[0].emoji;
}

function makeColumn(symbols: SymbolConfig[], rows: number): string[] {
  const col: string[] = [];
  for (let r = 0; r < rows; r++) col.push(pickRandom(symbols));
  return col;
}

/** Evaluate a single payline across the grid */
function evaluatePayline(
  grid: string[][],
  payline: Payline,
  symbols: SymbolConfig[]
): { count: number; emoji: string } | null {
  const first = grid[0][payline.cells[0]];
  let count = 1;
  for (let c = 1; c < grid.length; c++) {
    if (grid[c][payline.cells[c]] === first) {
      count++;
    } else {
      break;
    }
  }
  if (count < 2) return null;
  // Check the symbol has a payout for this count
  const sym = symbols.find((s) => s.emoji === first);
  if (!sym || !sym.payouts[count]) return null;
  return { count, emoji: first };
}

/**
 * Spin the reels.
 * @returns spin result with the BEST winning payline (or no win)
 */
export function spin(machine: MachineConfig): SpinResult {
  const { columns, rows, symbols, paylines } = machine;

  // Create the grid
  const grid: string[][] = [];
  for (let c = 0; c < columns; c++) {
    grid.push(makeColumn(symbols, rows));
  }

  // Evaluate each payline, track the best
  let bestWin = 0;
  let bestType: string | null = null;
  let bestPaylineName: string | null = null;
  let bestCells: string[] = [];

  for (const pl of paylines) {
    const result = evaluatePayline(grid, pl, symbols);
    if (!result) continue;

    const sym = symbols.find((s) => s.emoji === result.emoji)!;
    const multiplier = sym.payouts[result.count];
    if (multiplier > bestWin) {
      bestWin = multiplier;
      bestPaylineName = pl.name;
      bestType = `${result.count}× ${sym.name} — ${multiplier}× multiplier!`;

      // Build winning cell list
      bestCells = [];
      for (let c = 0; c < grid.length; c++) {
        const r = pl.cells[c];
        // Only mark cells up to the matching streak
        if (c < result.count) {
          bestCells.push(`${c}-${r}`);
        }
      }
    }
  }

  if (bestWin === 0) {
    return {
      symbols: grid,
      winAmount: 0,
      winType: null,
      winningCells: [],
      paylineName: null,
    };
  }

  return {
    symbols: grid,
    winAmount: bestWin,
    winType: bestType,
    winningCells: bestCells,
    paylineName: bestPaylineName,
  };
}

export const STARTING_BALANCE = 1000;
