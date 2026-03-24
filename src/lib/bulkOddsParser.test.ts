import { describe, expect, it } from 'vitest'

import { parseBulkOdds } from './bulkOddsParser'

describe('parseBulkOdds', () => {
  it('parses a standard two-team sportsbook block into home and away odds', () => {
    const raw = `
NEW YORK KNICKS
501
+ 2.5
- 110
O 229.5
- 105
+ 120
BOSTON CELTICS
502
- 2.5
- 110
U 229.5
- 115
- 140
`

    expect(parseBulkOdds(raw)).toEqual([
      {
        awayAbbr: 'NYK',
        homeAbbr: 'BOS',
        odds: {
          source: 'manual',
          awayMoneyline: 120,
          homeMoneyline: -140,
          spread: -2.5,
          spreadAwayOdds: -110,
          spreadHomeOdds: -110,
          overUnder: 229.5,
          overOdds: -105,
          underOdds: -115,
        },
      },
    ])
  })

  it('supports EVEN and fractional glyph variants from pasted books', () => {
    const raw = `
ORLANDO MAGIC
701
+ 3Â½
- 108
O 217Â½
EVEN
+ 145
MILWAUKEE BUCKS
702
- 3Â½
- 112
U 217Â½
- 120
- 170
`

    const [game] = parseBulkOdds(raw)
    expect(game).toBeDefined()
    if (!game) {
      throw new Error('Expected parser to return a game')
    }

    expect(game.awayAbbr).toBe('ORL')
    expect(game.homeAbbr).toBe('MIL')
    expect(game.odds.spread).toBe(-3.5)
    expect(game.odds.overUnder).toBe(217.5)
    expect(game.odds.overOdds).toBe(100)
  })

  it('throws a helpful error when the paste does not include recognizable team names', () => {
    expect(() => parseBulkOdds('not a sportsbook block')).toThrow(/Could not find team names/)
  })

  it('accepts sportsbook city aliases like LA LAKERS and city-only labels', () => {
    const raw = `
LA LAKERS
534
- 2
- 105
O 227
Even
- 115
DETROIT
533
+ 2
- 105
U 227
- 110
+ 105
`

    expect(parseBulkOdds(raw)).toEqual([
      {
        awayAbbr: 'LAL',
        homeAbbr: 'DET',
        odds: {
          source: 'manual',
          awayMoneyline: -115,
          homeMoneyline: 105,
          spread: 2,
          spreadAwayOdds: -105,
          spreadHomeOdds: -105,
          overUnder: 227,
          overOdds: 100,
          underOdds: -110,
        },
      },
    ])
  })
})
