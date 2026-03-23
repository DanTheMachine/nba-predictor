import { normalizeAbbr } from './nbaModel'
import type {
  GradedPredictionRow,
  PredictionLogEntry,
  ResultLogEntry,
  TeamAbbr,
  TrackerStats,
} from './nbaTypes'

function parseNumberOrNull(value: string): number | null {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseTeamAbbr(value: string): TeamAbbr | null {
  const abbr = normalizeAbbr(value.trim().split(/\s+/)[0] ?? '')
  return abbr ? (abbr as TeamAbbr) : null
}

function parseAmericanOdds(value: string): number {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseResultsTrackerCsv(raw: string): ResultLogEntry[] {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new Error('Need at least a header row + 1 data row')

  const headers = (lines[0] ?? '').split(',').map((header) => header.trim().replace(/"/g, '').toLowerCase())
  const iDate = headers.findIndex((header) => header.includes('date'))
  const iHome = headers.findIndex((header) => header === 'home')
  const iAway = headers.findIndex((header) => header === 'away')
  const iHS = headers.findIndex((header) => header.includes('home score'))
  const iAS = headers.findIndex((header) => header.includes('away score'))

  if ([iDate, iHome, iAway, iHS, iAS].some((index) => index < 0)) {
    throw new Error('Missing columns - expected: Date, Home, Away, Home Score, Away Score')
  }

  const parsed = lines
    .slice(1)
    .map((line) => {
      const cols = line.split(',').map((value) => value.trim().replace(/"/g, ''))
      const home = parseTeamAbbr(cols[iHome] ?? '')
      const away = parseTeamAbbr(cols[iAway] ?? '')
      const hScore = Number.parseInt(cols[iHS] ?? '', 10)
      const aScore = Number.parseInt(cols[iAS] ?? '', 10)

      if (!home || !away || !Number.isFinite(hScore) || !Number.isFinite(aScore)) return null

      return {
        date: cols[iDate] ?? '',
        home,
        away,
        hScore,
        aScore,
      } satisfies ResultLogEntry
    })
    .filter((row): row is ResultLogEntry => row !== null && Boolean(row.date))

  if (!parsed.length) throw new Error('No valid rows found')
  return parsed
}

export function parsePredictionTrackerCsv(raw: string): PredictionLogEntry[] {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new Error('Need header + data rows')

  const headers = (lines[0] ?? '').split(',').map((header) => header.trim().replace(/"/g, '').toLowerCase())
  const findHeader = (pattern: string) => headers.findIndex((header) => header.includes(pattern))
  const idx = {
    date: findHeader('date'),
    home: findHeader('home'),
    away: findHeader('away'),
    hProj: findHeader('h proj'),
    aProj: findHeader('a proj'),
    total: findHeader('model total'),
    vegaOU: findHeader('vegas o/u'),
    overOdds: findHeader('over odds'),
    underOdds: findHeader('under odds'),
    ouRec: findHeader('o/u rec'),
    ouEdge: findHeader('o/u edge'),
    hML: findHeader('h ml (model)'),
    aML: findHeader('a ml (model)'),
    vegaHML: findHeader('vegas h ml'),
    vegaAML: findHeader('vegas a ml'),
    vegasSpread: findHeader('vegas spread'),
    spreadHomeOdds: findHeader('spread home odds'),
    spreadAwayOdds: findHeader('spread away odds'),
    mlRec: findHeader('ml rec'),
    mlEdge: findHeader('ml edge'),
    sprRec: findHeader('spread rec'),
    sprEdge: findHeader('spread edge'),
    hWin: findHeader('h win'),
    aWin: findHeader('a win'),
  }

  const getCol = (cols: string[], index: number): string => (index >= 0 ? (cols[index] ?? '') : '')

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(',').map((value) => value.trim().replace(/"/g, ''))
      const home = parseTeamAbbr(getCol(cols, idx.home))
      const away = parseTeamAbbr(getCol(cols, idx.away))
      if (!home || !away) return null

      return {
        date: getCol(cols, idx.date),
        home,
        away,
        hProj: parseNumberOrNull(getCol(cols, idx.hProj)),
        aProj: parseNumberOrNull(getCol(cols, idx.aProj)),
        modelTotal: parseNumberOrNull(getCol(cols, idx.total)),
        vegaOU: parseNumberOrNull(getCol(cols, idx.vegaOU)),
        vegasSpread: parseNumberOrNull(getCol(cols, idx.vegasSpread)),
        spreadHomeOdds: parseNumberOrNull(getCol(cols, idx.spreadHomeOdds)),
        spreadAwayOdds: parseNumberOrNull(getCol(cols, idx.spreadAwayOdds)),
        overOdds: parseNumberOrNull(getCol(cols, idx.overOdds)),
        underOdds: parseNumberOrNull(getCol(cols, idx.underOdds)),
        ouRec: getCol(cols, idx.ouRec),
        ouEdge: getCol(cols, idx.ouEdge),
        hMLmodel: getCol(cols, idx.hML),
        aMLmodel: getCol(cols, idx.aML),
        vegaHML: getCol(cols, idx.vegaHML),
        vegaAML: getCol(cols, idx.vegaAML),
        mlRec: getCol(cols, idx.mlRec),
        mlEdge: getCol(cols, idx.mlEdge),
        sprRec: getCol(cols, idx.sprRec),
        sprEdge: getCol(cols, idx.sprEdge),
        hWinPct: parseNumberOrNull(getCol(cols, idx.hWin)),
        aWinPct: parseNumberOrNull(getCol(cols, idx.aWin)),
      } satisfies PredictionLogEntry
    })
    .filter((row): row is PredictionLogEntry => row !== null && Boolean(row.date))
}

export function gradePredictionLog(predictions: PredictionLogEntry[], results: ResultLogEntry[]): GradedPredictionRow[] {
  return predictions.map((prediction) => {
    const result = results.find((row) => row.home === prediction.home && row.away === prediction.away && row.date === prediction.date)
    if (!result) return { ...prediction, res: null, graded: false }

    const actualTotal = result.hScore + result.aScore
    const actualDiff = result.hScore - result.aScore
    const mlRecRaw = (prediction.mlRec || '').trim()
    const mlRecLower = mlRecRaw.toLowerCase()
    const fallbackMlSide =
      prediction.hWinPct == null ? null : prediction.hWinPct > 50 ? 'home' : 'away'

    const mlRecSide =
      mlRecLower === 'pass' || mlRecLower === 'â€”' || mlRecLower === '-' ? null
      : mlRecLower.includes(`${prediction.home.toLowerCase()} ml`) || mlRecLower.includes(`ml - ${prediction.home.toLowerCase()}`) || mlRecLower.includes(`home - ${prediction.home.toLowerCase()}`) || mlRecLower === 'home ml' || mlRecLower === 'home' ? 'home'
      : mlRecLower.includes(`${prediction.away.toLowerCase()} ml`) || mlRecLower.includes(`ml - ${prediction.away.toLowerCase()}`) || mlRecLower.includes(`away - ${prediction.away.toLowerCase()}`) || mlRecLower === 'away ml' || mlRecLower === 'away' ? 'away'
      : !mlRecRaw && prediction.mlEdge && prediction.mlEdge !== 'â€”' ? fallbackMlSide
      : !mlRecRaw && !prediction.mlEdge ? fallbackMlSide
      : null

    const mlWin =
      mlRecSide === 'home'
        ? result.hScore > result.aScore
        : mlRecSide === 'away'
          ? result.aScore > result.hScore
          : undefined

    const mlOdds =
      mlRecSide === 'home'
        ? parseAmericanOdds(prediction.vegaHML || prediction.hMLmodel)
        : mlRecSide === 'away'
          ? parseAmericanOdds(prediction.vegaAML || prediction.aMLmodel)
          : 0
    const mlPayout = mlOdds >= 0 ? mlOdds / 100 : 100 / Math.abs(mlOdds)
    const mlROI = mlRecSide == null || mlWin == null ? undefined : mlWin ? mlPayout : -1

    let sprWin: boolean | null | undefined
    let sprROI: number | null | undefined
    const sprRecLower = (prediction.sprRec || '').toLowerCase()
    if (sprRecLower && sprRecLower !== 'pass' && sprRecLower !== 'â€”') {
      const isHomeSpr = sprRecLower.startsWith('home')
      const spreadNum = Number.parseFloat((prediction.sprRec || '').match(/[-+]?[\d.]+/)?.[0] ?? '0')
      const coverDiff = isHomeSpr ? actualDiff + spreadNum : -actualDiff - spreadNum
      sprWin = coverDiff > 0
      sprROI = sprWin ? 100 / 110 : -1
    }

    let ouWin: boolean | null | undefined
    let ouROI: number | null | undefined
    const ouRecLower = (prediction.ouRec || '').toLowerCase()
    if (ouRecLower && ouRecLower !== 'pass' && ouRecLower !== 'â€”' && prediction.vegaOU != null) {
      ouWin = ouRecLower === 'over' ? actualTotal > prediction.vegaOU : actualTotal < prediction.vegaOU
      ouROI = ouWin ? 100 / 110 : -1
    }

    const normalizedMlRec =
      mlRecSide === 'home'
        ? `HOME - ${prediction.home}`
        : mlRecSide === 'away'
          ? `AWAY - ${prediction.away}`
          : 'PASS'

    return {
      ...prediction,
      mlRec: normalizedMlRec,
      res: result,
      graded: true,
      actualTotal,
      actualDiff,
      mlWin,
      mlROI,
      sprWin,
      sprROI,
      ouWin,
      ouROI,
    }
  })
}

export function summarizeTrackedPredictions(graded: GradedPredictionRow[]): TrackerStats {
  const settled = graded.filter((row) => row.graded)

  const summarize = (
    rows: GradedPredictionRow[],
    outcome: 'mlWin' | 'sprWin' | 'ouWin',
    roiKey: 'mlROI' | 'sprROI' | 'ouROI',
  ) => {
    const relevant = rows.filter((row) => row[roiKey] != null)
    const w = relevant.filter((row) => row[outcome] === true).length
    const l = relevant.filter((row) => row[outcome] === false).length
    const roi = relevant.reduce((sum, row) => sum + (row[roiKey] ?? 0), 0)
    return {
      w,
      l,
      roi: roi.toFixed(2),
      pct: relevant.length ? ((w / relevant.length) * 100).toFixed(1) : 'â€”',
    }
  }

  return {
    ml: summarize(settled, 'mlWin', 'mlROI'),
    spr: summarize(settled, 'sprWin', 'sprROI'),
    ou: summarize(settled, 'ouWin', 'ouROI'),
  }
}
