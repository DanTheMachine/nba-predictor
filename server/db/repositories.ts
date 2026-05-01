import { Prisma } from '@prisma/client'

import type { OddsInput } from '../../src/lib/nbaTypes.js'
import { getPrismaClient } from './client.js'
import type { NbaAutomationPredictionRow } from '../services/nba/nbaAutomation.js'

function toBusinessDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`)
}

function toJson(value: unknown) {
  return value as Prisma.InputJsonValue
}

const NBA_SPORT = 'NBA' as const

// ─── Shared / Sport-Aware Repositories ───────────────────────────────────────

export async function createNbaPredictionRun(date: string, modelVersion: string, summary: Record<string, unknown>) {
  const prisma = getPrismaClient()
  if (!prisma) return null

  return prisma.predictionRun.create({
    data: {
      sport: NBA_SPORT,
      businessDate: toBusinessDate(date),
      modelVersion,
      summary: toJson(summary),
    },
  })
}

export async function findOrCreateNbaPredictionRun(date: string, modelVersion: string, summary: Record<string, unknown>) {
  const prisma = getPrismaClient()
  if (!prisma) return null

  const existing = await prisma.predictionRun.findFirst({
    where: {
      sport: NBA_SPORT,
      businessDate: toBusinessDate(date),
      modelVersion,
    },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    return prisma.predictionRun.update({
      where: { id: existing.id },
      data: { summary: toJson(summary) },
    })
  }

  return createNbaPredictionRun(date, modelVersion, summary)
}

export async function updateNbaPredictionRunExports(runId: string | null, data: { exportPath?: string; resultsPath?: string; reviewStatus?: string }) {
  const prisma = getPrismaClient()
  if (!prisma || !runId) return null

  return prisma.predictionRun.update({ where: { id: runId }, data })
}

export async function listNbaPredictionRuns(limit = 10) {
  const prisma = getPrismaClient()
  if (!prisma) return []

  return prisma.predictionRun.findMany({
    where: { sport: NBA_SPORT },
    orderBy: [{ businessDate: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })
}

export async function getLatestNbaPredictionRunForDate(date: string) {
  const prisma = getPrismaClient()
  if (!prisma) return null

  return prisma.predictionRun.findFirst({
    where: { sport: NBA_SPORT, businessDate: toBusinessDate(date) },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createNbaPredictionFileRecord(args: {
  date: string
  path: string
  source: string
  fileRole?: string
  runId?: string | null
  metadata?: Record<string, unknown> | null
}) {
  const prisma = getPrismaClient()
  if (!prisma) return null

  return prisma.predictionFile.create({
    data: {
      sport: NBA_SPORT,
      businessDate: toBusinessDate(args.date),
      source: args.source,
      path: args.path,
      fileRole: args.fileRole ?? 'export',
      predictionRunId: args.runId ?? undefined,
      metadata: args.metadata ? toJson(args.metadata) : undefined,
    },
  })
}

export async function createNbaResultFileRecord(args: {
  date: string
  path: string
  source: string
  fileRole?: string
  runId?: string | null
  metadata?: Record<string, unknown> | null
}) {
  const prisma = getPrismaClient()
  if (!prisma) return null

  return prisma.resultFile.create({
    data: {
      sport: NBA_SPORT,
      businessDate: toBusinessDate(args.date),
      source: args.source,
      path: args.path,
      fileRole: args.fileRole ?? 'export',
      predictionRunId: args.runId ?? undefined,
      metadata: args.metadata ? toJson(args.metadata) : undefined,
    },
  })
}

export async function saveNbaEvaluationSummary(
  fromDate: string,
  toDate: string,
  thresholds: Record<string, unknown>,
  summary: Record<string, unknown>,
  modelVersion?: string,
) {
  const prisma = getPrismaClient()
  if (!prisma) return null

  return prisma.evaluationSummary.create({
    data: {
      sport: NBA_SPORT,
      fromDate: toBusinessDate(fromDate),
      toDate: toBusinessDate(toDate),
      modelVersion,
      thresholds: toJson(thresholds),
      summary: toJson(summary),
    },
  })
}

// ─── NBA Repositories ─────────────────────────────────────────────────────────

export async function saveNbaTeamStatSnapshot(date: string, season: number, payload: Record<string, unknown>) {
  const prisma = getPrismaClient()
  if (!prisma) return null

  return prisma.nbaTeamStatSnapshot.upsert({
    where: {
      businessDate_sourceSeason: {
        businessDate: toBusinessDate(date),
        sourceSeason: season,
      },
    },
    update: {
      fetchedAt: new Date(),
      payload: toJson(payload),
    },
    create: {
      businessDate: toBusinessDate(date),
      sourceSeason: season,
      fetchedAt: new Date(),
      payload: toJson(payload),
    },
  })
}

export type NbaSlateRow = {
  lookupKey: string
  awayTeam: string
  homeTeam: string
  gameTime: Date
  gameDateIso: string
  context?: Record<string, unknown> | null
}

export async function saveNbaSlateRows(date: string, rows: NbaSlateRow[]) {
  const prisma = getPrismaClient()
  if (!prisma) return 0

  await Promise.all(
    rows.map((row) =>
      prisma.nbaSlateGame.upsert({
        where: {
          businessDate_lookupKey: {
            businessDate: toBusinessDate(date),
            lookupKey: row.lookupKey,
          },
        },
        update: {
          awayTeam: row.awayTeam,
          homeTeam: row.homeTeam,
          gameTime: row.gameTime,
          gameDateIso: row.gameDateIso,
          status: 'scheduled',
          context: row.context ? toJson(row.context) : Prisma.JsonNull,
        },
        create: {
          businessDate: toBusinessDate(date),
          lookupKey: row.lookupKey,
          awayTeam: row.awayTeam,
          homeTeam: row.homeTeam,
          gameTime: row.gameTime,
          gameDateIso: row.gameDateIso,
          status: 'scheduled',
          context: row.context ? toJson(row.context) : Prisma.JsonNull,
        },
      }),
    ),
  )

  return rows.length
}

export type NbaOddsRow = {
  lookupKey: string
  source: string
  odds: Record<string, unknown>
}

export async function saveNbaMarketOddsSnapshot(date: string, rows: NbaOddsRow[]) {
  const prisma = getPrismaClient()
  if (!prisma) return 0

  await Promise.all(
    rows.map((row) =>
      prisma.nbaMarketOddsSnapshot.upsert({
        where: {
          businessDate_lookupKey_source: {
            businessDate: toBusinessDate(date),
            lookupKey: row.lookupKey,
            source: row.source,
          },
        },
        update: { odds: toJson(row.odds) },
        create: {
          businessDate: toBusinessDate(date),
          lookupKey: row.lookupKey,
          source: row.source,
          odds: toJson(row.odds),
        },
      }),
    ),
  )

  return rows.length
}

export async function saveNbaPredictions(runId: string | null, date: string, rows: NbaAutomationPredictionRow[]) {
  const prisma = getPrismaClient()
  if (!prisma || !runId) return 0

  await Promise.all(
    rows.map((row) =>
      prisma.nbaPrediction.upsert({
        where: {
          predictionRunId_lookupKey: {
            predictionRunId: runId,
            lookupKey: row.lookupKey,
          },
        },
        update: {
          awayTeam: row.awayTeam,
          homeTeam: row.homeTeam,
          payload: toJson(row),
        },
        create: {
          predictionRunId: runId,
          businessDate: toBusinessDate(date),
          lookupKey: row.lookupKey,
          awayTeam: row.awayTeam,
          homeTeam: row.homeTeam,
          payload: toJson(row),
        },
      }),
    ),
  )

  return rows.length
}

export async function getNbaPredictionsByRunOrDate(args: { runId?: string; date?: string }) {
  const prisma = getPrismaClient()
  if (!prisma) return []

  if (args.runId) {
    return prisma.nbaPrediction.findMany({
      where: { predictionRunId: args.runId },
      orderBy: { lookupKey: 'asc' },
    })
  }

  if (args.date) {
    const latestRun = await getLatestNbaPredictionRunForDate(args.date)
    if (latestRun) {
      return prisma.nbaPrediction.findMany({
        where: { predictionRunId: latestRun.id },
        orderBy: { lookupKey: 'asc' },
      })
    }
    return prisma.nbaPrediction.findMany({
      where: { businessDate: toBusinessDate(args.date) },
      orderBy: { lookupKey: 'asc' },
    })
  }

  return []
}

export async function getNbaPredictionsByDateRange(fromDate: string, toDate: string) {
  const prisma = getPrismaClient()
  if (!prisma) return []

  return prisma.nbaPrediction.findMany({
    where: {
      businessDate: {
        gte: toBusinessDate(fromDate),
        lte: toBusinessDate(toDate),
      },
    },
    orderBy: [{ businessDate: 'desc' }, { lookupKey: 'asc' }],
  })
}

export type NbaResultRow = {
  lookupKey: string
  awayTeam: string
  homeTeam: string
  awayScore: number
  homeScore: number
  payload?: Record<string, unknown> | null
}

export async function saveNbaResults(date: string, rows: NbaResultRow[]) {
  const prisma = getPrismaClient()
  if (!prisma) return 0

  await Promise.all(
    rows.map((row) =>
      prisma.nbaGameResult.upsert({
        where: {
          businessDate_lookupKey: {
            businessDate: toBusinessDate(date),
            lookupKey: row.lookupKey,
          },
        },
        update: {
          awayTeam: row.awayTeam,
          homeTeam: row.homeTeam,
          awayScore: row.awayScore,
          homeScore: row.homeScore,
          payload: row.payload ? toJson(row.payload) : Prisma.JsonNull,
        },
        create: {
          businessDate: toBusinessDate(date),
          lookupKey: row.lookupKey,
          awayTeam: row.awayTeam,
          homeTeam: row.homeTeam,
          awayScore: row.awayScore,
          homeScore: row.homeScore,
          payload: row.payload ? toJson(row.payload) : Prisma.JsonNull,
        },
      }),
    ),
  )

  return rows.length
}

export async function getNbaResultsByDateRange(fromDate: string, toDate: string) {
  const prisma = getPrismaClient()
  if (!prisma) return []

  return prisma.nbaGameResult.findMany({
    where: {
      businessDate: {
        gte: toBusinessDate(fromDate),
        lte: toBusinessDate(toDate),
      },
    },
    orderBy: [{ businessDate: 'desc' }, { lookupKey: 'asc' }],
  })
}

// ─── NBA Odds Override Repositories ──────────────────────────────────────────

export type NbaOddsOverrideRow = {
  lookupKey: string
  awayTeam: string
  homeTeam: string
  source: string
  status?: string
  odds: OddsInput
  metadata?: Record<string, unknown> | null
}

export async function saveNbaOddsOverrides(date: string, rows: NbaOddsOverrideRow[]) {
  const prisma = getPrismaClient()
  if (!prisma) return 0

  await Promise.all(
    rows.map((row) =>
      prisma.mlbOddsOverride.upsert({
        where: {
          sport_businessDate_lookupKey_source: {
            sport: NBA_SPORT,
            businessDate: toBusinessDate(date),
            lookupKey: row.lookupKey,
            source: row.source,
          },
        },
        update: {
          awayTeam: row.awayTeam,
          homeTeam: row.homeTeam,
          status: row.status ?? 'staged',
          odds: toJson(row.odds),
          metadata: row.metadata ? toJson(row.metadata) : Prisma.JsonNull,
        },
        create: {
          sport: NBA_SPORT,
          businessDate: toBusinessDate(date),
          lookupKey: row.lookupKey,
          awayTeam: row.awayTeam,
          homeTeam: row.homeTeam,
          source: row.source,
          status: row.status ?? 'staged',
          odds: toJson(row.odds),
          metadata: row.metadata ? toJson(row.metadata) : undefined,
        },
      }),
    ),
  )

  return rows.length
}

export async function listNbaOddsOverridesByDate(date: string) {
  const prisma = getPrismaClient()
  if (!prisma) return []

  return prisma.mlbOddsOverride.findMany({
    where: {
      sport: NBA_SPORT,
      businessDate: toBusinessDate(date),
    },
    orderBy: [{ updatedAt: 'desc' }, { lookupKey: 'asc' }],
  })
}

export async function getNbaOddsOverridesForDate(
  date: string,
  args?: { source?: string; statuses?: string[] },
) {
  const prisma = getPrismaClient()
  if (!prisma) return []

  return prisma.mlbOddsOverride.findMany({
    where: {
      sport: NBA_SPORT,
      businessDate: toBusinessDate(date),
      source: args?.source,
      status: args?.statuses?.length ? { in: args.statuses } : undefined,
    },
    orderBy: [{ updatedAt: 'desc' }, { lookupKey: 'asc' }],
  })
}

export async function updateNbaOddsOverrideStatus(args: {
  date: string
  status: string
  source?: string
  lookupKeys?: string[]
}) {
  const prisma = getPrismaClient()
  if (!prisma) return { count: 0 }

  return prisma.mlbOddsOverride.updateMany({
    where: {
      sport: NBA_SPORT,
      businessDate: toBusinessDate(args.date),
      source: args.source,
      lookupKey: args.lookupKeys?.length ? { in: args.lookupKeys } : undefined,
    },
    data: { status: args.status },
  })
}
