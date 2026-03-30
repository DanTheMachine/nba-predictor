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
"2026-03-20","BOS Celtics","LAL Lakers","HOME - BOS","-150","20260320BOSLAL"`)

    const report = evaluatePredictions(predictions, [])

    expect(report.moneyline.pending).toBe(1)
    expect(report.rows[0]?.result).toBe('PENDING')
    expect(report.rows[0]?.units).toBe(0)
  })

  it('builds lookup keys from date and team abbreviations when the predictions CSV does not include one', () => {
    const predictions = parsePredictionsCsv(`"Date","Home","Away","ML Rec","ML Edge%","Vegas H ML"
"2026-03-20","BOS Celtics","LAL Lakers","HOME - BOS","+3.4%","-145"`)

    expect(predictions).toHaveLength(1)
    expect(predictions[0]?.lookupKey).toBe('20260320BOSLAL')
    expect(predictions[0]?.home).toBe('BOS')
    expect(predictions[0]?.away).toBe('LAL')
  })

  it('treats placeholder odds markers as missing values while preserving explicit recommendations', () => {
    const predictions = parsePredictionsCsv(`"Date","Home","Away","ML Rec","Vegas H ML","Vegas A ML","Vegas Spread","Vegas O/U"
"2026-03-20","BOS Celtics","LAL Lakers","HOME - BOS","â€”","---","-","â€”"`)

    expect(predictions[0]?.mlRec).toBe('HOME - BOS')
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

  it('parses a cumulative predictions sheet with summary rows above the header', () => {
    const predictions = parsePredictionsCsv(
      `\t\t\t\t34 Units\t-9 Units
\t\t\t\t55-21\t75-85
Date\tTime\tHome\tAway\tH Win%\tA Win%\tML Rec\tOver Odds\tUnder Odds\tVegas Spread\tSpread Home Odds\tSpread Away Odds\tVegas H ML\tVegas A ML\tSpread Rec\tO/U Rec\tML Edge%\tSPR Edge%\tOU Edge%\tML Bet\tLookupKey\tActual Home
2026-03-23\t7:00 PM EDT\tDET Pistons\tLAL Lakers\t64.9%\t35.1%\tHOME - DET\t-105\t-105\t+1.5\t-105\t-105\t+100\t-110\tHOME +1.5\tOVER\t+16.0%\t+9.4%\t+3.8%\t2\t20260323DETLAL\t113`,
    )

    expect(predictions).toHaveLength(1)
    expect(predictions[0]?.home).toBe('DET')
    expect(predictions[0]?.away).toBe('LAL')
    expect(predictions[0]?.mlRec).toBe('HOME - DET')
    expect(predictions[0]?.lookupKey).toBe('20260323DETLAL')
    expect(predictions[0]?.mlEdgePct).toBe(16)
    expect(predictions[0]?.actualMlBet).toBe(2)
  })

  it('parses results rows without a header row', () => {
    const results = parseResultsCsv(`2026-03-20,BOS,LAL,118,110
2026-03-21,CLE,NYK,101,99`)

    expect(results).toHaveLength(2)
    expect(results[0]?.lookupKey).toBe('20260320BOSLAL')
    expect(results[1]?.home).toBe('CLE')
    expect(results[1]?.awayScore).toBe(99)
  })

  it('builds rich market and threshold breakdowns when edge and actual-bet fields are present', () => {
    const predictions = parsePredictionsCsv(`"Date","Home","Away","H Win%","A Win%","ML Rec","Vegas H ML","Spread Rec","Spread Home Odds","O/U Rec","Over Odds","Vegas O/U","LookupKey","ML Edge%","SPR Edge%","OU Edge%","ML Bet","Spread Bet","OU Bet"
"2026-03-20","BOS Celtics","LAL Lakers","61.0%","39.0%","HOME - BOS","-150","HOME -4.0","-110","OVER","-110","220.0","20260320BOSLAL","+6.0%","+5.0%","+10.0%","2","1","3"`)
    const results = parseResultsCsv(`"Date","Home","Away","Home Score","Away Score","LookupKey"
"2026-03-20","BOS","LAL","118","110","20260320BOSLAL"`)

    const report = evaluatePredictions(predictions, results)

    expect(report.markets[0]?.actual.totalBets).toBe(1)
    expect(report.markets[0]?.actual.roiUnits).toBeCloseTo(1.3333, 3)
    expect(report.edgeThresholds.find((bucket) => bucket.label === 'Edge 6%+')?.summary.totalBets).toBe(2)
    expect(report.calibration.find((bucket) => bucket.label === '60-65%')?.games).toBe(1)
    expect(report.totalsCalibration.find((row) => row.label === 'OVER')?.games).toBe(1)
    expect(report.totalsEdgeBuckets.find((row) => row.label === '10%+')?.games).toBe(1)
  })
})
