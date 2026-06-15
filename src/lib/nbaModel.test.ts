import { describe, expect, it } from 'vitest'

import { TEAMS, predictGame } from './nbaModel'
import type { GameType } from './nbaTypes'

const BASE_ARGS = {
  homeTeam: 'BOS' as const,
  awayTeam: 'NYK' as const,
  homeB2B: false,
  awayB2B: false,
  liveStats: {},
}

function total(gameType: GameType): number {
  const result = predictGame({ ...BASE_ARGS, gameType })
  return parseFloat(result.total)
}

describe('predictGame – playoff scoring reduction', () => {
  it('projects a lower total in Round 1 than in the regular season', () => {
    expect(total('Playoff (Round 1)')).toBeLessThan(total('Regular Season'))
  })

  it('projects a lower total in every playoff round than the regular season', () => {
    const rs = total('Regular Season')
    expect(total('Playoff (Round 1)')).toBeLessThan(rs)
    expect(total('Playoff (Conf Semi)')).toBeLessThan(rs)
    expect(total('Playoff (Conf Final)')).toBeLessThan(rs)
    expect(total('NBA Finals')).toBeLessThan(rs)
  })

  it('applies the same reduction to all playoff rounds', () => {
    const r1    = total('Playoff (Round 1)')
    const semi  = total('Playoff (Conf Semi)')
    const final = total('Playoff (Conf Final)')
    const nbaFinals = total('NBA Finals')
    expect(r1).toBeCloseTo(semi, 4)
    expect(semi).toBeCloseTo(final, 4)
    expect(final).toBeCloseTo(nbaFinals, 4)
  })

  it('reduces the playoff total by roughly 7–11% vs regular season', () => {
    const rs  = total('Regular Season')
    const r1  = total('Playoff (Round 1)')
    const pct = (rs - r1) / rs
    expect(pct).toBeGreaterThan(0.07)
    expect(pct).toBeLessThan(0.11)
  })
})

describe('predictGame – score sanity', () => {
  it('projected team scores sum to the displayed total', () => {
    const result = predictGame({ ...BASE_ARGS, gameType: 'Regular Season' })
    const sum = parseFloat(result.hScore) + parseFloat(result.aScore)
    expect(sum).toBeCloseTo(parseFloat(result.total), 1)
  })

  it('win probabilities sum to 1', () => {
    const result = predictGame({ ...BASE_ARGS, gameType: 'Regular Season' })
    expect(result.hWinProb + result.aWinProb).toBeCloseTo(1, 6)
  })

  it('home team scores more when home court and net rating strongly favor the home side', () => {
    const result = predictGame({
      homeTeam: 'OKC',
      awayTeam: 'BKN',
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
      liveStats: {},
    })
    expect(parseFloat(result.hScore)).toBeGreaterThan(parseFloat(result.aScore))
    expect(result.hWinProb).toBeGreaterThan(0.5)
  })

  it('back-to-back away team reduces projected away score', () => {
    const fresh = predictGame({ ...BASE_ARGS, gameType: 'Regular Season', awayB2B: false })
    const tired = predictGame({ ...BASE_ARGS, gameType: 'Regular Season', awayB2B: true })
    expect(parseFloat(tired.aScore)).toBeLessThan(parseFloat(fresh.aScore))
  })

  it('live stats override baseline for the affected team', () => {
    const baseline = predictGame({ ...BASE_ARGS, gameType: 'Regular Season' })
    const withBoost = predictGame({
      ...BASE_ARGS,
      gameType: 'Regular Season',
      liveStats: { BOS: { offRtg: 135 } },
    })
    expect(parseFloat(withBoost.hScore)).toBeGreaterThan(parseFloat(baseline.hScore))
  })

  it('marks isPlayoff false for Regular Season and true for playoff rounds', () => {
    expect(predictGame({ ...BASE_ARGS, gameType: 'Regular Season' }).isPlayoff).toBe(false)
    expect(predictGame({ ...BASE_ARGS, gameType: 'Playoff (Round 1)' }).isPlayoff).toBe(true)
    expect(predictGame({ ...BASE_ARGS, gameType: 'NBA Finals' }).isPlayoff).toBe(true)
  })
})

describe('TEAMS table', () => {
  it('contains all 30 franchises', () => {
    expect(Object.keys(TEAMS)).toHaveLength(30)
  })

  it('every team has positive offRtg, defRtg, and pace', () => {
    for (const [abbr, stats] of Object.entries(TEAMS)) {
      expect(stats.offRtg, abbr).toBeGreaterThan(0)
      expect(stats.defRtg, abbr).toBeGreaterThan(0)
      expect(stats.pace, abbr).toBeGreaterThan(0)
    }
  })
})
