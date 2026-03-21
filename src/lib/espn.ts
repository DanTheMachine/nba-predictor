import type { ESPNTeamColorMap, OddsInput, ScheduleGame, TeamAbbr } from './nbaTypes'
import { TEAMS, normalizeAbbr } from './nbaModel'

const PROXY = 'http://localhost:3001/proxy?url='

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

function isTeamAbbr(value: string): value is TeamAbbr {
  return value in TEAMS
}

export async function fetchNBAColors(onStatus: StatusSetter): Promise<ESPNTeamColorMap> {
  onStatus('Fetching ESPN team colors…')
  const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=40'
  const res = await fetch(`${PROXY}${encodeURIComponent(url)}`)
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
  const res = await fetch(`${PROXY}${encodeURIComponent(url)}`)
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
      `${PROXY}${encodeURIComponent(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${ds}`)}`,
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
