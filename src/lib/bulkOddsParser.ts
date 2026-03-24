import type { ParsedBulkGame, TeamAbbr } from './nbaTypes'

const BULK_NAME_MAP: Record<string, TeamAbbr> = {
  'ATLANTA HAWKS': 'ATL',
  'ATLANTA': 'ATL',
  'BOSTON CELTICS': 'BOS',
  'BOSTON': 'BOS',
  'BROOKLYN NETS': 'BKN',
  'BROOKLYN': 'BKN',
  'CHARLOTTE HORNETS': 'CHA',
  'CHARLOTTE': 'CHA',
  'CHICAGO BULLS': 'CHI',
  'CHICAGO': 'CHI',
  'CLEVELAND CAVALIERS': 'CLE',
  'CLEVELAND': 'CLE',
  'DALLAS MAVERICKS': 'DAL',
  'DALLAS': 'DAL',
  'DENVER NUGGETS': 'DEN',
  'DENVER': 'DEN',
  'DETROIT PISTONS': 'DET',
  'DETROIT': 'DET',
  'GOLDEN STATE WARRIORS': 'GSW',
  'GOLDEN STATE': 'GSW',
  'HOUSTON ROCKETS': 'HOU',
  'HOUSTON': 'HOU',
  'INDIANA PACERS': 'IND',
  'INDIANA': 'IND',
  'LOS ANGELES CLIPPERS': 'LAC',
  'LOS ANGELES LAKERS': 'LAL',
  'LA CLIPPERS': 'LAC',
  'LA LAKERS': 'LAL',
  'MEMPHIS GRIZZLIES': 'MEM',
  'MEMPHIS': 'MEM',
  'MIAMI HEAT': 'MIA',
  'MIAMI': 'MIA',
  'MILWAUKEE BUCKS': 'MIL',
  'MILWAUKEE': 'MIL',
  'MINNESOTA TIMBERWOLVES': 'MIN',
  'MINNESOTA': 'MIN',
  'NEW ORLEANS PELICANS': 'NOP',
  'NEW ORLEANS': 'NOP',
  'NEW YORK KNICKS': 'NYK',
  'NEW YORK': 'NYK',
  'OKLAHOMA CITY THUNDER': 'OKC',
  'OKLAHOMA CITY': 'OKC',
  'ORLANDO MAGIC': 'ORL',
  'ORLANDO': 'ORL',
  'PHILADELPHIA 76ERS': 'PHI',
  'PHILADELPHIA': 'PHI',
  'PHOENIX SUNS': 'PHX',
  'PHOENIX': 'PHX',
  'PORTLAND TRAIL BLAZERS': 'POR',
  'PORTLAND': 'POR',
  'SACRAMENTO KINGS': 'SAC',
  'SACRAMENTO': 'SAC',
  'SAN ANTONIO SPURS': 'SAS',
  'SAN ANTONIO': 'SAS',
  'TORONTO RAPTORS': 'TOR',
  'TORONTO': 'TOR',
  'UTAH JAZZ': 'UTA',
  'UTAH': 'UTA',
  'WASHINGTON WIZARDS': 'WAS',
  'WASHINGTON': 'WAS',
}

const normalizeFractionGlyphs = (value: string): string =>
  value
    .trim()
    .replace(/\s*[Â]?½/g, '.5')
    .replace(/\s*[Â]?¼/g, '.25')
    .replace(/\s*[Â]?¾/g, '.75')
    .replace(/\s+/g, ' ')

const parseOddsNum = (value: string | undefined): number | null => {
  if (!value) return null
  const clean = normalizeFractionGlyphs(value)
  if (/^even$/i.test(clean)) return 100
  const match = clean.match(/^([+-])\s*([\d.]+)$/)
  if (!match) return null
  const sign = match[1]
  const numericPart = match[2]
  if (!sign || !numericPart) return null
  const numericValue = parseFloat(numericPart)
  return sign === '-' ? -numericValue : numericValue
}

const parseSpreadNum = (value: string | undefined): number | null => {
  if (!value) return null
  const clean = normalizeFractionGlyphs(value)
  const match = clean.match(/^([+-])\s*([\d.]+)$/)
  if (!match) return null
  const sign = match[1]
  const numericPart = match[2]
  if (!sign || !numericPart) return null
  const numericValue = parseFloat(numericPart)
  return sign === '-' ? -numericValue : numericValue
}

const parseOU = (value: string | undefined): number | null => {
  if (!value) return null
  const clean = normalizeFractionGlyphs(value)
  const match = clean.match(/^[OoUu]\s*([\d.]+)$/)
  if (!match) return null
  const numericPart = match[1]
  if (!numericPart) return null
  return parseFloat(numericPart)
}

export function parseBulkOdds(raw: string): ParsedBulkGame[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length)

  const isTeamName = (line: string) => BULK_NAME_MAP[line.toUpperCase()] !== undefined
  const isRotNum = (line: string) => /^\d{3,4}$/.test(line)

  const teamIndices: number[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line && isTeamName(line.toUpperCase())) {
      teamIndices.push(i)
    }
  }

  if (teamIndices.length < 2) {
    const sample = lines.slice(0, 5).map((line) => JSON.stringify(line)).join(', ')
    throw new Error(`Could not find team names. First lines seen: ${sample}`)
  }

  const games: ParsedBulkGame[] = []
  for (let t = 0; t < teamIndices.length - 1; t += 2) {
    const firstTeamIndex = teamIndices[t]
    const secondTeamIndex = teamIndices[t + 1]
    if (firstTeamIndex === undefined || secondTeamIndex === undefined) continue

    const firstTeamLine = lines[firstTeamIndex]
    const secondTeamLine = lines[secondTeamIndex]
    if (!firstTeamLine || !secondTeamLine) continue

    const firstTeamName = firstTeamLine.toUpperCase()
    const secondTeamName = secondTeamLine.toUpperCase()
    const awayAbbr = BULK_NAME_MAP[firstTeamName]
    const homeAbbr = BULK_NAME_MAP[secondTeamName]

    if (!awayAbbr || !homeAbbr) {
      continue
    }

    let firstCursor = firstTeamIndex + 1
    const firstRotationLine = lines[firstCursor]
    if (firstRotationLine && isRotNum(firstRotationLine)) firstCursor += 1
    const awayLines: string[] = []
    while (firstCursor < secondTeamIndex && awayLines.length < 5) {
      const line = lines[firstCursor]
      if (line) awayLines.push(line)
      firstCursor += 1
    }

    let secondCursor = secondTeamIndex + 1
    const secondRotationLine = lines[secondCursor]
    if (secondRotationLine && isRotNum(secondRotationLine)) secondCursor += 1
    const homeLines: string[] = []
    const nextTeamIndex = teamIndices[t + 2] ?? lines.length
    while (secondCursor < nextTeamIndex && homeLines.length < 5) {
      const line = lines[secondCursor]
      if (line) homeLines.push(line)
      secondCursor += 1
    }

    const [awaySpreadRaw, awaySpreadOddsRaw, awayOURaw, awayOverOddsRaw, awayMoneylineRaw] = awayLines
    const [homeSpreadRaw, homeSpreadOddsRaw, homeOURaw, homeUnderOddsRaw, homeMoneylineRaw] = homeLines

    const awaySpread = parseSpreadNum(awaySpreadRaw)
    const homeSpread = parseSpreadNum(homeSpreadRaw) ?? (awaySpread != null ? -awaySpread : null)
    const ouLine = parseOU(awayOURaw) ?? parseOU(homeOURaw)

    games.push({
      homeAbbr,
      awayAbbr,
      odds: {
        source: 'manual',
        homeMoneyline: parseOddsNum(homeMoneylineRaw) ?? 0,
        awayMoneyline: parseOddsNum(awayMoneylineRaw) ?? 0,
        spread: homeSpread ?? -3.5,
        spreadHomeOdds: parseOddsNum(homeSpreadOddsRaw) ?? -110,
        spreadAwayOdds: parseOddsNum(awaySpreadOddsRaw) ?? -110,
        overUnder: ouLine ?? 220,
        overOdds: parseOddsNum(awayOverOddsRaw) ?? -110,
        underOdds: parseOddsNum(homeUnderOddsRaw) ?? -110,
      },
    })
  }

  return games
}
