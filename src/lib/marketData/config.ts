import type { MarketDataProviderId } from './types'

function clean(value: string | undefined): string {
  return value?.trim() ?? ''
}

function parseProvider(value: string | undefined): MarketDataProviderId {
  const normalized = clean(value).toLowerCase()
  if (normalized === 'opticodds') return 'opticOdds'
  if (normalized === 'sportsdataio') return 'sportsDataIo'
  return 'none'
}

export const MARKET_DATA_PROVIDER = parseProvider(import.meta.env.VITE_MARKET_DATA_PROVIDER)

export const MARKET_DATA_PROXY_BASE_URL = clean(import.meta.env.VITE_PROXY_BASE_URL || 'http://localhost:3002').replace(/\/+$/, '')

export const OPTIC_ODDS_API_KEY = clean(import.meta.env.VITE_OPTIC_ODDS_API_KEY)

export const OPTIC_ODDS_SPORTSBOOKS = clean(import.meta.env.VITE_OPTIC_ODDS_SPORTSBOOKS || 'DraftKings,FanDuel,BetMGM,Caesars,Pinnacle')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .slice(0, 5)

export const SPORTS_DATA_IO_API_KEY = clean(import.meta.env.VITE_SPORTS_DATA_IO_API_KEY)

export function isProviderConfigured(provider: MarketDataProviderId): boolean {
  if (provider === 'opticOdds') return OPTIC_ODDS_API_KEY.length > 0
  if (provider === 'sportsDataIo') return SPORTS_DATA_IO_API_KEY.length > 0
  return false
}
