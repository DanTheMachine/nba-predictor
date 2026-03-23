# NBA Predictor Model Algorithms

This document explains how the current NBA model in [NBAModel.tsx](C:\projects\game_sims\nba-predictor\src\NBAModel.tsx) produces:

- projected points
- projected game total
- Money Line win probabilities
- spread cover recommendations
- over/under recommendations
- betting recommendations versus sportsbook terms
- post-bet evaluation-ready CSV exports

The core engine currently lives in:

- [nbaModel.ts](C:\projects\game_sims\nba-predictor\src\lib\nbaModel.ts)
- [betting.ts](C:\projects\game_sims\nba-predictor\src\lib\betting.ts)

The predictor workflow around that engine is now split across:

- [usePredictorState.ts](C:\projects\game_sims\nba-predictor\src\hooks\usePredictorState.ts)
- [SingleGameControls.tsx](C:\projects\game_sims\nba-predictor\src\components\SingleGameControls.tsx)
- [SingleGameResults.tsx](C:\projects\game_sims\nba-predictor\src\components\SingleGameResults.tsx)
- [BBRefImportPanel.tsx](C:\projects\game_sims\nba-predictor\src\components\BBRefImportPanel.tsx)

## 1. Inputs

For each matchup, the engine starts with team-level ratings.

- `offRtg`: offensive rating
- `defRtg`: defensive rating
- `pace`: estimated possessions per game
- `netRtg`: overall efficiency differential
- `tsPct`: true shooting percentage
- `rebPct`: rebounding percentage proxy
- `astPct`: assist percentage
- `tovPct`: turnover percentage
- `efgPct`: effective field goal percentage
- `oppEfgPct`: opponent effective field goal percentage allowed
- `threePAr`: three-point attempt rate
- `div`, `conf`, `arena`, `capacity`: team metadata used mostly for display

These come from:

- baseline hardcoded team estimates in [nbaModel.ts](C:\projects\game_sims\nba-predictor\src\lib\nbaModel.ts)
- optionally overwritten by pasted Basketball Reference updates

The model also uses matchup context.

- `gameType`: regular season or playoff round
- `homeB2B`: whether the home team is on a back-to-back
- `awayB2B`: whether the away team is on a back-to-back
- `liveStats`: imported stat overrides
- `odds`: sportsbook terms such as Money Line, spread, and total

## 2. Score And Total Projection

The core projection engine lives in `predictGame(...)`.

### 2.1 Context adjustments

- Playoff games reduce expected pace with `PLAYOFF_PACE_MULTIPLIER = 0.975`.
- Regular season games use full pace.
- Home court advantage is modeled as `HOME_COURT_EDGE = 2.3`.
- Each back-to-back applies a margin adjustment:
  - `homeB2B -> -1.4`
  - `awayB2B -> +1.4`

Unlike the older version of the model, home court and fatigue are handled as point-margin adjustments instead of score multipliers.

### 2.2 Pace projection

The model estimates game pace with:

- `expectedPace = clamp(((home.pace + away.pace) / 2) * playoffPaceFactor, 92, 103)`

This means:

- start from the average pace of both teams
- reduce it slightly in playoff games
- clamp it into a realistic NBA range

This possessions estimate becomes the scoring volume base for both teams.

### 2.3 Blended offensive expectation

Instead of multiplying offense and defense ratios, the model blends them.

Home base expected rating:

- `(home.offRtg + away.defRtg) / 2`

Away base expected rating:

- `(away.offRtg + home.defRtg) / 2`

Interpretation:

- each team's scoring expectation starts halfway between its own offense and the opponent's defense
- this is more stable than ratio multiplication
- it reduces the risk of overstating elite-versus-poor matchups

### 2.4 Matchup adjustments

The model adds smaller matchup-specific adjustments on top of those base ratings.

Home adjustment:

- `(home.efgPct - away.oppEfgPct) * 0.45`
- `+ (away.tovPct - home.tovPct) * 0.25`
- `+ (home.rebPct - away.rebPct) * 0.10`
- `+ (home.threePAr - away.threePAr) * 0.05`

Away adjustment:

- `(away.efgPct - home.oppEfgPct) * 0.45`
- `+ (home.tovPct - away.tovPct) * 0.25`
- `+ (away.rebPct - home.rebPct) * 0.10`
- `+ (away.threePAr - home.threePAr) * 0.05`

Interpretation:

- `efgPct` gets the heaviest weight because shot efficiency and shot mix matter most
- `tovPct` adjusts for possession security
- `rebPct` adjusts for extra-possession potential
- `threePAr` adds a small style-based modifier

### 2.5 Net rating prior

The model also includes a light net rating prior:

- `netRatingEdge = (home.netRtg - away.netRtg) * 0.18`

This is split across both teams:

- home gets `+ netRatingEdge / 2`
- away gets `- netRatingEdge / 2`

This lets overall team quality matter without overwhelming the matchup layer.

### 2.6 Expected rating per team

Home expected rating:

- `clamp(homeBaseRtg + homeMatchupAdj + netRatingEdge / 2, 101, 125)`

Away expected rating:

- `clamp(awayBaseRtg + awayMatchupAdj - netRatingEdge / 2, 101, 125)`

These are bounded so the model does not wander into unrealistic offensive outputs.

### 2.7 Projected points and total

The model converts expected ratings into points:

- `baseHomeScore = (homeExpectedRtg / 100) * expectedPace`
- `baseAwayScore = (awayExpectedRtg / 100) * expectedPace`

Projected margin:

- `(baseHomeScore - baseAwayScore) + situationalEdge`

Projected total:

- `baseHomeScore + baseAwayScore`

Final projected scores:

- `hScore = max(85, projectedTotal / 2 + projectedMargin / 2)`
- `aScore = max(85, projectedTotal / 2 - projectedMargin / 2)`

The model returns projected scores rounded to one decimal place.

## 3. Win Probability

After projected points are created, the model converts them into a home win probability.

### 3.1 Net scoring differential

- `diff = hScore - aScore`

This is the main matchup-strength number used for win probability.

### 3.2 Margin standard deviation

- `MARGIN_STD_DEV = 12.0`

This acts as a rough game-to-game NBA scoring margin spread.

### 3.3 Logistic win probability

The model uses a logistic transform:

- `z = diff / MARGIN_STD_DEV`
- `homeWinProb = 1 / (1 + exp(-1.7 * z))`

Then it bounds the result:

- minimum `3%`
- maximum `97%`

Away win probability is:

- `awayWinProb = 1 - homeWinProb`

## 4. Feature Flags

The prediction output also includes readable feature explanations.

The model emits feature rows based on threshold checks, including:

- offensive rating
- defensive rating
- net rating
- eFG%
- TOV%
- home court
- game type

These are explanatory outputs, not separate prediction engines.

## 5. Live Stat Overrides

The model can replace baseline team stats before projecting.

### 5.1 Basketball Reference paste import

`parseBBRefCSV(...)` can overwrite defaults using pasted Basketball Reference values for:

- `offRtg`
- `defRtg`
- `netRtg`
- `pace`
- `efgPct`
- `oppEfgPct`
- `tovPct`
- `rebPct`
- `threePAr`

If live stats exist for a team:

- `liveStats[abbr]` is merged over the hardcoded baseline

### 5.2 Fallback behavior

If no live row exists:

- the baseline hardcoded team table is used as-is

This lets the app run even without a fresh import while still supporting faster updates when new team stats are pasted in.

## 6. Sportsbook Odds Parsing

The app supports:

- ESPN-fetched odds from scoreboard data
- manual single-game entry
- bulk pasted sportsbook text for the daily slate

The model ultimately normalizes these into:

- `homeMoneyline`
- `awayMoneyline`
- `spread`
- `spreadHomeOdds`
- `spreadAwayOdds`
- `overUnder`
- `overOdds`
- `underOdds`

Bulk sportsbook text parsing now lives in:

- [bulkOddsParser.ts](C:\projects\game_sims\nba-predictor\src\lib\bulkOddsParser.ts)

That parser is responsible only for turning pasted sportsbook text into normalized odds objects; it does not run simulations or grade outcomes.

## 7. Converting Sportsbook Terms Into Fair Probabilities

Before comparing model outputs to sportsbook prices, the model removes vig.

### 7.1 American odds to implied probability

Handled by `americanToImplied(...)`.

- negative odds: `-150 -> 150 / (150 + 100)`
- positive odds: `+130 -> 100 / (130 + 100)`

### 7.2 Vig removal

For two-way markets:

1. convert each side to implied probability
2. add both implied probabilities
3. divide each side by that total

This creates vig-adjusted fair market probabilities for:

- Money Line
- spread price
- over/under price

## 8. Money Line Bet Recommendation

The Money Line comparison lives in `analyzeBetting(...)`.

### 8.1 Model edges

- `homeEdge = modelHomeProb - marketHomeProb`
- `awayEdge = modelAwayProb - marketAwayProb`

### 8.2 Recommendation rule

- bet `home` if `homeEdge > 2.5%`
- bet `away` if `awayEdge > 2.5%`
- otherwise `none`

Displayed value:

- `mlValuePct = max(homeEdge, awayEdge) * 100`

## 9. Spread Recommendation

The spread model treats scoring margin as a simple normal-style distribution around projected point differential.

### 9.1 Projected margin

- `diff = projectedHomeScore - projectedAwayScore`

### 9.2 Standard deviation

- `std = 11.5`

### 9.3 Favorite cover probability

If `odds.spread <= 0`, the home team is laying the points.

The model computes:

- `spAbs = abs(odds.spread)`
- `favDiff = homeFav ? diff : -diff`
- `favCover = 1 - normCDF((spAbs - favDiff) / std)`
- `dogCover = 1 - favCover`

Then it maps those back to:

- `homeCoverProb`
- `awayCoverProb`

### 9.4 Spread recommendation rule

After vig removal on spread prices:

- bet the `home` spread side if edge exceeds `3.0%`
- bet the `away` spread side if edge exceeds `3.0%`
- otherwise `pass`

Displayed value:

- `spreadEdge = max(spreadHomeEdge, spreadAwayEdge) * 100`

## 10. Total Bet Recommendation

The model compares:

- `projectedTotal`
- sportsbook `overUnder`

### 10.1 Point-gap edge

- `ouEdge = projectedTotal - overUnder`

### 10.2 Recommendation rule

- `over` if `ouEdge > 2.0`
- `under` if `ouEdge < -2.0`
- `pass` otherwise

### 10.3 Probability-based total edge

The model also estimates:

- `pOver`
- `pUnder`

using the same normal-style distribution logic around projected total.

Then it compares those to vig-adjusted market probabilities to create:

- `ouEdgePct`

## 11. Kelly Sizing

The model calculates fractional Kelly-style staking suggestions for:

- Money Line
- spread
- over/under

Formula style:

- positive edges only
- scaled to approximately 25% Kelly

Examples:

- `kellyHome = (homeEdge / (1 - marketHomeProb)) * 0.25`
- `kellyAway = (awayEdge / (1 - marketAwayProb)) * 0.25`

Spread and total Kelly use the same edge-over-price structure after vig removal.

If an edge is negative, Kelly is `0`.

## 12. CSV Export Logic

The Predictor tab export creates a daily export row for each loaded game.

It includes:

- projected points
- projected total
- model Money Line
- explicit Money Line recommendation
- sportsbook Money Line
- sportsbook over and under prices
- sportsbook spread line
- sportsbook spread prices for both sides
- Money Line edge
- Kelly percentages
- spread recommendation
- spread edge
- over/under recommendation
- over/under edge
- team rating snapshot
- stats source
- odds source
- lookup key for later grading

If a simulation has not already been run for a row, export will generate one on demand using the same `predictGame(...)` engine.

### 12.1 Recent export additions for grading

Recent workflow changes expanded the export so post-bet evaluation can be done without assuming default prices.

Important exported fields now include:

- `ML Rec`
- `Vegas H ML`
- `Vegas A ML`
- `Vegas O/U`
- `Over Odds`
- `Under Odds`
- `Vegas Spread`
- `Spread Home Odds`
- `Spread Away Odds`
- `LookupKey`

These fields are used by the evaluator to grade:

- whether a Money Line recommendation actually existed
- which side was recommended
- which price was available for the recommended spread or total bet
- per-bet ROI in unit terms

### 12.2 Money Line grading change

Older grading logic could infer a Money Line side from whichever team had win probability above `50%`.

The current workflow is more explicit:

- the predictor export writes `ML Rec`
- the evaluation flow grades Money Line only when that field contains a real recommendation
- `PASS` means no Money Line wager should be counted

This is important because:

- a predicted winner is not always a bet
- a bet exists only when model edge versus sportsbook price crosses the recommendation threshold

## 13. Post-Bet Evaluation Workflow

The app now supports a dedicated evaluation pass using:

- exported Predictions CSV
- exported Results CSV

The evaluation logic currently lives in:

- [modelEvaluation.ts](C:\projects\game_sims\nba-predictor\src\lib\modelEvaluation.ts)
- [ModelEvaluation.tsx](C:\projects\game_sims\nba-predictor\src\components\ModelEvaluation.tsx)

The in-app Results tracker workflow also now has its own extracted parsing/state layer:

- [resultsTracker.ts](C:\projects\game_sims\nba-predictor\src\lib\resultsTracker.ts)
- [useResultsTracker.ts](C:\projects\game_sims\nba-predictor\src\hooks\useResultsTracker.ts)
- [ResultsTracker.tsx](C:\projects\game_sims\nba-predictor\src\components\ResultsTracker.tsx)

The evaluator:

- parses both CSV files
- matches games by `LookupKey`
- grades Money Line, spread, and total recommendations
- tracks `WIN`, `LOSS`, `PUSH`, or `PENDING`
- computes unit-based ROI from exported market odds

Compatibility notes:

- newer prediction exports carry the explicit structured odds fields
- older exports can still be evaluated with fallback assumptions for spread and total pricing

## 14. Worked Example

This example uses rounded values to explain the NBA flow. It is illustrative, not a promise of a live output.

### 13.1 Example inputs

Home team:

- `offRtg = 119.0`
- `defRtg = 112.0`
- `pace = 99.5`
- `netRtg = 7.0`
- `efgPct = 56.0`
- `oppEfgPct = 53.0`
- `tovPct = 12.0`
- `rebPct = 52.0`
- `threePAr = 42.0`

Away team:

- `offRtg = 114.0`
- `defRtg = 116.0`
- `pace = 98.0`
- `netRtg = -2.0`
- `efgPct = 54.0`
- `oppEfgPct = 55.0`
- `tovPct = 13.5`
- `rebPct = 49.0`
- `threePAr = 38.0`

Game context:

- regular season
- home team not on a back-to-back
- away team on a back-to-back

### 13.2 Pace

- average pace is about `98.75`
- no playoff slowdown applies

### 13.3 Base rating layer

Home base rating:

- halfway between `119.0` offense and `116.0` opponent defense

Away base rating:

- halfway between `114.0` offense and `112.0` opponent defense

So before matchup adjustments:

- the home side starts stronger
- the away side remains competitive, but lower

### 13.4 Matchup layer

The home side gains from:

- stronger eFG matchup
- lower turnover rate
- better rebounding
- higher three-point volume

The away side gets the opposite adjustment.

### 13.5 Margin and total

Then the model adds:

- net rating prior
- home court edge
- away back-to-back penalty

That pushes projected margin further toward the home side.

Projected scores might land in a shape like:

- home `116.8`
- away `109.9`

Projected total:

- `226.7`

### 13.6 Win probability

That projected margin is converted through the logistic transform into a home win probability, for example:

- home win probability in the low-to-mid `70%` range

Exact output depends on the specific team inputs and live overrides.

## 15. Calibration Notes

The current NBA model is still a hand-built rating model, not a trained closing-line model.

That means:

- it should be treated as a structured estimate, not a fully calibrated forecast system
- the current version intentionally uses a softer formula than the older one
- the best next step is historical backtesting against actual results and closing spreads

The most likely future improvements are:

- recalibrating win probability from historical NBA margin data
- tuning spread and total standard deviations from real game distributions
- weighting recent form separately from season-long baselines
- adding injury and lineup adjustments
- benchmarking model outputs against market close for calibration diagnostics

## 16. Testing Coverage Around The Model

The current refactor also added targeted coverage around the extracted prediction workflow pieces.

Important tests now include:

- [betting.test.ts](C:\projects\game_sims\nba-predictor\src\lib\betting.test.ts)
- [bulkOddsParser.test.ts](C:\projects\game_sims\nba-predictor\src\lib\bulkOddsParser.test.ts)
- [usePredictorState.test.ts](C:\projects\game_sims\nba-predictor\src\hooks\usePredictorState.test.ts)
- [useResultsTracker.test.ts](C:\projects\game_sims\nba-predictor\src\hooks\useResultsTracker.test.ts)
- [SingleGameResults.test.tsx](C:\projects\game_sims\nba-predictor\src\components\SingleGameResults.test.tsx)

These do not fully validate model quality, but they do protect:

- odds normalization
- predictor state transitions
- results import/grading aggregation
- single-game recommendation rendering
