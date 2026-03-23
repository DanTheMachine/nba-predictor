import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePredictorState } from './usePredictorState'
import type { OddsInput, PredictionResult } from '../lib/nbaTypes'

const fetchTodayScheduleMock = vi.fn()
const parseOddsFromEventMock = vi.fn()
const predictGameMock = vi.fn()

vi.mock('../lib/espn', () => ({
  fetchTodaySchedule: (...args: unknown[]) => fetchTodayScheduleMock(...args),
  parseOddsFromEvent: (...args: unknown[]) => parseOddsFromEventMock(...args),
}))

vi.mock('../lib/nbaModel', () => ({
  predictGame: (...args: unknown[]) => predictGameMock(...args),
}))

const makePrediction = (): PredictionResult => ({
  hWinProb: 0.61,
  aWinProb: 0.39,
  hScore: '115.0',
  aScore: '108.0',
  total: '223.0',
  projDiff: '7.0',
  isPlayoff: false,
  features: [],
})

const makeOdds = (): OddsInput => ({
  source: 'espn',
  homeMoneyline: -150,
  awayMoneyline: 130,
  spread: -4.5,
  spreadHomeOdds: -110,
  spreadAwayOdds: -110,
  overUnder: 224.5,
  overOdds: -108,
  underOdds: -112,
})

describe('usePredictorState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    predictGameMock.mockReturnValue(makePrediction())
  })

  it('applies manual odds and runs a new simulation when there is no current result', () => {
    const { result } = renderHook(() => usePredictorState({ liveStats: {} }))

    act(() => {
      result.current.setManualOdds({
        homeMoneyline: '-145',
        awayMoneyline: '+125',
        homeSpread: '-2.5',
        spreadHomeOdds: '-105',
        spreadAwayOdds: '-115',
        overUnder: '221.5',
        overOdds: '-110',
        underOdds: '-110',
      })
    })

    act(() => {
      result.current.applyManualOdds()
    })

    expect(result.current.oddsSource).toBe('manual')
    expect(result.current.oddsStatus).toBe('Manual lines applied')
    expect(result.current.odds).toMatchObject({
      source: 'manual',
      homeMoneyline: -145,
      awayMoneyline: 125,
      spread: -2.5,
      overUnder: 221.5,
    })
    expect(result.current.running).toBe(true)

    act(() => {
      vi.runAllTimers()
    })

    expect(predictGameMock).toHaveBeenCalledWith({
      homeTeam: 'BOS',
      awayTeam: 'LAL',
      gameType: 'Regular Season',
      homeB2B: false,
      awayB2B: false,
      liveStats: {},
    })
    expect(result.current.running).toBe(false)
    expect(result.current.result).toEqual(makePrediction())
  })

  it('loads ESPN odds, updates manual defaults, and does not rerun sim when a result already exists', async () => {
    const foundOdds = makeOdds()
    fetchTodayScheduleMock.mockResolvedValue({ rawEvents: [{ id: 'event-1' }] })
    parseOddsFromEventMock.mockReturnValue(foundOdds)

    const { result } = renderHook(() => usePredictorState({ liveStats: {} }))

    act(() => {
      result.current.setResult(makePrediction())
    })

    await act(async () => {
      await result.current.handleFetchOdds()
    })

    expect(fetchTodayScheduleMock).toHaveBeenCalled()
    expect(parseOddsFromEventMock).toHaveBeenCalledWith({ id: 'event-1' }, 'BOS', 'LAL')
    expect(result.current.odds).toEqual(foundOdds)
    expect(result.current.oddsSource).toBe('espn')
    expect(result.current.oddsStatus).toContain('ESPN')
    expect(result.current.manualOdds.homeMoneyline).toBe('-150')
    expect(result.current.manualOdds.awayMoneyline).toBe('130')
    expect(predictGameMock).not.toHaveBeenCalled()
  })

  it('falls back to manual mode when ESPN odds lookup fails', async () => {
    fetchTodayScheduleMock.mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => usePredictorState({ liveStats: {} }))

    await act(async () => {
      await result.current.handleFetchOdds()
    })

    expect(result.current.oddsSource).toBe('manual')
    expect(result.current.oddsStatus).toBe('ESPN unreachable — enter lines manually')
  })
})
