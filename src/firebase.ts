import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  update,
  onValue,
  remove,
  query,
  limitToLast,
  orderByChild,
  off,
  DataSnapshot,
} from 'firebase/database';
import type { Unsubscribe } from 'firebase/database';
import type { Player, ChatMessage, UserInfo } from './types';

// Firebase config — fill in your real values
const firebaseConfig = {
  apiKey: 'AIzaSyANbQWB1aYAdxj6KG4lUmqwFL1VYHqSzZA',
  authDomain: 'studio-1398542564-e4c36.firebaseapp.com',
  projectId: 'studio-1398542564-e4c36',
  storageBucket: 'studio-1398542564-e4c36.firebasestorage.app',
  messagingSenderId: '734512367488',
  appId: '1:734512367488:web:1d6f973bf9aa7698b26365',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// All casino data lives under this prefix (matches the projectId isolation pattern)
const PREFIX = 'casino';

// ── Player Helpers ──────────────────────────────────

export async function registerPlayer(user: UserInfo): Promise<void> {
  const playerRef = ref(db, `${PREFIX}/players/${user.id}`);
  const snap = await get(playerRef);

  if (!snap.exists()) {
    // New player — create with starting balance
    await set(playerRef, {
      id: user.id,
      name: user.name,
      balance: 1000,
      lastActive: Date.now(),
      totalSpins: 0,
      totalWon: 0,
    });
  } else {
    // Existing player — just update lastActive
    await update(playerRef, { lastActive: Date.now() });
  }
}

export async function heartbeat(userId: string): Promise<void> {
  await update(ref(db, `${PREFIX}/players/${userId}`), {
    lastActive: Date.now(),
  });
}

/**
 * Add credits to a player's balance (used by Stars purchases).
 */
export async function addCredits(userId: string, amount: number): Promise<number> {
  const playerRef = ref(db, `${PREFIX}/players/${userId}`);
  const snap = await get(playerRef);
  const current = snap.val() as Player;
  const newBalance = (current?.balance ?? 1000) + amount;
  await update(playerRef, {
    balance: newBalance,
    lastActive: Date.now(),
  });
  return newBalance;
}

export async function updateBalance(userId: string, delta: number): Promise<number> {
  const playerRef = ref(db, `${PREFIX}/players/${userId}`);
  const snap = await get(playerRef);
  const current = snap.val() as Player;
  const newBalance = (current?.balance ?? 1000) + delta;
  await update(playerRef, {
    balance: Math.max(0, newBalance),
    totalSpins: (current?.totalSpins ?? 0) + 1,
    totalWon: (current?.totalWon ?? 0) + Math.max(0, delta),
    lastActive: Date.now(),
  });
  return Math.max(0, newBalance);
}

export function listenPlayers(callback: (players: Player[]) => void): Unsubscribe {
  const playersRef = ref(db, `${PREFIX}/players`);
  const listener = onValue(playersRef, (snap: DataSnapshot) => {
    const players: Player[] = [];
    snap.forEach((child) => {
      players.push(child.val() as Player);
    });
    // Filter out stale players (no activity in 30s) and sort by balance desc
    const now = Date.now();
    const active = players
      .filter((p) => now - p.lastActive < 30000)
      .sort((a, b) => b.balance - a.balance);
    callback(active);
  });
  return listener;
}

// ── Chat Helpers ────────────────────────────────────

export async function sendMessage(userId: string, name: string, text: string): Promise<void> {
  const chatRef = ref(db, `${PREFIX}/chat`);
  await push(chatRef, {
    userId,
    name,
    text: text.slice(0, 200),
    timestamp: Date.now(),
  });
}

export function listenChat(callback: (messages: ChatMessage[]) => void): Unsubscribe {
  const chatQuery = query(
    ref(db, `${PREFIX}/chat`),
    orderByChild('timestamp'),
    limitToLast(50)
  );
  const listener = onValue(chatQuery, (snap: DataSnapshot) => {
    const messages: ChatMessage[] = [];
    snap.forEach((child) => {
      messages.push({ id: child.key!, ...child.val() } as ChatMessage);
    });
    callback(messages);
  });
  return listener;
}

// ── Cleanup ─────────────────────────────────────────

export function cleanup(userId: string): void {
  // Remove presence on disconnect
  const playerRef = ref(db, `${PREFIX}/players/${userId}`);
  remove(playerRef);
}

export { off };
