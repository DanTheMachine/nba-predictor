export type ParsedPredictionRow = {
  date: string
  home: string
  away: string
  lookupKey: string
  homeWinPct: number | null
  awayWinPct: number | null
  mlEdge: number | null
  mlRec: string
  spreadRec: string
  ouRec: string
  vegasHomeML: number | null
  vegasAwayML: number | null
  vegasSpread: number | null
  spreadHomeOdds: number | null
  spreadAwayOdds: number | null
  vegasOU: number | null
  overOdds: number | null
  underOdds: number | null
  compositeMarket: string
  compositePick: string
  compositeScore: number | null
  compositeTier: string
  mlEdgePct: number | null
  spreadEdgePct: number | null
  ouEdgePct: number | null
  actualMlBet: number | null
  actualOuBet: number | null
  actualSpreadBet: number | null
}

export type ParsedResultRow = {
  date: string
  home: string
  away: string
  homeScore: number
  awayScore: number
  lookupKey: string
}

export type EvaluatedBetRow = {
  lookupKey: string
  date: string
  matchup: string
  betType: 'ML' | 'SPR' | 'OU'
  recommendation: string
  odds: number | null
  result: 'WIN' | 'LOSS' | 'PUSH' | 'PENDING'
  units: number
  edgePct: number | null
  actualStake: number | null
  actualUnits: number
}

export type EvaluationSummary = {
  totalBets: number
  wins: number
  losses: number
  pushes: number
  pending: number
  roiUnits: number
  roiPct: number | null
  winPct: string
}

export type MarketBreakdown = {
  label: string
  all: EvaluationSummary
  actual: EvaluationSummary
}

export type EdgeThresholdBreakdown = {
  label: string
  minEdgePct: number
  summary: EvaluationSummary
}

export type CalibrationBucket = {
  label: string
  games: number
  accuracy: string
  avgPredicted: string
}

export type TotalsCalibrationRow = {
  label: 'OVER' | 'UNDER' | 'PASS'
  games: number
  avgEdge: string
  record?: string
  hitRate?: string
  units?: string
  roi?: string
  passNote?: string
}

export type EvaluationReport = {
  moneyline: EvaluationSummary
  spread: EvaluationSummary
  totals: EvaluationSummary
  rows: EvaluatedBetRow[]
  markets: MarketBreakdown[]
  edgeThresholds: EdgeThresholdBreakdown[]
  calibration: CalibrationBucket[]
  totalsCalibration: TotalsCalibrationRow[]
  totalsEdgeBuckets: Array<Omit<TotalsCalibrationRow, 'label'> & { label: string }>
}

function detectDelimiter(text: string): ',' | '\t' {
  const sampleLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)

  const commaScore = sampleLines.reduce((sum, line) => sum + (line.match(/,/g)?.length ?? 0), 0)
  const tabScore = sampleLines.reduce((sum, line) => sum + (line.match(/\t/g)?.length ?? 0), 0)

  return tabScore > commaScore ? '\t' : ','
}

function parseSeparatedValues(text: string, delimiter: ',' | '\t'): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      row.push(cell)
      cell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1
      row.push(cell)
      if (row.some((value) => value.trim() !== '')) rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  row.push(cell)
  if (row.some((value) => value.trim() !== '')) rows.push(row)
  return rows
}

function parseTable(text: string): string[][] {
  return parseSeparatedValues(text.trim(), detectDelimiter(text))
}

function findColumnIndex(headers: string[], pattern: string): number {
  return headers.findIndex((header) => header.includes(pattern))
}

function normalizeHeaders(row: string[]): string[] {
  return row.map((value) => value.trim().toLowerCase())
}

function findHeaderRowIndex(rows: string[][], requiredPatterns: string[]): number {
  return rows.findIndex((row) => {
    const headers = normalizeHeaders(row)
    return requiredPatterns.every((pattern) => findColumnIndex(headers, pattern) >= 0)
  })
}

function parseNumber(value: string): number | null {
  const cleaned = value.trim().replace(/[%+]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === 'PASS' || cleaned === '---' || cleaned === '—' || cleaned === 'â€”') return null
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function parseStake(value: string): number | null {
  const parsed = parseNumber(value)
  return parsed != null && parsed > 0 ? parsed : null
}

function parseTeamAbbr(value: string): string {
  return value.trim().split(/\s+/)[0] ?? ''
}

function looksLikeIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

function toLookupKey(date: string, home: string, away: string): string {
  return `${date.replace(/-/g, '')}${home}${away}`
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value))
}

export function parsePredictionsCsv(text: string): ParsedPredictionRow[] {
  const rows = parseTable(text)
  if (rows.length < 2) throw new Error('Predictions CSV needs a header row and at least one data row.')

  const headerRowIndex = findHeaderRowIndex(rows, ['date', 'home', 'away'])
  if (headerRowIndex < 0) throw new Error('Predictions CSV is missing required Date/Home/Away columns.')

  const headerRow = rows[headerRowIndex]
  if (!headerRow) throw new Error('Predictions CSV is missing a header row.')

  const headers = normalizeHeaders(headerRow)
  const idx = {
    date: findColumnIndex(headers, 'date'),
    home: findColumnIndex(headers, 'home'),
    away: findColumnIndex(headers, 'away'),
    homeWinPct: findColumnIndex(headers, 'h win'),
    awayWinPct: findColumnIndex(headers, 'a win'),
    mlEdge: findColumnIndex(headers, 'ml edge'),
    mlRec: findColumnIndex(headers, 'ml rec'),
    spreadRec: findColumnIndex(headers, 'spread rec'),
    ouRec: findColumnIndex(headers, 'o/u rec'),
    vegasHomeML: findColumnIndex(headers, 'vegas h ml'),
    vegasAwayML: findColumnIndex(headers, 'vegas a ml'),
    vegasSpread: findColumnIndex(headers, 'vegas spread'),
    spreadHomeOdds: findColumnIndex(headers, 'spread home odds'),
    spreadAwayOdds: findColumnIndex(headers, 'spread away odds'),
    vegasOU: findColumnIndex(headers, 'vegas o/u'),
    overOdds: findColumnIndex(headers, 'over odds'),
    underOdds: findColumnIndex(headers, 'under odds'),
    compositeMarket: findColumnIndex(headers, 'composite market'),
    compositePick: findColumnIndex(headers, 'composite pick'),
    compositeScore: findColumnIndex(headers, 'composite score'),
    compositeTier: findColumnIndex(headers, 'composite tier'),
    lookupKey: findColumnIndex(headers, 'lookupkey'),
    mlEdgePct: findColumnIndex(headers, 'ml edge%'),
    spreadEdgePct: findColumnIndex(headers, 'spr edge%'),
    ouEdgePct: findColumnIndex(headers, 'ou edge%'),
    actualMlBet: findColumnIndex(headers, 'ml bet'),
    actualOuBet: findColumnIndex(headers, 'ou bet'),
    actualSpreadBet: findColumnIndex(headers, 'spread bet'),
  }

  if ([idx.date, idx.home, idx.away].some((value) => value < 0)) {
    throw new Error('Predictions CSV is missing required Date/Home/Away columns.')
  }

  return rows
    .slice(headerRowIndex + 1)
    .map((columns) => {
      const get = (columnIndex: number) => (columnIndex >= 0 ? (columns[columnIndex] ?? '').trim() : '')
      const date = get(idx.date)
      const home = parseTeamAbbr(get(idx.home))
      const away = parseTeamAbbr(get(idx.away))

      return {
        date,
        home,
        away,
        lookupKey: get(idx.lookupKey) || toLookupKey(date, home, away),
        homeWinPct: parseNumber(get(idx.homeWinPct)),
        awayWinPct: parseNumber(get(idx.awayWinPct)),
        mlEdge: parseNumber(get(idx.mlEdge)),
        mlRec: get(idx.mlRec),
        spreadRec: get(idx.spreadRec),
        ouRec: get(idx.ouRec),
        vegasHomeML: parseNumber(get(idx.vegasHomeML)),
        vegasAwayML: parseNumber(get(idx.vegasAwayML)),
        vegasSpread: parseNumber(get(idx.vegasSpread)),
        spreadHomeOdds: parseNumber(get(idx.spreadHomeOdds)),
        spreadAwayOdds: parseNumber(get(idx.spreadAwayOdds)),
        vegasOU: parseNumber(get(idx.vegasOU)),
        overOdds: parseNumber(get(idx.overOdds)),
        underOdds: parseNumber(get(idx.underOdds)),
        compositeMarket: get(idx.compositeMarket),
        compositePick: get(idx.compositePick),
        compositeScore: parseNumber(get(idx.compositeScore)),
        compositeTier: get(idx.compositeTier),
        mlEdgePct: parseNumber(get(idx.mlEdgePct)) ?? parseNumber(get(idx.mlEdge)),
        spreadEdgePct: parseNumber(get(idx.spreadEdgePct)),
        ouEdgePct: parseNumber(get(idx.ouEdgePct)),
        actualMlBet: parseStake(get(idx.actualMlBet)),
        actualOuBet: parseStake(get(idx.actualOuBet)),
        actualSpreadBet: parseStake(get(idx.actualSpreadBet)),
      }
    })
    .filter((row) => row.date && row.home && row.away && looksLikeIsoDate(row.date))
}

export function parseResultsCsv(text: string): ParsedResultRow[] {
  const rows = parseTable(text)
  if (rows.length < 1) throw new Error('Results CSV needs at least one data row.')

  const headerRowIndex = findHeaderRowIndex(rows, ['date', 'home', 'away', 'home score', 'away score'])
  const hasHeader = headerRowIndex >= 0
  const headerRow = hasHeader ? rows[headerRowIndex] : null
  const headers = headerRow ? normalizeHeaders(headerRow) : []
  const idx = hasHeader
    ? {
        date: findColumnIndex(headers, 'date'),
        home: headers.findIndex((header) => header === 'home'),
        away: headers.findIndex((header) => header === 'away'),
        homeScore: findColumnIndex(headers, 'home score'),
        awayScore: findColumnIndex(headers, 'away score'),
        lookupKey: findColumnIndex(headers, 'lookupkey'),
      }
    : {
        date: 0,
        home: 1,
        away: 2,
        homeScore: 3,
        awayScore: 4,
        lookupKey: 5,
      }

  if (hasHeader && [idx.date, idx.home, idx.away, idx.homeScore, idx.awayScore].some((value) => value < 0)) {
    throw new Error('Results CSV is missing required Date/Home/Away/Home Score/Away Score columns.')
  }

  const dataRows = hasHeader ? rows.slice(headerRowIndex + 1) : rows

  return dataRows
    .map((columns) => {
      const get = (columnIndex: number) => (columnIndex >= 0 ? (columns[columnIndex] ?? '').trim() : '')
      const date = get(idx.date)
      const home = parseTeamAbbr(get(idx.home)).toUpperCase()
      const away = parseTeamAbbr(get(idx.away)).toUpperCase()
      return {
        date,
        home,
        away,
        homeScore: Number.parseInt(get(idx.homeScore), 10),
        awayScore: Number.parseInt(get(idx.awayScore), 10),
        lookupKey: get(idx.lookupKey) || toLookupKey(date, home, away),
      }
    })
    .filter((row) => row.date && looksLikeIsoDate(row.date) && row.home && row.away && Number.isFinite(row.homeScore) && Number.isFinite(row.awayScore))
}

function unitsFromAmericanOdds(odds: number | null): number {
  if (odds == null) return 0
  return odds > 0 ? odds / 100 : 100 / Math.abs(odds)
}

function actualUnitsForStake(result: EvaluatedBetRow['result'], odds: number | null, stake: number | null): number {
  if (stake == null || result === 'PENDING') return 0
  if (result === 'PUSH') return 0
  if (result === 'LOSS') return -stake
  return unitsFromAmericanOdds(odds) * stake
}

function summarize(rows: EvaluatedBetRow[]): EvaluationSummary {
  const wins = rows.filter((row) => row.result === 'WIN').length
  const losses = rows.filter((row) => row.result === 'LOSS').length
  const pushes = rows.filter((row) => row.result === 'PUSH').length
  const pending = rows.filter((row) => row.result === 'PENDING').length
  const settled = wins + losses + pushes
  const totalBets = rows.length
  const roiUnits = rows.reduce((sum, row) => sum + row.units, 0)
  const stakeTotal = rows.filter((row) => row.result !== 'PENDING').reduce((sum, row) => sum + 1, 0)
  const roiPct = stakeTotal > 0 ? (roiUnits / stakeTotal) * 100 : null
  const winPct = settled > 0 ? ((wins / settled) * 100).toFixed(1) : '-'

  return { totalBets, wins, losses, pushes, pending, roiUnits, roiPct, winPct }
}

function summarizeActual(rows: EvaluatedBetRow[]): EvaluationSummary {
  const actualRows = rows.filter((row) => row.actualStake != null)
  const wins = actualRows.filter((row) => row.result === 'WIN').length
  const losses = actualRows.filter((row) => row.result === 'LOSS').length
  const pushes = actualRows.filter((row) => row.result === 'PUSH').length
  const pending = actualRows.filter((row) => row.result === 'PENDING').length
  const settled = wins + losses + pushes
  const totalBets = actualRows.length
  const roiUnits = actualRows.reduce((sum, row) => sum + row.actualUnits, 0)
  const stakeTotal = actualRows
    .filter((row) => row.result !== 'PENDING')
    .reduce((sum, row) => sum + (row.actualStake ?? 0), 0)
  const roiPct = stakeTotal > 0 ? (roiUnits / stakeTotal) * 100 : null
  const winPct = settled > 0 ? ((wins / settled) * 100).toFixed(1) : '-'

  return { totalBets, wins, losses, pushes, pending, roiUnits, roiPct, winPct }
}

function formatRecord(summary: EvaluationSummary): string {
  return `${summary.wins}-${summary.losses}-${summary.pushes}`
}

function formatPct(value: number | null): string {
  return value == null ? '-' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function formatUnits(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}u`
}

function buildMarketBreakdown(rows: EvaluatedBetRow[]): MarketBreakdown[] {
  return [
    { label: 'ML', all: summarize(rows.filter((row) => row.betType === 'ML')), actual: summarizeActual(rows.filter((row) => row.betType === 'ML')) },
    { label: 'PL', all: summarize(rows.filter((row) => row.betType === 'SPR')), actual: summarizeActual(rows.filter((row) => row.betType === 'SPR')) },
    { label: 'O/U', all: summarize(rows.filter((row) => row.betType === 'OU')), actual: summarizeActual(rows.filter((row) => row.betType === 'OU')) },
  ]
}

function buildEdgeThresholds(rows: EvaluatedBetRow[]): EdgeThresholdBreakdown[] {
  const settledRows = rows.filter((row) => row.result !== 'PENDING' && row.edgePct != null)
  return [2, 4, 6, 8].map((minEdgePct) => ({
    label: `Edge ${minEdgePct}%+`,
    minEdgePct,
    summary: summarize(settledRows.filter((row) => (row.edgePct ?? -Infinity) >= minEdgePct)),
  }))
}

function buildCalibration(predictions: ParsedPredictionRow[], resultsByKey: Map<string, ParsedResultRow>): CalibrationBucket[] {
  const buckets = [
    { label: '50-55%', min: 50, max: 55 },
    { label: '55-60%', min: 55, max: 60 },
    { label: '60-65%', min: 60, max: 65 },
    { label: '65-70%', min: 65, max: 70 },
    { label: '70%+', min: 70, max: Infinity },
  ]

  return buckets.map((bucket) => {
    const rows = predictions
      .map((prediction) => {
        const result = resultsByKey.get(prediction.lookupKey)
        if (!result || prediction.homeWinPct == null || prediction.awayWinPct == null) return null
        const predictedHome = prediction.homeWinPct >= prediction.awayWinPct
        const predictedPct = predictedHome ? prediction.homeWinPct : prediction.awayWinPct
        if (predictedPct < bucket.min || predictedPct >= bucket.max) return null
        const homeWon = result.homeScore > result.awayScore
        return { predictedPct, correct: predictedHome === homeWon }
      })
      .filter((row): row is { predictedPct: number; correct: boolean } => row !== null)

    const avgPredicted = rows.length > 0 ? rows.reduce((sum, row) => sum + row.predictedPct, 0) / rows.length : null
    const accuracy = rows.length > 0 ? (rows.filter((row) => row.correct).length / rows.length) * 100 : null

    return {
      label: bucket.label,
      games: rows.length,
      accuracy: accuracy == null ? '-' : `${accuracy.toFixed(1)}%`,
      avgPredicted: avgPredicted == null ? '-' : `${avgPredicted.toFixed(1)}%`,
    }
  })
}

function buildTotalsCalibration(rows: EvaluatedBetRow[]): TotalsCalibrationRow[] {
  const labels: Array<'OVER' | 'UNDER' | 'PASS'> = ['OVER', 'UNDER', 'PASS']
  return labels.map((label) => {
    const matching = rows.filter((row) => row.recommendation.trim().toUpperCase() === label)
    const avgEdge = matching.filter((row) => row.edgePct != null)
    const avgEdgePct = avgEdge.length > 0 ? avgEdge.reduce((sum, row) => sum + (row.edgePct ?? 0), 0) / avgEdge.length : null

    if (label === 'PASS') {
      return {
        label,
        games: matching.length,
        avgEdge: avgEdgePct == null ? '-' : `${avgEdgePct.toFixed(1)}%`,
        passNote: 'No bet tracked for PASS rows',
      }
    }

    const summary = summarize(matching.filter((row) => row.result !== 'PENDING'))
    return {
      label,
      games: matching.length,
      avgEdge: avgEdgePct == null ? '-' : `${avgEdgePct.toFixed(1)}%`,
      record: formatRecord(summary),
      hitRate: `${summary.winPct}%`,
      units: formatUnits(summary.roiUnits),
      roi: formatPct(summary.roiPct),
    }
  })
}

function buildTotalsEdgeBuckets(rows: EvaluatedBetRow[]): Array<Omit<TotalsCalibrationRow, 'label'> & { label: string }> {
  const settled = rows.filter((row) => row.betType === 'OU' && row.result !== 'PENDING' && row.edgePct != null)
  const buckets = [
    { label: '0-5%', min: 0, max: 5 },
    { label: '5-10%', min: 5, max: 10 },
    { label: '10%+', min: 10, max: Infinity },
  ]

  return buckets.map((bucket) => {
    const matching = settled.filter((row) => {
      const edge = row.edgePct ?? -Infinity
      return edge >= bucket.min && edge < bucket.max
    })
    const avgEdgePct = matching.length > 0 ? matching.reduce((sum, row) => sum + (row.edgePct ?? 0), 0) / matching.length : null
    const summary = summarize(matching)

    return {
      label: bucket.label,
      games: matching.length,
      avgEdge: avgEdgePct == null ? '-' : `${avgEdgePct.toFixed(1)}%`,
      record: formatRecord(summary),
      hitRate: `${summary.winPct}%`,
      units: formatUnits(summary.roiUnits),
      roi: formatPct(summary.roiPct),
    }
  })
}

export function evaluatePredictions(predictions: ParsedPredictionRow[], results: ParsedResultRow[]): EvaluationReport {
  const resultsByKey = new Map(results.map((row) => [row.lookupKey, row]))
  const evaluatedRows: EvaluatedBetRow[] = []

  for (const prediction of predictions) {
    const result = resultsByKey.get(prediction.lookupKey)
    const matchup = `${prediction.home} vs ${prediction.away}`
    const pendingRow = (
      betType: EvaluatedBetRow['betType'],
      recommendation: string,
      odds: number | null,
      edgePct: number | null,
      actualStake: number | null,
    ): EvaluatedBetRow => ({
      lookupKey: prediction.lookupKey,
      date: prediction.date,
      matchup,
      betType,
      recommendation,
      odds,
      result: 'PENDING',
      units: 0,
      edgePct,
      actualStake,
      actualUnits: 0,
    })

    const fallbackMlRec =
      prediction.mlEdge != null && prediction.homeWinPct != null && prediction.awayWinPct != null
        ? prediction.homeWinPct >= prediction.awayWinPct
          ? `HOME - ${prediction.home}`
          : `AWAY - ${prediction.away}`
        : ''

    const mlRec = (prediction.mlRec || fallbackMlRec).trim().toUpperCase()
    if (mlRec && mlRec !== 'PASS' && mlRec !== '-' && mlRec !== '—' && mlRec !== 'â€”') {
      const mlSide = mlRec.includes(prediction.home) ? 'home' : mlRec.includes(prediction.away) ? 'away' : null
      const odds = mlSide === 'home' ? prediction.vegasHomeML : mlSide === 'away' ? prediction.vegasAwayML : null
      const actualStake = prediction.actualMlBet
      if (!result || mlSide === null) {
        evaluatedRows.push(pendingRow('ML', prediction.mlRec, odds, prediction.mlEdgePct, actualStake))
      } else {
        const homeWon = result.homeScore > result.awayScore
        const won = mlSide === 'home' ? homeWon : !homeWon
        const row: EvaluatedBetRow = {
          lookupKey: prediction.lookupKey,
          date: prediction.date,
          matchup,
          betType: 'ML',
          recommendation: prediction.mlRec,
          odds,
          result: won ? 'WIN' : 'LOSS',
          units: won ? unitsFromAmericanOdds(odds) : -1,
          edgePct: prediction.mlEdgePct,
          actualStake,
          actualUnits: 0,
        }
        row.actualUnits = actualUnitsForStake(row.result, odds, actualStake)
        evaluatedRows.push(row)
      }
    }

    const spreadRec = prediction.spreadRec.trim().toUpperCase()
    if (spreadRec && spreadRec !== 'PASS' && spreadRec !== '-' && spreadRec !== '—' && spreadRec !== 'â€”') {
      const spreadValueMatch = spreadRec.match(/[-+]?[\d.]+/)
      const spreadValue = spreadValueMatch ? Number.parseFloat(spreadValueMatch[0]) : null
      const isHomeBet = spreadRec.startsWith(prediction.home) || spreadRec.startsWith('HOME')
      const odds = (isHomeBet ? prediction.spreadHomeOdds : prediction.spreadAwayOdds) ?? -110
      const actualStake = prediction.actualSpreadBet
      if (!result || spreadValue == null) {
        evaluatedRows.push(pendingRow('SPR', prediction.spreadRec, odds, prediction.spreadEdgePct, actualStake))
      } else {
        const actualDiff = result.homeScore - result.awayScore
        const coverDiff = isHomeBet ? actualDiff + spreadValue : -actualDiff - spreadValue
        const outcome = coverDiff > 0 ? 'WIN' : coverDiff < 0 ? 'LOSS' : 'PUSH'
        const row: EvaluatedBetRow = {
          lookupKey: prediction.lookupKey,
          date: prediction.date,
          matchup,
          betType: 'SPR',
          recommendation: prediction.spreadRec,
          odds,
          result: outcome,
          units: outcome === 'WIN' ? unitsFromAmericanOdds(odds) : outcome === 'LOSS' ? -1 : 0,
          edgePct: prediction.spreadEdgePct,
          actualStake,
          actualUnits: 0,
        }
        row.actualUnits = actualUnitsForStake(row.result, odds, actualStake)
        evaluatedRows.push(row)
      }
    }

    const ouRec = prediction.ouRec.trim().toUpperCase()
    if (ouRec && ouRec !== 'PASS' && ouRec !== '-' && ouRec !== '—' && ouRec !== 'â€”') {
      const odds = (ouRec === 'OVER' ? prediction.overOdds : ouRec === 'UNDER' ? prediction.underOdds : null) ?? -110
      const actualStake = prediction.actualOuBet
      if (!result || prediction.vegasOU == null) {
        evaluatedRows.push(pendingRow('OU', prediction.ouRec, odds, prediction.ouEdgePct, actualStake))
      } else {
        const actualTotal = result.homeScore + result.awayScore
        const outcome =
          ouRec === 'OVER'
            ? actualTotal > prediction.vegasOU ? 'WIN' : actualTotal < prediction.vegasOU ? 'LOSS' : 'PUSH'
            : actualTotal < prediction.vegasOU ? 'WIN' : actualTotal > prediction.vegasOU ? 'LOSS' : 'PUSH'
        const row: EvaluatedBetRow = {
          lookupKey: prediction.lookupKey,
          date: prediction.date,
          matchup,
          betType: 'OU',
          recommendation: prediction.ouRec,
          odds,
          result: outcome,
          units: outcome === 'WIN' ? unitsFromAmericanOdds(odds) : outcome === 'LOSS' ? -1 : 0,
          edgePct: prediction.ouEdgePct,
          actualStake,
          actualUnits: 0,
        }
        row.actualUnits = actualUnitsForStake(row.result, odds, actualStake)
        evaluatedRows.push(row)
      }
    }
  }

  const sortedRows = evaluatedRows.sort((a, b) => `${b.date}${b.lookupKey}`.localeCompare(`${a.date}${a.lookupKey}`))
  const ouRows = sortedRows.filter((row) => row.betType === 'OU')

  return {
    moneyline: summarize(sortedRows.filter((row) => row.betType === 'ML')),
    spread: summarize(sortedRows.filter((row) => row.betType === 'SPR')),
    totals: summarize(ouRows),
    rows: sortedRows,
    markets: buildMarketBreakdown(sortedRows),
    edgeThresholds: buildEdgeThresholds(sortedRows),
    calibration: buildCalibration(predictions, resultsByKey),
    totalsCalibration: buildTotalsCalibration(ouRows),
    totalsEdgeBuckets: buildTotalsEdgeBuckets(ouRows),
  }
}
