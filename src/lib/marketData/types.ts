export type MarketDataProviderId = 'none' | 'opticOdds' | 'sportsDataIo'

export type MarketDataMarketType = 'moneyline' | 'spread' | 'total'

export type MarketDataSide = 'home' | 'away' | 'over' | 'under'

export type MarketDataAvailability = 'available' | 'not_configured' | 'unsupported' | 'error'

export type MarketDataCapabilities = {
  opener: boolean
  history: boolean
  consensus: boolean
  splits: boolean
  live: boolean
}

export type MarketDataRequest = {
  date: string
  league: 'nba'
}

export type MarketDataPricePoint = {
  line?: number | null
  odds?: number | null
}

export type MarketDataBookSnapshot = {
  bookId: string
  bookName: string
  isPrimary?: boolean
  timestamp: string
  homeMoneyline?: number | null
  awayMoneyline?: number | null
  spread?: {
    home?: MarketDataPricePoint | null
    away?: MarketDataPricePoint | null
  } | null
  total?: {
    over?: MarketDataPricePoint | null
    under?: MarketDataPricePoint | null
  } | null
}

export type MarketDataGameKey = {
  homeAbbr: string
  awayAbbr: string
}

export type MarketDataConsensusSnapshot = {
  timestamp: string
  homeMoneyline?: number | null
  awayMoneyline?: number | null
  spread?: number | null
  spreadHomeOdds?: number | null
  spreadAwayOdds?: number | null
  total?: number | null
  totalOverOdds?: number | null
  totalUnderOdds?: number | null
}

export type MarketDataGameSnapshot = {
  game: MarketDataGameKey
  provider: MarketDataProviderId
  sourceLabel: string
  lastUpdated: string
  books: MarketDataBookSnapshot[]
  opener?: MarketDataConsensusSnapshot | null
  current?: MarketDataConsensusSnapshot | null
  metadata?: Record<string, string | number | boolean | null | undefined>
}

export type MarketDataFetchResult = {
  provider: MarketDataProviderId
  sourceLabel: string
  status: MarketDataAvailability
  fetchedAt: string
  capabilities: MarketDataCapabilities
  games: MarketDataGameSnapshot[]
  errors: string[]
}

export type MarketDataProviderDefinition = {
  id: MarketDataProviderId
  label: string
  capabilities: MarketDataCapabilities
}

export interface MarketDataClient {
  provider: MarketDataProviderDefinition
  fetchGames(request: MarketDataRequest): Promise<MarketDataFetchResult>
}
