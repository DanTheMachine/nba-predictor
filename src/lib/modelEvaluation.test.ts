import { describe, expect, it } from 'vitest'

import { evaluatePredictions, parsePredictionsCsv, parseResultsCsv } from './modelEvaluation'

describe('modelEvaluation', () => {
  it('falls back to ML edge and win percentages when ML Rec is missing', () => {
    const predictions = parsePredictionsCsv(`"Date","Home","Away","H Win%","A Win%","ML Edge%","Vegas H ML","Vegas A ML","LookupKey"
"2026-03-20","BOS Celtics","LAL Lakers","61.0%","39.0%","+4.2%","-150","+130","20260320BOSLAL"`)
    const results = parseResultsCsv(`"Date","Home","Away","Home Score","Away Score","LookupKey"
"2026-03-20","BOS","LAL","110","102","20260320BOSLAL"`)

    const report = evaluatePredictions(predictions, results)

    expect(report.moneyline.totalBets).toBe(1)
    expect(report.moneyline.wins).toBe(1)
    expect(report.rows[0]?.recommendation).toBe('')
    expect(report.rows[0]?.result).toBe('WIN')
  })

  it('grades spread and totals as pushes when the closing number lands exactly', () => {
    const predictions = parsePredictionsCsv(`"Date","Home","Away","Spread Rec","Vegas Spread","Spread Home Odds","Vegas O/U","Over Odds","O/U Rec","LookupKey"
"2026-03-20","BOS Celtics","LAL Lakers","BOS -8.0","-8.0","-110","220.0","-110","OVER","20260320BOSLAL"`)
    const results = parseResultsCsv(`"Date","Home","Away","Home Score","Away Score","LookupKey"
"2026-03-20","BOS","LAL","114","106","20260320BOSLAL"`)

    const report = evaluatePredictions(predictions, results)
    const spreadBet = report.rows.find((row) => row.betType === 'SPR')
    const totalsBet = report.rows.find((row) => row.betType === 'OU')

    expect(spreadBet?.result).toBe('PUSH')
    expect(spreadBet?.units).toBe(0)
    expect(totalsBet?.result).toBe('PUSH')
    expect(totalsBet?.units).toBe(0)
  })

  it('marks bets as pending when no result row is available yet', () => {
    const predictions = parsePredictionsCsv(`"Date","Home","Away","ML Rec","Vegas H ML","LookupKey"
"2026-03-20","BOS Celtics","LAL Lakers","BOS ML","-150","20260320BOSLAL"`)

    const report = evaluatePredictions(predictions, [])

    expect(report.moneyline.pending).toBe(1)
    expect(report.rows[0]?.result).toBe('PENDING')
    expect(report.rows[0]?.units).toBe(0)
  })

  it('builds lookup keys from date and team abbreviations when the predictions CSV does not include one', () => {
    const predictions = parsePredictionsCsv(`"Date","Home","Away","ML Rec","ML Edge%","Vegas H ML"
"2026-03-20","BOS Celtics","LAL Lakers","BOS ML","+3.4%","-145"`)

    expect(predictions).toHaveLength(1)
    expect(predictions[0]?.lookupKey).toBe('20260320BOSLAL')
    expect(predictions[0]?.home).toBe('BOS')
    expect(predictions[0]?.away).toBe('LAL')
  })

  it('treats placeholder odds markers as missing values while preserving explicit recommendations', () => {
    const predictions = parsePredictionsCsv(`"Date","Home","Away","ML Rec","Vegas H ML","Vegas A ML","Vegas Spread","Vegas O/U"
"2026-03-20","BOS Celtics","LAL Lakers","BOS ML","â€”","---","-","â€”"`)

    expect(predictions[0]?.mlRec).toBe('BOS ML')
    expect(predictions[0]?.vegasHomeML).toBeNull()
    expect(predictions[0]?.vegasAwayML).toBeNull()
    expect(predictions[0]?.vegasSpread).toBeNull()
    expect(predictions[0]?.vegasOU).toBeNull()
  })

  it('normalizes results rows and derives lookup keys when the results CSV omits them', () => {
    const results = parseResultsCsv(`"Date","Home","Away","Home Score","Away Score"
"2026-03-20","bos","lal","111","104"`)

    expect(results).toHaveLength(1)
    expect(results[0]?.home).toBe('BOS')
    expect(results[0]?.away).toBe('LAL')
    expect(results[0]?.lookupKey).toBe('20260320BOSLAL')
  })
})
