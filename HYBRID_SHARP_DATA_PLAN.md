# Hybrid Sharp Data Plan

## Goal

Replace the current sample sharp loader with a hybrid live market-data pipeline that:

- fetches real sportsbook odds from one provider
- stores raw opener/current/book-by-book market snapshots
- derives sharp-style signals from those snapshots
- maps the derived output into the existing `sharpInput` and `sharpContext` UI model

## Why Hybrid

Most documented odds APIs provide live prices and line movement, but not full "sharp" metadata such as public ticket percentages, money percentages, or explicit steam / reverse-line-move flags.

The hybrid approach solves that by:

- buying or integrating live odds data from a provider
- computing consensus and movement signals ourselves
- leaving space to add premium split data later without replacing the UI contract

## Current State

- `ScheduleAnalysis.tsx` already renders `sharpInput` and `sharpContext`
- `LOAD SAMPLE SHARP` exists as a fallback for UI tuning / no-provider cases
- `normalizeSharpSignals` and composite recommendation logic already consume the sharp model
- the app already uses a local proxy pattern for ESPN requests
- a temporary VSiN paste adapter now exists for importing opener, current-line, and split data without an API

## Phase 1: Scaffolding And Contracts

Objective: create a stable internal market-data layer before wiring any live vendor.

Deliverables:

- `src/lib/marketData/types.ts`
  - raw provider-independent market snapshot types
  - book-level odds types
  - fetch request / response types
  - provider capability flags
- `src/lib/marketData/config.ts`
  - env-backed provider selection
  - provider key helpers
- `src/lib/marketData/providers.ts`
  - provider registry and capability metadata
- `src/lib/marketData/clients.ts`
  - unified client factory
  - stub provider clients returning structured "not configured / not implemented" results
- `.env.example`
  - provider-related placeholders

Success criteria:

- project still builds and typechecks
- no UI behavior changes yet
- one typed place exists for future live market-data integration

## Phase 2: First Provider Integration

Objective: connect one real odds vendor.

Recommended order:

1. OpticOdds
2. SportsDataIO

Deliverables:

- one concrete provider client
- normalized raw book-by-book snapshots
- opener/current timestamps and source labeling
- graceful failure states for missing keys, rate limits, and upstream errors

## Phase 3: Schedule Wiring

Objective: fetch market snapshots during the schedule workflow.

Deliverables:

- add market-data fetch step to the `LOAD GAMES` pipeline
- match provider games to existing schedule rows
- attach raw market snapshots to each game row
- keep schedule load resilient if the provider is unavailable

## Phase 4: Derived Sharp Engine

Objective: compute sharp-style signals from raw snapshots.

Derived outputs:

- opening vs current movement
- consensus line
- consensus side
- steam-style flags
- reverse-line-move heuristics
- support-board scores
- source and freshness timestamps

Deliverables:

- `src/lib/sharpSignals.ts` or equivalent derivation module
- mapping into existing `SharpSignalInput`
- compatibility with `normalizeSharpSignals`

## Phase 5: UI Transition

Objective: stop using fake sharp data.

Deliverables:

- replace `LOAD SAMPLE SHARP` with `LOAD LIVE SHARP`, or fold sharp loading into `LOAD GAMES`
- show source, freshness, and fallback states clearly
- preserve manual sharp editing as an override path

Status:

- provider-backed live sharp still depends on market-data API keys
- the UI now also supports a temporary `VSiN Import` path through the existing bulk import flow
- `LOAD SAMPLE SHARP` remains useful as a no-provider fallback

## Phase 6: Testing

Coverage targets:

- provider response normalization
- line-move and consensus calculations
- steam / reverse-line-move heuristics
- schedule-row integration
- fallback behavior when the provider is unavailable

## Phase 7: Phase-2 Enhancements

Possible follow-ups after live odds are working:

- historical storage for CLV tracking
- premium split data provider integration
- richer manual override UI
- multi-provider comparison
- book weighting for sharper consensus

## Temporary VSiN Adapter

Objective: capture as much sharp-style data as possible without paying for a live split API.

Current behavior:

- the bulk import box auto-detects pasted VSiN-style sections
- supported sections currently include:
  - spread board
  - moneyline board
  - totals board
  - splits board
- the adapter maps pasted data into:
  - `editedOdds` using current imported lines
  - `sharpInput` using opener and split fields

Intentional constraints:

- this is a temporary import adapter, not the long-term market-data architecture
- it should stay loosely coupled so we can swap it out for a real provider later
- it should not block or replace the existing provider-backed hybrid path

Recommended next steps for this adapter:

- add lightweight bulk-import UI guidance for multi-section VSiN paste
- add more parser fixtures from real-world paste variants
- consider exporting the parsed intermediary structure if we later support other board/splits sources
