import { describe, expect, it } from 'vitest'

import { americanToImplied, analyzeBetting, mlAmerican, normCDF } from './betting'
import type { OddsInput, PredictionResult } from './nbaTypes'

const makePrediction = (overrides: Partial<PredictionResult> = {}): PredictionResult => ({
  hWinProb: 0.62,
  aWinProb: 0.38,
  hScore: '116.0',
  aScore: '108.0',
  total: '224.0',
  projDiff: '8.0',
  isPlayoff: false,
  features: [],
  ...overrides,
})

const makeOdds = (overrides: Partial<OddsInput> = {}): OddsInput => ({
  source: 'manual',
  homeMoneyline: -135,
  awayMoneyline: 120,
  spread: -4.5,
  spreadHomeOdds: -110,
  spreadAwayOdds: -110,
  overUnder: 220.5,
  overOdds: -110,
  underOdds: -110,
  ...overrides,
})

describe('betting helpers', () => {
  it('converts American odds to implied probabilities', () => {
    expect(americanToImplied(-150)).toBeCloseTo(0.6, 4)
    expect(americanToImplied(130)).toBeCloseTo(100 / 230, 4)
    expect(americanToImplied(0)).toBe(0.5)
  })

  it('formats win probabilities back to American odds', () => {
    expect(mlAmerican(0.6)).toBe('-150')
    expect(mlAmerican(0.4)).toBe('+150')
    expect(mlAmerican(0)).toBe('N/A')
  })

  it('keeps the normal CDF approximation centered', () => {
    expect(normCDF(0)).toBeCloseTo(0.5, 6)
    expect(normCDF(1)).toBeGreaterThan(0.5)
    expect(normCDF(-1)).toBeLessThan(0.5)
  })

  it('finds positive value on home moneyline, spread, and over when the model is stronger than market', () => {
    const analysis = analyzeBetting(makePrediction(), makeOdds())

    expect(analysis.mlValueSide).toBe('home')
    expect(analysis.mlValuePct).toBeGreaterThan(0)
    expect(analysis.spreadRec.startsWith('home')).toBe(true)
    expect(analysis.ouRec).toBe('over')
    expect(analysis.kellyHome).toBeGreaterThan(0)
    expect(analysis.kellySpread).toBeGreaterThan(0)
    expect(analysis.kellyOU).toBeGreaterThan(0)
  })

  it('returns pass recommendations when the market is already efficient versus the projection', () => {
    const balancedPrediction = makePrediction({
      hWinProb: 0.52,
      aWinProb: 0.48,
      hScore: '110.0',
      aScore: '108.0',
      total: '218.0',
      projDiff: '2.0',
    })
    const balancedOdds = makeOdds({
      homeMoneyline: -110,
      awayMoneyline: -110,
      spread: -2.0,
      overUnder: 218.0,
    })

    const analysis = analyzeBetting(balancedPrediction, balancedOdds)

    expect(analysis.mlValueSide).toBe('none')
    expect(analysis.spreadRec).toBe('pass')
    expect(analysis.ouRec).toBe('pass')
  })
})
