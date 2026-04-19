# Fast Break Predictor

NBA game prediction and betting analysis tool. Runs Monte Carlo simulations against live team stats and sportsbook lines to produce model-vs-market edges across moneyline, spread, and over/under markets.

## Stack

- React 19 + TypeScript + Vite
- Express proxy server (ESPN API, odds, results)
- Vitest (unit/component tests) + Playwright (e2e)

## Quick Start

```bash
# Terminal 1 — proxy server
npm run proxy

# Terminal 2 — dev app
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) (Vite may choose a different port — check terminal output).

See [RUNNING_THE_NBA_MODEL.md](RUNNING_THE_NBA_MODEL.md) for the full daily workflow.

## Daily Workflow

1. **FETCH ESPN** — load team colors
2. **IMPORT STATS** — paste Basketball Reference advanced stats
3. **LOAD GAMES** — pull today's slate with odds, injuries, starters, form
4. Paste/edit lines if needed (`BULK EDIT LINES` or per-game `EDIT ODDS`)
5. **RUN ALL SIMS** — run 100k simulations per matchup
6. **PREDICTIONS CSV** — export predictions
7. Next day: **RESULTS CSV** → import both into the Results or Model Eval tab

## Commands

```bash
npm run dev          # start Vite dev server
npm run proxy        # start Express proxy
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm run test         # Vitest (unit + component)
npm run test:watch   # Vitest watch mode
npm run test:e2e     # Playwright e2e
```

## Project Structure

```
src/
  NBAModel.tsx              # main coordinator component
  components/
    ScheduleAnalysis.tsx    # today's games, bulk import, export
    SingleGameControls.tsx  # single-game matchup setup
    SingleGameResults.tsx   # single-game prediction output
    BBRefImportPanel.tsx    # Basketball Reference stats import
    ModelEvaluation.tsx     # post-bet grading and ROI
    ResultsTracker.tsx      # in-app results log
  hooks/
    usePredictorState.ts    # single-game sim state
    useResultsTracker.ts    # results grading state
  lib/
    nbaModel.ts             # core simulation and team data
    betting.ts              # edge, Kelly, moneyline math
    espn.ts                 # ESPN API helpers
    compositeRecommendation.ts
proxy.ts                    # local Express proxy server
```
