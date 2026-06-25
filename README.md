# Casino Night 🎰

A slot-machine Discord Activity that also runs in a plain browser.
Built with TypeScript + Vite + Firebase Realtime Database.

## Features

- **🎰 Slot Machine** — 3 reels × 3 rows, centre-row payline, weighted symbol odds
- **💰 Balance Tracking** — Start with 1000 credits, win/loss persisted to Firebase
- **🏆 Live Leaderboard** — See other players and their balances in real time
- **💬 Live Chat** — Chat with everyone currently playing
- **🔐 Discord Auth** — OAuth2 via Discord (in Discord Activity mode)
- **🌐 Browser Fallback** — Enter a name and play immediately

## Prerequisites

1. **Firebase Realtime Database** — Enable RTDB in your Firebase console
2. **Discord Application** — Create one at https://discord.com/developers/applications
3. **Cloudflare Pages** — For hosting

## Setup

### 1. Firebase

1. Place your full Firebase config in `src/firebase.ts` (the `firebaseConfig` object)
2. Enable **Realtime Database** in Firebase Console (not Firestore)
3. Set RTDB rules to allow reads/writes:

```json
{
  "rules": {
    "casino": {
      ".read": true,
      ".write": true,
      "players": {
        ".indexOn": "lastActive"
      },
      "chat": {
        ".indexOn": "timestamp"
      }
    }
  }
}
```

### 2. Discord Application

1. Create a new application in the Discord Developer Portal
2. Go to **OAuth2** → **Redirects**
3. Add your Cloudflare Pages URL (e.g. `https://casino.pages.dev/`)
4. **Client ID**: `1519713772770562149`
5. Generate a **Client Secret** and save it

### 3. Cloudflare Pages

**Option A — Git integration (recommended):**

1. Connect your Git repo (`Walusimbi-Leon1/casino`) in Cloudflare Dashboard
2. Use these build settings:

| Setting | Value |
|---|---|
| Framework preset | **None** |
| Build command | `npm run build` |
| Build output directory | `dist/` |
| Root directory | *(leave blank)* |

3. Go to **Settings** → **Environment variables** and add:

| Variable | Value |
|---|---|
| `DISCORD_CLIENT_ID` | `1519713772770562149` |
| `DISCORD_CLIENT_SECRET` | *(your generated secret)* |
| `DISCORD_REDIRECT_URI` | Your Pages URL, same as OAuth redirect |

4. Deploy — Pages will automatically detect `functions/` and serve the API endpoint

**Option B — Wrangler CLI:**

```bash
npm run preview   # builds + starts local wrangler dev server
npx wrangler deploy   # deploy to Cloudflare
```

Set environment variables via:
```bash
npx wrangler secret put DISCORD_CLIENT_ID
npx wrangler secret put DISCORD_CLIENT_SECRET
npx wrangler secret put DISCORD_REDIRECT_URI
```

### 4. Discord Activity URL

In the Discord Developer Portal under your application:

- Go to **SKU** → **Activity** → set **Activity URL** to your Pages URL
- Users can launch it from Discord's Activity Launcher

## Development

```bash
npm install
npm run dev     # Vite dev server on port 3000
npm run build   # Production build → dist/
```

## Architecture

```
casino/
├── index.html              # Entry HTML
├── src/
│   ├── main.ts             # Bootstrap & orchestration
│   ├── types.ts            # TypeScript interfaces
│   ├── discord.ts          # Discord SDK integration
│   ├── firebase.ts         # Firebase RTDB helpers
│   ├── game.ts             # Slot machine logic
│   ├── chat.ts             # In-memory chat state
│   ├── ui.ts               # DOM manipulation & events
│   └── style.css           # All styles
├── functions/
│   └── api/
│       └── exchange.js     # Cloudflare Pages Function (OAuth)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Slot Machine Specs

- **7 symbols** — 🍒 🍋 🍊 🍇 🔔 💎 7️⃣
- **3 matching** — ×5 to ×100 bet multiplier (rarer = higher)
- **2 matching** — only cherries return a small win (×2)
- **Default bet** — 10 credits
- **Starting balance** — 1000 credits

## Firebase Data Structure

```
{project}/
  casino/
    players/{userId}/
      name, balance, lastActive, totalSpins, totalWon
    chat/{messageId}/
      userId, name, text, timestamp
```
