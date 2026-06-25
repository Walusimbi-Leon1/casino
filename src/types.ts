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

/** Symbol configuration for the slot machine */
export interface SymbolConfig {
  emoji: string;
  name: string;
  weight: number;
  payout3: number;  // multiplier for 3 matching
  payout2: number;  // multiplier for 2 matching
}

/** Result of a spin */
export interface SpinResult {
  symbols: string[][];  // 3 columns × 3 rows
  winAmount: number;    // multiplier of bet
  winType: string | null;
  winIndices: number[]; // column indices that matched (0,1,2)
}

/** Discord auth info */
export interface UserInfo {
  id: string;
  name: string;
}

/** Which screen to show */
export type Screen = 'splash' | 'game';
