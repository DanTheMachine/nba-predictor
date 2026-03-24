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
}

export type EvaluationSummary = {
  totalBets: number
  wins: number
  losses: number
  pushes: number
  pending: number
  roiUnits: number
  winPct: string
}

export type EvaluationReport = {
  moneyline: EvaluationSummary
  spread: EvaluationSummary
  totals: EvaluationSummary
  rows: EvaluatedBetRow[]
}

function parseCsv(text: string): string[][] {
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

    if (char === ',' && !inQuotes) {
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

function findColumnIndex(headers: string[], pattern: string): number {
  return headers.findIndex((header) => header.includes(pattern))
}

function parseNumber(value: string): number | null {
  const cleaned = value.trim().replace(/[%+]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === 'PASS' || cleaned === '---' || cleaned === '—') return null
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function parseTeamAbbr(value: string): string {
  return value.trim().split(/\s+/)[0] ?? ''
}

function toLookupKey(date: string, home: string, away: string): string {
  return `${date.replace(/-/g, '')}${home}${away}`
}

export function parsePredictionsCsv(text: string): ParsedPredictionRow[] {
  const rows = parseCsv(text.trim())
  if (rows.length < 2) throw new Error('Predictions CSV needs a header row and at least one data row.')

  const headerRow = rows[0]
  if (!headerRow) throw new Error('Predictions CSV is missing a header row.')
  const headers = headerRow.map((value) => value.trim().toLowerCase())
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
  }

  if ([idx.date, idx.home, idx.away].some((value) => value < 0)) {
    throw new Error('Predictions CSV is missing required Date/Home/Away columns.')
  }

  return rows.slice(1).map((columns) => {
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
    }
  }).filter((row) => row.date && row.home && row.away)
}

export function parseResultsCsv(text: string): ParsedResultRow[] {
  const rows = parseCsv(text.trim())
  if (rows.length < 2) throw new Error('Results CSV needs a header row and at least one data row.')

  const headerRow = rows[0]
  if (!headerRow) throw new Error('Results CSV is missing a header row.')
  const headers = headerRow.map((value) => value.trim().toLowerCase())
  const idx = {
    date: findColumnIndex(headers, 'date'),
    home: headers.findIndex((header) => header === 'home'),
    away: headers.findIndex((header) => header === 'away'),
    homeScore: findColumnIndex(headers, 'home score'),
    awayScore: findColumnIndex(headers, 'away score'),
    lookupKey: findColumnIndex(headers, 'lookupkey'),
  }

  if ([idx.date, idx.home, idx.away, idx.homeScore, idx.awayScore].some((value) => value < 0)) {
    throw new Error('Results CSV is missing required Date/Home/Away/Home Score/Away Score columns.')
  }

  return rows.slice(1).map((columns) => {
    const get = (columnIndex: number) => (columnIndex >= 0 ? (columns[columnIndex] ?? '').trim() : '')
    const date = get(idx.date)
    const home = get(idx.home).toUpperCase()
    const away = get(idx.away).toUpperCase()
    return {
      date,
      home,
      away,
      homeScore: Number.parseInt(get(idx.homeScore), 10),
      awayScore: Number.parseInt(get(idx.awayScore), 10),
      lookupKey: get(idx.lookupKey) || toLookupKey(date, home, away),
    }
  }).filter((row) => row.date && row.home && row.away && Number.isFinite(row.homeScore) && Number.isFinite(row.awayScore))
}

function unitsFromAmericanOdds(odds: number | null): number {
  if (odds == null) return 0
  return odds > 0 ? odds / 100 : 100 / Math.abs(odds)
}

function summarize(rows: EvaluatedBetRow[], betType: EvaluatedBetRow['betType']): EvaluationSummary {
  const filtered = rows.filter((row) => row.betType === betType)
  const wins = filtered.filter((row) => row.result === 'WIN').length
  const losses = filtered.filter((row) => row.result === 'LOSS').length
  const pushes = filtered.filter((row) => row.result === 'PUSH').length
  const pending = filtered.filter((row) => row.result === 'PENDING').length
  const settled = wins + losses + pushes
  const totalBets = filtered.length
  const roiUnits = filtered.reduce((sum, row) => sum + row.units, 0)
  const winPct = settled > 0 ? ((wins / settled) * 100).toFixed(1) : '-'

  return { totalBets, wins, losses, pushes, pending, roiUnits, winPct }
}

export function evaluatePredictions(predictions: ParsedPredictionRow[], results: ParsedResultRow[]): EvaluationReport {
  const resultsByKey = new Map(results.map((row) => [row.lookupKey, row]))
  const evaluatedRows: EvaluatedBetRow[] = []

  for (const prediction of predictions) {
    const result = resultsByKey.get(prediction.lookupKey)
    const matchup = `${prediction.home} vs ${prediction.away}`
    const pendingRow = (betType: EvaluatedBetRow['betType'], recommendation: string, odds: number | null): EvaluatedBetRow => ({
      lookupKey: prediction.lookupKey,
      date: prediction.date,
      matchup,
      betType,
      recommendation,
      odds,
      result: 'PENDING',
      units: 0,
    })

    const fallbackMlRec =
      prediction.mlEdge != null && prediction.homeWinPct != null && prediction.awayWinPct != null
        ? prediction.homeWinPct >= prediction.awayWinPct
          ? `HOME - ${prediction.home}`
          : `AWAY - ${prediction.away}`
        : ''
    const mlRec = (prediction.mlRec || fallbackMlRec).trim().toUpperCase()
    if (mlRec && mlRec !== 'PASS' && mlRec !== '-' && mlRec !== '—') {
      const mlSide = mlRec.includes(prediction.home) ? 'home' : mlRec.includes(prediction.away) ? 'away' : null
      const odds = mlSide === 'home' ? prediction.vegasHomeML : mlSide === 'away' ? prediction.vegasAwayML : null
      if (!result || mlSide === null) {
        evaluatedRows.push(pendingRow('ML', prediction.mlRec, odds))
      } else {
        const homeWon = result.homeScore > result.awayScore
        const won = mlSide === 'home' ? homeWon : !homeWon
        evaluatedRows.push({
          lookupKey: prediction.lookupKey,
          date: prediction.date,
          matchup,
          betType: 'ML',
          recommendation: prediction.mlRec,
          odds,
          result: won ? 'WIN' : 'LOSS',
          units: won ? unitsFromAmericanOdds(odds) : -1,
        })
      }
    }

    const spreadRec = prediction.spreadRec.trim().toUpperCase()
    if (spreadRec && spreadRec !== 'PASS' && spreadRec !== '-' && spreadRec !== '—') {
      const spreadValueMatch = spreadRec.match(/[-+]?[\d.]+/)
      const spreadValue = spreadValueMatch ? Number.parseFloat(spreadValueMatch[0]) : null
      const isHomeBet = spreadRec.startsWith(prediction.home) || spreadRec.startsWith('HOME')
      const odds = (isHomeBet ? prediction.spreadHomeOdds : prediction.spreadAwayOdds) ?? -110
      if (!result || spreadValue == null) {
        evaluatedRows.push(pendingRow('SPR', prediction.spreadRec, odds))
      } else {
        const actualDiff = result.homeScore - result.awayScore
        const coverDiff = isHomeBet ? actualDiff + spreadValue : -actualDiff - spreadValue
        const outcome = coverDiff > 0 ? 'WIN' : coverDiff < 0 ? 'LOSS' : 'PUSH'
        evaluatedRows.push({
          lookupKey: prediction.lookupKey,
          date: prediction.date,
          matchup,
          betType: 'SPR',
          recommendation: prediction.spreadRec,
          odds,
          result: outcome,
          units: outcome === 'WIN' ? unitsFromAmericanOdds(odds) : outcome === 'LOSS' ? -1 : 0,
        })
      }
    }

    const ouRec = prediction.ouRec.trim().toUpperCase()
    if (ouRec && ouRec !== 'PASS' && ouRec !== '-' && ouRec !== '—') {
      const odds = (ouRec === 'OVER' ? prediction.overOdds : ouRec === 'UNDER' ? prediction.underOdds : null) ?? -110
      if (!result || prediction.vegasOU == null) {
        evaluatedRows.push(pendingRow('OU', prediction.ouRec, odds))
      } else {
        const actualTotal = result.homeScore + result.awayScore
        const outcome =
          ouRec === 'OVER'
            ? actualTotal > prediction.vegasOU ? 'WIN' : actualTotal < prediction.vegasOU ? 'LOSS' : 'PUSH'
            : actualTotal < prediction.vegasOU ? 'WIN' : actualTotal > prediction.vegasOU ? 'LOSS' : 'PUSH'
        evaluatedRows.push({
          lookupKey: prediction.lookupKey,
          date: prediction.date,
          matchup,
          betType: 'OU',
          recommendation: prediction.ouRec,
          odds,
          result: outcome,
          units: outcome === 'WIN' ? unitsFromAmericanOdds(odds) : outcome === 'LOSS' ? -1 : 0,
        })
      }
    }
  }

  return {
    moneyline: summarize(evaluatedRows, 'ML'),
    spread: summarize(evaluatedRows, 'SPR'),
    totals: summarize(evaluatedRows, 'OU'),
    rows: evaluatedRows.sort((a, b) => `${b.date}${b.lookupKey}`.localeCompare(`${a.date}${a.lookupKey}`)),
  }
}
