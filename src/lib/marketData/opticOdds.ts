import { normalizeAbbr } from '../nbaModel'
import { PROXY_BASE_URL } from '../proxyConfig'
import { OPTIC_ODDS_API_KEY, OPTIC_ODDS_SPORTSBOOKS } from './config'
import type {
  MarketDataBookSnapshot,
  MarketDataClient,
  MarketDataConsensusSnapshot,
  MarketDataFetchResult,
  MarketDataGameSnapshot,
  MarketDataRequest,
} from './types'
import { MARKET_DATA_PROVIDERS } from './providers'

type OpticOddsFixture = {
  id?: string
  start_date?: string
  home_competitors?: Array<{ id?: string; abbreviation?: string }>
  away_competitors?: Array<{ id?: string; abbreviation?: string }>
}

type OpticOddsOdd = {
  sportsbook?: string
  market_id?: string
  team_id?: string | null
  selection_line?: string | null
  price?: number | null
  points?: number | null
  timestamp?: number | null
}

type OpticOddsOddsFixture = {
  id?: string
  odds?: OpticOddsOdd[]
}

type OpticOddsDataResponse<T> = {
  data?: T[]
}

function toIsoDayRange(date: string): { start: string; end: string } {
  return {
    start: `${date}T00:00:00Z`,
    end: `${date}T23:59:59Z`,
  }
}

function fromUnixTimestamp(value: number | null | undefined): string {
  if (!value) return new Date().toISOString()
  return new Date(value * 1000).toISOString()
}

function safeAverage(values: Array<number | null | undefined>, digits = 0): number | null {
  const filtered = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (!filtered.length) return null
  const average = filtered.reduce((sum, value) => sum + value, 0) / filtered.length
  return digits > 0 ? Number(average.toFixed(digits)) : Math.round(average)
}

function buildProxyUrl(url: string): string {
  return `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(url)}`
}

async function fetchOpticOddsJson<T>(url: string): Promise<T> {
  const response = await fetch(buildProxyUrl(url), {
    headers: {
      'x-upstream-api-key': OPTIC_ODDS_API_KEY,
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpticOdds proxy ${response.status}: ${body.slice(0, 200)}`)
  }

  return response.json() as Promise<T>
}

function fixtureAbbrs(fixture: OpticOddsFixture): { homeAbbr: string | null; awayAbbr: string | null } {
  const homeAbbr = normalizeAbbr(fixture.home_competitors?.[0]?.abbreviation?.toUpperCase() ?? '')
  const awayAbbr = normalizeAbbr(fixture.away_competitors?.[0]?.abbreviation?.toUpperCase() ?? '')
  return {
    homeAbbr: homeAbbr || null,
    awayAbbr: awayAbbr || null,
  }
}

function buildBookSnapshots(
  fixture: OpticOddsFixture,
  oddsFixture: OpticOddsOddsFixture | undefined,
): MarketDataBookSnapshot[] {
  const homeTeamId = fixture.home_competitors?.[0]?.id ?? null
  const awayTeamId = fixture.away_competitors?.[0]?.id ?? null
  const bySportsbook = new Map<string, OpticOddsOdd[]>()

  for (const odd of oddsFixture?.odds ?? []) {
    const sportsbook = odd.sportsbook?.trim()
    if (!sportsbook) continue
    const existing = bySportsbook.get(sportsbook) ?? []
    existing.push(odd)
    bySportsbook.set(sportsbook, existing)
  }

  return Array.from(bySportsbook.entries()).map(([sportsbook, entries]) => {
    const moneylineHome = entries.find((entry) => entry.market_id === 'moneyline' && entry.team_id === homeTeamId)
    const moneylineAway = entries.find((entry) => entry.market_id === 'moneyline' && entry.team_id === awayTeamId)
    const spreadHome = entries.find((entry) => entry.market_id === 'point_spread' && entry.team_id === homeTeamId)
    const spreadAway = entries.find((entry) => entry.market_id === 'point_spread' && entry.team_id === awayTeamId)
    const totalOver = entries.find((entry) => entry.market_id === 'total_points' && String(entry.selection_line ?? '').toLowerCase() === 'over')
    const totalUnder = entries.find((entry) => entry.market_id === 'total_points' && String(entry.selection_line ?? '').toLowerCase() === 'under')
    const latestTimestamp = entries.reduce((max, entry) => Math.max(max, entry.timestamp ?? 0), 0)

    return {
      bookId: sportsbook.toLowerCase().replace(/\s+/g, '_'),
      bookName: sportsbook,
      isPrimary: sportsbook === OPTIC_ODDS_SPORTSBOOKS[0],
      timestamp: fromUnixTimestamp(latestTimestamp),
      homeMoneyline: moneylineHome?.price ?? null,
      awayMoneyline: moneylineAway?.price ?? null,
      spread: spreadHome || spreadAway
        ? {
            home: {
              line: spreadHome?.points ?? null,
              odds: spreadHome?.price ?? null,
            },
            away: {
              line: spreadAway?.points ?? null,
              odds: spreadAway?.price ?? null,
            },
          }
        : null,
      total: totalOver || totalUnder
        ? {
            over: {
              line: totalOver?.points ?? totalUnder?.points ?? null,
              odds: totalOver?.price ?? null,
            },
            under: {
              line: totalUnder?.points ?? totalOver?.points ?? null,
              odds: totalUnder?.price ?? null,
            },
          }
        : null,
    }
  })
}

function buildConsensusSnapshot(books: MarketDataBookSnapshot[]): MarketDataConsensusSnapshot | null {
  if (!books.length) return null

  return {
    timestamp: books
      .map((book) => book.timestamp)
      .sort()
      .slice(-1)[0] ?? new Date().toISOString(),
    homeMoneyline: safeAverage(books.map((book) => book.homeMoneyline)),
    awayMoneyline: safeAverage(books.map((book) => book.awayMoneyline)),
    spread: safeAverage(books.map((book) => book.spread?.home?.line), 1),
    spreadHomeOdds: safeAverage(books.map((book) => book.spread?.home?.odds)),
    spreadAwayOdds: safeAverage(books.map((book) => book.spread?.away?.odds)),
    total: safeAverage(books.map((book) => book.total?.over?.line), 1),
    totalOverOdds: safeAverage(books.map((book) => book.total?.over?.odds)),
    totalUnderOdds: safeAverage(books.map((book) => book.total?.under?.odds)),
  }
}

function toGameSnapshot(
  fixture: OpticOddsFixture,
  oddsFixture: OpticOddsOddsFixture | undefined,
): MarketDataGameSnapshot | null {
  const { homeAbbr, awayAbbr } = fixtureAbbrs(fixture)
  if (!homeAbbr || !awayAbbr) return null

  const books = buildBookSnapshots(fixture, oddsFixture)
  const current = buildConsensusSnapshot(books)

  return {
    game: {
      homeAbbr,
      awayAbbr,
    },
    provider: 'opticOdds',
    sourceLabel: 'OpticOdds',
    lastUpdated: current?.timestamp ?? fixture.start_date ?? new Date().toISOString(),
    books,
    opener: null,
    current,
    metadata: {
      fixtureId: fixture.id ?? '',
      requestedSportsbooks: OPTIC_ODDS_SPORTSBOOKS.join(','),
    },
  }
}

export class OpticOddsMarketDataClient implements MarketDataClient {
  provider = MARKET_DATA_PROVIDERS.opticOdds

  async fetchGames(request: MarketDataRequest): Promise<MarketDataFetchResult> {
    if (!OPTIC_ODDS_API_KEY) {
      return {
        provider: 'opticOdds',
        sourceLabel: this.provider.label,
        status: 'not_configured',
        fetchedAt: new Date().toISOString(),
        capabilities: this.provider.capabilities,
        games: [],
        errors: ['OpticOdds API key is not configured'],
      }
    }

    const { start, end } = toIsoDayRange(request.date)
    const fixtureUrl = new URL('https://api.opticodds.com/api/v3/fixtures')
    fixtureUrl.searchParams.set('sport', 'basketball')
    fixtureUrl.searchParams.set('league', 'nba')
    fixtureUrl.searchParams.set('start_date_after', start)
    fixtureUrl.searchParams.set('start_date_before', end)

    try {
      const fixturesResponse = await fetchOpticOddsJson<OpticOddsDataResponse<OpticOddsFixture>>(fixtureUrl.toString())
      const fixtures = fixturesResponse.data ?? []

      const oddsFixtures = await Promise.all(
        fixtures.map(async (fixture) => {
          if (!fixture.id) return [fixture.id ?? '', undefined] as const
          const oddsUrl = new URL('https://api.opticodds.com/api/v3/fixtures/odds')
          oddsUrl.searchParams.append('fixture_id', fixture.id)
          for (const sportsbook of OPTIC_ODDS_SPORTSBOOKS) oddsUrl.searchParams.append('sportsbook', sportsbook)
          oddsUrl.searchParams.append('market', 'moneyline')
          oddsUrl.searchParams.append('market', 'point_spread')
          oddsUrl.searchParams.append('market', 'total_points')
          oddsUrl.searchParams.set('is_main', 'true')
          oddsUrl.searchParams.set('odds_format', 'AMERICAN')

          const oddsResponse = await fetchOpticOddsJson<OpticOddsDataResponse<OpticOddsOddsFixture>>(oddsUrl.toString())
          return [fixture.id, oddsResponse.data?.[0]] as const
        }),
      )

      const oddsByFixtureId = new Map(oddsFixtures)
      const games = fixtures
        .map((fixture) => toGameSnapshot(fixture, fixture.id ? oddsByFixtureId.get(fixture.id) : undefined))
        .filter((game): game is MarketDataGameSnapshot => game !== null)

      return {
        provider: 'opticOdds',
        sourceLabel: this.provider.label,
        status: 'available',
        fetchedAt: new Date().toISOString(),
        capabilities: this.provider.capabilities,
        games,
        errors: [],
      }
    } catch (error) {
      return {
        provider: 'opticOdds',
        sourceLabel: this.provider.label,
        status: 'error',
        fetchedAt: new Date().toISOString(),
        capabilities: this.provider.capabilities,
        games: [],
        errors: [error instanceof Error ? error.message : 'Unknown OpticOdds error'],
      }
    }
  }
}
