import { describe, expect, it } from 'vitest'

import { buildCompositeCandidates, buildCompositeRecommendation, normalizeSharpSignals } from './compositeRecommendation'
import type { BettingAnalysis, ScheduleRow } from './nbaTypes'

const baseRow: ScheduleRow = {
  game: { homeAbbr: 'BOS', awayAbbr: 'LAL', gameTime: '7:30 PM', tvInfo: 'ESPN' },
  espnOdds: null,
  marketData: null,
  editedOdds: {
    source: 'manual',
    homeMoneyline: -145,
    awayMoneyline: 125,
    spread: -4.5,
    spreadHomeOdds: -110,
    spreadAwayOdds: -105,
    overUnder: 220.5,
    overOdds: -112,
    underOdds: -108,
  },
  simResult: {
    hWinProb: 0.62,
    aWinProb: 0.38,
    hScore: '116.0',
    aScore: '108.0',
    total: '224.0',
    projDiff: '8.0',
    isPlayoff: false,
    features: [],
  },
  homeB2B: false,
  awayB2B: false,
  sharpInput: null,
  sharpContext: null,
  injuries: [],
  projectedStarters: { home: null, away: null },
  recentForm: { home: null, away: null },
  compositeRecommendation: null,
}

const analysis: BettingAnalysis = {
  homeImpliedProb: 0.57,
  awayImpliedProb: 0.43,
  homeEdge: 0.05,
  awayEdge: -0.05,
  mlValueSide: 'home',
  mlValuePct: 5,
  spreadRec: 'home -4.5',
  spreadEdge: 4,
  ouRec: 'over',
  ouEdge: 3.5,
  ouEdgePct: 4.4,
  homeCoverProb: 0.58,
  awayCoverProb: 0.42,
  spHIC: 0.52,
  spAIC: 0.48,
  ovIC: 0.52,
  unIC: 0.48,
  pOver: 0.57,
  pUnder: 0.43,
  kellyHome: 0.03,
  kellyAway: 0,
  kellySpread: 0.02,
  kellyOU: 0.01,
}

describe('compositeRecommendation', () => {
  it('returns a pass recommendation when analysis is missing', () => {
    const rec = buildCompositeRecommendation(baseRow, null)
    expect(rec.primaryMarket).toBe('PASS')
    expect(rec.pass).toBe(true)
  })

  it('upgrades confidence when sharp signals align with the model side', () => {
    const sharpInput = {
      source: 'manual',
      lastUpdated: '2026-03-23T12:00:00.000Z',
      openingHomeMoneyline: -130,
      openingAwayMoneyline: 110,
      openingSpread: -3.5,
      openingTotal: 219,
      moneylineHomeBetsPct: 42,
      moneylineHomeMoneyPct: 61,
      clvLean: 'home' as const,
      steamMoveLean: 'home' as const,
      reverseLineMoveLean: 'none' as const,
      notes: 'Sharp support on Boston',
    }
    const row = { ...baseRow, sharpInput, sharpContext: normalizeSharpSignals(sharpInput, baseRow.editedOdds) }

    const rec = buildCompositeRecommendation(row, analysis)

    expect(rec.primaryMarket).toBe('ML')
    expect(rec.score).toBeGreaterThan(60)
    expect(rec.pass).toBe(false)
  })

  it('returns all playable market candidates for slate-level best-bet ranking', () => {
    const candidates = buildCompositeCandidates(baseRow, analysis)

    expect(candidates.map((candidate) => candidate.primaryMarket)).toEqual(['ML', 'O/U', 'SPR'])
    expect(candidates.every((candidate) => candidate.pass === false)).toBe(true)
  })
})
