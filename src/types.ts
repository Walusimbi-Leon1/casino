/** A player in the casino */
export interface Player {
  id: string;
  name: string;
  balance: number;
  lastActive: number;
  totalSpins: number;
  totalWon: number;
}

/** A chat message */
export interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  text: string;
  timestamp: number;
}

/** A payline — rows indices (0=top, 1=centre, 2=bottom) to check per column */
export interface Payline {
  name: string;
  cells: number[]; // row index per column, length = columns
}

/** Symbol configuration for the slot machine */
export interface SymbolConfig {
  emoji: string;
  name: string;
  weight: number;
  /** Multiplier keyed by match-count: { 2: 1, 3: 5, 4: 20, 5: 100 } */
  payouts: Record<number, number>;
}

/** A slot machine variant */
export interface MachineConfig {
  id: string;
  name: string;
  description: string;
  columns: number;
  rows: number;
  paylines: Payline[];
  symbols: SymbolConfig[];
  defaultBet: number;
  minBet: number;
  maxBet: number;
}

/** Result of a spin — one payline win at most (highest) */
export interface SpinResult {
  symbols: string[][];     // [col][row]  (columns × rows)
  winAmount: number;       // multiplier of bet
  winType: string | null;  // human-readable description
  winningCells: string[];  // CSS classes: "col-row" e.g. "0-1", "1-1"
  paylineName: string | null;
}

/** Discord auth info */
export interface UserInfo {
  id: string;
  name: string;
}
