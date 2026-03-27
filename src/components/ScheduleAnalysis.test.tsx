import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeSharpSignals } from '../lib/compositeRecommendation'
import type { MarketDataGameSnapshot } from '../lib/marketData'
import { deriveSharpInputFromMarketData } from '../lib/sharpSignals'

import ScheduleAnalysis from './ScheduleAnalysis'
import type {
  BettingAnalysis,
  EditableOddsFields,
  LiveStatsMap,
  OddsInput,
  PredictionResult,
  ScheduleRow,
  TeamAbbr,
  TeamStats,
} from '../lib/nbaTypes'

const makeTeam = (name: string): TeamStats => ({
  name,
  color: '#123456',
  alt: '#654321',
  div: 'Atlantic',
  conf: 'East',
  offRtg: 118,
  defRtg: 110,
  pace: 99,
  netRtg: 8,
  tsPct: 58,
  rebPct: 52,
  astPct: 61,
  tovPct: 12.5,
  efgPct: 55.2,
  oppEfgPct: 52.1,
  threePAr: 0.41,
  arena: 'Arena',
  capacity: 18000,
})

const prediction: PredictionResult = {
  hWinProb: 0.62,
  aWinProb: 0.38,
  hScore: '114.0',
  aScore: '108.0',
  total: '222.0',
  projDiff: '6.0',
  isPlayoff: false,
  features: [{ label: 'Net Rating', good: true, detail: '+6.0' }],
}

const editedOdds: OddsInput = {
  source: 'manual',
  homeMoneyline: -140,
  awayMoneyline: 120,
  spread: -3.5,
  spreadHomeOdds: -110,
  spreadAwayOdds: -110,
  overUnder: 218.5,
  overOdds: -110,
  underOdds: -110,
}

const espnOdds: OddsInput = {
  ...editedOdds,
  source: 'espn',
}

const bulkEditedOdds: OddsInput = {
  source: 'manual',
  homeMoneyline: -165,
  awayMoneyline: 140,
  spread: -4.5,
  spreadHomeOdds: -108,
  spreadAwayOdds: -112,
  overUnder: 220.5,
  overOdds: -105,
  underOdds: -115,
}

const evenMoneyEditedOdds: OddsInput = {
  source: 'manual',
  homeMoneyline: -120,
  awayMoneyline: 0,
  spread: -1.5,
  spreadHomeOdds: -118,
  spreadAwayOdds: -102,
  overUnder: 222.5,
  overOdds: -108,
  underOdds: -112,
}

const analysis: BettingAnalysis = {
  homeImpliedProb: 0.58,
  awayImpliedProb: 0.42,
  homeEdge: 0.04,
  awayEdge: -0.04,
  mlValueSide: 'home',
  mlValuePct: 4.2,
  spreadRec: 'home -3.5',
  spreadEdge: 3.1,
  ouRec: 'over',
  ouEdge: 3.5,
  ouEdgePct: 2.6,
  homeCoverProb: 0.55,
  awayCoverProb: 0.45,
  spHIC: 0,
  spAIC: 0,
  ovIC: 0,
  unIC: 0,
  pOver: 0.54,
  pUnder: 0.46,
  kellyHome: 0.08,
  kellyAway: 0,
  kellySpread: 0.04,
  kellyOU: 0.03,
}

const makeRow = (): ScheduleRow => ({
  game: {
    homeAbbr: 'BOS',
    awayAbbr: 'LAL',
    gameTime: '7:30 PM EDT',
    tvInfo: 'ESPN',
  },
  espnOdds,
  marketData: null,
  editedOdds,
  simResult: prediction,
  homeB2B: false,
  awayB2B: true,
  sharpInput: null,
  sharpContext: null,
  injuries: [
    {
      team: 'LAL',
      player: 'LeBron James',
      status: 'Out',
      note: 'LeBron James - Out',
      source: 'ESPN roster',
      lastUpdated: '2026-03-24T01:00:00.000Z',
    },
  ],
  projectedStarters: {
    home: {
      team: 'BOS',
      starters: [
        { position: 'PG', player: 'Jrue Holiday', stats: { pts: 14.1, ast: 5.8, reb: 4.4 } },
        { position: 'SG', player: 'Derrick White', stats: { pts: 16.2, ast: 4.9, reb: 4.1 } },
        { position: 'SF', player: 'Jaylen Brown', stats: { pts: 25.1, ast: 4.3, reb: 6.6 } },
        { position: 'PF', player: 'Jayson Tatum', stats: { pts: 27.4, ast: 5.9, reb: 8.7 } },
        { position: 'C', player: 'Kristaps Porzingis', stats: { pts: 20.2, ast: 1.9, reb: 7.4 } },
      ],
      source: 'ESPN depth chart',
      lastUpdated: '2026-03-24T01:05:00.000Z',
    },
    away: {
      team: 'LAL',
      starters: [
        { position: 'PG', player: 'Luka Doncic', stats: { pts: 33.4, ast: 8.4, reb: 8.0 } },
        { position: 'SG', player: 'Austin Reaves', stats: { pts: 19.1, ast: 5.7, reb: 4.8 } },
        { position: 'SF', player: 'LeBron James', stats: { pts: 25.2, ast: 7.8, reb: 7.5 } },
        { position: 'PF', player: 'Rui Hachimura', stats: { pts: 13.7, ast: 1.4, reb: 5.3 } },
        { position: 'C', player: 'Jaxson Hayes', stats: { pts: 6.8, ast: 0.9, reb: 5.9 } },
      ],
      source: 'ESPN depth chart',
      lastUpdated: '2026-03-24T01:05:00.000Z',
    },
  },
  recentForm: {
    home: {
      team: 'BOS',
      wins: 4,
      losses: 1,
      avgMargin: 6.2,
      streak: 'W2',
      source: 'ESPN scoreboard',
      lastUpdated: '2026-03-24T01:10:00.000Z',
      games: [
        { date: '2026-03-20', opponent: 'LAL', venue: 'vs.', result: 'W', pointsFor: 118, pointsAgainst: 111 },
      ],
    },
    away: {
      team: 'LAL',
      wins: 3,
      losses: 2,
      avgMargin: 2.4,
      streak: 'L1',
      source: 'ESPN scoreboard',
      lastUpdated: '2026-03-24T01:10:00.000Z',
      games: [
        { date: '2026-03-20', opponent: 'BOS', venue: 'at', result: 'L', pointsFor: 111, pointsAgainst: 118 },
      ],
    },
  },
  compositeRecommendation: null,
})

const makeSharpRow = (): ScheduleRow => ({
  ...makeRow(),
  sharpInput: {
    source: 'manual',
    lastUpdated: '2026-03-24T01:15:00.000Z',
    openingHomeMoneyline: -120,
    openingAwayMoneyline: 110,
    openingSpread: -2.5,
    openingTotal: 216.5,
    moneylineHomeBetsPct: 42,
    moneylineHomeMoneyPct: 58,
    spreadHomeBetsPct: 46,
    spreadHomeMoneyPct: 61,
    totalOverBetsPct: 63,
    totalOverMoneyPct: 49,
    clvLean: ['home', 'under'],
    steamMoveLean: ['over'],
    reverseLineMoveLean: ['away'],
    consensusMoneyline: 'home',
    consensusSpread: 'away',
    consensusTotal: 'under',
    notes: 'Books moved toward Boston while over stayed public.',
  },
})

const marketData: MarketDataGameSnapshot = {
  game: { homeAbbr: 'BOS', awayAbbr: 'LAL' },
  provider: 'opticOdds',
  sourceLabel: 'OpticOdds',
  lastUpdated: '2026-03-24T01:15:00.000Z',
  opener: {
    timestamp: '2026-03-24T00:15:00.000Z',
    homeMoneyline: -120,
    awayMoneyline: 110,
    spread: -2.5,
    spreadHomeOdds: -110,
    spreadAwayOdds: -110,
    total: 216.5,
    totalOverOdds: -110,
    totalUnderOdds: -110,
  },
  current: {
    timestamp: '2026-03-24T01:15:00.000Z',
    homeMoneyline: -145,
    awayMoneyline: 125,
    spread: -4,
    spreadHomeOdds: -110,
    spreadAwayOdds: -110,
    total: 220,
    totalOverOdds: -110,
    totalUnderOdds: -110,
  },
  books: [
    {
      bookId: 'draftkings',
      bookName: 'DraftKings',
      timestamp: '2026-03-24T01:15:00.000Z',
      homeMoneyline: -145,
      awayMoneyline: 125,
      spread: {
        home: { line: -4, odds: -110 },
        away: { line: 4, odds: -110 },
      },
      total: {
        over: { line: 220, odds: -110 },
        under: { line: 220, odds: -110 },
      },
    },
    {
      bookId: 'fanduel',
      bookName: 'FanDuel',
      timestamp: '2026-03-24T01:15:00.000Z',
      homeMoneyline: -150,
      awayMoneyline: 128,
      spread: {
        home: { line: -4.5, odds: -110 },
        away: { line: 4.5, odds: -110 },
      },
      total: {
        over: { line: 220.5, odds: -112 },
        under: { line: 220.5, odds: -108 },
      },
    },
  ],
}

const teams = {
  BOS: makeTeam('Boston Celtics'),
  LAL: makeTeam('Los Angeles Lakers'),
} as Record<TeamAbbr, TeamStats>

const baseEditFields: Partial<EditableOddsFields> = {}
const liveStats = {} as LiveStatsMap

function renderScheduleAnalysis(row: ScheduleRow) {
  return render(
    <ScheduleAnalysis
      card={{}}
      analyzeBetting={() => analysis}
      mlAmerican={(probability) => (probability >= 0.5 ? '-163' : '+163')}
      predictGame={() => prediction}
      liveStats={liveStats}
      TEAMS={teams}
      showBulkImport={false}
      setShowBulkImport={vi.fn()}
      bulkError=""
      bulkStatus=""
      bulkPaste=""
      setBulkPaste={vi.fn()}
      handleBulkImport={vi.fn()}
      linesRows={[row]}
      setLinesRows={vi.fn()}
      showLines
      schedStatus=""
      schedLoading={false}
      simsRunning={false}
      handleLoadSchedule={vi.fn()}
      handleRunAllSims={vi.fn()}
      handleExport={vi.fn()}
      handleFetchResults={vi.fn()}
      fetchingResults={false}
      editingIdx={null}
      setEditingIdx={vi.fn()}
      editFields={baseEditFields}
      setEditFields={vi.fn()}
      startEdit={vi.fn()}
      saveEdit={vi.fn()}
    />,
  )
}

describe('ScheduleAnalysis', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows an EDITED badge on manually edited game cards', () => {
    renderScheduleAnalysis(makeRow())

    expect(screen.getByText('EDITED')).toBeInTheDocument()
    expect(screen.getByText('7:30 PM EDT · Vegas Line')).toBeInTheDocument()
    expect(screen.getByText('LAL +120 / BOS -140 | LAL +3.5 -110 / BOS -3.5 -110 | O/U 218.5 (-110 / -110)')).toBeInTheDocument()
    expect(screen.getByText('NO SHARP')).toBeInTheDocument()
    expect(screen.getByText('No live sharp source attached')).toBeInTheDocument()
  })

  it('shows both loaded and edited odds in the game card header when they differ', () => {
    renderScheduleAnalysis({ ...makeRow(), editedOdds: bulkEditedOdds })

    expect(screen.getByText('7:30 PM EDT · Edited, Using Manual Line')).toBeInTheDocument()
    expect(screen.getByText('V - LAL +120 / BOS -140 | LAL +3.5 -110 / BOS -3.5 -110 | O/U 218.5 (-110 / -110)')).toBeInTheDocument()
    expect(screen.getByText('M - LAL +140 / BOS -165 | LAL +4.5 -112 / BOS -4.5 -108 | O/U 220.5 (-105 / -115)')).toBeInTheDocument()
  })

  it('renders even money as 100 in the compact header odds display', () => {
    renderScheduleAnalysis({
      ...makeRow(),
      game: { ...makeRow().game, homeAbbr: 'CHA', awayAbbr: 'NYK', gameTime: '7:00 PM EDT', tvInfo: 'FanDuel SN SE, MSG, NBA TV' },
      editedOdds: evenMoneyEditedOdds,
      espnOdds: evenMoneyEditedOdds,
    })

    expect(screen.getByText('7:00 PM EDT · Vegas Line')).toBeInTheDocument()
    expect(screen.getByText('NYK +100 / CHA -120 | NYK +1.5 -102 / CHA -1.5 -118 | O/U 222.5 (-108 / -112)')).toBeInTheDocument()
  })

  it('renders projected starters with inline injury designations', () => {
    renderScheduleAnalysis(makeRow())

    fireEvent.click(screen.getByRole('button', { name: 'OPEN CARD' }))

    expect(screen.getByText('SHARP INFORMATION')).toBeInTheDocument()
    expect(screen.getByText('PROJECTED STARTERS')).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.textContent === 'PG: Jrue Holiday - 14.1 PPG 5.8 APG')).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => element?.textContent === 'SF: LeBron James - 25.2 PPG 7.5 RPG - Out'),
    ).toBeInTheDocument()
  })

  it('renders the redesigned sharp information sections', () => {
    renderScheduleAnalysis(makeSharpRow())

    fireEvent.click(screen.getByRole('button', { name: 'OPEN CARD' }))

    expect(screen.getByText('RECENT FORM')).toBeInTheDocument()
    expect(screen.getByText('PROJECTED STARTERS')).toBeInTheDocument()
    expect(screen.getByText('MARKET SIGNALS')).toBeInTheDocument()
    expect(screen.getByText('INJURIES')).toBeInTheDocument()
    expect(screen.getByText('SHARP SUPPORT BOARD')).toBeInTheDocument()
    expect(screen.getByText('LINE MOVES')).toBeInTheDocument()
    expect(screen.getByText('MOVE SUMMARY')).toBeInTheDocument()
    expect(screen.getByText('SPLITS')).toBeInTheDocument()
    expect(screen.getByText('CONSENSUS')).toBeInTheDocument()
    expect(screen.getByText('Vegas Open')).toBeInTheDocument()
    expect(screen.getByText('Vegas Current')).toBeInTheDocument()
    expect(screen.getByText('Manual Current')).toBeInTheDocument()
    expect(screen.getByText('Market read: BOS support')).toBeInTheDocument()
    expect(screen.getByText('MANUAL SHARP')).toBeInTheDocument()
    expect(screen.getByText((content) => content.startsWith('Sharp source: manual'))).toBeInTheDocument()
    expect(screen.getByText('BOS ML')).toBeInTheDocument()
    expect(screen.getByText('4/6')).toBeInTheDocument()
    expect(screen.getByText('Model agrees: BOS ML edge')).toBeInTheDocument()
    expect(screen.getByText('UNDER')).toBeInTheDocument()
    expect(screen.getByText('3/6')).toBeInTheDocument()
    expect(screen.getByText('Model differs: OVER edge')).toBeInTheDocument()
    expect(screen.getByText('Books moved toward Boston while over stayed public.')).toBeInTheDocument()
    expect(screen.getByText('CLV: HOME, UNDER')).toBeInTheDocument()
    expect(screen.getByText('ML: BOS')).toBeInTheDocument()
    expect(screen.getByText('Total: UNDER')).toBeInTheDocument()
  })

  it('refreshes live sharp context from market snapshots', () => {
    const row = { ...makeRow(), marketData }
    const setLinesRows = vi.fn()

    render(
      <ScheduleAnalysis
        card={{}}
        analyzeBetting={() => analysis}
        mlAmerican={(probability) => (probability >= 0.5 ? '-163' : '+163')}
        predictGame={() => prediction}
        liveStats={liveStats}
        TEAMS={teams}
        showBulkImport={false}
        setShowBulkImport={vi.fn()}
        bulkError=""
        bulkStatus=""
        bulkPaste=""
        setBulkPaste={vi.fn()}
        handleBulkImport={vi.fn()}
        linesRows={[row]}
        setLinesRows={setLinesRows}
        showLines
        schedStatus=""
        schedLoading={false}
        simsRunning={false}
        handleLoadSchedule={vi.fn()}
        handleRunAllSims={vi.fn()}
        handleExport={vi.fn()}
        handleFetchResults={vi.fn()}
        fetchingResults={false}
        editingIdx={null}
        setEditingIdx={vi.fn()}
        editFields={baseEditFields}
        setEditFields={vi.fn()}
        startEdit={vi.fn()}
        saveEdit={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'REFRESH LIVE SHARP' }))

    expect(setLinesRows).toHaveBeenCalledTimes(1)
    const updater = setLinesRows.mock.calls[0]?.[0]
    expect(typeof updater).toBe('function')

    const [updatedRow] = updater([row])
    expect(updatedRow.sharpInput).toEqual(deriveSharpInputFromMarketData(row.marketData, row.editedOdds))
    expect(updatedRow.sharpInput?.source).toBe('OpticOdds')
    expect(updatedRow.sharpInput?.notes).toContain('consensus sample')
    expect(updatedRow.sharpContext).toEqual(normalizeSharpSignals(updatedRow.sharpInput, updatedRow.editedOdds))
  })
})
