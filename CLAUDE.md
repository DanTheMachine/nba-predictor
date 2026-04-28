# NBA Predictor – Claude Code Guide

## Project Overview

React/TypeScript/Vite frontend with an Express proxy. Predicts NBA game outcomes and generates betting recommendations for moneyline, spread, and totals markets.

## Commands

```bash
npm run dev          # start Vite dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright end-to-end tests
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

## Model Constants (nbaModel.ts)

| Constant | Value | Notes |
|----------|-------|-------|
| `LEAGUE_AVG_RTG` | 115.3 | Reference rating for context |
| `LEAGUE_AVG_PACE` | 99.0 | Reference pace |
| `HOME_COURT_EDGE` | 2.3 pts | Additive margin adjustment |
| `BACK_TO_BACK_EDGE` | 1.4 pts | Applied per fatigued team |
| `PLAYOFF_PACE_FACTOR` | 0.966 | Pace multiplier for all playoff rounds |
| `PLAYOFF_SCORING_FACTOR` | 0.976 | Rating multiplier for all playoff rounds |
| `MARGIN_STD_DEV` | 12.0 | Used in win-probability logistic curve |

## Recommendation Thresholds (betting.ts)

| Market | Threshold |
|--------|-----------|
| Moneyline | edge > 4.0% |
| Spread | cover edge > 5.0% |
| Total | projected total differs from line by > 3.0 pts |

## Playoff Adjustments

Playoff games apply two separate multipliers to reduce the structural over-prediction seen vs Vegas lines:
- **Pace**: `PLAYOFF_PACE_FACTOR = 0.966` — slower possessions
- **Scoring efficiency**: `PLAYOFF_SCORING_FACTOR = 0.976` — applied to both teams' expected ratings after matchup blending

Combined effect: ~5.8% below equivalent regular-season projections. A single flat factor is used for all playoff rounds; per-round escalation was considered but is not empirically supported — later rounds don't reliably score lower than earlier ones because better offenses also survive.

If totals bias reappears in later rounds, adjust `PLAYOFF_SCORING_FACTOR` in `nbaModel.ts`.

## Testing

Unit tests live alongside source files (`*.test.ts`). E2E tests are in `tests/e2e/`.

Coverage includes betting math, model predictions (regular season vs playoff), composite recommendations, odds parsing, ESPN normalization, results grading, and key UI flows.

## Architecture Notes

- `NBAModel.tsx` still carries `// @ts-nocheck` — it is the coordinator shell; logic has been extracted to hooks/lib.
- `ScheduleAnalysis.tsx` is the most actively changed UI surface.
- Composite score/tier is a heuristic rank, not a calibrated probability.
- Live stat overrides (Basketball Reference paste) merge over the hardcoded `TEAMS` table in `nbaModel.ts`.
