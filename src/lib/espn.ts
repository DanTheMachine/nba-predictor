import type {
  ESPNTeamColorMap,
  InjuryInfo,
  OddsInput,
  ProjectedStarter,
  ProjectedStarterInfo,
  RecentFormSummary,
  ScheduleGame,
  StarterPosition,
  TeamAbbr,
} from './nbaTypes'
import { TEAMS, normalizeAbbr } from './nbaModel'
import { PROXY_URL } from './proxyConfig'

// eslint-disable-next-line no-unused-vars
type StatusSetter = (status: string) => void

type ESPNEvent = {
  date?: string
  competitions?: Array<{
    broadcasts?: Array<{ names?: string[] }>
    competitors?: Array<{
      homeAway?: 'home' | 'away'
      score?: string
      team?: { abbreviation?: string }
    }>
    odds?: Array<{
      moneyline?: {
        home?: { close?: { odds?: string }; open?: { odds?: string } }
        away?: { close?: { odds?: string }; open?: { odds?: string } }
      }
      pointSpread?: {
        home?: { close?: { line?: string; odds?: string }; open?: { line?: string; odds?: string } }
        away?: { close?: { line?: string; odds?: string }; open?: { line?: string; odds?: string } }
      }
      total?: {
        over?: { close?: { line?: string; odds?: string } }
        under?: { close?: { odds?: string } }
      }
    }>
  }>
}

type ScoreboardResponse = {
  events?: ESPNEvent[]
}

type ESPNTeamsResponse = {
  sports?: Array<{
    leagues?: Array<{
      teams?: Array<{
        team?: {
          id?: string
          abbreviation?: string
          links?: Array<{
            rel?: string[] | string
            href?: string
          }>
        }
      }>
    }>
  }>
}

type ESPNRosterResponse = {
  athletes?: Array<{
    displayName?: string
    fullName?: string
    shortName?: string
    injuries?: Array<{
      status?: string
      detail?: string
      type?: string
      date?: string
    }>
  }>
}

function isTeamAbbr(value: string): value is TeamAbbr {
  return value in TEAMS
}

const STARTER_POSITIONS: StarterPosition[] = ['PG', 'SG', 'SF', 'PF', 'C']

function normalizeCellText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim()
}

function extractStarterName(value: string): string {
  return normalizeCellText(value).replace(/\s+(O|DD|DTD|GTD|Q)$/i, '').trim()
}

function findDepthChartHref(team: { links?: Array<{ rel?: string[] | string; href?: string }> } | undefined): string | null {
  const depthLink = team?.links?.find((link) => {
    const rel = Array.isArray(link.rel) ? link.rel : String(link.rel ?? '').split(/\s+/)
    return rel.some((part) => part.toLowerCase() === 'depthchart')
  })
  return depthLink?.href ?? null
}

function parseWideTable(doc: Document): ProjectedStarter[] {
  for (const table of Array.from(doc.querySelectorAll('table'))) {
    const rows = Array.from(table.querySelectorAll('tr'))
    if (!rows.length) continue

    const firstRowCells = Array.from(rows[0]?.querySelectorAll('th,td') ?? []).map((cell) => normalizeCellText(cell.textContent))
    const headerIndices = STARTER_POSITIONS.map((position) => firstRowCells.indexOf(position))
    if (headerIndices.some((index) => index === -1)) continue

    const starterRow = rows.find((row) => {
      const firstCell = normalizeCellText(row.querySelector('th,td')?.textContent)
      return firstCell.toLowerCase() === 'starter'
    })
    if (!starterRow) continue

    const starterCells = Array.from(starterRow.querySelectorAll('th,td')).map((cell) => normalizeCellText(cell.textContent))
    const starters = STARTER_POSITIONS.map((position, idx) => {
      const cellIndex = headerIndices[idx] ?? -1
      const rawName = starterCells[cellIndex] ?? ''
      return { position, player: extractStarterName(rawName) }
    }).filter((starter) => starter.player)

    if (starters.length === 5) return starters
  }

  return []
}

function parseSplitTables(doc: Document): ProjectedStarter[] {
  const tables = Array.from(doc.querySelectorAll('table'))
  if (tables.length < 2) return []

  const positionRows = Array.from(tables[0]?.querySelectorAll('tr') ?? []).map((row) =>
    Array.from(row.querySelectorAll('th,td')).map((cell) => normalizeCellText(cell.textContent)),
  )
  const depthRows = Array.from(tables[1]?.querySelectorAll('tr') ?? []).map((row) =>
    Array.from(row.querySelectorAll('th,td')).map((cell) => normalizeCellText(cell.textContent)),
  )

  const positions = positionRows.slice(1).map((row) => row[0]).filter((value): value is StarterPosition => STARTER_POSITIONS.includes(value as StarterPosition))
  const starterNames = depthRows.slice(1).map((row) => extractStarterName(row[0] ?? '')).filter(Boolean)

  if (positions.length !== 5 || starterNames.length !== 5) return []

  return positions.map((position, idx) => ({
    position,
    player: starterNames[idx] ?? '',
  }))
}

function parseSectionBlocks(doc: Document): ProjectedStarter[] {
  const starters: ProjectedStarter[] = []
  for (const position of STARTER_POSITIONS) {
    const heading = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6,div,span,strong')).find(
      (node) => normalizeCellText(node.textContent) === position,
    )
    if (!heading) continue

    let sibling: Element | null = heading.parentElement
    while (sibling && sibling.tagName.toLowerCase() !== 'table') sibling = sibling.nextElementSibling
    if (!sibling) continue

    const rows = Array.from(sibling.querySelectorAll('tr'))
    const starterRow = rows.find((row) => normalizeCellText(row.querySelector('th,td')?.textContent).toLowerCase() === 'starter')
    if (!starterRow) continue

    const starterCells = Array.from(starterRow.querySelectorAll('th,td')).map((cell) => normalizeCellText(cell.textContent))
    const player = extractStarterName(starterCells[1] ?? '')
    if (player) starters.push({ position, player })
  }

  return starters
}

export function parseProjectedStartersFromHtml(html: string, team: TeamAbbr): ProjectedStarterInfo | null {
  if (!html.trim() || typeof DOMParser === 'undefined') return null

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const starters = parseWideTable(doc)
  const splitTableStarters = starters.length === 5 ? starters : parseSplitTables(doc)
  const resolvedStarters = splitTableStarters.length === 5 ? splitTableStarters : parseSectionBlocks(doc)

  if (resolvedStarters.length !== 5) return null

  return {
    team,
    starters: resolvedStarters,
    source: 'ESPN depth chart',
    lastUpdated: new Date().toISOString(),
  }
}

export async function fetchNBAColors(onStatus: StatusSetter): Promise<ESPNTeamColorMap> {
  onStatus('Fetching ESPN team colors…')
  const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=40'
  const res = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error(`ESPN teams: HTTP ${res.status}`)
  const data = await res.json()
  const map: ESPNTeamColorMap = {}
  for (const { team } of (data?.sports?.[0]?.leagues?.[0]?.teams ?? [])) {
    const abbr = normalizeAbbr(team.abbreviation?.toUpperCase() ?? '')
    if (isTeamAbbr(abbr)) {
      map[abbr] = { color: `#${team.color ?? '1a1a2e'}`, altColor: `#${team.alternateColor ?? '888'}` }
    }
  }
  return map
}

export async function fetchTodaySchedule(onStatus: StatusSetter): Promise<{ games: ScheduleGame[]; rawEvents: ESPNEvent[] }> {
  onStatus("Fetching today's NBA schedule…")
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const today = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${today}`
  const res = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error(`ESPN scoreboard: HTTP ${res.status}`)
  const data = await res.json()
  const games: ScheduleGame[] = []
  for (const event of (data?.events ?? [])) {
    const comp = event.competitions?.[0]
    if (!comp) continue
    const homeC = comp.competitors?.find((c) => c.homeAway === 'home')
    const awayC = comp.competitors?.find((c) => c.homeAway === 'away')
    if (!homeC || !awayC) continue
    const ha = normalizeAbbr(homeC.team?.abbreviation?.toUpperCase() ?? '')
    const aa = normalizeAbbr(awayC.team?.abbreviation?.toUpperCase() ?? '')
    if (!isTeamAbbr(ha) || !isTeamAbbr(aa)) continue
    let gt = event.date ?? ''
    try {
      gt = new Date(gt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone: 'America/New_York',
      })
    } catch {
      // keep raw date string
    }
    games.push({
      homeAbbr: ha,
      awayAbbr: aa,
      gameTime: gt,
      tvInfo: (comp.broadcasts ?? []).flatMap((b) => b.names ?? []).join(', ') || '—',
    })
  }
  onStatus(`Found ${games.length} game${games.length !== 1 ? 's' : ''} today`)
  return { games, rawEvents: data?.events ?? [] }
}

function ymd(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function fetchRecentForm(abbrs: TeamAbbr[]): Promise<Partial<Record<TeamAbbr, RecentFormSummary>>> {
  const targets = new Set(abbrs)
  const gameMap = new Map<TeamAbbr, RecentFormSummary['games']>()
  const lastUpdated = new Date().toISOString()

  for (const abbr of abbrs) gameMap.set(abbr, [])

  for (let daysBack = 1; daysBack <= 14; daysBack += 1) {
    const pending = abbrs.filter((abbr) => (gameMap.get(abbr)?.length ?? 0) < 5)
    if (!pending.length) break

    const day = new Date()
    day.setDate(day.getDate() - daysBack)
    const res = await fetch(
      `${PROXY_URL}${encodeURIComponent(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${ymd(day)}`)}`,
    )
    if (!res.ok) continue

    const data = (await res.json()) as ScoreboardResponse
    for (const event of data.events ?? []) {
      const comp = event.competitions?.[0]
      const homeC = comp?.competitors?.find((c) => c.homeAway === 'home')
      const awayC = comp?.competitors?.find((c) => c.homeAway === 'away')
      if (!homeC || !awayC) continue

      const home = normalizeAbbr(homeC.team?.abbreviation?.toUpperCase() ?? '')
      const away = normalizeAbbr(awayC.team?.abbreviation?.toUpperCase() ?? '')
      if (!isTeamAbbr(home) || !isTeamAbbr(away)) continue

      const homeScore = Number.parseInt(homeC.score ?? '', 10)
      const awayScore = Number.parseInt(awayC.score ?? '', 10)
      if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) continue

      const eventDate = event.date ? isoDate(new Date(event.date)) : isoDate(day)

      if (targets.has(home) && (gameMap.get(home)?.length ?? 0) < 5) {
        gameMap.get(home)?.push({
          date: eventDate,
          opponent: away,
          venue: 'vs.',
          result: homeScore > awayScore ? 'W' : 'L',
          pointsFor: homeScore,
          pointsAgainst: awayScore,
        })
      }
      if (targets.has(away) && (gameMap.get(away)?.length ?? 0) < 5) {
        gameMap.get(away)?.push({
          date: eventDate,
          opponent: home,
          venue: 'at',
          result: awayScore > homeScore ? 'W' : 'L',
          pointsFor: awayScore,
          pointsAgainst: homeScore,
        })
      }
    }
  }

  const summaries: Partial<Record<TeamAbbr, RecentFormSummary>> = {}
  for (const abbr of abbrs) {
    const games = gameMap.get(abbr) ?? []
    const wins = games.filter((game) => game.result === 'W').length
    const losses = games.length - wins
    const margins = games.map((game) => game.pointsFor - game.pointsAgainst)
    const avgMargin = margins.length ? margins.reduce((sum, margin) => sum + margin, 0) / margins.length : 0
    let streak = '-'
    if (games.length) {
      const latestResult = games[0]?.result
      let streakCount = 0
      for (const game of games) {
        if (game.result !== latestResult) break
        streakCount += 1
      }
      streak = `${latestResult}${streakCount}`
    }

    summaries[abbr] = {
      team: abbr,
      games,
      wins,
      losses,
      avgMargin: Number(avgMargin.toFixed(1)),
      streak,
      source: 'ESPN scoreboard',
      lastUpdated,
    }
  }

  return summaries
}

export async function fetchTeamInjuries(
  abbrs: TeamAbbr[],
  onStatus?: StatusSetter,
): Promise<Partial<Record<TeamAbbr, InjuryInfo[]>>> {
  const uniqueAbbrs = [...new Set(abbrs)]
  if (!uniqueAbbrs.length) return {}

  onStatus?.('Pulling ESPN injury reports...')

  const teamRes = await fetch(`${PROXY_URL}${encodeURIComponent('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=40')}`)
  if (!teamRes.ok) throw new Error(`ESPN teams: HTTP ${teamRes.status}`)

  const teamsData = (await teamRes.json()) as ESPNTeamsResponse
  const teamIdByAbbr = new Map<TeamAbbr, string>()

  for (const { team } of teamsData?.sports?.[0]?.leagues?.[0]?.teams ?? []) {
    const abbr = normalizeAbbr(team?.abbreviation?.toUpperCase() ?? '')
    if (isTeamAbbr(abbr) && team?.id) teamIdByAbbr.set(abbr, team.id)
  }

  const entries = await Promise.all(
    uniqueAbbrs.map(async (abbr) => {
      const teamId = teamIdByAbbr.get(abbr)
      if (!teamId) return [abbr, []] as const

      const rosterRes = await fetch(
        `${PROXY_URL}${encodeURIComponent(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/roster`)}`,
      )
      if (!rosterRes.ok) return [abbr, []] as const

      const roster = (await rosterRes.json()) as ESPNRosterResponse
      const injuries: InjuryInfo[] = []

      for (const athlete of roster.athletes ?? []) {
        const player = athlete.displayName ?? athlete.fullName ?? athlete.shortName ?? 'Unknown player'
        for (const injury of athlete.injuries ?? []) {
          const status = injury.status?.trim() || 'Injury report'
          const detail = injury.detail?.trim() || injury.type?.trim() || ''
          injuries.push({
            team: abbr,
            player,
            status,
            note: detail ? `${player} - ${status} (${detail})` : `${player} - ${status}`,
            source: 'ESPN roster',
            lastUpdated: injury.date,
          })
        }
      }

      injuries.sort((a, b) => {
        const aTime = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0
        const bTime = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0
        return bTime - aTime
      })

      return [abbr, injuries] as const
    }),
  )

  return Object.fromEntries(entries)
}

export async function fetchProjectedStarters(
  abbrs: TeamAbbr[],
  onStatus?: StatusSetter,
): Promise<Partial<Record<TeamAbbr, ProjectedStarterInfo>>> {
  const uniqueAbbrs = [...new Set(abbrs)]
  if (!uniqueAbbrs.length) return {}

  onStatus?.('Pulling ESPN projected starters...')

  const teamRes = await fetch(`${PROXY_URL}${encodeURIComponent('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=40')}`)
  if (!teamRes.ok) throw new Error(`ESPN teams: HTTP ${teamRes.status}`)

  const teamsData = (await teamRes.json()) as ESPNTeamsResponse
  const teamInfoByAbbr = new Map<TeamAbbr, { depthHref: string | null }>()

  for (const { team } of teamsData?.sports?.[0]?.leagues?.[0]?.teams ?? []) {
    const abbr = normalizeAbbr(team?.abbreviation?.toUpperCase() ?? '')
    if (!isTeamAbbr(abbr)) continue
    teamInfoByAbbr.set(abbr, { depthHref: findDepthChartHref(team) })
  }

  const entries = await Promise.all(
    uniqueAbbrs.map(async (abbr) => {
      const depthHref = teamInfoByAbbr.get(abbr)?.depthHref
      if (!depthHref) return [abbr, null] as const

      const depthRes = await fetch(`${PROXY_URL}${encodeURIComponent(depthHref)}`)
      if (!depthRes.ok) return [abbr, null] as const

      const html = await depthRes.text()
      return [abbr, parseProjectedStartersFromHtml(html, abbr)] as const
    }),
  )

  return Object.fromEntries(entries.filter(([, info]) => info))
}

export function parseOddsFromEvent(event: ESPNEvent, ha: TeamAbbr, aa: TeamAbbr): OddsInput | null {
  const comp = event.competitions?.[0]
  if (!comp) return null
  const homeC = comp.competitors?.find((c) => c.homeAway === 'home')
  const awayC = comp.competitors?.find((c) => c.homeAway === 'away')
  if (!homeC || !awayC) return null
  if (normalizeAbbr(homeC.team?.abbreviation?.toUpperCase() ?? '') !== ha) return null
  if (normalizeAbbr(awayC.team?.abbreviation?.toUpperCase() ?? '') !== aa) return null
  const o = comp.odds?.[0]
  if (!o) return null
  const ml = o.moneyline
  const ps = o.pointSpread
  const tot = o.total
  const hML = parseFloat((ml?.home?.close?.odds ?? ml?.home?.open?.odds ?? '0').replace('+', '')) || 0
  const aML = parseFloat((ml?.away?.close?.odds ?? ml?.away?.open?.odds ?? '0').replace('+', '')) || 0
  if (!hML && !aML) return null
  return {
    source: 'espn',
    homeMoneyline: hML,
    awayMoneyline: aML,
    spread: parseFloat(ps?.home?.close?.line ?? ps?.home?.open?.line ?? '-3.5'),
    spreadHomeOdds: parseFloat((ps?.home?.close?.odds ?? '-110').replace('+', '')) || -110,
    spreadAwayOdds: parseFloat((ps?.away?.close?.odds ?? '-110').replace('+', '')) || -110,
    overUnder: parseFloat((tot?.over?.close?.line ?? '225').replace(/[ou]/gi, '')) || 225,
    overOdds: parseFloat((tot?.over?.close?.odds ?? '-110').replace('+', '')) || -110,
    underOdds: parseFloat((tot?.under?.close?.odds ?? '-110').replace('+', '')) || -110,
  }
}

export async function fetchB2BTeams(abbrs: TeamAbbr[]): Promise<Set<TeamAbbr>> {
  try {
    const yd = new Date()
    yd.setDate(yd.getDate() - 1)
    const ds = `${yd.getFullYear()}${String(yd.getMonth() + 1).padStart(2, '0')}${String(yd.getDate()).padStart(2, '0')}`
    const res = await fetch(
      `${PROXY_URL}${encodeURIComponent(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${ds}`)}`,
    )
    if (!res.ok) return new Set()
    const data = await res.json()
    const played = new Set<TeamAbbr>()
    for (const ev of data?.events ?? []) {
      for (const c of ev.competitions?.[0]?.competitors ?? []) {
        const a = normalizeAbbr(c.team?.abbreviation?.toUpperCase() ?? '')
        if (isTeamAbbr(a)) played.add(a)
      }
    }
    return new Set(abbrs.filter((a) => played.has(a)))
  } catch {
    return new Set<TeamAbbr>()
  }
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

