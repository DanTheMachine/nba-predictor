import type { MarketDataCapabilities, MarketDataProviderDefinition, MarketDataProviderId } from './types'

const BASE_CAPABILITIES: Record<MarketDataProviderId, MarketDataCapabilities> = {
  none: {
    opener: false,
    history: false,
    consensus: false,
    splits: false,
    live: false,
  },
  opticOdds: {
    opener: true,
    history: true,
    consensus: true,
    splits: false,
    live: true,
  },
  sportsDataIo: {
    opener: true,
    history: true,
    consensus: true,
    splits: false,
    live: true,
  },
}

export const MARKET_DATA_PROVIDERS: Record<MarketDataProviderId, MarketDataProviderDefinition> = {
  none: {
    id: 'none',
    label: 'No provider',
    capabilities: BASE_CAPABILITIES.none,
  },
  opticOdds: {
    id: 'opticOdds',
    label: 'OpticOdds',
    capabilities: BASE_CAPABILITIES.opticOdds,
  },
  sportsDataIo: {
    id: 'sportsDataIo',
    label: 'SportsDataIO',
    capabilities: BASE_CAPABILITIES.sportsDataIo,
  },
}
