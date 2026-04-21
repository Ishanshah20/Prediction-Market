#!/usr/bin/env bash
# ============================================================
# create_market.sh - Create a new prediction market via factory
# Usage: ./scripts/create_market.sh "Your question?" <deadline_unix_timestamp>
# ============================================================

set -euo pipefail

source .env.contracts 2>/dev/null || { echo "Run deploy.sh first"; exit 1; }

QUESTION="${1:-Will Stellar reach 1 billion accounts by 2026?}"
DEADLINE="${2:-$(($(date +%s) + 86400))}"
SOURCE_ACCOUNT="${STELLAR_SOURCE_ACCOUNT:-alice}"

echo "📊 Creating market: $QUESTION"
echo "   Deadline: $(date -d @$DEADLINE 2>/dev/null || date -r $DEADLINE)"

MARKET_ADDRESS=$(stellar contract invoke \
  --id "$VITE_FACTORY_CONTRACT_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network "$VITE_NETWORK" \
  -- create_market \
  --creator "$(stellar keys address $SOURCE_ACCOUNT)" \
  --question "$QUESTION" \
  --deadline "$DEADLINE")

echo "✅ Market created: $MARKET_ADDRESS"
