# NBA Predictor Refactor Handoff

## Current State

- The project has already been migrated to TypeScript.
- `npm run test`, `npm run test:e2e`, `npm run build`, `npm run lint`, and `npm run typecheck` are currently passing.
- The large `NBAModel_29` file was renamed to `NBAModel.tsx`.
- `src/NBAModel.tsx` still has a temporary `// @ts-nocheck` and is not fully typed yet.
- The main schedule workflow has been extracted, but `NBAModel.tsx` is still a coordinator with broad state and handler props.

## Refactors Completed

- Extracted betting helpers and shared types:
  - `src/lib/betting.ts`
  - `src/lib/nbaTypes.ts`
- Extracted additional typed helper modules:
  - `src/lib/resultsTracker.ts`
  - `src/lib/bulkOddsParser.ts`
- Extracted core model/domain logic:
  - `src/lib/nbaModel.ts`
- Extracted ESPN/network helpers:
  - `src/lib/espn.ts`
- Extracted stateful workflow hooks:
  - `src/hooks/useResultsTracker.ts`
  - `src/hooks/usePredictorState.ts`
- Extracted reusable UI components:
  - `src/components/CourtBar.tsx`
  - `src/components/StatBar.tsx`
  - `src/components/TeamCard.tsx`
  - `src/components/ResultsTracker.tsx`
  - `src/components/ScheduleAnalysis.tsx`
  - `src/components/ModelEvaluation.tsx`
  - `src/components/SingleGameControls.tsx`
  - `src/components/SingleGameResults.tsx`
  - `src/components/BBRefImportPanel.tsx`

## Evaluation And CSV Changes

- The app now includes a dedicated post-bet evaluation flow on the `MODEL EVAL` tab.
- Shared evaluation logic lives in:
  - `src/lib/modelEvaluation.ts`
- Predictions CSV export now includes the structured betting fields needed for downstream grading:
  - `ML Rec`
  - `Over Odds`
  - `Under Odds`
  - `Vegas Spread`
  - `Spread Home Odds`
  - `Spread Away Odds`
  - existing ML odds and `LookupKey`
- Moneyline grading now uses the explicit `ML Rec` recommendation when present instead of inferring from `H Win% > 50`.
- The evaluator still includes fallbacks for older CSVs when some of the new columns are missing.

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

## Results Tracker Refactor Status

- The legacy in-file results workflow was removed from `src/NBAModel.tsx`.
- Results parsing, grading, and aggregation now live in:
  - `src/lib/resultsTracker.ts`
- The active Results tab state and handlers now live in:
  - `src/hooks/useResultsTracker.ts`
- `NBAModel.tsx` now consumes the hook instead of duplicating the workflow inline.

## Predictor UI Changes

- The single-game workflow is now behind a closed-by-default panel below `TODAY'S GAMES & EXPORT`.
- The toggle copy is:
  - closed: `OPEN SINGLE GAME`
  - open: `CLOSE PANEL`
- That panel contains:
  - filter by division
  - home/away selectors
  - advanced stats comparison
  - single-game simulation
  - single-game line fetching/manual odds controls
- That UI is no longer rendered inline in `NBAModel.tsx`; it now lives in:
  - `src/components/SingleGameControls.tsx`
- The post-simulation predictor display also now lives outside the monolith in:
  - `src/components/SingleGameResults.tsx`
- The Basketball Reference import panel now lives in:
  - `src/components/BBRefImportPanel.tsx`
- The single-game predictor state/actions now live in:
  - `src/hooks/usePredictorState.ts`
- `NBAModel.tsx` still has mojibake-heavy legacy text/style strings, but it is materially smaller and more coordinator-oriented than before.

## Bulk Odds Parser Status

- Bulk sportsbook paste parsing was extracted from `NBAModel.tsx` into:
  - `src/lib/bulkOddsParser.ts`
- Focused unit coverage was added in:
  - `src/lib/bulkOddsParser.test.ts`
- This parser now handles:
  - standard two-team sportsbook blocks
  - `EVEN`
  - fractional glyph variants like `½`

## Testing And CI

- Vitest, Testing Library, and Playwright are now set up.
- Key config/files:
  - `vite.config.ts`
  - `src/test/setup.ts`
  - `playwright.config.ts`
  - `.github/workflows/ci.yml`
- Current test coverage includes:
  - betting math unit tests in `src/lib/betting.test.ts`
  - bulk odds parser unit tests in `src/lib/bulkOddsParser.test.ts`
  - predictor hook tests in `src/hooks/usePredictorState.test.ts`
  - results tracker hook tests in `src/hooks/useResultsTracker.test.ts`
  - single-game results component tests in `src/components/SingleGameResults.test.tsx`
  - evaluator parser/grading unit tests in `src/lib/modelEvaluation.test.ts`
  - evaluator component tests in `src/components/ModelEvaluation.test.tsx`
  - export contract test in `src/NBAModel.test.tsx`
  - Playwright coverage in `tests/e2e/model-evaluation.spec.ts`
- Current browser coverage includes:
  - model evaluation flow
  - opening the single-game panel
  - exporting predictions CSV from the today's-games flow with stubbed ESPN responses
- GitHub Actions now runs install, typecheck, lint, Vitest, build, Playwright browser install, and E2E tests on push/PR.

## Important Notes

- Some legacy text in the project still contains mojibake/non-ASCII artifacts from the original source.
- We have been preserving behavior over cleanup, so some extracted components still use broad prop contracts.
- We improved the prediction formula, but it has not yet been backtested against historical NBA results. The next serious model-quality step is calibration against real game outcomes and/or closing lines.
- `src/NBAModel.tsx` still has `// @ts-nocheck`, but much of the predictor/results UI and workflow logic has already been pushed into hooks/components/helpers.
- `npm run typecheck` is currently passing after the latest extractions.
- The latest focused test run for:
  - `src/hooks/usePredictorState.test.ts`
  - `src/hooks/useResultsTracker.test.ts`
  - `src/components/SingleGameResults.test.tsx`
  passed `7/7`.

## Best Next Steps

1. Add tests for `src/components/SingleGameControls.tsx`, since it is now one of the main extracted predictor UI surfaces without direct coverage.
2. Keep shrinking `src/NBAModel.tsx` by extracting the remaining small predictor shell pieces, such as the ESPN colors banner and toggle/header wrappers.
3. Consider a `useScheduleAnalysisState`-style hook if we want the schedule/export workflow to follow the same pattern as results and single-game predictor state.
4. Remove `@ts-nocheck` from `src/NBAModel.tsx` by typing the remaining state/helpers after a few more extractions.
5. Backtest the updated model against historical NBA results to tune win-probability calibration and spread/total variance assumptions.
