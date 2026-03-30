# Running The NBA Predictor

This guide explains how to run the NBA predictor locally, from starting the servers to using the main workflow inside the app.

## 1. Project Location

Workspace:

- `C:\projects\game_sims\nba-predictor`

Main app file:

- [NBAModel.tsx](C:\projects\game_sims\nba-predictor\src\NBAModel.tsx)

Current extracted workflow pieces:

- [usePredictorState.ts](C:\projects\game_sims\nba-predictor\src\hooks\usePredictorState.ts)
- [SingleGameControls.tsx](C:\projects\game_sims\nba-predictor\src\components\SingleGameControls.tsx)
- [SingleGameResults.tsx](C:\projects\game_sims\nba-predictor\src\components\SingleGameResults.tsx)
- [BBRefImportPanel.tsx](C:\projects\game_sims\nba-predictor\src\components\BBRefImportPanel.tsx)
- [useResultsTracker.ts](C:\projects\game_sims\nba-predictor\src\hooks\useResultsTracker.ts)
- [ScheduleAnalysis.tsx](C:\projects\game_sims\nba-predictor\src\components\ScheduleAnalysis.tsx)

Local proxy:

- [proxy.ts](C:\projects\game_sims\nba-predictor\proxy.ts)

## 2. What You Need Running

The NBA predictor uses two local processes:

1. the Vite React app
2. the local proxy server

Why both are needed:

- the React app serves the browser UI
- the proxy forwards ESPN API requests through `VITE_PROXY_BASE_URL`, or `http://localhost:3002` by default
- features like schedule loading, odds fetches, team color loading, and results export depend on the proxy

## 3. First-Time Setup

Open a terminal in:

- `C:\projects\game_sims\nba-predictor`

Install dependencies if needed:

```powershell
npm install
```

If `node_modules` already exists, you usually do not need to run this again.

## 4. Start The Proxy Server

Open Terminal 1 in:

- `C:\projects\game_sims\nba-predictor`

Run:

```powershell
npm run proxy
```

Expected success message:

```text
Proxy running on http://localhost:3002
```

Keep this terminal running while you use the app.

Optional custom port:

```powershell
$env:PORT=3002
npm run proxy
```

Optional frontend proxy base URL override:

Create a local `.env` file from `.env.example` and set:

```text
VITE_PROXY_BASE_URL=http://localhost:3002
```

## 5. Start The React App

Open Terminal 2 in:

- `C:\projects\game_sims\nba-predictor`

Run:

```powershell
npm run dev
```

Vite will start a local dev server, usually at:

- `http://localhost:5173`

Keep this terminal running too.

## 6. Open The Browser App

Open your browser and go to:

- [http://localhost:5173](http://localhost:5173)

If Vite chooses a different port, use the URL shown in the terminal output.

## 7. Recommended Daily Workflow

This is the most common end-to-end pipeline for using the NBA model.

### 7.1 Load team colors

Click:

- `FETCH ESPN`

What it does:

- loads ESPN team colors
- updates the display layer for team cards and matchup visuals

Typical success state:

- ESPN team colors loaded
- fetch status turns green

### 7.2 Import live advanced stats

Click:

- `IMPORT STATS`

or, if stats were already loaded:

- `UPDATE STATS`

What it does:

- opens the Basketball Reference import panel
- lets you paste the Miscellaneous or Advanced Stats export
- updates the model inputs for all teams when parsed successfully

Typical success message:

- updated team stats from Basketball Reference

Important note:

- this is the main way to refresh model inputs beyond the hardcoded baseline estimates

### 7.3 Load today's games

Click:

- `LOAD GAMES`

What it does:

- pulls today's NBA slate
- attempts to attach ESPN odds to each game
- checks which teams are on a back-to-back
- fetches recent form, ESPN injuries, and projected starters
- creates the current day's game cards and attached line data

Typical success message:

- `X games loaded | Y with ESPN lines | B2B: ...`

What appears on the game cards after load:

- recent form
- ESPN injuries
- projected starters
- sharp context placeholders or manual sharp inputs

### 7.4 If sportsbook lines need manual updates

Use either:

- per-game `EDIT ODDS`
- bulk paste import

For bulk paste:

1. click `BULK EDIT LINES`
2. paste sportsbook lines text
3. click `APPLY TO TODAY'S GAMES`

What it does:

- parses pasted team blocks
- matches them to loaded games
- updates Money Line, spread, and total fields
- marks affected game cards with an `EDITED` badge in the header

### 7.5 Adjust back-to-back flags if needed

Each game row has B2B toggles for:

- the home team
- the away team

Use these if:

- the automatic detection missed a team
- you want to manually test a fatigue scenario

### 7.6 Run all simulations

Click:

- `RUN ALL SIMS`

What it does:

- runs `predictGame(...)` for every loaded matchup
- fills the game cards with:
  - projected scores
  - projected total
  - win probabilities
  - betting edges
  - spread and total recommendations
- populates the `BEST BETS SUMMARY` card below the slate cards

Important note:

- the displayed projected team scores, total, and projected score difference now come from one consistent rounded display layer, so the visible team scores add up to the visible total

### 7.7 Export predictions

Click:

- `PREDICTIONS CSV`

What it does:

- builds a CSV from all current rows
- includes model outputs, market terms, edges, Kelly values, and lookup keys

Typical success message:

- exported `nba-predictions-YYYY-MM-DD.csv`

### 7.8 Export next-day results

The next day, click:

- `RESULTS CSV`

What it does:

- fetches yesterday's final NBA scores through the proxy
- exports a results CSV
- gives you a file you can paste into the results tracker flow

Typical success message:

- exported yesterday's NBA results

### 7.9 Evaluate model performance

Switch to the:

- `Results` tab
- `MODEL EVAL` tab

What it does:

- lets you paste or import both predictions and results CSV content
- matches games by lookup key and team/date data
- grades Money Line, spread, and over/under outcomes
- shows win-loss and ROI summaries by market

What is different between the two tabs:

- `Results` is the built-in tracker for imported prediction and result logs inside the app workflow
- `MODEL EVAL` is the dedicated post-bet evaluation screen for pasting full Predictions CSV and Results CSV files and reviewing per-bet grading and ROI

Recommended workflow:

1. export `PREDICTIONS CSV`
2. export `RESULTS CSV` the next day
3. switch to the `Results` tab
4. click `PASTE PREDICTIONS CSV`
5. click `PASTE RESULTS CSV`
6. import both

Alternative workflow:

1. export `PREDICTIONS CSV`
2. export `RESULTS CSV` the next day
3. switch to the `MODEL EVAL` tab
4. paste the full predictions CSV
5. paste the full results CSV
6. click `EVALUATE MODEL`

What to look at:

- `MONEYLINE`
- `SPREAD ATS`
- `OVER / UNDER`
- graded game count
- ROI by market

## 8. Single-Game Workflow

The app also supports one-off matchup analysis.

The single-game tools now live behind a closed-by-default panel below the `TODAY'S GAMES & EXPORT` section.

Open them with:

- `OPEN SINGLE GAME`

Typical flow:

1. choose home team
2. choose away team
3. set game type
4. set back-to-back flags if needed
5. import BBRef stats if desired
6. fetch odds or enter them manually
7. run the simulation

This is useful for:

- testing one game quickly
- checking baseline versus live imported stats
- comparing ESPN odds against manual lines

## 9. Schedule Card Layout

Each loaded game now appears as a closed-by-default intelligence card.

Closed card summary includes:

- matchup and game metadata
- sim summary after `RUN ALL SIMS`
- sim breakdown
- `EDITED` badge when manual odds are active

Expanded card includes:

- `MODEL & MARKET`
- `TEAM COMPARISON`
- `SHARP INFORMATION`

Below the game-card stack, the schedule area now also includes:

- `BEST BETS SUMMARY`

That summary currently:

- ranks all playable `ML`, `SPR`, and `O/U` candidates across the slate
- sorts them by edge percentage
- shows tier and composite score
- shows market-specific projection context in the middle column
- shows sharp context when available, otherwise `No Sharp Information`
- shows the pick with the relevant odds on the right

Important behavior distinction:

- the raw `ML`, `SPR`, and `O/U` recommendations come from model-versus-market thresholds
- the tier / score line is a heuristic ranking layer, not a calibrated confidence percentage

`SHARP INFORMATION` currently contains:

- `RECENT FORM`
- `PROJECTED STARTERS`
- `SHARP`
- `INJURIES`

## 9. Full Workflow Pipeline Summary

Use this sequence for most days:

1. start `npm run proxy`
2. start `npm run dev`
3. open `http://localhost:5173`
4. click `FETCH ESPN`
5. click `IMPORT STATS` and paste Basketball Reference data if desired
6. click `LOAD GAMES`
7. paste or edit lines if needed
8. adjust B2B flags if needed
9. click `RUN ALL SIMS`
10. click `PREDICTIONS CSV`
11. next day, click `RESULTS CSV`
12. switch to the `Results` tab
13. import both CSVs to grade performance

## 10. Common Problems

### Proxy not running

Symptoms:

- schedule fails
- odds fail
- results export fails
- ESPN color fetch fails

Fix:

```powershell
npm run proxy
```

### App not loading

Symptoms:

- browser page does not open
- `localhost:5173` does not respond

Fix:

```powershell
npm run dev
```

### BBRef import does not update teams

Symptoms:

- import fails
- zero teams updated
- stats stay on estimates

Fixes:

- paste the full table including the header row
- use the Basketball Reference table that includes the expected advanced stat columns
- confirm team names match the standard Basketball Reference naming

### Bulk paste parser does not match lines

Symptoms:

- bulk paste says it parsed too few teams
- game cards do not update

Fixes:

- load today's games first
- use the standard team-block paste format
- confirm the pasted teams match the same slate already loaded in the app

### Results grading is incomplete

Symptoms:

- some games stay ungraded
- only part of the sheet evaluates correctly

Fixes:

- make sure you exported predictions from the current app format
- make sure results and predictions refer to the same game date
- confirm both CSVs were imported into the `Results` tab

## 11. Running Checks

The repo currently has build and static checks available from the command line.

### 11.1 Production build

Run:

```powershell
npm run build
```

What this does:

- builds the Vite production bundle
- catches JSX and compile-time issues

### 11.2 Lint

Run:

```powershell
npm run lint
```

What this covers:

- ESLint checks across the TypeScript and React files

### 11.3 Type checking

Run:

```powershell
npm run typecheck
```

What this covers:

- frontend TypeScript checks
- Node and proxy TypeScript checks

## 12. Testing

The repo now includes both component-level and browser-level tests.

### 12.1 Vitest unit and component tests

Run:

```powershell
npm run test
```

Watch mode:

```powershell
npm run test:watch
```

Vitest UI:

```powershell
npm run test:ui
```

What this covers:

- component rendering and interaction tests
- CSV evaluation logic through UI-facing test cases
- extracted hook tests for predictor/results workflows
- extracted helper tests such as bulk odds parsing
- composite recommendation and best-bets ranking logic

Examples of focused test runs:

```powershell
npm run test -- --run src/hooks/usePredictorState.test.ts src/hooks/useResultsTracker.test.ts src/components/SingleGameResults.test.tsx
```

```powershell
npm run test -- --run src/lib/bulkOddsParser.test.ts
```

```powershell
npm run test -- --run src/components/ScheduleAnalysis.test.tsx src/lib/compositeRecommendation.test.ts src/lib/betting.test.ts
```

### 12.2 Playwright UI tests

Run:

```powershell
npm run test:e2e
```

What this covers:

- end-to-end browser smoke coverage
- tab navigation and evaluator workflow checks

First-time note:

- Playwright may require browser installation before the first run
- if needed, run `npx playwright install chromium`

## 13. Notes For Local Runs

- Keep both terminals open while using the app.
- The proxy must remain running for ESPN-backed features.
- The model can still run without BBRef imports, but then it uses baseline estimates instead of refreshed advanced stats.
- Results grading works best when predictions and results are exported in the same workflow cycle.
- `NBAModel.tsx` is now more of a coordinator than before, but it still has `// @ts-nocheck`, so typecheck passing does not yet mean the entire predictor shell is fully typed.

