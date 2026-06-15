# NBA Predictor – Claude Code Guide

## Project Overview

React/TypeScript/Vite frontend with an Express proxy. Predicts NBA game outcomes and generates betting recommendations for moneyline, spread, and totals markets.

A server automation layer (Node/TypeScript) handles daily pipeline runs, DB persistence, CSV export, and odds override capture — all backed by a shared PostgreSQL database (same instance as the MLB predictor).

## Commands

```bash
npm run dev          # start Vite dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit (both tsconfig.json and tsconfig.node.json)
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright end-to-end tests
npm run proxy        # start Express proxy server (port 3002)
npm run cli          # run automation CLI commands (see CLI section below)
npm run api          # start automation API server (port 8789)
```

Always run `npm run typecheck` and `npm run test` before committing model or betting logic changes.

## Key Source Files

| File | Purpose |
|------|---------|
| `src/lib/nbaModel.ts` | Core prediction engine — team stats, `predictGame()`, playoff factors |
| `src/lib/betting.ts` | Edge calculation, recommendation thresholds, Kelly sizing |
| `src/lib/compositeRecommendation.ts` | Heuristic tier/score ranking across the daily slate |
| `src/lib/modelEvaluation.ts` | Post-bet grading and ROI evaluation |
| `src/lib/bulkOddsParser.ts` | Bulk sportsbook text → normalized odds |
| `src/lib/vsinSharpParser.ts` | VSiN sharp-data paste adapter |
| `src/lib/espn.ts` | ESPN schedule, odds, injuries, projected starters |
| `src/hooks/usePredictorState.ts` | Single-game predictor state |
| `src/hooks/useResultsTracker.ts` | Results tracking state |
| `src/components/ScheduleAnalysis.tsx` | Main daily-slate UX surface |

### Server Automation Layer

| File | Purpose |
|------|---------|
| `server/config.ts` | All env-var config (`appConfig`), `assertDateInput`, `isDbConfigured` |
| `server/db/client.ts` | Prisma singleton (`getPrismaClient`) |
| `server/db/repositories.ts` | All DB read/write functions |
| `server/services/nba/nbaAutomation.ts` | ESPN fetch, `generateNbaPredictions()`, `runNbaDailyPipeline()`, evaluation |
| `server/services/nba/nbaCsv.ts` | CSV builders for predictions and results |
| `server/services/nba/nbaOddsOverrides.ts` | Import, list, approve, reject odds overrides |
| `server/services/nba/nbaOddsCapture.ts` | Playwright browser scraper for BetLotus NBA odds |
| `cli.ts` | CLI entry point (`npm run cli -- <command>`) |
| `api.ts` | Express REST API on port 8789 |

## Model Constants (nbaModel.ts)

| Constant | Value | Notes |
|----------|-------|-------|
| `LEAGUE_AVG_RTG` | 115.3 | Reference rating for context |
| `LEAGUE_AVG_PACE` | 99.0 | Reference pace |
| `HOME_COURT_EDGE` | 2.3 pts | Additive margin adjustment |
| `BACK_TO_BACK_EDGE` | 1.4 pts | Applied per fatigued team |
| `PLAYOFF_PACE_FACTOR` | 0.966 | Pace multiplier for all playoff rounds |
| `PLAYOFF_SCORING_FACTOR` | 0.951 | Rating multiplier for all playoff rounds |
| `MARGIN_STD_DEV` | 12.0 | Used in win-probability logistic curve |

## Recommendation Thresholds (betting.ts)

| Market | Threshold |
|--------|-----------|
| Moneyline | edge > 4.0% |
| Spread | cover edge > 6.5% |
| Total | projected total differs from line by > 3.0 pts |

## Playoff Adjustments

Playoff games apply two separate multipliers to reduce the structural over-prediction seen vs Vegas lines:
- **Pace**: `PLAYOFF_PACE_FACTOR = 0.966` — slower possessions
- **Scoring efficiency**: `PLAYOFF_SCORING_FACTOR = 0.951` — applied to both teams' expected ratings after matchup blending

Combined effect: ~8.1% below equivalent regular-season projections (0.966 × 0.951 = 0.919). Recalibrated after the full 2025-26 playoff season: model totals were running ~12 pts above Vegas lines throughout the playoffs, causing systematic OVER recommendations that lost. A 229-pt regular-season projection now comes out to ~211, closer to where Vegas set playoff lines. A single flat factor is used for all playoff rounds; per-round escalation was considered but is not empirically supported — later rounds don't reliably score lower than earlier ones because better offenses also survive.

If totals bias reappears in later rounds, adjust `PLAYOFF_SCORING_FACTOR` in `nbaModel.ts`.

## CLI Commands

Run via `npm run cli -- <command> [flags]`:

```
nba:load-slate                --date YYYY-MM-DD
nba:run-predictions           --date YYYY-MM-DD [--use-odds-overrides] [--override-source LABEL]
nba:run-daily-pipeline        --date YYYY-MM-DD [--use-odds-overrides] [--override-source LABEL]
nba:export-predictions-csv    --date YYYY-MM-DD [--runId RUN_ID]
nba:ingest-results            --date YYYY-MM-DD
nba:export-results-csv        --date YYYY-MM-DD
nba:evaluate                  --from YYYY-MM-DD --to YYYY-MM-DD
nba:list-runs
nba:capture-odds-overrides    --date YYYY-MM-DD [--source LABEL]
nba:import-odds-overrides     --date YYYY-MM-DD --file PATH [--source LABEL]
nba:list-odds-overrides       --date YYYY-MM-DD
nba:approve-odds-overrides    --date YYYY-MM-DD [--source LABEL] [--lookupKeys KEY1,KEY2]
nba:reject-odds-overrides     --date YYYY-MM-DD [--source LABEL] [--lookupKeys KEY1,KEY2]
```

## Odds Override System

The two-step flow for using sportsbook odds instead of ESPN lines:

1. **Capture** — `nba:capture-odds-overrides` launches a headless Playwright browser, logs into BetLotus, navigates to the NBA odds page, scrapes raw text, parses it via `parseBulkOdds`, and stores all records as `staged`.
2. **Approve** — `nba:approve-odds-overrides` promotes `staged` → `approved` for a given date/source.
3. **Run predictions** — `nba:run-predictions --use-odds-overrides` reads approved overrides for the date and substitutes them for ESPN odds. Games with neither ESPN odds nor an approved override are skipped.

Override records are stored in the shared `OddsOverride` table with `sport = 'NBA'` (Prisma model: `mlbOddsOverride`). Source label defaults to `betlotus-nba`.

Lookup key format: `YYYYMMDD + homeTeamAbbr + awayTeamAbbr` (e.g. `20260430BOSLAL`).

Browser capture is fully config-driven via `ODDS_CAPTURE_*` env vars (see `.env.example`).

## Database

- Shared PostgreSQL instance with the MLB predictor (`mlb_predictor` DB)
- NBA predictor generates its own Prisma client (`prisma/schema.prisma`) but **never runs migrations** — the MLB predictor is the schema authority (`prisma db push` runs there)
- NBA-specific tables: `NbaTeamStatSnapshot`, `NbaSlateGame`, `NbaMarketOddsSnapshot`, `NbaPrediction`, `NbaGameResult`
- Shared tables filtered by `sport = 'NBA'`: `PredictionRun`, `OddsOverride`, `EvaluationSummary`, `PredictionFile`, `ResultFile`

## Testing

Unit tests live alongside source files (`*.test.ts`). E2E tests are in `tests/e2e/`.

Coverage includes betting math, model predictions (regular season vs playoff), composite recommendations, odds parsing, ESPN normalization, results grading, odds override import/approve/reject logic, and key UI flows.

## Architecture Notes

- `NBAModel.tsx` still carries `// @ts-nocheck` — it is the coordinator shell; logic has been extracted to hooks/lib.
- `ScheduleAnalysis.tsx` is the most actively changed UI surface.
- Composite score/tier is a heuristic rank, not a calibrated probability.
- Live stat overrides (Basketball Reference paste) merge over the hardcoded `TEAMS` table in `nbaModel.ts`.
- `tsconfig.node.json` uses `module: ESNext` + `moduleResolution: Bundler` (not NodeNext) so server files can import from `src/lib/` without `.js` extension conflicts from Vite-style imports.
