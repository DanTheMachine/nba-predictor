import {
  MARKET_DATA_PROVIDER,
  OPTIC_ODDS_API_KEY,
  SPORTS_DATA_IO_API_KEY,
  isProviderConfigured,
} from './config'
import { OpticOddsMarketDataClient } from './opticOdds'
import { MARKET_DATA_PROVIDERS } from './providers'
import type { MarketDataClient, MarketDataFetchResult, MarketDataProviderId, MarketDataRequest } from './types'

function buildEmptyResult(
  provider: MarketDataProviderId,
  status: MarketDataFetchResult['status'],
  errors: string[],
): MarketDataFetchResult {
  const definition = MARKET_DATA_PROVIDERS[provider]
  return {
    provider,
    sourceLabel: definition.label,
    status,
    fetchedAt: new Date().toISOString(),
    capabilities: definition.capabilities,
    games: [],
    errors,
  }
}

class StubMarketDataClient implements MarketDataClient {
  provider

  constructor(provider: MarketDataProviderId) {
    this.provider = MARKET_DATA_PROVIDERS[provider]
  }

  async fetchGames(): Promise<MarketDataFetchResult> {
    if (this.provider.id === 'none') {
      return buildEmptyResult('none', 'unsupported', ['No market data provider selected'])
    }

    if (!isProviderConfigured(this.provider.id)) {
      return buildEmptyResult(this.provider.id, 'not_configured', [`${this.provider.label} API key is not configured`])
    }

    return buildEmptyResult(this.provider.id, 'unsupported', [`${this.provider.label} live market client is not implemented yet`])
  }
}

export function createMarketDataClient(provider: MarketDataProviderId = MARKET_DATA_PROVIDER): MarketDataClient {
  if (provider === 'opticOdds') return new OpticOddsMarketDataClient()
  return new StubMarketDataClient(provider)
}

export const MARKET_DATA_BOOT_CONFIG = {
  provider: MARKET_DATA_PROVIDER,
  opticOddsConfigured: OPTIC_ODDS_API_KEY.length > 0,
  sportsDataIoConfigured: SPORTS_DATA_IO_API_KEY.length > 0,
}
