# Game Intelligence Cards And Composite Recommendation Roadmap

## Summary
The schedule analysis flow is now centered on expandable per-game intelligence cards instead of a best-bets-only output. Each card combines the current simulation/model view, market lines, team comparison context, sharp-betting signals, injury status, and recent team form into one panel for the matchup. Composite recommendation infrastructure exists in the data model and export flow, but the live UI is intentionally still sim-first while the richer recommendation layer is staged in.

## Key Changes
### 1. Promote each game row into a full intelligence card
- Keep the current schedule load, odds editing, sim runs, and export flow.
- Replace the previous emphasis on the bottom best-bets summary with expandable game cards as the main output surface.
- Each card now presents:
  - matchup and game metadata
  - simulation results and market-by-market model recommendations
  - `MODEL & MARKET` card
  - `TEAM COMPARISON` card
  - `SHARP INFORMATION` card
  - injury section
  - recent-results / trend section
- Keep a compact ranked summary above the cards, but treat it as an overview layer rather than the final product.

### 2. Add a composite recommendation layer above the existing betting analysis
- Leave the prediction engine and `analyzeBetting` math unchanged for this phase.
- Add a new recommendation engine that combines:
  - model edge outputs
  - sharp market signals
- Composite output already supports:
  - primary recommended play
  - numeric score
  - tier label
  - pass/no-play state
  - short reason tags explaining why the card is rated where it is
- Injuries and recent results are displayed on the card but do not directly change the composite score in v1.
- The current UI intentionally still emphasizes simulation output and betting breakdowns rather than a final composite pick.

### 3. Add sharp-signal support as normalized game data
- Extend the schedule row and domain model to store normalized sharp inputs alongside current odds and sim data.
- Support a fuller sharp-info schema, with fields remaining optional when a feed is not available:
  - opening/current line movement
  - public bet / money splits
  - CLV-related leans
  - steam / reverse-line-move / consensus-style flags
- Use a normalization layer so manual entry, imports, and future live providers can map into the same internal sharp-signal model.
- Current sharp inputs are still manual-entry driven, but the normalization path and recommendation scaffolding are in place.

### 4. Add injury and trend context as timestamped intelligence
- Injury data structures now store:
  - player/team injury note
  - status
  - source label when available
  - `lastUpdated` timestamp
- Timestamping injury info is important:
  - injury news gets stale quickly
  - users need to know whether a recommendation is based on fresh injury info or older context
  - the UI should show a freshness indicator like "updated 18 min ago" or an absolute timestamp
- Recent-results context now also carries source/freshness metadata and shows:
  - recent game outcomes and form summary
  - dates
  - home/away indicators
  - game scores
  - `lastUpdated` metadata from ESPN
- ESPN injury fetching is now implemented through team roster endpoints during `LOAD GAMES`.
- Head-to-head data is intentionally out of scope.

## Public Interfaces / Types
- `src/lib/nbaTypes.ts` now contains types for:
  - `SharpSignalInput`
  - `SharpMarketContext`
  - `InjuryInfo`
  - `RecentFormSummary`
  - `CompositeRecommendation`
- `ScheduleRow` now carries:
  - sharp context
  - injury context
  - recent-form context
  - final composite recommendation
- A helper module near `src/lib/betting.ts` owns:
  - sharp-signal normalization
  - composite scoring
  - tier assignment
  - explanation tag generation
- `src/components/ScheduleAnalysis.tsx` now renders the main expandable intelligence-card surface.
- `src/lib/espn.ts` now owns both recent-form fetching and ESPN roster-based injury fetching.

## Export / Evaluation
- Predictions export now includes composite recommendation fields:
  - primary recommended play
  - score
  - tier
  - reason tags
- It also includes optional freshness/context fields where useful for later auditing:
  - injury last-updated timestamp
  - sharp-data timestamp if available
- Keep post-bet evaluation backward-compatible with older CSVs.
- Evaluation should distinguish:
  - raw model market recommendations
  - final composite-primary recommendation

## Current UI State
- Game cards are closed by default beneath the Single Game Tools panel.
- `MODEL & MARKET` shows:
  - Vegas and manual rows
  - projection summary
  - ML / total / spread edge breakdowns
- `TEAM COMPARISON` shows:
  - net rating edge
  - pace
  - eFG
  - TOV
  - ORB%
  - 3PAr
  - AST%
  - B2B
- `SHARP INFORMATION` now uses:
  - `RECENT FORM` on the left
  - `PROJECTED STARTERS` on the right
  - `SHARP` below recent form
  - `INJURIES` below projected starters
  - inline italic freshness text for each section
- Injury display is split side by side by team, with away-team styling matching the away recent-form styling.
- Projected starters are fetched from ESPN depth chart pages and matching injury designations are appended inline in red.
- Manual line overrides are surfaced with an `EDITED` badge on the game card header.

## Assumptions And Defaults
- The existing model engine is unchanged in this phase.
- Composite recommendations are driven by model + sharp inputs only in v1.
- Injuries and recent results are context panels, not scoring inputs, for now.
- Injury timestamps are required whenever the source provides them, and the UI should surface freshness clearly.
- Head-to-head data is out of scope.
- The final UX centers on rich per-game intelligence cards, with any ranked summary acting as a secondary overview.
