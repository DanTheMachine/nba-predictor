import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeSharpSignals } from '../lib/compositeRecommendation'

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
        { position: 'PG', player: 'Jrue Holiday' },
        { position: 'SG', player: 'Derrick White' },
        { position: 'SF', player: 'Jaylen Brown' },
        { position: 'PF', player: 'Jayson Tatum' },
        { position: 'C', player: 'Kristaps Porzingis' },
      ],
      source: 'ESPN depth chart',
      lastUpdated: '2026-03-24T01:05:00.000Z',
    },
    away: {
      team: 'LAL',
      starters: [
        { position: 'PG', player: 'Luka Doncic' },
        { position: 'SG', player: 'Austin Reaves' },
        { position: 'SF', player: 'LeBron James' },
        { position: 'PF', player: 'Rui Hachimura' },
        { position: 'C', player: 'Jaxson Hayes' },
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
  })

  it('renders projected starters with inline injury designations', () => {
    renderScheduleAnalysis(makeRow())

    fireEvent.click(screen.getByRole('button', { name: 'OPEN CARD' }))

    expect(screen.getByText('SHARP INFORMATION')).toBeInTheDocument()
    expect(screen.getByText('PROJECTED STARTERS')).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => element?.textContent === 'SF: LeBron James - Out'),
    ).toBeInTheDocument()
  })

  it('renders the redesigned sharp information sections', () => {
    renderScheduleAnalysis(makeSharpRow())

    fireEvent.click(screen.getByRole('button', { name: 'OPEN CARD' }))

    expect(screen.getByText('RECENT FORM')).toBeInTheDocument()
    expect(screen.getByText('PROJECTED STARTERS')).toBeInTheDocument()
    expect(screen.getByText('MARKET SIGNALS')).toBeInTheDocument()
    expect(screen.getByText('INJURIES')).toBeInTheDocument()
    expect(screen.getByText('LINE MOVES')).toBeInTheDocument()
    expect(screen.getByText('MOVE SUMMARY')).toBeInTheDocument()
    expect(screen.getByText('SPLITS')).toBeInTheDocument()
    expect(screen.getByText('CONSENSUS')).toBeInTheDocument()
    expect(screen.getByText('Vegas Open')).toBeInTheDocument()
    expect(screen.getByText('Vegas Current')).toBeInTheDocument()
    expect(screen.getByText('Manual Current')).toBeInTheDocument()
    expect(screen.getByText('Market read: BOS support')).toBeInTheDocument()
    expect(screen.getByText('Books moved toward Boston while over stayed public.')).toBeInTheDocument()
    expect(screen.getByText('CLV: HOME, UNDER')).toBeInTheDocument()
    expect(screen.getByText('ML: BOS')).toBeInTheDocument()
    expect(screen.getByText('Total: UNDER')).toBeInTheDocument()
  })

  it('loads sample sharp context into existing schedule rows', () => {
    const row = makeRow()
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

    fireEvent.click(screen.getByRole('button', { name: 'LOAD SAMPLE SHARP' }))

    expect(setLinesRows).toHaveBeenCalledTimes(1)
    const updater = setLinesRows.mock.calls[0]?.[0]
    expect(typeof updater).toBe('function')

    const [updatedRow] = updater([row])
    expect(updatedRow.sharpInput?.source).toBe('sample')
    expect(updatedRow.sharpInput?.notes).toContain('sample sharp context')
    expect(updatedRow.sharpContext).toEqual(normalizeSharpSignals(updatedRow.sharpInput, updatedRow.editedOdds))
  })
})
