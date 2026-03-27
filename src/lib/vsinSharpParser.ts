import { americanToImplied } from './betting'
import type { OddsInput, SharpLeanSide, SharpLeanValue, SharpSignalInput, TeamAbbr } from './nbaTypes'

const TEAM_NAME_MAP: Record<string, TeamAbbr> = {
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

const CURRENT_BOOKS = ['DK', 'Circa', 'South Point', "Boomer's", 'Westgate', 'Wynn', 'Stations', 'Caesars', 'BetMGM'] as const
type CurrentBook = (typeof CURRENT_BOOKS)[number]
type SectionKind = 'spread' | 'moneyline' | 'total' | 'splits'

type SpreadCell = { line: number; odds: number } | null
type MoneylineCell = number | null
type TotalCell = { line: number; odds: number } | null

type SplitSnapshot = {
  spread: { awayLine: number; homeLine: number; awayMoneyPct: number; homeMoneyPct: number; awayBetPct: number; homeBetPct: number }
  total: { line: number; overMoneyPct: number; underMoneyPct: number; overBetPct: number; underBetPct: number }
  moneyline: { awayOdds: number; homeOdds: number; awayMoneyPct: number; homeMoneyPct: number; awayBetPct: number; homeBetPct: number }
}

type VsinGameAccumulator = {
  awayAbbr: TeamAbbr
  homeAbbr: TeamAbbr
  openingSpread?: { away: SpreadCell; home: SpreadCell }
  currentSpreadByBook: Partial<Record<CurrentBook, { away: SpreadCell; home: SpreadCell }>>
  openingMoneyline?: { away: MoneylineCell; home: MoneylineCell }
  currentMoneylineByBook: Partial<Record<CurrentBook, { away: MoneylineCell; home: MoneylineCell }>>
  openingTotal?: { over: TotalCell; under: TotalCell }
  currentTotalByBook: Partial<Record<CurrentBook, { over: TotalCell; under: TotalCell }>>
  splits?: SplitSnapshot
}

export type ParsedVsinSharpGame = {
  awayAbbr: TeamAbbr
  homeAbbr: TeamAbbr
  odds: OddsInput | null
  sharpInput: SharpSignalInput
}

function cleanLine(value: string): string {
  return value.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim()
}

function resolveTeamAbbr(name: string): TeamAbbr | null {
  return TEAM_NAME_MAP[cleanLine(name).toUpperCase()] ?? null
}

function parseSignedNumber(value: string): number | null {
  const clean = cleanLine(value).replace(/^EVEN$/i, '+100')
  const match = clean.match(/^([+-])?(\d+(?:\.\d+)?)$/)
  if (!match) return null
  const numeric = Number(match[2])
  if (!Number.isFinite(numeric)) return null
  if (match[1] === '-') return -numeric
  return numeric
}

function parseSpreadCell(value: string): SpreadCell {
  const clean = cleanLine(value)
  if (clean === '-') return null
  const match = clean.match(/^([+-]\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)$/)
  if (!match) return null
  return { line: Number(match[1]), odds: Number(match[2]) }
}

function parseMoneylineCell(value: string): MoneylineCell {
  const clean = cleanLine(value)
  if (clean === '-') return null
  return parseSignedNumber(clean)
}

function parseTotalCell(value: string): TotalCell {
  const clean = cleanLine(value)
  if (clean === '-') return null
  const match = clean.match(/^[OU]\s+(\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)$/i)
  if (!match) return null
  return { line: Number(match[1]), odds: Number(match[2]) }
}

function parsePct(value: string): number {
  const clean = cleanLine(value).replace('%', '')
  const numeric = Number(clean)
  if (!Number.isFinite(numeric)) throw new Error(`Invalid percentage: ${value}`)
  return numeric
}

function isTimeLine(value: string): boolean {
  return /^\d{1,2}:\d{2}\s*[AP]M$/i.test(cleanLine(value))
}

function pushLean(target: SharpLeanSide[], value: SharpLeanSide | null): void {
  if (!value || value === 'none' || target.includes(value)) return
  target.push(value)
}

function finalizeLean(values: SharpLeanSide[]): SharpLeanValue | undefined {
  if (!values.length) return undefined
  return values.length === 1 ? values[0] : values
}

function mlMoveLean(openingHomeMoneyline: number | null | undefined, currentHomeMoneyline: number | null | undefined): SharpLeanSide | null {
  if (openingHomeMoneyline == null || currentHomeMoneyline == null) return null
  const move = americanToImplied(currentHomeMoneyline) - americanToImplied(openingHomeMoneyline)
  if (move >= 0.02) return 'home'
  if (move <= -0.02) return 'away'
  return null
}

function spreadMoveLean(openingSpread: number | null | undefined, currentSpread: number | null | undefined): SharpLeanSide | null {
  if (openingSpread == null || currentSpread == null) return null
  const move = currentSpread - openingSpread
  if (move <= -0.75) return 'home'
  if (move >= 0.75) return 'away'
  return null
}

function totalMoveLean(openingTotal: number | null | undefined, currentTotal: number | null | undefined): SharpLeanSide | null {
  if (openingTotal == null || currentTotal == null) return null
  const move = currentTotal - openingTotal
  if (move >= 1.5) return 'over'
  if (move <= -1.5) return 'under'
  return null
}

function majority<T extends string>(values: T[], thresholdRatio = 0.6): T | 'none' {
  if (!values.length) return 'none'
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1
    return acc
  }, {})
  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (!winner) return 'none'
  return winner[1] / values.length >= thresholdRatio ? (winner[0] as T) : 'none'
}

function buildConsensus(game: VsinGameAccumulator): Pick<SharpSignalInput, 'consensusMoneyline' | 'consensusSpread' | 'consensusTotal'> {
  const moneylineVotes = CURRENT_BOOKS.flatMap((book) => {
    const pair = game.currentMoneylineByBook[book]
    if (pair?.home == null || pair.away == null) return []
    return [americanToImplied(pair.home) > americanToImplied(pair.away) ? 'home' : 'away'] as const
  })

  const spreadVotes = CURRENT_BOOKS.flatMap((book) => {
    const pair = game.currentSpreadByBook[book]
    if (!pair?.home) return []
    if (pair.home.line <= -0.5) return ['home'] as const
    if (pair.home.line >= 0.5) return ['away'] as const
    return []
  })

  let consensusTotal: 'over' | 'under' | 'none' = 'none'
  if (game.splits) {
    if (game.splits.total.overMoneyPct >= 55) consensusTotal = 'over'
    else if (game.splits.total.underMoneyPct >= 55) consensusTotal = 'under'
  }

  return {
    consensusMoneyline: majority(moneylineVotes),
    consensusSpread: majority(spreadVotes),
    consensusTotal,
  }
}

function buildCurrentOdds(game: VsinGameAccumulator): OddsInput | null {
  const currentSpreadBook = CURRENT_BOOKS.find((book) => game.currentSpreadByBook[book]?.home && game.currentSpreadByBook[book]?.away)
  const currentMoneylineBook = CURRENT_BOOKS.find((book) => game.currentMoneylineByBook[book]?.home != null && game.currentMoneylineByBook[book]?.away != null)
  const currentTotalBook = CURRENT_BOOKS.find((book) => game.currentTotalByBook[book]?.over && game.currentTotalByBook[book]?.under)
  if (!currentSpreadBook || !currentMoneylineBook || !currentTotalBook) return null

  const spread = game.currentSpreadByBook[currentSpreadBook]
  const moneyline = game.currentMoneylineByBook[currentMoneylineBook]
  const total = game.currentTotalByBook[currentTotalBook]
  if (!spread?.home || !spread.away || moneyline?.home == null || moneyline.away == null || !total?.over || !total.under) return null

  return {
    source: 'vsin',
    homeMoneyline: moneyline.home,
    awayMoneyline: moneyline.away,
    spread: spread.home.line,
    spreadHomeOdds: spread.home.odds,
    spreadAwayOdds: spread.away.odds,
    overUnder: total.over.line,
    overOdds: total.over.odds,
    underOdds: total.under.odds,
  }
}

function buildSharpInput(game: VsinGameAccumulator, odds: OddsInput | null): SharpSignalInput {
  const openingHomeMoneyline = game.openingMoneyline?.home ?? null
  const openingAwayMoneyline = game.openingMoneyline?.away ?? null
  const openingSpread = game.openingSpread?.home?.line ?? null
  const openingTotal = game.openingTotal?.over?.line ?? null

  const clvLeans: SharpLeanSide[] = []
  const steamLeans: SharpLeanSide[] = []
  const reverseLineMoveLeans: SharpLeanSide[] = []

  pushLean(clvLeans, mlMoveLean(openingHomeMoneyline, odds?.homeMoneyline))
  pushLean(clvLeans, spreadMoveLean(openingSpread, odds?.spread))
  pushLean(clvLeans, totalMoveLean(openingTotal, odds?.overUnder))

  if (openingSpread != null && odds?.spread != null && Math.abs(odds.spread - openingSpread) >= 1) {
    pushLean(steamLeans, spreadMoveLean(openingSpread, odds.spread))
  }
  if (openingTotal != null && odds?.overUnder != null && Math.abs(odds.overUnder - openingTotal) >= 2) {
    pushLean(steamLeans, totalMoveLean(openingTotal, odds.overUnder))
  }
  if (openingHomeMoneyline != null && odds?.homeMoneyline != null) {
    const impliedMove = americanToImplied(odds.homeMoneyline) - americanToImplied(openingHomeMoneyline)
    if (Math.abs(impliedMove) >= 0.03) pushLean(steamLeans, mlMoveLean(openingHomeMoneyline, odds.homeMoneyline))
  }

  if (game.splits && odds) {
    if (game.splits.spread.homeBetPct < 50 && openingSpread != null && odds.spread < openingSpread) pushLean(reverseLineMoveLeans, 'home')
    if (game.splits.spread.homeBetPct > 50 && openingSpread != null && odds.spread > openingSpread) pushLean(reverseLineMoveLeans, 'away')
    if (game.splits.total.overBetPct > 50 && openingTotal != null && odds.overUnder < openingTotal) pushLean(reverseLineMoveLeans, 'under')
    if (game.splits.total.overBetPct < 50 && openingTotal != null && odds.overUnder > openingTotal) pushLean(reverseLineMoveLeans, 'over')
    if (game.splits.moneyline.homeBetPct < 50 && openingHomeMoneyline != null && odds.homeMoneyline < openingHomeMoneyline) pushLean(reverseLineMoveLeans, 'home')
    if (game.splits.moneyline.homeBetPct > 50 && openingHomeMoneyline != null && odds.homeMoneyline > openingHomeMoneyline) pushLean(reverseLineMoveLeans, 'away')
  }

  const consensus = buildConsensus(game)
  const notes = [
    'Imported from pasted VSiN board data.',
    game.openingSpread ? 'Spread opener loaded.' : null,
    game.openingMoneyline ? 'Moneyline opener loaded.' : null,
    game.openingTotal ? 'Total opener loaded.' : null,
    game.splits ? 'Bet % and money % loaded.' : null,
  ].filter(Boolean).join(' ')

  return {
    source: 'VSiN Import',
    lastUpdated: new Date().toISOString(),
    openingHomeMoneyline,
    openingAwayMoneyline,
    openingSpread,
    openingTotal,
    moneylineHomeBetsPct: game.splits?.moneyline.homeBetPct ?? null,
    moneylineHomeMoneyPct: game.splits?.moneyline.homeMoneyPct ?? null,
    spreadHomeBetsPct: game.splits?.spread.homeBetPct ?? null,
    spreadHomeMoneyPct: game.splits?.spread.homeMoneyPct ?? null,
    totalOverBetsPct: game.splits?.total.overBetPct ?? null,
    totalOverMoneyPct: game.splits?.total.overMoneyPct ?? null,
    clvLean: finalizeLean(clvLeans),
    steamMoveLean: finalizeLean(steamLeans),
    reverseLineMoveLean: finalizeLean(reverseLineMoveLeans),
    consensusMoneyline: consensus.consensusMoneyline,
    consensusSpread: consensus.consensusSpread,
    consensusTotal: consensus.consensusTotal,
    notes,
  }
}

function readSectionKind(lines: string[], startIndex: number): SectionKind {
  const sample = cleanLine(lines[startIndex + 4] ?? '')
  if (/^[OU]\s/i.test(sample)) return 'total'
  if (/^[+-]\d+(?:\.\d+)?\s+[+-]?\d+(?:\.\d+)?$/.test(sample)) return 'spread'
  return 'moneyline'
}

function ensureGame(store: Map<string, VsinGameAccumulator>, awayAbbr: TeamAbbr, homeAbbr: TeamAbbr): VsinGameAccumulator {
  const key = `${awayAbbr}-${homeAbbr}`
  const existing = store.get(key)
  if (existing) return existing
  const created: VsinGameAccumulator = {
    awayAbbr,
    homeAbbr,
    currentSpreadByBook: {},
    currentMoneylineByBook: {},
    currentTotalByBook: {},
  }
  store.set(key, created)
  return created
}

function parseMarketSection(lines: string[], startIndex: number, store: Map<string, VsinGameAccumulator>): number {
  const kind = readSectionKind(lines, startIndex)
  let cursor = startIndex + 1
  while (cursor < lines.length) {
    const line = cleanLine(lines[cursor] ?? '')
    if (!line) {
      cursor += 1
      continue
    }
    if (line.startsWith('Time ') || line.startsWith('Thursday,')) break
    if (!isTimeLine(line)) {
      cursor += 1
      continue
    }
    const awayAbbr = resolveTeamAbbr(lines[cursor + 1] ?? '')
    const homeAbbr = resolveTeamAbbr(lines[cursor + 2] ?? '')
    if (!awayAbbr || !homeAbbr) throw new Error(`Could not resolve teams near line: ${line}`)
    const cells = lines.slice(cursor + 3, cursor + 23).map(cleanLine)
    if (cells.length < 20) throw new Error(`Incomplete ${kind} section for ${awayAbbr} at ${homeAbbr}`)
    const game = ensureGame(store, awayAbbr, homeAbbr)

    if (kind === 'spread') {
      game.openingSpread = { away: parseSpreadCell(cells[0] ?? ''), home: parseSpreadCell(cells[1] ?? '') }
      CURRENT_BOOKS.forEach((book, index) => {
        game.currentSpreadByBook[book] = { away: parseSpreadCell(cells[2 + index * 2] ?? ''), home: parseSpreadCell(cells[3 + index * 2] ?? '') }
      })
    } else if (kind === 'moneyline') {
      game.openingMoneyline = { away: parseMoneylineCell(cells[0] ?? ''), home: parseMoneylineCell(cells[1] ?? '') }
      CURRENT_BOOKS.forEach((book, index) => {
        game.currentMoneylineByBook[book] = { away: parseMoneylineCell(cells[2 + index * 2] ?? ''), home: parseMoneylineCell(cells[3 + index * 2] ?? '') }
      })
    } else {
      game.openingTotal = { over: parseTotalCell(cells[0] ?? ''), under: parseTotalCell(cells[1] ?? '') }
      CURRENT_BOOKS.forEach((book, index) => {
        game.currentTotalByBook[book] = { over: parseTotalCell(cells[2 + index * 2] ?? ''), under: parseTotalCell(cells[3 + index * 2] ?? '') }
      })
    }

    cursor += 23
  }
  return cursor
}

function parseSplitsSection(lines: string[], startIndex: number, store: Map<string, VsinGameAccumulator>): number {
  let cursor = startIndex + 1
  while (cursor < lines.length) {
    const line = cleanLine(lines[cursor] ?? '')
    if (!line) {
      cursor += 1
      continue
    }
    if (line.startsWith('Time ')) break
    if (!resolveTeamAbbr(lines[cursor] ?? '')) {
      cursor += 1
      continue
    }
    const awayAbbr = resolveTeamAbbr(lines[cursor] ?? '')
    const homeAbbr = resolveTeamAbbr(lines[cursor + 1] ?? '')
    if (!awayAbbr || !homeAbbr) throw new Error(`Could not resolve split teams near line: ${line}`)
    const cells = lines.slice(cursor + 2, cursor + 20).map(cleanLine)
    if (cells.length < 18) throw new Error(`Incomplete splits section for ${awayAbbr} at ${homeAbbr}`)
    const game = ensureGame(store, awayAbbr, homeAbbr)
    game.splits = {
      spread: {
        awayLine: Number(cells[0] ?? ''),
        homeLine: Number(cells[1] ?? ''),
        awayMoneyPct: parsePct(cells[2] ?? ''),
        homeMoneyPct: parsePct(cells[3] ?? ''),
        awayBetPct: parsePct(cells[4] ?? ''),
        homeBetPct: parsePct(cells[5] ?? ''),
      },
      total: {
        line: Number(cells[6] ?? ''),
        overMoneyPct: parsePct(cells[8] ?? ''),
        underMoneyPct: parsePct(cells[9] ?? ''),
        overBetPct: parsePct(cells[10] ?? ''),
        underBetPct: parsePct(cells[11] ?? ''),
      },
      moneyline: {
        awayOdds: Number(cells[12] ?? ''),
        homeOdds: Number(cells[13] ?? ''),
        awayMoneyPct: parsePct(cells[14] ?? ''),
        homeMoneyPct: parsePct(cells[15] ?? ''),
        awayBetPct: parsePct(cells[16] ?? ''),
        homeBetPct: parsePct(cells[17] ?? ''),
      },
    }
    cursor += 20
  }
  return cursor
}

export function looksLikeVsinSharpImport(raw: string): boolean {
  return raw.includes('DK Open') && (raw.includes('Thursday,') || raw.includes('Time'))
}

export function parseVsinSharpImport(raw: string): ParsedVsinSharpGame[] {
  const lines = raw.split(/\r?\n/).map((line) => line.replace(/\u00a0/g, ' ').trim()).filter(Boolean)
  const store = new Map<string, VsinGameAccumulator>()

  let cursor = 0
  while (cursor < lines.length) {
    const line = cleanLine(lines[cursor] ?? '')
    if (line.startsWith('Thursday,')) {
      cursor = parseSplitsSection(lines, cursor, store)
      continue
    }
    if (line.startsWith('Time ')) {
      cursor = parseMarketSection(lines, cursor, store)
      continue
    }
    cursor += 1
  }

  const games = [...store.values()].map((game) => {
    const odds = buildCurrentOdds(game)
    return {
      awayAbbr: game.awayAbbr,
      homeAbbr: game.homeAbbr,
      odds,
      sharpInput: buildSharpInput(game, odds),
    }
  })

  if (!games.length) throw new Error('No VSiN games parsed from paste')
  return games
}
