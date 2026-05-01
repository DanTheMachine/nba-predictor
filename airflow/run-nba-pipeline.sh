#!/bin/bash
# Daily NBA pipeline runner — called by launchd each morning.
# Fetches today's slate, generates predictions, ingests yesterday's results.

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
LOG_DIR="$REPO_DIR/airflow/logs/pipeline"
LOG_FILE="$LOG_DIR/nba-$(date +%Y-%m-%d).log"
DATE="$(date +%Y-%m-%d)"

mkdir -p "$LOG_DIR"

exec >> "$LOG_FILE" 2>&1
echo "===== NBA Pipeline starting at $(date) ====="

cd "$REPO_DIR"

if [ "${USE_ODDS_OVERRIDES:-false}" = "true" ]; then
  echo "Capturing odds from BetLotus for $DATE..."
  npm run cli -- nba:capture-odds-overrides --date "$DATE"

  echo "Approving captured odds overrides for $DATE..."
  npm run cli -- nba:approve-odds-overrides --date "$DATE" --source betlotus-nba

  echo "Running NBA daily pipeline with odds overrides for $DATE..."
  npm run cli -- nba:run-daily-pipeline --date "$DATE" --use-odds-overrides --override-source betlotus-nba
else
  echo "Running NBA daily pipeline for $DATE..."
  npm run cli -- nba:run-daily-pipeline --date "$DATE"
fi

echo "===== NBA Pipeline completed at $(date) ====="
