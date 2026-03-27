import { describe, expect, it } from 'vitest'

import type { MarketDataGameSnapshot } from './marketData'
import type { OddsInput } from './nbaTypes'
import { deriveSharpInputFromMarketData } from './sharpSignals'

const activeOdds: OddsInput = {
  source: 'espn',
  homeMoneyline: -140,
  awayMoneyline: 120,
  spread: -3.5,
  spreadHomeOdds: -110,
  spreadAwayOdds: -110,
  overUnder: 218.5,
  overOdds: -110,
  underOdds: -110,
}

const snapshot: MarketDataGameSnapshot = {
  game: { homeAbbr: 'BOS', awayAbbr: 'LAL' },
  provider: 'opticOdds',
  sourceLabel: 'OpticOdds',
  lastUpdated: '2026-03-25T20:00:00.000Z',
  opener: {
    timestamp: '2026-03-25T16:00:00.000Z',
    homeMoneyline: -120,
    awayMoneyline: 108,
    spread: -2.5,
    spreadHomeOdds: -110,
    spreadAwayOdds: -110,
    total: 216.5,
    totalOverOdds: -110,
    totalUnderOdds: -110,
  },
  current: {
    timestamp: '2026-03-25T20:00:00.000Z',
    homeMoneyline: -145,
    awayMoneyline: 125,
    spread: -4,
    spreadHomeOdds: -112,
    spreadAwayOdds: -108,
    total: 220,
    totalOverOdds: -110,
    totalUnderOdds: -110,
  },
  books: [
    {
      bookId: 'draftkings',
      bookName: 'DraftKings',
      timestamp: '2026-03-25T20:00:00.000Z',
      homeMoneyline: -145,
      awayMoneyline: 125,
      spread: {
        home: { line: -4, odds: -112 },
        away: { line: 4, odds: -108 },
      },
      total: {
        over: { line: 220, odds: -110 },
        under: { line: 220, odds: -110 },
      },
    },
    {
      bookId: 'fanduel',
      bookName: 'FanDuel',
      timestamp: '2026-03-25T20:00:00.000Z',
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
    {
      bookId: 'betmgm',
      bookName: 'BetMGM',
      timestamp: '2026-03-25T20:00:00.000Z',
      homeMoneyline: -142,
      awayMoneyline: 120,
      spread: {
        home: { line: -4, odds: -110 },
        away: { line: 4, odds: -110 },
      },
      total: {
        over: { line: 219.5, odds: -110 },
        under: { line: 219.5, odds: -110 },
      },
    },
  ],
}

describe('deriveSharpInputFromMarketData', () => {
  it('derives sharp-style inputs from opener and current market snapshots', () => {
    const result = deriveSharpInputFromMarketData(snapshot, activeOdds)

    expect(result).not.toBeNull()
    expect(result?.source).toBe('OpticOdds')
    expect(result?.openingHomeMoneyline).toBe(-120)
    expect(result?.openingSpread).toBe(-2.5)
    expect(result?.openingTotal).toBe(216.5)
    expect(result?.consensusMoneyline).toBe('home')
    expect(result?.consensusSpread).toBe('home')
    expect(result?.consensusTotal).toBe('over')
    expect(result?.clvLean).toEqual(['home', 'over'])
    expect(result?.steamMoveLean).toEqual(['home', 'over'])
    expect(result?.reverseLineMoveLean).toBe('over')
    expect(result?.notes).toContain('OpticOdds: 3 books in consensus sample.')
    expect(result?.notes).toContain('Spread moved -1.5 from opener.')
    expect(result?.notes).toContain('Total moved +3.5 from opener.')
  })

  it('returns null when no current market snapshot is available', () => {
    expect(deriveSharpInputFromMarketData({ ...snapshot, current: null }, activeOdds)).toBeNull()
  })
})
