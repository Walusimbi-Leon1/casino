#!/usr/bin/env bash
# setup-bot.sh — Configure the Telegram bot webhook and commands
#
# Usage:
#   ./setup-bot.sh <BOT_TOKEN> <WEBHOOK_URL>
#
# Example:
#   ./setup-bot.sh 8941696472:AAGtUQSlrW8m26TCuXlJQJnf9O3PchyOBHs https://casino-8ia.pages.dev/api/webhook

set -e

TOKEN="$1"
WEBHOOK="$2"

if [ -z "$TOKEN" ] || [ -z "$WEBHOOK" ]; then
  echo "Usage: $0 <BOT_TOKEN> <WEBHOOK_URL>"
  echo ""
  echo "Example:"
  echo "  $0 8941696472:xxxxx https://casino-8ia.pages.dev/api/webhook"
  exit 1
fi

echo "🔧 Setting webhook to: $WEBHOOK"
curl -s -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$WEBHOOK\"}" | python3 -m json.tool

echo ""
echo "🔧 Setting bot commands..."
curl -s -X POST "https://api.telegram.org/bot${TOKEN}/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {"command": "start", "description": "🎰 Open Casino Night"}
    ]
  }' | python3 -m json.tool

echo ""
echo "🔧 Checking webhook info..."
curl -s "https://api.telegram.org/bot${TOKEN}/getWebhookInfo" | python3 -m json.tool

echo ""
echo "✅ Bot setup complete!"
echo ""
echo "Now set these env vars in your Cloudflare Pages dashboard:"
echo "  TELEGRAM_BOT_TOKEN  = $TOKEN"
echo "  FIREBASE_DATABASE_URL = https://studio-1398542564-e4c36-default-rtdb.firebaseio.com"
echo "  TG_MINI_APP_URL     = https://casino-8ia.pages.dev"
echo ""
echo "Also update the firebase.ts config if it doesn't match the above."
