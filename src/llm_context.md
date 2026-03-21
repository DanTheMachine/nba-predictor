# NBA Predictor Refactor Handoff

## Current State

- The project has already been migrated to TypeScript.
- `npm run build`, `npm run lint`, and `npm run typecheck` are currently passing.
- The large `NBAModel_29` file was renamed to `NBAModel.tsx`.
- `src/NBAModel.tsx` still has a temporary `// @ts-nocheck` and is not fully typed yet.
- The main schedule workflow has been extracted, but `NBAModel.tsx` is still a coordinator with broad state and handler props.

## Refactors Completed

- Extracted betting helpers and shared types:
  - `src/lib/betting.ts`
  - `src/lib/nbaTypes.ts`
- Extracted core model/domain logic:
  - `src/lib/nbaModel.ts`
- Extracted ESPN/network helpers:
  - `src/lib/espn.ts`
- Extracted reusable UI components:
  - `src/components/CourtBar.tsx`
  - `src/components/StatBar.tsx`
  - `src/components/TeamCard.tsx`
  - `src/components/ResultsTracker.tsx`
  - `src/components/ScheduleAnalysis.tsx`

## Model Calibration Changes

- The prediction formula in `src/lib/nbaModel.ts` was recently recalibrated because outputs were drifting too far from other models.
- The old version used a more aggressive offensive/defensive interaction and a steeper win-probability curve.
- The current version now:
  - blends offense and opponent defense arithmetically instead of multiplying ratio effects
  - clamps expected pace into a realistic NBA range
  - uses smaller matchup adjustments for `efgPct`, `tovPct`, `rebPct`, and `threePAr`
  - uses home court and B2B as additive point-margin adjustments
  - converts projected margin into win probability with a softer logistic curve
- Files involved:
  - `src/lib/nbaModel.ts`
  - `src/lib/betting.ts`

## Documentation Added

- Added a model explainer:
  - `NBA_MODEL_PREDICTION_ALGORITHMS.md`
- Added a local runbook:
  - `RUNNING_THE_NBA_MODEL.md`
- Both documents were intentionally written to parallel the NHL project's docs in structure and detail.

## Schedule Refactor Status

- `ScheduleAnalysis.tsx` now owns:
  - schedule controls
  - bulk odds import UI
  - editable lines table
  - per-game simulation analysis cards
  - best-bets summary panel
- `NBAModel.tsx` now acts more like a coordinator and passes state/handlers into `ScheduleAnalysis`.

## Important Notes

- Some legacy text in the project still contains mojibake/non-ASCII artifacts from the original source.
- We have been preserving behavior over cleanup, so some extracted components still use broad props and `// @ts-nocheck`.
- The repo does not appear to be a git checkout in this environment, so `git status` was not available here.
- We improved the prediction formula, but it has not yet been backtested against historical NBA results. The next serious model-quality step is calibration against real game outcomes and/or closing lines.

## Best Next Steps

1. Remove `@ts-nocheck` from `src/NBAModel.tsx` by typing remaining state and helpers.
2. Break up `src/components/ScheduleAnalysis.tsx` into smaller typed subcomponents if needed.
3. Backtest the updated model against historical NBA results to tune win-probability calibration and spread/total variance assumptions.
4. Extract remaining predictor-tab UI from `src/NBAModel.tsx` if we want to keep shrinking the coordinator file.
