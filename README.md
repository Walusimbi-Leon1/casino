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

1. Connect your Git repo (`Walusimbi-Leon1/casino`) in Cloudflare Dashboard
2. Use these build settings:

| Setting | Value |
|---|---|
| Framework preset | **None** |
| Build command | `npm run build` |
| Build output directory | `dist/` |
| Root directory | *(leave blank)* |
| **Deploy command** | **(leave empty — do not set this)** |

> ⚠️ Do NOT set a deploy command. Cloudflare Pages auto-deploys from the build output. 
> A deploy command (like `npx wrangler deploy`) is for Workers, not Pages.

3. Go to **Settings** → **Environment variables** and add:

| Variable | Value |
|---|---|
| `DISCORD_CLIENT_ID` | `1519713772770562149` |
| `DISCORD_CLIENT_SECRET` | *(your generated secret)* |
| `DISCORD_REDIRECT_URI` | Your Pages URL, same as OAuth redirect |

4. **Deploy** — Pages will:
   - Run `npm run build`
   - Serve the `dist/` folder as static content
   - Auto-detect `functions/` and serve the API endpoint

### Local preview with Wrangler

```bash
npm run preview   # builds + starts local wrangler dev server at http://localhost:8788
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
│   ├── telegram.ts         # Telegram Mini App SDK integration
│   ├── bot.ts              # Telegram bot API helpers (Stars invoices)
│   ├── firebase.ts         # Firebase RTDB helpers
│   ├── game.ts             # Slot machine logic
│   ├── chat.ts             # In-memory chat state
│   ├── ui.ts               # DOM manipulation & events
│   └── style.css           # All styles
├── functions/
│   └── api/
│       ├── exchange.js     # Discord OAuth token exchange
│       ├── create-invoice.js # Telegram Stars invoice creator
│       └── webhook.js      # Telegram bot webhook (/start, payments)
├── setup-bot.sh            # Bot webhook configuration script
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Platform Support

The game runs on **three platforms** automatically:

| Platform | Auth | Payment |
|----------|------|---------|
| 🎮 **Telegram** | `Telegram.WebApp.initDataUnsafe.user` | Telegram Stars ⭐ |
| 🔷 **Discord** | Discord OAuth2 via SDK | (coming soon) |
| 🌐 **Browser** | Enter a name | None |

It detects the environment at startup and adapts accordingly.

---

## Telegram Mini App Setup

### 1. BotFather

1. Open [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/mybots` → select your bot → **Bot Settings** → **Menu Button** → Set the Mini App URL to your Cloudflare Pages URL (e.g. `https://casino-8ia.pages.dev`)
3. Also set: **Bot Settings** → **Payments** → Enable Telegram Stars

### 2. Cloudflare Environment Variables

Add these to your Cloudflare Pages dashboard:

| Variable | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | `8941696472:xxxxx` |
| `FIREBASE_DATABASE_URL` | `https://studio-1398542564-e4c36-default-rtdb.firebaseio.com` |
| `TG_MINI_APP_URL` | `https://casino-8ia.pages.dev` |

### 3. Configure Webhook

Run the setup script (from your local machine):

```bash
chmod +x setup-bot.sh
./setup-bot.sh 8941696472:xxxxx https://casino-8ia.pages.dev/api/webhook
```

Or manually:

```bash
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://casino-8ia.pages.dev/api/webhook"}'
```

### 4. Try It

Open your bot on Telegram → Send `/start` → Tap "Play Casino Night" → Spin the slots!

### How Stars Work

1. Tap ⭐ **Buy Credits** in the game
2. Choose a package (5⭐ → 1,000cr, 25⭐ → 6,000cr, etc.)
3. Telegram shows the payment confirmation
4. You pay with Stars from your Telegram wallet
5. Credits are added to your account automatically

Stars are Telegram's built-in currency — no Stripe, no fiat. Players buy Stars from Telegram and spend them in your bot. You can cash out Stars via Fragment.com.

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
