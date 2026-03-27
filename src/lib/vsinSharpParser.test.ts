import { describe, expect, it } from 'vitest'

import { parseVsinSharpImport } from './vsinSharpParser'

describe('parseVsinSharpImport', () => {
  it('parses pasted VSiN market and split blocks into current odds and sharp inputs', () => {
    const raw = `
Time	Thu,March 26th	DK Open	DK	Circa	South Point	Boomer's	Westgate	Wynn	Stations	Caesars	BetMGM
7:10 PM
New York Knicks
Charlotte Hornets
-1.5 -102
+1.5 -118
+2.5 -115
-2.5 -105
+2 -110
-2 -110
+2 -110
-2 -110
-
-
+2 -109
-2 -109
+2 -110
-2 -110
+2 -110
-2 -110
+2.5 -105
-2.5 -115
+2.5 -110
-2.5 +100
Time	Thu,March 26th	DK Open	DK	Circa	South Point	Boomer's	Westgate	Wynn	Stations	Caesars	BetMGM
7:10 PM
New York Knicks
Charlotte Hornets
-112
-108
+110
-130
+115
-135
+115
-135
+115
-135
+115
-135
+115
-135
+115
-135
+118
-140
+115
-140
Time	Thu,March 26th	DK Open	DK	Circa	South Point	Boomer's	Westgate	Wynn	Stations	Caesars	BetMGM
7:10 PM
New York Knicks
Charlotte Hornets
O 223.5 -115
U 223.5 -105
O 224.5 -105
U 224.5 -115
O 224.5 -110
U 224.5 -110
O 224 -110
U 224 -110
O 224 -110
U 224 -110
O 224 -110
U 224 -110
O 224 -110
U 224 -110
O 224 -110
U 224 -110
O 223.5 -115
U 223.5 -105
O 224.5 -110
U 224.5 -110
Thursday,Mar 26	Spread	Handle	Bets	Total	Handle	Bets	Money	Handle	Bets
New York Knicks
Charlotte Hornets
+2.5
-2.5
18%
82%
52%
48%
224.5
224.5
66%
34%
80%
20%
+110
-130
53%
47%
63%
37%
`

    const [game] = parseVsinSharpImport(raw)
    expect(game).toBeDefined()
    if (!game) throw new Error('Expected parsed VSiN game')

    expect(game.awayAbbr).toBe('NYK')
    expect(game.homeAbbr).toBe('CHA')
    expect(game.odds).toEqual({
      source: 'vsin',
      awayMoneyline: 110,
      homeMoneyline: -130,
      spread: -2.5,
      spreadAwayOdds: -115,
      spreadHomeOdds: -105,
      overUnder: 224.5,
      overOdds: -105,
      underOdds: -115,
    })
    expect(game.sharpInput.source).toBe('VSiN Import')
    expect(game.sharpInput.openingAwayMoneyline).toBe(-112)
    expect(game.sharpInput.openingHomeMoneyline).toBe(-108)
    expect(game.sharpInput.openingSpread).toBe(1.5)
    expect(game.sharpInput.openingTotal).toBe(223.5)
    expect(game.sharpInput.moneylineHomeBetsPct).toBe(37)
    expect(game.sharpInput.moneylineHomeMoneyPct).toBe(47)
    expect(game.sharpInput.spreadHomeBetsPct).toBe(48)
    expect(game.sharpInput.spreadHomeMoneyPct).toBe(82)
    expect(game.sharpInput.totalOverBetsPct).toBe(80)
    expect(game.sharpInput.totalOverMoneyPct).toBe(66)
    expect(game.sharpInput.consensusMoneyline).toBe('home')
    expect(game.sharpInput.consensusSpread).toBe('home')
    expect(game.sharpInput.consensusTotal).toBe('over')
  })
})
