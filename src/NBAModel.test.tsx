import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { downloadCsvMock } = vi.hoisted(() => ({
  downloadCsvMock: vi.fn(),
}))

vi.mock('./components/CourtBar', () => ({
  default: () => <div data-testid="court-bar" />,
}))

vi.mock('./components/ModelEvaluation', () => ({
  default: () => <div data-testid="model-evaluation" />,
}))

vi.mock('./components/ResultsTracker', () => ({
  default: () => <div data-testid="results-tracker" />,
}))

vi.mock('./components/StatBar', () => ({
  default: () => <div data-testid="stat-bar" />,
}))

vi.mock('./components/TeamCard', () => ({
  default: () => <div data-testid="team-card" />,
}))

vi.mock('./components/ScheduleAnalysis', () => ({
  default: ({
    linesRows,
    handleExport,
    handleLoadSchedule,
    handleRunAllSims,
  }: {
    linesRows: Array<{ simResult?: unknown; sharpInput?: { source?: string | null } | null }>
    handleExport: () => void
    handleLoadSchedule: () => void
    handleRunAllSims: () => void
  }) => {
    const hasSimResults = linesRows.some((row) => row.simResult)

    return (
      <div>
        <button onClick={handleLoadSchedule}>LOAD GAMES</button>
        {linesRows.some((row) => row.sharpInput?.source === 'OpticOdds') && <div>LIVE SHARP READY</div>}
        {linesRows.length > 0 && <button onClick={handleRunAllSims}>RUN ALL SIMS</button>}
        {hasSimResults && <button onClick={handleExport}>PREDICTIONS CSV</button>}
      </div>
    )
  },
}))

vi.mock('./lib/betting', () => ({
  americanToImplied: vi.fn((odds: number) => (odds < 0 ? Math.abs(odds) / (Math.abs(odds) + 100) : 100 / (odds + 100))),
  mlAmerican: vi.fn((prob: number) => (prob >= 0.5 ? '-150' : '+150')),
  analyzeBetting: vi.fn(() => ({
    mlValueSide: 'home',
    mlValuePct: 4.2,
    spreadRec: 'home -4.5',
    spreadEdge: 3.3,
    ouRec: 'over',
    ouEdge: 4.5,
    ouEdgePct: 5.1,
    kellyHome: 0.0312,
    kellyAway: 0,
    kellySpread: 0.0221,
    kellyOU: 0.0184,
  })),
}))

vi.mock('./lib/nbaModel', () => ({
  DIVISIONS: { Atlantic: ['BOS'], Pacific: ['LAL'] },
  GAME_TYPES: ['Regular Season', 'Playoffs'],
  TEAMS: {
    BOS: {
      name: 'Celtics',
      color: '#008348',
      alt: '#ffffff',
      offRtg: 120.1,
      defRtg: 110.2,
      netRtg: 9.9,
      efgPct: 57.1,
      tovPct: 12.4,
      rebPct: 51.7,
      pace: 98.8,
    },
    LAL: {
      name: 'Lakers',
      color: '#552583',
      alt: '#fdb927',
      offRtg: 115.4,
      defRtg: 113.8,
      netRtg: 1.6,
      efgPct: 54.2,
      tovPct: 13.8,
      rebPct: 49.4,
      pace: 99.4,
    },
  },
  normalizeAbbr: vi.fn((value: string) => value),
  parseBBRefCSV: vi.fn(() => ({ stats: {}, count: 0, timestamp: 'stub' })),
  predictGame: vi.fn(() => ({
    hWinProb: 0.62,
    aWinProb: 0.38,
    hScore: '116.0',
    aScore: '108.0',
    total: '224.0',
    projDiff: '8.0',
    isPlayoff: false,
    features: [],
  })),
}))

vi.mock('./lib/espn', () => ({
  downloadCSV: downloadCsvMock,
  fetchB2BTeams: vi.fn(async () => new Set<string>()),
  fetchNBAColors: vi.fn(async () => ({})),
  fetchProjectedStarters: vi.fn(async () => ({
    BOS: { team: 'BOS', starters: [{ position: 'PG', player: 'Jrue Holiday' }, { position: 'SG', player: 'Derrick White' }, { position: 'SF', player: 'Jaylen Brown' }, { position: 'PF', player: 'Jayson Tatum' }, { position: 'C', player: 'Kristaps Porzingis' }], source: 'ESPN depth chart', lastUpdated: '2026-03-24T12:00:00.000Z' },
    LAL: { team: 'LAL', starters: [{ position: 'PG', player: 'Luka Doncic' }, { position: 'SG', player: 'Austin Reaves' }, { position: 'SF', player: 'LeBron James' }, { position: 'PF', player: 'Rui Hachimura' }, { position: 'C', player: 'Jaxson Hayes' }], source: 'ESPN depth chart', lastUpdated: '2026-03-24T12:00:00.000Z' },
  })),
  fetchRecentForm: vi.fn(async () => ({
    BOS: { team: 'BOS', games: [], wins: 0, losses: 0, avgMargin: 0, streak: '-', source: 'ESPN', lastUpdated: '2026-03-23T12:00:00.000Z' },
    LAL: { team: 'LAL', games: [], wins: 0, losses: 0, avgMargin: 0, streak: '-', source: 'ESPN', lastUpdated: '2026-03-23T12:00:00.000Z' },
  })),
  fetchTeamInjuries: vi.fn(async () => ({
    BOS: [{ team: 'BOS', player: 'Jaylen Brown', status: 'Day-To-Day', note: 'Jaylen Brown - Day-To-Day', source: 'ESPN roster', lastUpdated: '2026-03-23T14:00:00.000Z' }],
    LAL: [{ team: 'LAL', player: 'LeBron James', status: 'Out', note: 'LeBron James - Out', source: 'ESPN roster', lastUpdated: '2026-03-23T15:00:00.000Z' }],
  })),
  fetchTodaySchedule: vi.fn(async () => ({
    games: [{ homeAbbr: 'BOS', awayAbbr: 'LAL', gameTime: '7:30 PM' }],
    rawEvents: [{ id: 'event-1' }],
  })),
  parseOddsFromEvent: vi.fn(() => ({
    source: 'espn',
    homeMoneyline: -145,
    awayMoneyline: 125,
    spread: -4.5,
    spreadHomeOdds: -110,
    spreadAwayOdds: -105,
    overUnder: 220.5,
    overOdds: -112,
    underOdds: -108,
  })),
}))

vi.mock('./lib/marketData', () => ({
  createMarketDataClient: vi.fn(() => ({
    provider: {
      id: 'opticOdds',
      label: 'OpticOdds',
      capabilities: { opener: true, history: true, consensus: true, splits: false, live: true },
    },
    fetchGames: vi.fn(async () => ({
      provider: 'opticOdds',
      sourceLabel: 'OpticOdds',
      status: 'available',
      fetchedAt: '2026-03-24T12:00:00.000Z',
      capabilities: { opener: true, history: true, consensus: true, splits: false, live: true },
      games: [
        {
          game: { homeAbbr: 'BOS', awayAbbr: 'LAL' },
          provider: 'opticOdds',
          sourceLabel: 'OpticOdds',
          lastUpdated: '2026-03-24T12:30:00.000Z',
          opener: null,
          current: {
            timestamp: '2026-03-24T12:30:00.000Z',
            homeMoneyline: -142,
            awayMoneyline: 122,
            spread: -4,
            spreadHomeOdds: -110,
            spreadAwayOdds: -110,
            total: 220,
            totalOverOdds: -110,
            totalUnderOdds: -110,
          },
          books: [],
          metadata: {},
        },
      ],
      errors: [],
    })),
  })),
}))

vi.mock('./lib/sharpSignals', () => ({
  deriveSharpInputFromMarketData: vi.fn((marketData) =>
    marketData
      ? {
          source: 'OpticOdds',
          lastUpdated: '2026-03-24T12:30:00.000Z',
          openingHomeMoneyline: -120,
          openingAwayMoneyline: 110,
          openingSpread: -2.5,
          openingTotal: 216.5,
          consensusMoneyline: 'home',
          consensusSpread: 'home',
          consensusTotal: 'over',
          clvLean: ['home', 'over'],
          steamMoveLean: ['home'],
          reverseLineMoveLean: ['over'],
          notes: 'Derived from live market snapshots.',
        }
      : null,
  ),
}))

import NBAModel from './NBAModel'

describe('NBAModel export', () => {
  beforeEach(() => {
    downloadCsvMock.mockReset()
  })

  it('exports the prediction CSV with evaluator odds columns and explicit recommendations', async () => {
    render(<NBAModel />)

    fireEvent.click(screen.getByRole('button', { name: /load games/i }))
    expect(await screen.findByText('LIVE SHARP READY')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: /run all sims/i }))
    fireEvent.click(await screen.findByRole('button', { name: /predictions csv/i }))

    await waitFor(() => {
      expect(downloadCsvMock).toHaveBeenCalledTimes(1)
    })

    const [csvText, fileName] = downloadCsvMock.mock.calls[0] ?? []
    expect(fileName).toMatch(/^nba-predictions-\d{4}-\d{2}-\d{2}\.csv$/)

    const [headerRow, dataRow] = String(csvText).trim().split('\n')

    expect(headerRow).toContain('"ML Rec"')
    expect(headerRow).toContain('"Over Odds"')
    expect(headerRow).toContain('"Under Odds"')
    expect(headerRow).toContain('"Vegas Spread"')
    expect(headerRow).toContain('"Spread Home Odds"')
    expect(headerRow).toContain('"Spread Away Odds"')
    expect(headerRow).toContain('"Composite Market"')
    expect(headerRow).toContain('"Composite Pick"')
    expect(headerRow).toContain('"Composite Score"')
    expect(headerRow).toContain('"Composite Tier"')
    expect(headerRow).toContain('"LookupKey"')

    expect(dataRow).toContain('"HOME - BOS"')
    expect(dataRow).toContain('"-112"')
    expect(dataRow).toContain('"-108"')
    expect(dataRow).toContain('"-4.5"')
    expect(dataRow).toContain('"-110"')
    expect(dataRow).toContain('"-105"')
    expect(dataRow).toContain('"OVER"')
    expect(dataRow).toContain('"HOME -4.5"')
    expect(dataRow).toContain('"O/U"')
    expect(dataRow).toContain('"OVER 220.5"')
    expect(dataRow).toContain('"Model edge 5.1% on OVER 220.5')
    expect(dataRow).toMatch(/"\d{8}BOSLAL"/)
  })
})
