# NBA Predictor Refactor Handoff

## Current State

- The project has already been migrated to TypeScript.
- `npm run build`, `npm run lint`, and `npm run typecheck` are currently passing.
- The large `NBAModel_29` file was renamed to `NBAModel.tsx`.
- `src/NBAModel.tsx` still has a temporary `// @ts-nocheck` and is not fully typed yet.
- The main schedule workflow has been extracted, but `NBAModel.tsx` is still a coordinator with broad state and handler props.
- The main schedule UX is now driven by expandable game intelligence cards rather than the old best-bets-first layout.
- A temporary VSiN sharp-data import path now exists through the existing bulk import box.

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
- Recommendation sensitivity was also tightened in `src/lib/betting.ts` without changing the underlying simulation:
  - Moneyline recommendations now require edge above `4.0%`
  - spread recommendations now require cover edge above `5.0%`
  - totals recommendations now require projected total to differ from the market total by more than `3.0` points
- The displayed `hScore`, `aScore`, `total`, and `projDiff` values in `src/lib/nbaModel.ts` are now rounded from one consistent display layer so shown team scores add up cleanly to the shown total.

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
  - expandable game intelligence cards
  - ranked best-bets summary panel
  - manual sharp / injury editing
- `NBAModel.tsx` now acts more like a coordinator and passes state/handlers into `ScheduleAnalysis`.
- The schedule load banner now surfaces market-data configuration / warning status from the live sharp provider workflow.

## Game Intelligence Card Status

- The schedule area now renders closed-by-default cards for each loaded game.
- The game card header now shows:
  - a compact `Vegas Line` row when loaded/current odds match
  - an `Edited, Using Manual Line` header with:
    - `V - ...` for the loaded market line
    - `M - ...` for the manual/imported sim line in blue
- The expanded card currently includes:
  - `MODEL & MARKET`
  - `TEAM COMPARISON`
  - `SHARP INFORMATION`
- A `BEST BETS SUMMARY` card now renders after the game cards and before the single-game tools panel.
- That summary now:
  - ranks all playable market candidates across the loaded slate rather than only one composite winner per game
  - sorts the list by market edge percentage
  - shows tier / score, market-specific projection detail, sharp detail or `No Sharp Information`, and the pick with odds
- `MODEL & MARKET` currently shows:
  - Vegas and manual line rows
  - projected score / total
  - ML, total, and spread edge breakdowns
- `TEAM COMPARISON` currently shows:
  - net rating edge
  - pace
  - eFG
  - TOV
  - ORB%
  - 3PAr
  - AST%
  - B2B
- `SHARP INFORMATION` currently shows:
  - `RECENT FORM` on the left
  - `PROJECTED STARTERS` on the right
  - `SHARP` below recent form
  - `INJURIES` below projected starters
  - inline italic freshness timestamps for recent form, projected starters, sharp context, and injuries
- Projected starters now:
  - load from ESPN depth chart pages during `LOAD GAMES`
  - render inside `SHARP INFORMATION`
  - append matching injury designations in red when a projected starter is also listed in the injury feed
  - show compact stat lines:
    - `PG` / `SG`: `PPG APG`
    - `SF` / `PF` / `C`: `PPG RPG`
- Manually edited odds now show an `EDITED` badge on the game card header.
- Composite recommendation types and export fields exist, but the current UI is intentionally still simulation-first rather than final-recommendation-first.
- Composite scoring still exists, but it should be understood as a heuristic rank/strength score rather than a calibrated probability or true confidence measure.

## ESPN Context Fetching Status

- `src/lib/espn.ts` now owns:
  - today schedule fetch
  - ESPN color fetch
  - recent form fetch
  - B2B lookup
  - roster-based ESPN injury fetch
  - projected starters fetch from ESPN depth chart HTML
- `LOAD GAMES` now performs:
  1. today's schedule fetch
  2. odds parsing
  3. back-to-back detection
  4. recent form fetch
  5. ESPN injury fetch
  6. ESPN projected starters fetch
  7. schedule row assembly
- Recent form now includes:
  - date
  - opponent
  - home/away indicator
  - result
  - score
  - source and timestamp
- Injury data now includes:
  - player
  - status
  - source
  - timestamp
- Manual injury editing now preserves ESPN-fetched injury items instead of overwriting them.

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
  - sportsbook alias names such as `LA LAKERS`, `LA CLIPPERS`, and city-only paste variants

## Sharp Import Status

- A temporary VSiN adapter now exists in:
  - `src/lib/vsinSharpParser.ts`
- Focused unit coverage was added in:
  - `src/lib/vsinSharpParser.test.ts`
- The existing bulk import textarea in `ScheduleAnalysis.tsx` now auto-detects VSiN-style paste blocks and imports:
  - opening spread / current spread by book
  - opening moneyline / current moneyline by book
  - opening total / current total by book
  - spread, total, and moneyline bet % / money %
- The VSiN adapter is intentionally loosely coupled:
  - it maps pasted data into `editedOdds` and `sharpInput`
  - it does not replace the provider-backed market-data abstraction
  - the old sportsbook bulk-odds parser still works for non-VSiN paste formats
- The imported sharp source currently shows as:
  - `VSiN Import`
- The parser currently prefers:
  - `DK` current lines for imported active odds when available
  - opener fields from `DK Open`
- This path is intended as a temporary / low-cost workaround while API-backed sharp data remains unavailable.
- Important behavior distinction:
  - raw `ML`, `SPR`, and `O/U` recommendations come from model-vs-market logic in `src/lib/betting.ts`
  - sharp inputs are currently used in the composite recommendation / ranking layer and schedule card context, not as a prerequisite for generating the raw recommendations

## Testing And CI

- Vitest, Testing Library, and Playwright are now set up.
- Key config/files:
  - `vite.config.ts`
  - `src/test/setup.ts`
  - `playwright.config.ts`
  - `.github/workflows/ci.yml`
- Current test coverage includes:
  - betting math unit tests in `src/lib/betting.test.ts`
  - composite recommendation unit tests in `src/lib/compositeRecommendation.test.ts`
  - bulk odds parser unit tests in `src/lib/bulkOddsParser.test.ts`
  - VSiN sharp import unit tests in `src/lib/vsinSharpParser.test.ts`
  - ESPN injury normalization and projected starter parser tests in `src/lib/espn.test.ts`
  - predictor hook tests in `src/hooks/usePredictorState.test.ts`
  - results tracker hook tests in `src/hooks/useResultsTracker.test.ts`
  - single-game results component tests in `src/components/SingleGameResults.test.tsx`
  - schedule card UI tests in `src/components/ScheduleAnalysis.test.tsx`
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
- `ScheduleAnalysis.tsx` is currently the most actively iterated UX surface and now carries most of the game-card presentation logic.
- Composite recommendation infrastructure exists, but the user-facing workflow still prioritizes sim results and market breakdowns while the final recommendation UX is being shaped.
- The latest focused test run for:
  - `src/components/ScheduleAnalysis.test.tsx`
  - `src/lib/compositeRecommendation.test.ts`
  - `src/lib/betting.test.ts`
  passed `22/22` across the latest focused runs touching the recommendation / best-bets workflow.

## Best Next Steps

1. Add tests for `src/components/SingleGameControls.tsx`, since it is now one of the main extracted predictor UI surfaces without direct coverage.
2. Keep shrinking `src/NBAModel.tsx` by extracting the remaining small predictor shell pieces, such as the ESPN colors banner and toggle/header wrappers.
3. Consider a `useScheduleAnalysisState`-style hook if we want the schedule/export workflow to follow the same pattern as results and single-game predictor state.
4. Remove `@ts-nocheck` from `src/NBAModel.tsx` by typing the remaining state/helpers after a few more extractions.
5. Backtest the updated model against historical NBA results to tune win-probability calibration and spread/total variance assumptions.
6. Consider adding lightweight UI guidance in the bulk import panel so users know it now accepts both standard sportsbook odds blocks and multi-section VSiN sharp-data paste.
7. Decide whether the best-bets summary should remain an all-candidates slate board or gain optional filtering such as top 3 only, grouped by market, or grouped by tier.
