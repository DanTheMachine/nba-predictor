import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useResultsTracker } from './useResultsTracker'

const resultsCsv = [
  'Date,Home,Away,Home Score,Away Score',
  '2026-03-21,BOS Celtics,LAL Lakers,110,102',
].join('\n')

const predictionsCsv = [
  'Date,Home,Away,H Proj,A Proj,Model Total,Vegas O/U,Over Odds,Under Odds,O/U Rec,O/U Edge,H ML (model),A ML (model),Vegas H ML,Vegas A ML,Vegas Spread,Spread Home Odds,Spread Away Odds,ML Rec,ML Edge,Spread Rec,Spread Edge,H Win,A Win',
  '2026-03-21,BOS Celtics,LAL Lakers,112,104,216,214.5,-110,-110,OVER,+1.5,-140,+120,-145,+125,-3.5,-110,-110,HOME - BOS,+4.2,HOME -3.5,+2.1,61,39',
].join('\n')

describe('useResultsTracker', () => {
  it('dedupes imported results and predictions across repeated imports', () => {
    const { result } = renderHook(() => useResultsTracker())

    act(() => {
      result.current.setResultsPaste(resultsCsv)
    })
    act(() => {
      result.current.handleImportResults()
    })

    act(() => {
      result.current.setResultsPaste(resultsCsv)
    })
    act(() => {
      result.current.handleImportResults()
    })

    act(() => {
      result.current.setPredPaste(predictionsCsv)
    })
    act(() => {
      result.current.handleImportPredictions()
    })

    act(() => {
      result.current.setPredPaste(predictionsCsv)
    })
    act(() => {
      result.current.handleImportPredictions()
    })

    expect(result.current.resultsLog).toHaveLength(1)
    expect(result.current.predLog).toHaveLength(1)
    expect(result.current.resultsStatus).toContain('Imported 1 predictions')
  })

  it('recomputes graded rows and tracker stats from imported CSV data', () => {
    const { result } = renderHook(() => useResultsTracker())

    act(() => {
      result.current.setResultsPaste(resultsCsv)
    })
    act(() => {
      result.current.handleImportResults()
    })
    act(() => {
      result.current.setPredPaste(predictionsCsv)
    })
    act(() => {
      result.current.handleImportPredictions()
    })

    expect(result.current.gradedRows).toHaveLength(1)
    expect(result.current.gradedRows[0]).toMatchObject({
      graded: true,
      mlRec: 'HOME - BOS',
      mlWin: true,
      actualTotal: 212,
      actualDiff: 8,
    })
    expect(result.current.stats.ml).toMatchObject({
      w: 1,
      l: 0,
      pct: '100.0',
    })
  })
})
