import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { analyzeBetting } from '../../../src/lib/betting.js'
import { buildCompositeRecommendation } from '../../../src/lib/compositeRecommendation.js'
import { predictGame, TEAMS } from '../../../src/lib/nbaModel.js'
import type { OddsInput, TeamAbbr } from '../../../src/lib/nbaTypes.js'
import { appConfig, assertDateInput, isDbConfigured, subtractOneDay } from '../../config.js'
import {
  createNbaPredictionFileRecord,
  createNbaPredictionRun,
  createNbaResultFileRecord,
  getNbaOddsOverridesForDate,
  getNbaPredictionsByDateRange,
  getNbaPredictionsByRunOrDate,
  getNbaResultsByDateRange,
  saveNbaEvaluationSummary,
  saveNbaMarketOddsSnapshot,
  saveNbaPredictions,
  saveNbaResults,
  saveNbaSlateRows,
  saveNbaTeamStatSnapshot,
  updateNbaPredictionRunExports,
} from '../../db/repositories.js'
import { buildNbaPredictionsCsv, buildNbaResultsCsv } from './nbaCsv.js'

export const CURRENT_MODEL_VERSION = 'heuristic-v1'

const ESPN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  Referer: 'https://www.espn.com/',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
}

type ESPNCompetitor = {
  homeAway?: 'home' | 'away'
  score?: string
  team?: { abbreviation?: string }
}

type ESPNOdds = {
  moneyline?: {
    home?: { close?: { odds?: string }; open?: { odds?: string } }
    away?: { close?: { odds?: string }; open?: { odds?: string } }
  }
  pointSpread?: {
    home?: { close?: { line?: string; odds?: string } }
    away?: { close?: { odds?: string } }
  }
  total?: {
    over?: { close?: { line?: string; odds?: string } }
    under?: { close?: { odds?: string } }
  }
}

type ESPNEvent = {
  id?: string
  date?: string
  status?: { type?: { completed?: boolean; name?: string } }
  competitions?: Array<{
    competitors?: ESPNCompetitor[]
    odds?: ESPNOdds[]
  }>
}

type ScoreboardResponse = {
  events?: ESPNEvent[]
}

export type NbaScheduleGame = {
  homeAbbr: TeamAbbr
  awayAbbr: TeamAbbr
  gameTime: string
  gameDateIso: string
  lookupKey: string
  espnOdds: OddsInput | null
  status: string
}

export type NbaAutomationPredictionRow = {
  date: string
  gameTime: string
  awayTeam: TeamAbbr
  homeTeam: TeamAbbr
  homeScore: string
  awayScore: string
  total: string
  projectedMargin: string
  homeWinProb: number
  awayWinProb: number
  mlRec: string
  mlEdgePct: number
  spreadRec: string
  spreadEdgePct: number
  ouRec: string
  ouEdgePct: number
  vegasHomeML: number
  vegasAwayML: number
  vegasSpread: number
  vegasOU: number
  spreadHomeOdds: number
  spreadAwayOdds: number
  overOdds: number
  underOdds: number
  compositeMarket: string
  compositePick: string
  compositeScore: number
  compositeTier: string
  compositeReasons: string[]
  isPlayoff: boolean
  lookupKey: string
}

export type NbaResultRow = {
  date: string
  home: TeamAbbr
  away: TeamAbbr
  homeScore: number
  awayScore: number
  lookupKey: string
}

// ─── ESPN Data Fetching ───────────────────────────────────────────────────────

function toEspnDate(date: string) {
  return date.replaceAll('-', '')
}

function normalizeAbbr(abbr: string): TeamAbbr {
  const map: Record<string, string> = {
    GS: 'GSW',
    SA: 'SAS',
    NO: 'NOP',
    NY: 'NYK',
    BK: 'BKN',
    WSH: 'WAS',
    PHO: 'PHX',
    UTAH: 'UTA',
  }
  return (map[abbr] ?? abbr) as TeamAbbr
}

function parseMoneyline(raw?: string): number {
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

function parseEspnOdds(odds?: ESPNOdds): OddsInput | null {
  if (!odds) return null
  const homeML = parseMoneyline(odds.moneyline?.home?.close?.odds ?? odds.moneyline?.home?.open?.odds)
  const awayML = parseMoneyline(odds.moneyline?.away?.close?.odds ?? odds.moneyline?.away?.open?.odds)
  const spreadLine = Number(odds.pointSpread?.home?.close?.line ?? '0') || 0
  const spreadHomeOdds = parseMoneyline(odds.pointSpread?.home?.close?.odds)
  const spreadAwayOdds = parseMoneyline(odds.pointSpread?.away?.close?.odds)
  const overUnder = Number(odds.total?.over?.close?.line ?? '0') || 0
  const overOdds = parseMoneyline(odds.total?.over?.close?.odds)
  const underOdds = parseMoneyline(odds.total?.under?.close?.odds)

  if (!homeML && !awayML && !overUnder) return null

  return {
    source: 'espn',
    homeMoneyline: homeML,
    awayMoneyline: awayML,
    spread: spreadLine,
    spreadHomeOdds: spreadHomeOdds || -110,
    spreadAwayOdds: spreadAwayOdds || -110,
    overUnder,
    overOdds: overOdds || -110,
    underOdds: underOdds || -110,
  }
}

async function fetchEspnScoreboard(date: string): Promise<ESPNEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${toEspnDate(date)}`
  const res = await fetch(url, { headers: ESPN_HEADERS })
  if (!res.ok) throw new Error(`ESPN scoreboard fetch failed: ${res.status}`)
  const data = (await res.json()) as ScoreboardResponse
  return data.events ?? []
}

// ─── Schedule / Slate ─────────────────────────────────────────────────────────

export async function fetchNbaSlate(date: string): Promise<NbaScheduleGame[]> {
  const events = await fetchEspnScoreboard(date)
  const prevDayEvents = await fetchEspnScoreboard(subtractOneDay(date)).catch(() => [])

  const prevDayTeams = new Set<string>()
  for (const event of prevDayEvents) {
    for (const comp of event.competitions ?? []) {
      for (const c of comp.competitors ?? []) {
        if (c.team?.abbreviation) prevDayTeams.add(c.team.abbreviation)
      }
    }
  }

  const games: NbaScheduleGame[] = []

  for (const event of events) {
    const comp = event.competitions?.[0]
    if (!comp) continue

    const home = comp.competitors?.find((c) => c.homeAway === 'home')
    const away = comp.competitors?.find((c) => c.homeAway === 'away')
    if (!home?.team?.abbreviation || !away?.team?.abbreviation) continue

    const homeAbbr = normalizeAbbr(home.team.abbreviation)
    const awayAbbr = normalizeAbbr(away.team.abbreviation)

    if (!TEAMS[homeAbbr] || !TEAMS[awayAbbr]) continue

    const gameDate = event.date ? new Date(event.date) : new Date()
    const gameDateIso = gameDate.toISOString().slice(0, 10)
    const gameTime = gameDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    })

    const lookupKey = buildLookupKey(date, homeAbbr, awayAbbr)
    const espnOdds = parseEspnOdds(comp.odds?.[0])

    games.push({
      homeAbbr,
      awayAbbr,
      gameTime,
      gameDateIso,
      lookupKey,
      espnOdds,
      status: event.status?.type?.name ?? 'scheduled',
    })
  }

  return games
}

export type PredictionRunOptions = {
  useOddsOverrides?: boolean
  overrideSource?: string
}

// ─── Predictions ──────────────────────────────────────────────────────────────

export async function generateNbaPredictions(dateInput?: string, options: PredictionRunOptions = {}) {
  const date = assertDateInput(dateInput)
  const slate = await fetchNbaSlate(date)

  await saveNbaSlateRows(
    date,
    slate.map((g) => ({
      lookupKey: g.lookupKey,
      awayTeam: g.awayAbbr,
      homeTeam: g.homeAbbr,
      gameTime: new Date(`${g.gameDateIso}T00:00:00Z`),
      gameDateIso: g.gameDateIso,
      context: { gameTime: g.gameTime, espnOdds: g.espnOdds, status: g.status },
    })),
  )

  const oddsRows = slate
    .filter((g) => g.espnOdds)
    .map((g) => ({ lookupKey: g.lookupKey, source: 'espn', odds: g.espnOdds as Record<string, unknown> }))
  await saveNbaMarketOddsSnapshot(date, oddsRows)

  const approvedOverrides = options.useOddsOverrides
    ? await getNbaOddsOverridesForDate(date, { source: options.overrideSource, statuses: ['approved'] })
    : []
  const overridesByKey = new Map(approvedOverrides.map((o) => [o.lookupKey, o]))

  const season = Number(date.slice(0, 4))
  await saveNbaTeamStatSnapshot(date, season, TEAMS as unknown as Record<string, unknown>)

  const predictionRows: NbaAutomationPredictionRow[] = slate
    .filter((g) => g.espnOdds || overridesByKey.has(g.lookupKey))
    .map((g) => {
      const override = overridesByKey.get(g.lookupKey)
      const odds: OddsInput = override
        ? (override.odds as unknown as OddsInput)
        : g.espnOdds!
      const result = predictGame({
        homeTeam: g.homeAbbr,
        awayTeam: g.awayAbbr,
        gameType: 'Regular Season',
        homeB2B: false,
        awayB2B: false,
        liveStats: {},
      })

      const analysis = analyzeBetting(result, odds)
      const composite = buildCompositeRecommendation(
        {
          game: { homeAbbr: g.homeAbbr, awayAbbr: g.awayAbbr, gameTime: g.gameTime, tvInfo: '' },
          espnOdds: odds,
          marketData: null,
          editedOdds: null,
          simResult: result,
          homeB2B: false,
          awayB2B: false,
          sharpInput: null,
          sharpContext: null,
          injuries: [],
          projectedStarters: { home: null, away: null },
          recentForm: { home: null, away: null },
          compositeRecommendation: null,
        },
        analysis,
      )

      return {
        date,
        gameTime: g.gameTime,
        awayTeam: g.awayAbbr,
        homeTeam: g.homeAbbr,
        homeScore: result.hScore,
        awayScore: result.aScore,
        total: result.total,
        projectedMargin: result.projDiff,
        homeWinProb: result.hWinProb,
        awayWinProb: result.aWinProb,
        mlRec: analysis.mlValueSide === 'none' ? 'PASS' : `${analysis.mlValueSide.toUpperCase()} ML`,
        mlEdgePct: analysis.mlValuePct,
        spreadRec: analysis.spreadRec.toUpperCase(),
        spreadEdgePct: analysis.spreadEdge,
        ouRec: analysis.ouRec.toUpperCase(),
        ouEdgePct: analysis.ouEdgePct,
        vegasHomeML: odds.homeMoneyline,
        vegasAwayML: odds.awayMoneyline,
        vegasSpread: odds.spread,
        vegasOU: odds.overUnder,
        spreadHomeOdds: odds.spreadHomeOdds,
        spreadAwayOdds: odds.spreadAwayOdds,
        overOdds: odds.overOdds,
        underOdds: odds.underOdds,
        compositeMarket: composite.primaryMarket,
        compositePick: composite.pick,
        compositeScore: composite.score,
        compositeTier: composite.tier,
        compositeReasons: composite.reasons,
        isPlayoff: result.isPlayoff,
        lookupKey: g.lookupKey,
      } satisfies NbaAutomationPredictionRow
    })

  const summary = {
    totalGames: slate.length,
    predictedGames: predictionRows.length,
    dbPersisted: isDbConfigured(),
    usedOddsOverrides: Boolean(options.useOddsOverrides),
    overrideSource: options.overrideSource ?? null,
    generatedAt: new Date().toISOString(),
  }

  const run = await createNbaPredictionRun(date, CURRENT_MODEL_VERSION, summary)
  await saveNbaPredictions(run?.id ?? null, date, predictionRows)

  return {
    date,
    modelVersion: CURRENT_MODEL_VERSION,
    runId: run?.id ?? null,
    usedOddsOverrides: Boolean(options.useOddsOverrides),
    rows: predictionRows,
  }
}

// ─── Results ──────────────────────────────────────────────────────────────────

export async function ingestNbaResults(dateInput?: string): Promise<NbaResultRow[]> {
  const date = assertDateInput(dateInput)
  const events = await fetchEspnScoreboard(date)

  const results: NbaResultRow[] = []

  for (const event of events) {
    if (!event.status?.type?.completed) continue
    const comp = event.competitions?.[0]
    if (!comp) continue

    const home = comp.competitors?.find((c) => c.homeAway === 'home')
    const away = comp.competitors?.find((c) => c.homeAway === 'away')
    if (!home?.team?.abbreviation || !away?.team?.abbreviation) continue

    const homeAbbr = normalizeAbbr(home.team.abbreviation)
    const awayAbbr = normalizeAbbr(away.team.abbreviation)
    if (!TEAMS[homeAbbr] || !TEAMS[awayAbbr]) continue

    const homeScore = Number(home.score ?? '0')
    const awayScore = Number(away.score ?? '0')
    if (!homeScore && !awayScore) continue

    const lookupKey = buildLookupKey(date, homeAbbr, awayAbbr)
    results.push({ date, home: homeAbbr, away: awayAbbr, homeScore, awayScore, lookupKey })
  }

  await saveNbaResults(
    date,
    results.map((r) => ({
      lookupKey: r.lookupKey,
      awayTeam: r.away,
      homeTeam: r.home,
      awayScore: r.awayScore,
      homeScore: r.homeScore,
    })),
  )

  return results
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export async function exportNbaPredictionsCsv(args: { date?: string; runId?: string }) {
  const records = await getNbaPredictionsByRunOrDate(args)
  const rows = records.map((r) => r.payload as unknown as NbaAutomationPredictionRow)
  rows.sort((a, b) => (a.gameTime ?? '').localeCompare(b.gameTime ?? ''))

  const csv = buildNbaPredictionsCsv(rows)
  const fileDate = args.date ?? rows[0]?.date ?? new Date().toISOString().slice(0, 10)
  const outputPath = path.resolve(appConfig.exportDir, `nba-predictions-${fileDate}.csv`)
  await ensureExportDir()
  await writeFile(outputPath, csv, 'utf8')

  if (args.runId) {
    await updateNbaPredictionRunExports(args.runId, { exportPath: outputPath })
  }
  await createNbaPredictionFileRecord({
    date: fileDate,
    path: outputPath,
    source: 'automation-export',
    fileRole: 'export',
    runId: args.runId ?? null,
    metadata: { rowCount: rows.length },
  })

  return { path: outputPath, csv, rowCount: rows.length }
}

export async function exportNbaResultsCsv(dateInput?: string) {
  const date = assertDateInput(dateInput)
  const results = await ingestNbaResults(date)
  const csv = buildNbaResultsCsv(results)
  const outputPath = path.resolve(appConfig.exportDir, `nba-results-${date}.csv`)
  await ensureExportDir()
  await writeFile(outputPath, csv, 'utf8')
  await createNbaResultFileRecord({
    date,
    path: outputPath,
    source: 'automation-export',
    fileRole: 'export',
    metadata: { rowCount: results.length },
  })
  return { path: outputPath, csv, rowCount: results.length }
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function runNbaDailyPipeline(dateInput?: string, options: PredictionRunOptions = {}) {
  const date = assertDateInput(dateInput)
  const predictions = await generateNbaPredictions(date, options)
  const predictionsExport = await exportNbaPredictionsCsv({
    runId: predictions.runId ?? undefined,
    date,
  })
  const resultsDate = subtractOneDay(date)
  const ingestedResults = await ingestNbaResults(resultsDate)
  const resultsExport = await exportNbaResultsCsv(resultsDate)

  return {
    date,
    resultsDate,
    usedOddsOverrides: Boolean(options.useOddsOverrides),
    overrideSource: options.overrideSource ?? null,
    predictionRunId: predictions.runId,
    predictionCount: predictions.rows.length,
    resultsIngested: ingestedResults.length,
    predictionsExportPath: predictionsExport.path,
    resultsExportPath: resultsExport.path,
  }
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

export async function evaluateNba(dateRange?: { from: string; to: string }) {
  if (!isDbConfigured()) {
    if (appConfig.enableFallbackMode) {
      return { mode: 'fallback', report: { message: 'Database not configured.' } }
    }
    throw new Error('Database-backed evaluation requires DATABASE_URL.')
  }

  const from = assertDateInput(dateRange?.from)
  const to = assertDateInput(dateRange?.to, from)

  const predictionRecords = await getNbaPredictionsByDateRange(from, to)
  const resultRecords = await getNbaResultsByDateRange(from, to)

  const resultsByKey = new Map(resultRecords.map((r) => [r.lookupKey, r]))

  let mlWins = 0, mlLosses = 0, mlBets = 0
  let ouWins = 0, ouLosses = 0, ouBets = 0
  let spreadWins = 0, spreadLosses = 0, spreadBets = 0

  for (const record of predictionRecords) {
    const row = record.payload as unknown as NbaAutomationPredictionRow
    const result = resultsByKey.get(row.lookupKey)
    if (!result?.homeScore || !result?.awayScore) continue

    const homeWon = result.homeScore > result.awayScore

    if (row.mlRec !== 'PASS') {
      mlBets++
      const pickedHome = row.mlRec.startsWith('HOME')
      if (pickedHome === homeWon) mlWins++
      else mlLosses++
    }

    const actualTotal = result.homeScore + result.awayScore
    if (row.ouRec !== 'PASS') {
      ouBets++
      if (row.ouRec === 'OVER' && actualTotal > row.vegasOU) ouWins++
      else if (row.ouRec === 'UNDER' && actualTotal < row.vegasOU) ouWins++
      else ouLosses++
    }

    if (row.spreadRec !== 'PASS') {
      spreadBets++
      const actualMargin = result.homeScore - result.awayScore
      const pickedHomeCover = row.spreadRec.includes('HOME')
      const covered = pickedHomeCover ? actualMargin > -row.vegasSpread : actualMargin < -row.vegasSpread
      if (covered) spreadWins++
      else spreadLosses++
    }
  }

  const report = {
    from,
    to,
    totalPredictions: predictionRecords.length,
    totalResults: resultRecords.length,
    ml: { bets: mlBets, wins: mlWins, losses: mlLosses, pct: mlBets ? ((mlWins / mlBets) * 100).toFixed(1) : 'N/A' },
    ou: { bets: ouBets, wins: ouWins, losses: ouLosses, pct: ouBets ? ((ouWins / ouBets) * 100).toFixed(1) : 'N/A' },
    spread: { bets: spreadBets, wins: spreadWins, losses: spreadLosses, pct: spreadBets ? ((spreadWins / spreadBets) * 100).toFixed(1) : 'N/A' },
  }

  await saveNbaEvaluationSummary(from, to, {}, report as unknown as Record<string, unknown>, CURRENT_MODEL_VERSION)

  return { mode: 'database', report }
}

// ─── Read Helpers ─────────────────────────────────────────────────────────────

export async function getNbaLatestRuns(limit = 10) {
  const prisma = (await import('../../db/client.js')).getPrismaClient()
  if (!prisma) return []
  return prisma.predictionRun.findMany({
    where: { sport: 'NBA' },
    orderBy: [{ businessDate: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })
}

export async function getNbaStoredPredictions(args: { runId?: string; date?: string }) {
  const records = await getNbaPredictionsByRunOrDate(args)
  return records.map((r) => r.payload as unknown as NbaAutomationPredictionRow)
}

export async function getNbaStoredResults(from: string, to: string) {
  const rows = await getNbaResultsByDateRange(from, to)
  return rows.map((r) => ({
    lookupKey: r.lookupKey,
    awayTeam: r.awayTeam,
    homeTeam: r.homeTeam,
    awayScore: r.awayScore,
    homeScore: r.homeScore,
    businessDate: r.businessDate,
  }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildLookupKey(date: string, homeTeam: TeamAbbr, awayTeam: TeamAbbr) {
  return `${date.replaceAll('-', '')}${homeTeam}${awayTeam}`
}

async function ensureExportDir() {
  await mkdir(path.resolve(appConfig.exportDir), { recursive: true })
}
