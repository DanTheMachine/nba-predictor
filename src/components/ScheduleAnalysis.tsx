import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import type { UseResultsTrackerReturn } from "../hooks/useResultsTracker";
import { buildCompositeCandidates, buildCompositeRecommendation, createCompositeFromSim, normalizeSharpSignals } from "../lib/compositeRecommendation";
import { deriveSharpInputFromMarketData } from "../lib/sharpSignals";
import type { analyzeBetting as AnalyzeBettingFn, mlAmerican as MlAmericanFn } from "../lib/betting";
import type { predictGame as PredictGameFn } from "../lib/nbaModel";
import type {
  BettingAnalysis,
  EditableOddsFields,
  InjuryInfo,
  LiveStatsMap,
  OddsInput,
  ProjectedStarter,
  ScheduleRow,
  SharpLeanSide,
  SharpLeanValue,
  TeamAbbr,
  TeamStats,
} from "../lib/nbaTypes";

type Props = {
  card: CSSProperties
  analyzeBetting: typeof AnalyzeBettingFn
  mlAmerican: typeof MlAmericanFn
  predictGame: typeof PredictGameFn
  liveStats: LiveStatsMap
  TEAMS: Record<TeamAbbr, TeamStats>
  showBulkImport: boolean
  setShowBulkImport: Dispatch<SetStateAction<boolean>>
  bulkError: string
  bulkStatus: string
  bulkPaste: string
  setBulkPaste: Dispatch<SetStateAction<string>>
  handleBulkImport: () => void
  linesRows: ScheduleRow[]
  setLinesRows: Dispatch<SetStateAction<ScheduleRow[]>>
  showLines: boolean
  schedStatus: string
  schedLoading: boolean
  simsRunning: boolean
  handleLoadSchedule: () => void | Promise<void>
  handleRunAllSims: () => void
  handleExport: () => void
  handleFetchResults: UseResultsTrackerReturn["handleFetchResults"]
  fetchingResults: boolean
  editingIdx: number | null
  setEditingIdx: Dispatch<SetStateAction<number | null>>
  editFields: Partial<EditableOddsFields>
  setEditFields: Dispatch<SetStateAction<Partial<EditableOddsFields>>>
  // eslint-disable-next-line no-unused-vars
  startEdit: (idx: number) => void
  // eslint-disable-next-line no-unused-vars
  saveEdit: (idx: number) => void
}

type ContextFields = {
  openingHomeMoneyline: string
  openingAwayMoneyline: string
  openingSpread: string
  openingTotal: string
  moneylineHomeBetsPct: string
  moneylineHomeMoneyPct: string
  spreadHomeBetsPct: string
  spreadHomeMoneyPct: string
  totalOverBetsPct: string
  totalOverMoneyPct: string
  clvLean: string
  steamMoveLean: string
  reverseLineMoveLean: string
  consensusMoneyline: "home" | "away" | "none"
  consensusSpread: "home" | "away" | "none"
  consensusTotal: "over" | "under" | "none"
  notes: string
  homeInjuries: string
  awayInjuries: string
}

const EMPTY_CONTEXT: ContextFields = {
  openingHomeMoneyline: "",
  openingAwayMoneyline: "",
  openingSpread: "",
  openingTotal: "",
  moneylineHomeBetsPct: "",
  moneylineHomeMoneyPct: "",
  spreadHomeBetsPct: "",
  spreadHomeMoneyPct: "",
  totalOverBetsPct: "",
  totalOverMoneyPct: "",
  clvLean: "none",
  steamMoveLean: "none",
  reverseLineMoveLean: "none",
  consensusMoneyline: "none",
  consensusSpread: "none",
  consensusTotal: "none",
  notes: "",
  homeInjuries: "",
  awayInjuries: "",
}

const EDIT_FIELDS: Array<{ label: string; field: keyof EditableOddsFields }> = [
  { label: "H ML", field: "homeMoneyline" },
  { label: "A ML", field: "awayMoneyline" },
  { label: "Spread", field: "spread" },
  { label: "Spr H Odds", field: "spreadHomeOdds" },
  { label: "Spr A Odds", field: "spreadAwayOdds" },
  { label: "O/U", field: "overUnder" },
  { label: "Over", field: "overOdds" },
  { label: "Under", field: "underOdds" },
]

const TEAM_CONTEXT_HELP = {
  netRtg: "Net rating per 100 possessions: offense minus defense. Higher is better.",
  pace: "Estimated possessions per game. Higher pace means more scoring opportunities.",
  efg: "Effective field goal percentage. Weights 3-pointers more than 2-pointers.",
  tov: "Turnover percentage. Lower means the team gives away fewer possessions.",
  orb: "Offensive rebound percentage. Higher means more second-chance opportunities.",
  threePar: "Three-point attempt rate. Shows how often a team shoots from 3.",
  ast: "Assist percentage. Higher often means more ball movement and assisted makes.",
  b2b: "Back-to-back indicator. Shows whether the team is playing on consecutive days.",
} as const

function num(value: string): number | null {
  const parsed = Number.parseFloat(value.trim())
  return Number.isFinite(parsed) ? parsed : null
}

function freshness(value?: string): string {
  if (!value) return "No timestamp"
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (mins < 1) return "Updated just now"
  if (mins < 60) return `Updated ${mins} min ago`
  return `Updated ${Math.round(mins / 60)} hr ago`
}

function freshnessColor(value?: string): string {
  return value ? "#3fb950" : "#5a4a2a"
}

function formatSignedNumber(value: number, digits = 1): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`
}

function formatPercentGap(value: number | null | undefined): string | null {
  if (value == null) return null
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
}

function sharpSideLabel(side: "home" | "away" | "none" | undefined, row: ScheduleRow): string {
  if (!side || side === "none") return "None"
  return side === "home" ? row.game.homeAbbr : row.game.awayAbbr
}

function sharpTotalLabel(side: "over" | "under" | "none" | undefined): string {
  if (!side || side === "none") return "None"
  return side.toUpperCase()
}

function sharpTone(aligned: boolean): string {
  return aligned ? "#3fb950" : "#f59e0b"
}

function leanValues(lean: SharpLeanValue | undefined): SharpLeanSide[] {
  if (!lean) return []
  const values = Array.isArray(lean) ? lean : [lean]
  return values.filter((value): value is SharpLeanSide => value != null && value !== "none")
}

function formatLeanValue(lean: SharpLeanValue | undefined): string {
  const values = leanValues(lean)
  return values.length ? values.map((value) => value.toUpperCase()).join(", ") : "NONE"
}

function parseLeanValue(value: string): SharpLeanValue {
  const parsed = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is SharpLeanSide => ["home", "away", "over", "under", "none"].includes(item))
    .filter((item) => item !== "none")

  if (!parsed.length) return "none"
  return [...new Set(parsed)]
}

function hasLean(lean: SharpLeanValue | undefined, candidate: Exclude<SharpLeanSide, "none">): boolean {
  return leanValues(lean).includes(candidate)
}

function sampleLean(index: number, cycle: readonly SharpLeanSide[]): SharpLeanSide {
  return cycle[index % cycle.length] ?? "none"
}

function buildSampleSharpInput(row: ScheduleRow, index: number) {
  if (!row.editedOdds) return null

  const moneylineLean: "home" | "away" = index % 2 === 0 ? "home" : "away"
  const spreadLean: "home" | "away" = index % 3 === 0 ? "home" : "away"
  const totalLean: "over" | "under" = index % 2 === 0 ? "over" : "under"

  return {
    source: "sample",
    lastUpdated: new Date().toISOString(),
    openingHomeMoneyline: row.editedOdds.homeMoneyline + (moneylineLean === "home" ? 18 : -14),
    openingAwayMoneyline: row.editedOdds.awayMoneyline + (moneylineLean === "home" ? -14 : 18),
    openingSpread: Number((row.editedOdds.spread + (spreadLean === "home" ? 1 : -1)).toFixed(1)),
    openingTotal: Number((row.editedOdds.overUnder + (totalLean === "over" ? -2.5 : 2)).toFixed(1)),
    moneylineHomeBetsPct: moneylineLean === "home" ? 41 : 63,
    moneylineHomeMoneyPct: moneylineLean === "home" ? 57 : 49,
    spreadHomeBetsPct: spreadLean === "home" ? 44 : 59,
    spreadHomeMoneyPct: spreadLean === "home" ? 61 : 46,
    totalOverBetsPct: totalLean === "over" ? 68 : 43,
    totalOverMoneyPct: totalLean === "over" ? 52 : 61,
    clvLean: [sampleLean(index, [moneylineLean, "none"]), sampleLean(index + 1, [totalLean, "none"])].filter((value) => value !== "none"),
    steamMoveLean: [sampleLean(index + 1, [totalLean, "none"]), sampleLean(index + 2, [spreadLean, "none"])].filter((value) => value !== "none"),
    reverseLineMoveLean: [sampleLean(index + 2, [spreadLean, "none"]), sampleLean(index + 3, [totalLean, "none"])].filter((value) => value !== "none"),
    consensusMoneyline: moneylineLean,
    consensusSpread: spreadLean,
    consensusTotal: totalLean,
    notes: `${row.game.awayAbbr}/${row.game.homeAbbr}: sample sharp context for UI tuning. Splits, line movement, and lean flags are seeded for preview.`,
  }
}

function shortDate(value: string): string {
  if (!value) return value
  const [, month, day] = value.split("-")
  if (!month || !day) return value
  return `${month}-${day}`
}

function normalizePlayerKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function starterInjuryTag(starterName: string, team: TeamAbbr, allInjuries: InjuryInfo[]): string | null {
  const starterKey = normalizePlayerKey(starterName)
  const match = allInjuries.find((injury) => injury.team === team && normalizePlayerKey(injury.player) === starterKey)
  if (!match) return null
  return match.status?.trim() || "Injury"
}

function formatStarterStats(starter: ProjectedStarter): string | null {
  const pts = starter.stats?.pts
  if (pts == null) return null

  if (starter.position === "PG" || starter.position === "SG") {
    const ast = starter.stats?.ast
    return ast != null ? `${pts.toFixed(1)} PPG ${ast.toFixed(1)} APG` : `${pts.toFixed(1)} PPG`
  }

  const reb = starter.stats?.reb
  return reb != null ? `${pts.toFixed(1)} PPG ${reb.toFixed(1)} RPG` : `${pts.toFixed(1)} PPG`
}

function toContext(row: ScheduleRow): ContextFields {
  return {
    openingHomeMoneyline: row.sharpInput?.openingHomeMoneyline != null ? String(row.sharpInput.openingHomeMoneyline) : "",
    openingAwayMoneyline: row.sharpInput?.openingAwayMoneyline != null ? String(row.sharpInput.openingAwayMoneyline) : "",
    openingSpread: row.sharpInput?.openingSpread != null ? String(row.sharpInput.openingSpread) : "",
    openingTotal: row.sharpInput?.openingTotal != null ? String(row.sharpInput.openingTotal) : "",
    moneylineHomeBetsPct: row.sharpInput?.moneylineHomeBetsPct != null ? String(row.sharpInput.moneylineHomeBetsPct) : "",
    moneylineHomeMoneyPct: row.sharpInput?.moneylineHomeMoneyPct != null ? String(row.sharpInput.moneylineHomeMoneyPct) : "",
    spreadHomeBetsPct: row.sharpInput?.spreadHomeBetsPct != null ? String(row.sharpInput.spreadHomeBetsPct) : "",
    spreadHomeMoneyPct: row.sharpInput?.spreadHomeMoneyPct != null ? String(row.sharpInput.spreadHomeMoneyPct) : "",
    totalOverBetsPct: row.sharpInput?.totalOverBetsPct != null ? String(row.sharpInput.totalOverBetsPct) : "",
    totalOverMoneyPct: row.sharpInput?.totalOverMoneyPct != null ? String(row.sharpInput.totalOverMoneyPct) : "",
    clvLean: formatLeanValue(row.sharpInput?.clvLean).toLowerCase(),
    steamMoveLean: formatLeanValue(row.sharpInput?.steamMoveLean).toLowerCase(),
    reverseLineMoveLean: formatLeanValue(row.sharpInput?.reverseLineMoveLean).toLowerCase(),
    consensusMoneyline: row.sharpInput?.consensusMoneyline ?? "none",
    consensusSpread: row.sharpInput?.consensusSpread ?? "none",
    consensusTotal: row.sharpInput?.consensusTotal ?? "none",
    notes: row.sharpInput?.notes ?? "",
    homeInjuries: row.injuries.filter((i) => i.team === row.game.homeAbbr && i.source === "manual").map((i) => i.note).join("\n"),
    awayInjuries: row.injuries.filter((i) => i.team === row.game.awayAbbr && i.source === "manual").map((i) => i.note).join("\n"),
  }
}

function injuries(team: TeamAbbr, text: string, lastUpdated: string): InjuryInfo[] {
  return text.split("\n").map((line) => line.trim()).filter(Boolean).map((note) => ({
    team,
    player: "Team report",
    status: "NOTE",
    note,
    source: "manual",
    lastUpdated,
  }))
}

function formatSignedOdds(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`
}

function formatDisplayMoneyline(value: number): string {
  if (value === 0) return "+100"
  if (value === 100) return "+100"
  return `${value > 0 ? "+" : ""}${value}`
}

function formatMoneylinePair(homeAbbr: TeamAbbr, awayAbbr: TeamAbbr, homeMoneyline: number, awayMoneyline: number): string {
  return `${awayAbbr} ${formatSignedOdds(awayMoneyline)} / ${homeAbbr} ${formatSignedOdds(homeMoneyline)}`
}

function formatSpreadLabel(team: TeamAbbr, spread: number, odds: number): string {
  return `${team} ${spread > 0 ? "+" : ""}${spread} (${formatSignedOdds(odds)})`
}

function awaySpreadFromHomeSpread(homeSpread: number): number {
  return -homeSpread
}

function formatSpreadPair(homeAbbr: TeamAbbr, awayAbbr: TeamAbbr, spread: number): string {
  return `${awayAbbr} ${awaySpreadFromHomeSpread(spread) > 0 ? "+" : ""}${awaySpreadFromHomeSpread(spread)} / ${homeAbbr} ${spread > 0 ? "+" : ""}${spread}`
}

function formatTotalLabel(total: number): string {
  return `O/U ${total}`
}

function formatCompactHeaderOddsSummary(row: ScheduleRow, odds: OddsInput | null | undefined): string {
  if (!odds) return "No odds loaded"

  return [
    `${row.game.awayAbbr} ${formatDisplayMoneyline(odds.awayMoneyline)} / ${row.game.homeAbbr} ${formatDisplayMoneyline(odds.homeMoneyline)}`,
    `${row.game.awayAbbr} ${awaySpreadFromHomeSpread(odds.spread) > 0 ? "+" : ""}${awaySpreadFromHomeSpread(odds.spread)} ${formatSignedOdds(odds.spreadAwayOdds)} / ${row.game.homeAbbr} ${odds.spread > 0 ? "+" : ""}${odds.spread} ${formatSignedOdds(odds.spreadHomeOdds)}`,
    `${formatTotalLabel(odds.overUnder)} (${formatSignedOdds(odds.overOdds)} / ${formatSignedOdds(odds.underOdds)})`,
  ].join(" | ")
}

function sameOdds(a: OddsInput | null | undefined, b: OddsInput | null | undefined): boolean {
  if (!a || !b) return false
  return (
    a.homeMoneyline === b.homeMoneyline &&
    a.awayMoneyline === b.awayMoneyline &&
    a.spread === b.spread &&
    a.spreadHomeOdds === b.spreadHomeOdds &&
    a.spreadAwayOdds === b.spreadAwayOdds &&
    a.overUnder === b.overUnder &&
    a.overOdds === b.overOdds &&
    a.underOdds === b.underOdds
  )
}

function statusTone(status: string, hasRows: boolean): string {
  const normalized = status.toLowerCase()
  if (
    normalized.includes("error") ||
    normalized.includes("failed") ||
    normalized.includes("warning") ||
    normalized.includes("warn")
  ) {
    return "#f87171"
  }

  return hasRows ? "#3fb950" : "#5a4a2a"
}

type MarketSignalScore = {
  key: "home" | "away" | "over" | "under"
  label: string
  score: number
  evidence: number
}

function buildMarketSignalScores(row: ScheduleRow): MarketSignalScore[] {
  const sharp = row.sharpContext
  if (!sharp) return []

  const homeSupport =
    (sharp.homeMoneylineMove != null && sharp.homeMoneylineMove > 0 ? 1 : 0) +
    (sharp.moneylineHomeSplitGap != null && sharp.moneylineHomeSplitGap > 0 ? 1 : 0) +
    (row.sharpInput?.consensusMoneyline === "home" ? 1 : 0) +
    (hasLean(row.sharpInput?.clvLean, "home") ? 1 : 0) +
    (hasLean(row.sharpInput?.steamMoveLean, "home") ? 1 : 0) +
    (hasLean(row.sharpInput?.reverseLineMoveLean, "home") ? 1 : 0)

  const awaySupport =
    (sharp.awayMoneylineMove != null && sharp.awayMoneylineMove > 0 ? 1 : 0) +
    (sharp.moneylineHomeSplitGap != null && sharp.moneylineHomeSplitGap < 0 ? 1 : 0) +
    (row.sharpInput?.consensusMoneyline === "away" ? 1 : 0) +
    (hasLean(row.sharpInput?.clvLean, "away") ? 1 : 0) +
    (hasLean(row.sharpInput?.steamMoveLean, "away") ? 1 : 0) +
    (hasLean(row.sharpInput?.reverseLineMoveLean, "away") ? 1 : 0)

  const overSupport =
    (sharp.totalMove != null && sharp.totalMove > 0 ? 1 : 0) +
    (sharp.totalOverSplitGap != null && sharp.totalOverSplitGap > 0 ? 1 : 0) +
    (row.sharpInput?.consensusTotal === "over" ? 1 : 0) +
    (hasLean(row.sharpInput?.clvLean, "over") ? 1 : 0) +
    (hasLean(row.sharpInput?.steamMoveLean, "over") ? 1 : 0) +
    (hasLean(row.sharpInput?.reverseLineMoveLean, "over") ? 1 : 0)

  const underSupport =
    (sharp.totalMove != null && sharp.totalMove < 0 ? 1 : 0) +
    (sharp.totalOverSplitGap != null && sharp.totalOverSplitGap < 0 ? 1 : 0) +
    (row.sharpInput?.consensusTotal === "under" ? 1 : 0) +
    (hasLean(row.sharpInput?.clvLean, "under") ? 1 : 0) +
    (hasLean(row.sharpInput?.steamMoveLean, "under") ? 1 : 0) +
    (hasLean(row.sharpInput?.reverseLineMoveLean, "under") ? 1 : 0)

  const scores = [
    { key: "home", label: `${row.game.homeAbbr} ML`, score: homeSupport, evidence: homeSupport },
    { key: "away", label: `${row.game.awayAbbr} ML`, score: awaySupport, evidence: awaySupport },
    { key: "over", label: "OVER", score: overSupport, evidence: overSupport },
    { key: "under", label: "UNDER", score: underSupport, evidence: underSupport },
  ] satisfies MarketSignalScore[]

  return scores.sort((a, b) => b.score - a.score)
}

function inferMarketRead(row: ScheduleRow): string {
  const reads = buildMarketSignalScores(row)
  if (!reads.length) return "No market signal yet"

  if (!reads[0] || reads[0].score <= 0) return "Mixed market signals"
  if (reads[1] && reads[0].score === reads[1].score) return "Mixed market signals"
  const top = reads[0]
  if (top.key === "home" || top.key === "away") return `Market read: ${top.label.replace(" ML", "")} support`
  return `Market read: ${top.label} support`
}

function supportTone(score: number): string {
  if (score >= 4) return "#3fb950"
  if (score >= 2) return "#fbbf24"
  if (score >= 1) return "#60a5fa"
  return "#7a6a3a"
}

function supportBackground(score: number): string {
  if (score >= 4) return "rgba(63,185,80,0.08)"
  if (score >= 2) return "rgba(251,191,36,0.08)"
  if (score >= 1) return "rgba(96,165,250,0.08)"
  return "rgba(255,200,80,0.03)"
}

function supportBorder(score: number): string {
  if (score >= 4) return "rgba(63,185,80,0.2)"
  if (score >= 2) return "rgba(251,191,36,0.2)"
  if (score >= 1) return "rgba(96,165,250,0.2)"
  return "rgba(255,200,80,0.08)"
}

function sharpStatusLabel(row: ScheduleRow): string {
  if (row.sharpInput?.source === "manual") return "MANUAL SHARP"
  if (row.sharpInput?.source) return `${row.sharpInput.source.toUpperCase()} SHARP`
  if (row.marketData?.current) return "LIVE MARKET READY"
  if (row.marketData) return "MARKET LINKED"
  return "NO SHARP"
}

function sharpStatusTone(row: ScheduleRow): { color: string; border: string; background: string } {
  if (row.sharpInput?.source === "manual") {
    return {
      color: "#fbbf24",
      border: "rgba(251,191,36,0.28)",
      background: "rgba(251,191,36,0.08)",
    }
  }
  if (row.sharpInput?.source) {
    return {
      color: "#93c5fd",
      border: "rgba(96,165,250,0.28)",
      background: "rgba(96,165,250,0.08)",
    }
  }
  if (row.marketData?.current) {
    return {
      color: "#bfdbfe",
      border: "rgba(96,165,250,0.22)",
      background: "rgba(96,165,250,0.05)",
    }
  }
  return {
    color: "#7a6a3a",
    border: "rgba(255,200,80,0.12)",
    background: "rgba(255,200,80,0.03)",
  }
}

function recommendationTone(tier: "A" | "B" | "C" | "PASS"): { color: string; border: string; background: string } {
  if (tier === "A") {
    return { color: "#4ade80", border: "rgba(74,222,128,0.28)", background: "rgba(74,222,128,0.08)" }
  }
  if (tier === "B") {
    return { color: "#fbbf24", border: "rgba(251,191,36,0.28)", background: "rgba(251,191,36,0.08)" }
  }
  if (tier === "C") {
    return { color: "#93c5fd", border: "rgba(96,165,250,0.28)", background: "rgba(96,165,250,0.08)" }
  }
  return { color: "#7a6a3a", border: "rgba(255,200,80,0.12)", background: "rgba(255,200,80,0.03)" }
}

function compositeEdgePercent(
  row: ScheduleRow,
  analysis: BettingAnalysis | null,
  market: "ML" | "SPR" | "O/U" | "PASS",
): { value: number; label: string } {
  if (!analysis) return { value: 0, label: "0.0%" }
  if (market === "ML") {
    const side = analysis.mlValueSide === "home" ? row.game.homeAbbr : analysis.mlValueSide === "away" ? row.game.awayAbbr : "PASS"
    return { value: analysis.mlValuePct, label: `${side} +${analysis.mlValuePct.toFixed(1)}%` }
  }
  if (market === "SPR") {
    return { value: analysis.spreadEdge, label: spreadEdgeLabel(row, analysis) }
  }
  if (market === "O/U") {
    return { value: analysis.ouEdgePct, label: ouEdgeLabel(analysis) }
  }
  return { value: 0, label: "PASS" }
}

function compositePickOdds(
  row: ScheduleRow,
  analysis: BettingAnalysis | null,
  market: "ML" | "SPR" | "O/U" | "PASS",
): string {
  const odds = row.editedOdds
  if (!odds || !analysis) return ""

  if (market === "ML") {
    if (analysis.mlValueSide === "home") return formatSignedOdds(odds.homeMoneyline)
    if (analysis.mlValueSide === "away") return formatSignedOdds(odds.awayMoneyline)
    return ""
  }

  if (market === "SPR") {
    if (analysis.spreadRec.startsWith("home")) return formatSignedOdds(odds.spreadHomeOdds)
    if (analysis.spreadRec.startsWith("away")) return formatSignedOdds(odds.spreadAwayOdds)
    return ""
  }

  if (market === "O/U") {
    if (analysis.ouRec === "over") return formatSignedOdds(odds.overOdds)
    if (analysis.ouRec === "under") return formatSignedOdds(odds.underOdds)
    return ""
  }

  return ""
}

function compositeProjectionDetail(
  row: ScheduleRow,
  analysis: BettingAnalysis | null,
  market: "ML" | "SPR" | "O/U" | "PASS",
): string {
  const sim = row.simResult
  if (!sim || !analysis) return ""

  if (market === "ML") {
    if (analysis.mlValueSide === "home") return `${row.game.homeAbbr} win ${ (sim.hWinProb * 100).toFixed(1)}%`
    if (analysis.mlValueSide === "away") return `${row.game.awayAbbr} win ${ (sim.aWinProb * 100).toFixed(1)}%`
    return ""
  }

  if (market === "SPR") {
    return `${row.game.homeAbbr} ${sim.hScore}-${sim.aScore} ${row.game.awayAbbr} · Diff ${Number.parseFloat(sim.projDiff) > 0 ? "+" : ""}${sim.projDiff}`
  }

  if (market === "O/U") {
    return `${row.game.homeAbbr} ${sim.hScore}-${sim.aScore} ${row.game.awayAbbr} · Total ${sim.total}`
  }

  return ""
}

function compositeSharpDetail(row: ScheduleRow, market: "ML" | "SPR" | "O/U" | "PASS"): string {
  const sharp = row.sharpContext
  if (!sharp || !row.sharpInput) return "No Sharp Information"

  if (market === "ML") {
    const parts = [
      sharp.homeMoneylineMove != null ? `ML move ${formatSignedNumber(sharp.homeMoneylineMove * 100)} pts` : null,
      sharp.moneylineHomeSplitGap != null ? `ML gap ${formatPercentGap(sharp.moneylineHomeSplitGap)}` : null,
      row.sharpInput.consensusMoneyline && row.sharpInput.consensusMoneyline !== "none"
        ? `Consensus ${sharpSideLabel(row.sharpInput.consensusMoneyline, row)}`
        : null,
    ].filter(Boolean)
    return parts[0] ?? "No Sharp Information"
  }

  if (market === "SPR") {
    const parts = [
      sharp.spreadMove != null ? `Spread move ${formatSignedNumber(sharp.spreadMove)}` : null,
      sharp.spreadHomeSplitGap != null ? `Spread gap ${formatPercentGap(sharp.spreadHomeSplitGap)}` : null,
      row.sharpInput.consensusSpread && row.sharpInput.consensusSpread !== "none"
        ? `Consensus ${sharpSideLabel(row.sharpInput.consensusSpread, row)}`
        : null,
    ].filter(Boolean)
    return parts[0] ?? "No Sharp Information"
  }

  if (market === "O/U") {
    const parts = [
      sharp.totalMove != null ? `Total move ${formatSignedNumber(sharp.totalMove)}` : null,
      sharp.totalOverSplitGap != null ? `Total gap ${formatPercentGap(sharp.totalOverSplitGap)}` : null,
      row.sharpInput.consensusTotal && row.sharpInput.consensusTotal !== "none"
        ? `Consensus ${sharpTotalLabel(row.sharpInput.consensusTotal)}`
        : null,
    ].filter(Boolean)
    return parts[0] ?? "No Sharp Information"
  }

  return "No Sharp Information"
}

function modelSideForSignal(
  signal: MarketSignalScore,
  row: ScheduleRow,
  analysis: BettingAnalysis | null,
): string | null {
  if (!analysis) return null
  if (signal.key === "home" || signal.key === "away") {
    return analysis.mlValueSide === signal.key ? `${signal.label} edge` : analysis.mlValueSide !== "none" ? `${analysis.mlValueSide === "home" ? row.game.homeAbbr : row.game.awayAbbr} ML edge` : "No ML edge"
  }
  return analysis.ouRec === signal.key ? `${signal.label} edge` : analysis.ouRec !== "pass" ? `${analysis.ouRec.toUpperCase()} edge` : "No total edge"
}

function modelAgreementLabel(
  signal: MarketSignalScore,
  row: ScheduleRow,
  analysis: BettingAnalysis | null,
): string {
  const modelSide = modelSideForSignal(signal, row, analysis)
  if (!modelSide) return "Model pending"
  if (
    (signal.key === "home" || signal.key === "away")
      ? analysis?.mlValueSide === signal.key
      : analysis?.ouRec === signal.key
  ) {
    return `Model agrees: ${modelSide}`
  }
  return `Model differs: ${modelSide}`
}

function edgeTone(edge: number | null, passes: boolean): string {
  if (passes || edge == null || edge <= 0) return "#f87171"
  if (edge >= 5) return "#3fb950"
  return "#60a5fa"
}

function mlEdgeLabel(row: ScheduleRow, analysis: NonNullable<ReturnType<Props["analyzeBetting"]>>): string {
  if (analysis.mlValueSide === "home") return `${row.game.homeAbbr} +${analysis.mlValuePct.toFixed(1)}%`
  if (analysis.mlValueSide === "away") return `${row.game.awayAbbr} +${analysis.mlValuePct.toFixed(1)}%`
  return "PASS"
}

function ouEdgeLabel(analysis: NonNullable<ReturnType<Props["analyzeBetting"]>>): string {
  if (analysis.ouRec === "over") return `OVER +${analysis.ouEdgePct.toFixed(1)}%`
  if (analysis.ouRec === "under") return `UNDER +${analysis.ouEdgePct.toFixed(1)}%`
  return "PASS"
}

function spreadEdgeLabel(row: ScheduleRow, analysis: NonNullable<ReturnType<Props["analyzeBetting"]>>): string {
  if (analysis.spreadRec === "pass") return "PASS"
  const label = analysis.spreadRec.startsWith("home")
    ? analysis.spreadRec.replace(/^home/i, row.game.homeAbbr)
    : analysis.spreadRec.replace(/^away/i, row.game.awayAbbr)
  return `${label.toUpperCase()} +${analysis.spreadEdge.toFixed(1)}%`
}

export default function ScheduleAnalysis({
  analyzeBetting,
  mlAmerican,
  predictGame,
  liveStats,
  TEAMS,
  showBulkImport,
  setShowBulkImport,
  bulkError,
  bulkStatus,
  bulkPaste,
  setBulkPaste,
  handleBulkImport,
  linesRows,
  setLinesRows,
  showLines,
  schedStatus,
  schedLoading,
  simsRunning,
  handleLoadSchedule,
  handleRunAllSims,
  handleExport,
  handleFetchResults,
  fetchingResults,
  editingIdx,
  setEditingIdx,
  editFields,
  setEditFields,
  startEdit,
  saveEdit,
}: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [contextEditingIdx, setContextEditingIdx] = useState<number | null>(null)
  const [contextFields, setContextFields] = useState<ContextFields>(EMPTY_CONTEXT)

  const enrichedRows = useMemo(
    () =>
      linesRows.map((row) => {
        const analysis = row.editedOdds && row.simResult ? analyzeBetting(row.simResult, row.editedOdds) : null
        const sharpContext = normalizeSharpSignals(row.sharpInput, row.editedOdds)
        const composite = row.compositeRecommendation ?? buildCompositeRecommendation({ ...row, sharpContext }, analysis)
        return { row: { ...row, sharpContext, compositeRecommendation: composite }, analysis, composite }
      }),
    [analyzeBetting, linesRows],
  )

  const hasSimResults = enrichedRows.some((entry) => entry.row.simResult)
  const hasEditableOdds = linesRows.some((row) => row.editedOdds)
  const hasLiveSharpSource = linesRows.some((row) => row.marketData && row.editedOdds)
  const liveSharpCount = linesRows.filter((row) => row.sharpInput?.source && row.sharpInput.source !== "manual").length
  const manualSharpCount = linesRows.filter((row) => row.sharpInput?.source === "manual").length
  const marketReadyCount = linesRows.filter((row) => row.marketData?.current).length
  const bestBetRows = useMemo(
    () =>
      enrichedRows
        .flatMap((entry) =>
          buildCompositeCandidates(entry.row, entry.analysis)
            .filter((candidate) => !candidate.pass)
            .map((candidate) => ({
              row: entry.row,
              analysis: entry.analysis,
              composite: candidate,
              bestEdge: compositeEdgePercent(entry.row, entry.analysis, candidate.primaryMarket),
              pickOdds: compositePickOdds(entry.row, entry.analysis, candidate.primaryMarket),
              projectionDetail: compositeProjectionDetail(entry.row, entry.analysis, candidate.primaryMarket),
              sharpDetail: compositeSharpDetail(entry.row, candidate.primaryMarket),
            })),
        )
        .sort((a, b) => b.bestEdge.value - a.bestEdge.value)
        .slice(0, 5),
    [enrichedRows],
  )

  const refreshLiveSharp = (): void => {
    setLinesRows((prev) => prev.map((currentRow) => {
      const sharpInput = deriveSharpInputFromMarketData(currentRow.marketData, currentRow.editedOdds)
      if (!sharpInput) return currentRow

      const sharpContext = normalizeSharpSignals(sharpInput, currentRow.editedOdds)
      const analysis = currentRow.editedOdds && currentRow.simResult ? analyzeBetting(currentRow.simResult, currentRow.editedOdds) : null
      const nextRow = { ...currentRow, sharpInput, sharpContext }
      return { ...nextRow, compositeRecommendation: buildCompositeRecommendation(nextRow, analysis) }
    }))
  }

  const loadSampleSharp = (): void => {
    setLinesRows((prev) => prev.map((currentRow, rowIndex) => {
      const sharpInput = buildSampleSharpInput(currentRow, rowIndex)
      if (!sharpInput) return currentRow

      const sharpContext = normalizeSharpSignals(sharpInput, currentRow.editedOdds)
      const analysis = currentRow.editedOdds && currentRow.simResult ? analyzeBetting(currentRow.simResult, currentRow.editedOdds) : null
      const nextRow = { ...currentRow, sharpInput, sharpContext }
      return { ...nextRow, compositeRecommendation: buildCompositeRecommendation(nextRow, analysis) }
    }))
  }

  const saveContext = (idx: number): void => {
    const row = linesRows[idx]
    if (!row) return
    const lastUpdated = new Date().toISOString()
    const sharpInput = {
      source: "manual",
      lastUpdated,
      openingHomeMoneyline: num(contextFields.openingHomeMoneyline),
      openingAwayMoneyline: num(contextFields.openingAwayMoneyline),
      openingSpread: num(contextFields.openingSpread),
      openingTotal: num(contextFields.openingTotal),
      moneylineHomeBetsPct: num(contextFields.moneylineHomeBetsPct),
      moneylineHomeMoneyPct: num(contextFields.moneylineHomeMoneyPct),
      spreadHomeBetsPct: num(contextFields.spreadHomeBetsPct),
      spreadHomeMoneyPct: num(contextFields.spreadHomeMoneyPct),
      totalOverBetsPct: num(contextFields.totalOverBetsPct),
      totalOverMoneyPct: num(contextFields.totalOverMoneyPct),
      clvLean: parseLeanValue(contextFields.clvLean),
      steamMoveLean: parseLeanValue(contextFields.steamMoveLean),
      reverseLineMoveLean: parseLeanValue(contextFields.reverseLineMoveLean),
      consensusMoneyline: contextFields.consensusMoneyline,
      consensusSpread: contextFields.consensusSpread,
      consensusTotal: contextFields.consensusTotal,
      notes: contextFields.notes.trim(),
    }
    const nextInjuries = [
      ...row.injuries.filter((injury) => injury.source !== "manual"),
      ...injuries(row.game.homeAbbr, contextFields.homeInjuries, lastUpdated),
      ...injuries(row.game.awayAbbr, contextFields.awayInjuries, lastUpdated),
    ]

    setLinesRows((prev) => prev.map((currentRow, rowIndex) => {
      if (rowIndex !== idx) return currentRow
      const nextRow = {
        ...currentRow,
        sharpInput,
        injuries: nextInjuries,
        sharpContext: normalizeSharpSignals(sharpInput, currentRow.editedOdds),
      }
      const analysis = nextRow.editedOdds && nextRow.simResult ? analyzeBetting(nextRow.simResult, nextRow.editedOdds) : null
      return { ...nextRow, compositeRecommendation: buildCompositeRecommendation(nextRow, analysis) }
    }))
    setContextEditingIdx(null)
  }

  return (
    <div style={{ background:"#0f0800", border:"1px solid #251800", borderRadius:8, padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:schedStatus ? 12 : 0 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:"#5a4a2a", letterSpacing:3, marginBottom:3 }}>TODAY&apos;S GAMES & EXPORT</div>
          <div style={{ fontSize:11, color:"#3a2a1a" }}>Game intelligence cards combine model output, sharp context, injuries, and recent form.</div>
          {linesRows.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:7 }}>
              <div style={{ fontSize:8, color:"#93c5fd", border:"1px solid rgba(96,165,250,0.2)", background:"rgba(96,165,250,0.05)", borderRadius:999, padding:"3px 8px", letterSpacing:1 }}>
                LIVE SHARP {liveSharpCount}/{linesRows.length}
              </div>
              <div style={{ fontSize:8, color:"#bfdbfe", border:"1px solid rgba(96,165,250,0.16)", background:"rgba(96,165,250,0.04)", borderRadius:999, padding:"3px 8px", letterSpacing:1 }}>
                MARKET READY {marketReadyCount}/{linesRows.length}
              </div>
              <div style={{ fontSize:8, color:"#fbbf24", border:"1px solid rgba(251,191,36,0.16)", background:"rgba(251,191,36,0.05)", borderRadius:999, padding:"3px 8px", letterSpacing:1 }}>
                MANUAL SHARP {manualSharpCount}
              </div>
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
          <button onClick={handleLoadSchedule} disabled={schedLoading} style={{ background:schedLoading ? "#0f0800" : "#b45309", border:"none", borderRadius:5, padding:"8px 14px", color:schedLoading ? "#3a2a1a" : "#fef3c7", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:schedLoading ? "not-allowed" : "pointer" }}>{schedLoading ? "LOADING..." : linesRows.length ? "RELOAD" : "LOAD GAMES"}</button>
          {linesRows.length > 0 && <button onClick={refreshLiveSharp} disabled={!hasLiveSharpSource} style={{ background:hasLiveSharpSource ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.04)", border:"1px solid rgba(59,130,246,0.24)", borderRadius:5, padding:"8px 14px", color:hasLiveSharpSource ? "#bfdbfe" : "#5a6a8a", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:hasLiveSharpSource ? "pointer" : "not-allowed" }}>REFRESH LIVE SHARP</button>}
          {linesRows.length > 0 && <button onClick={loadSampleSharp} disabled={!hasEditableOdds} style={{ background:hasEditableOdds ? "rgba(251,191,36,0.12)" : "rgba(251,191,36,0.04)", border:"1px solid rgba(251,191,36,0.24)", borderRadius:5, padding:"8px 14px", color:hasEditableOdds ? "#fde68a" : "#7a6a3a", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:hasEditableOdds ? "pointer" : "not-allowed" }}>LOAD SAMPLE SHARP</button>}
          {linesRows.length > 0 && <button onClick={() => setShowBulkImport((prev) => !prev)} style={{ background:showBulkImport ? "rgba(251,191,36,0.12)" : "rgba(255,200,80,0.06)", border:"1px solid rgba(255,200,80,0.2)", borderRadius:5, padding:"8px 14px", color:showBulkImport ? "#fbbf24" : "#9a8a5a", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>{showBulkImport ? "HIDE" : "BULK EDIT LINES"}</button>}
          {linesRows.length > 0 && <button onClick={handleRunAllSims} disabled={simsRunning} style={{ background:simsRunning ? "#0f0800" : "#d29922", border:"none", borderRadius:5, padding:"8px 14px", color:simsRunning ? "#3a2a1a" : "#1a0f00", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:simsRunning ? "not-allowed" : "pointer" }}>{simsRunning ? "RUNNING..." : "RUN ALL SIMS"}</button>}
          {hasSimResults && <button onClick={handleExport} style={{ background:"#3fb950", border:"none", borderRadius:5, padding:"8px 14px", color:"#0d1117", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>PREDICTIONS CSV</button>}
          {hasSimResults && <button onClick={() => handleFetchResults(true)} disabled={fetchingResults} style={{ background:fetchingResults ? "#0f0800" : "linear-gradient(135deg,#1d4ed8,#3b82f6)", border:"none", borderRadius:5, padding:"8px 14px", color:fetchingResults ? "#3a2a1a" : "#eff6ff", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:fetchingResults ? "not-allowed" : "pointer" }}>{fetchingResults ? "FETCHING..." : "RESULTS CSV"}</button>}
        </div>
      </div>

      {showBulkImport && linesRows.length > 0 && (
        <div style={{ background:"rgba(255,200,80,0.03)", border:"1px solid rgba(255,200,80,0.15)", borderRadius:6, padding:14, marginBottom:12 }}>
          <div style={{ fontSize:10, color:"#fbbf24", letterSpacing:3, marginBottom:8, fontWeight:700 }}>BULK ODDS IMPORT</div>
          <textarea value={bulkPaste} onChange={(e) => setBulkPaste(e.target.value)} style={{ width:"100%", height:140, background:"#0d0800", border:"1px solid rgba(255,200,80,0.15)", borderRadius:4, color:"#e8d5a0", fontSize:11, fontFamily:"monospace", padding:10, resize:"vertical", boxSizing:"border-box", outline:"none" }} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, marginTop:8 }}>
            <button onClick={handleBulkImport} disabled={!bulkPaste.trim()} style={{ padding:"9px 0", background:bulkPaste.trim() ? "linear-gradient(135deg,#b45309,#92400e)" : "rgba(255,200,80,0.04)", border:bulkPaste.trim() ? "none" : "1px solid rgba(255,200,80,0.08)", borderRadius:4, color:bulkPaste.trim() ? "#fef3c7" : "#4a3a2a", fontSize:11, fontWeight:700, letterSpacing:3, fontFamily:"monospace", cursor:bulkPaste.trim() ? "pointer" : "not-allowed" }}>APPLY TO TODAY&apos;S GAMES</button>
            <button onClick={() => setBulkPaste("")} style={{ padding:"9px 14px", background:"transparent", border:"1px solid rgba(255,200,80,0.1)", borderRadius:4, color:"#4a3a2a", fontSize:10, fontFamily:"monospace", cursor:"pointer" }}>CLEAR</button>
          </div>
          {bulkStatus && <div style={{ fontSize:10, color:"#3fb950", marginTop:6 }}>{bulkStatus}</div>}
          {bulkError && <div style={{ fontSize:10, color:"#f87171", marginTop:6 }}>WARN {bulkError}</div>}
        </div>
      )}

      {schedStatus && <div style={{ fontSize:11, color:statusTone(schedStatus, linesRows.length > 0), marginBottom:showLines && linesRows.length ? 12 : 0 }}>{schedStatus}</div>}

      {showLines && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {enrichedRows.map(({ row, analysis }, idx) => {
            const sim = row.simResult
            const homeStats = liveStats[row.game.homeAbbr] ? { ...TEAMS[row.game.homeAbbr], ...liveStats[row.game.homeAbbr] } : TEAMS[row.game.homeAbbr]
            const awayStats = liveStats[row.game.awayAbbr] ? { ...TEAMS[row.game.awayAbbr], ...liveStats[row.game.awayAbbr] } : TEAMS[row.game.awayAbbr]
            const isExpanded = expandedIdx === idx
            const isContextEditing = contextEditingIdx === idx
            const sharpStatus = sharpStatusTone(row)
            const hasManualOverride = !!(row.espnOdds && row.editedOdds && !sameOdds(row.editedOdds, row.espnOdds))
            return (
              <div key={`${row.game.homeAbbr}-${row.game.awayAbbr}-${idx}`} style={{ background:"#0a0600", border:"1px solid #1f1400", borderRadius:8, overflow:"hidden" }}>
                <div style={{ padding:"12px 14px", display:"grid", gridTemplateColumns:"1.5fr 1.6fr auto auto", gap:10, alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:9, color:"#7a6a3a", marginBottom:4 }}>
                      {row.editedOdds
                        ? `${row.game.gameTime} · ${hasManualOverride ? "Edited, Using Manual Line" : "Vegas Line"}`
                        : row.game.gameTime}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}><div style={{ fontSize:18, color:"#e8d5a0", fontWeight:700, fontFamily:"'Oswald',monospace" }}>{row.game.awayAbbr} at {row.game.homeAbbr}</div>{row.editedOdds?.source === "manual" && (<div style={{ fontSize:8, color:"#dbeafe", border:"1px solid rgba(96,165,250,0.28)", background:"rgba(96,165,250,0.08)", borderRadius:999, padding:"2px 7px", letterSpacing:1.4, fontWeight:700, lineHeight:1.2 }}>EDITED</div>)}</div>
                    <div style={{ fontSize:10, color:"#6a5a3a", marginTop:2 }}>
                      {sim ? `Proj ${sim.hScore}-${sim.aScore} · Total ${sim.total} · ${row.game.homeAbbr} ${(sim.hWinProb * 100).toFixed(1)}% / ${row.game.awayAbbr} ${(sim.aWinProb * 100).toFixed(1)}%` : "Run the model to generate projections"}
                    </div>
                    <div style={{ fontSize:9, color:"#8a7a4a", marginTop:4, lineHeight:1.45 }}>
                      {hasManualOverride ? (
                        <>
                          <div style={{ color:"#6a5a3a" }}>
                            {`V - ${formatCompactHeaderOddsSummary(row, row.espnOdds)}`}
                          </div>
                          <div style={{ color:"#93c5fd" }}>
                            {`M - ${formatCompactHeaderOddsSummary(row, row.editedOdds)}`}
                          </div>
                        </>
                      ) : row.editedOdds ? (
                        <div style={{ color:"#8a7a4a" }}>
                          {formatCompactHeaderOddsSummary(row, row.editedOdds)}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginTop:4 }}>
                      <div style={{ fontSize:8, color:sharpStatus.color, border:`1px solid ${sharpStatus.border}`, background:sharpStatus.background, borderRadius:999, padding:"2px 7px", letterSpacing:1.2, fontWeight:700, lineHeight:1.2 }}>
                        {sharpStatusLabel(row)}
                      </div>
                      <div style={{ fontSize:8, color:"#5a6a8a" }}>
                        {row.sharpInput?.source
                          ? `Sharp source: ${row.sharpInput.source}${row.sharpInput.lastUpdated ? ` | ${freshness(row.sharpInput.lastUpdated)}` : ""}`
                          : row.marketData?.sourceLabel
                            ? `Market source ready: ${row.marketData.sourceLabel}${row.marketData.lastUpdated ? ` | ${freshness(row.marketData.lastUpdated)}` : ""}`
                            : "No live sharp source attached"}
                      </div>
                    </div>
                  </div>
                  <div style={{ background:"rgba(255,200,80,0.04)", border:"1px solid rgba(255,200,80,0.12)", borderRadius:6, padding:"8px 10px" }}>
                    <div style={{ fontSize:8, color:"#5a4a2a", marginBottom:4 }}>SIM BREAKDOWN</div>
                    {sim && analysis ? (
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:8 }}>
                        <div>
                          <div style={{ fontSize:8, color:"#5a4a2a" }}>ML</div>
                          <div style={{ fontSize:10, color:analysis.mlValueSide !== "none" ? "#3fb950" : "#6a5a3a", fontWeight:700 }}>
                            {analysis.mlValueSide !== "none" ? `${analysis.mlValueSide.toUpperCase()} +${analysis.mlValuePct.toFixed(1)}%` : "PASS"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize:8, color:"#5a4a2a" }}>SPR</div>
                          <div style={{ fontSize:10, color:analysis.spreadRec !== "pass" ? "#3fb950" : "#6a5a3a", fontWeight:700 }}>
                            {analysis.spreadRec !== "pass" ? `${analysis.spreadRec.toUpperCase()} +${analysis.spreadEdge.toFixed(1)}%` : "PASS"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize:8, color:"#5a4a2a" }}>OU</div>
                          <div style={{ fontSize:10, color:analysis.ouRec !== "pass" ? "#3fb950" : "#6a5a3a", fontWeight:700 }}>
                            {analysis.ouRec !== "pass" ? `${analysis.ouRec.toUpperCase()} +${analysis.ouEdgePct.toFixed(1)}%` : "PASS"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize:10, color:"#6a5a3a" }}>Run sim to see model edges on this card.</div>
                    )}
                  </div>
                  <button onClick={() => setLinesRows((prev) => prev.map((currentRow, rowIndex) => {
                    if (rowIndex !== idx) return currentRow
                    const nextSim = predictGame({ homeTeam:currentRow.game.homeAbbr, awayTeam:currentRow.game.awayAbbr, gameType:"Regular Season", homeB2B:currentRow.homeB2B, awayB2B:currentRow.awayB2B, liveStats })
                    const nextAnalysis = currentRow.editedOdds && currentRow.editedOdds.homeMoneyline !== 0 ? analyzeBetting(nextSim, currentRow.editedOdds) : null
                    return createCompositeFromSim(currentRow, nextSim, nextAnalysis)
                  }))} style={{ background:sim ? "rgba(63,185,80,0.08)" : "rgba(251,191,36,0.08)", border:`1px solid ${sim ? "#3fb95040" : "#fbbf2440"}`, borderRadius:4, padding:"7px 10px", color:sim ? "#3fb950" : "#fbbf24", fontSize:9, fontWeight:700, fontFamily:"monospace", cursor:"pointer" }}>{sim ? "RERUN" : "RUN"}</button>
                  <button onClick={() => setExpandedIdx(isExpanded ? null : idx)} style={{ background:"transparent", border:"1px solid rgba(255,200,80,0.15)", borderRadius:4, padding:"7px 10px", color:"#e8d5a0", fontSize:9, fontWeight:700, fontFamily:"monospace", cursor:"pointer" }}>{isExpanded ? "CLOSE" : "OPEN CARD"}</button>
                </div>

                {isExpanded && (
                  <div style={{ padding:"0 14px 14px", borderTop:"1px solid #1a1000", display:"flex", flexDirection:"column", gap:10 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"max-content minmax(220px,1fr)", gap:10, marginTop:12, alignItems:"stretch" }}>
                      <div style={{ background:"linear-gradient(180deg,rgba(255,200,80,0.06),rgba(15,8,0,0.96))", border:"1px solid rgba(255,200,80,0.16)", borderRadius:6, padding:"10px 10px 8px", boxShadow:"inset 0 0 0 1px rgba(255,200,80,0.04)", width:"fit-content", height:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-start" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:6 }}>
                          <div style={{ fontSize:9, fontWeight:700, color:"#f8e7b4", letterSpacing:1.5 }}>MODEL & MARKET</div>
                          <button onClick={() => { if (editingIdx === idx) setEditingIdx(null); else startEdit(idx); }} style={{ background:editingIdx === idx ? "rgba(251,191,36,0.15)" : "rgba(255,200,80,0.06)", border:`1px solid ${editingIdx === idx ? "rgba(251,191,36,0.4)" : "rgba(255,200,80,0.15)"}`, borderRadius:4, padding:"5px 8px", color:editingIdx === idx ? "#fbbf24" : "#9a8a5a", fontSize:8, fontWeight:700, fontFamily:"monospace", cursor:"pointer", whiteSpace:"nowrap" }}>
                            {editingIdx === idx ? "CLOSE ODDS" : "EDIT ODDS"}
                          </button>
                        </div>
                        {row.editedOdds ? (
                          <>
                            <div style={{ display:"grid", gridTemplateColumns:"46px 1fr", gap:6, alignItems:"start", marginBottom:6 }}>
                              <div style={{ display:"flex", flexDirection:"column", gap:6, paddingTop:0 }}>
                                {row.espnOdds && (
                                  <div style={{ fontSize:8, color:"#e8d5a0", letterSpacing:1.5, lineHeight:"24px" }}>
                                    VEGAS
                                  </div>
                                )}
                                {row.editedOdds.source === "manual" && (
                                  <div style={{ fontSize:8, color:"#dbeafe", letterSpacing:1.5, lineHeight:"24px", marginTop:"5px" }}>
                                    MANUAL
                                  </div>
                                )}
                                {!row.espnOdds && row.editedOdds.source !== "manual" && (
                                  <div style={{ fontSize:8, color:"#5a4a2a", letterSpacing:1.5, lineHeight:"24px" }}>
                                    {row.editedOdds.source.toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                                {row.espnOdds && (
                                  <div style={{ display:"grid", gridTemplateColumns:"max-content max-content", gap:6, justifyContent:"start", alignItems:"start" }}>
                                    <div style={{ background:"rgba(255,200,80,0.04)", borderRadius:4, padding:"1px 6px", minWidth:"282px" }}>
                                      <div style={{ fontSize:8, color:"#e8d5a0", fontWeight:700, whiteSpace:"nowrap", lineHeight:"24px", letterSpacing:1.5 }}>
                                        {row.game.awayAbbr} {formatSignedOdds(row.espnOdds.awayMoneyline)} | O {row.espnOdds.overUnder} ({formatSignedOdds(row.espnOdds.overOdds)}) | {formatSpreadLabel(row.game.awayAbbr, awaySpreadFromHomeSpread(row.espnOdds.spread), row.espnOdds.spreadAwayOdds)}
                                      </div>
                                    </div>
                                    <div style={{ background:"rgba(255,200,80,0.04)", borderRadius:4, padding:"1px 6px", minWidth:"282px" }}>
                                      <div style={{ fontSize:8, color:"#e8d5a0", fontWeight:700, whiteSpace:"nowrap", lineHeight:"24px", letterSpacing:1.5 }}>
                                        {row.game.homeAbbr} {formatSignedOdds(row.espnOdds.homeMoneyline)} | U {row.espnOdds.overUnder} ({formatSignedOdds(row.espnOdds.underOdds)}) | {formatSpreadLabel(row.game.homeAbbr, row.espnOdds.spread, row.espnOdds.spreadHomeOdds)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {row.editedOdds.source === "manual" && (
                                  <div style={{ display:"grid", gridTemplateColumns:"max-content max-content", gap:6, justifyContent:"start", alignItems:"start" }}>
                                    <div style={{ background:"rgba(96,165,250,0.06)", borderRadius:4, padding:"1px 6px", border:"1px solid rgba(96,165,250,0.14)", minWidth:"282px" }}>
                                      <div style={{ fontSize:8, color:"#dbeafe", fontWeight:700, whiteSpace:"nowrap", lineHeight:"24px", letterSpacing:1.5 }}>
                                        {row.game.awayAbbr} {formatSignedOdds(row.editedOdds.awayMoneyline)} | O {row.editedOdds.overUnder} ({formatSignedOdds(row.editedOdds.overOdds)}) | {formatSpreadLabel(row.game.awayAbbr, awaySpreadFromHomeSpread(row.editedOdds.spread), row.editedOdds.spreadAwayOdds)}
                                      </div>
                                    </div>
                                    <div style={{ background:"rgba(96,165,250,0.06)", borderRadius:4, padding:"1px 6px", border:"1px solid rgba(96,165,250,0.14)", minWidth:"282px" }}>
                                      <div style={{ fontSize:8, color:"#dbeafe", fontWeight:700, whiteSpace:"nowrap", lineHeight:"24px", letterSpacing:1.5 }}>
                                        {row.game.homeAbbr} {formatSignedOdds(row.editedOdds.homeMoneyline)} | U {row.editedOdds.overUnder} ({formatSignedOdds(row.editedOdds.underOdds)}) | {formatSpreadLabel(row.game.homeAbbr, row.editedOdds.spread, row.editedOdds.spreadHomeOdds)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize:9, color:"#7a6a3a", marginBottom:8 }}>No odds yet</div>
                        )}
                        <div style={{ fontSize:12, color:"#f8e7b4", fontWeight:700, textAlign:"center", marginTop:10 }}>
                          {sim ? `PROJECTION: ${row.game.homeAbbr} ${sim.hScore} - ${row.game.awayAbbr} ${sim.aScore} | Total ${sim.total}` : "No simulation yet"}
                        </div>
                        <div style={{ fontSize:9, color:"#dbeafe", marginTop:4, textAlign:"center" }}>
                          {sim && analysis
                            ? (
                              <>
                                {`ML Win pct ${row.game.homeAbbr} ${(sim.hWinProb * 100).toFixed(1)}% / ${row.game.awayAbbr} ${(sim.aWinProb * 100).toFixed(1)}% · `}
                                <span style={{ color:edgeTone(analysis.mlValuePct, analysis.mlValueSide === "none"), fontWeight:700 }}>
                                  {analysis.mlValueSide !== "none" ? `Edge ${mlEdgeLabel(row, analysis)}` : "Edge PASS - PASS"}
                                </span>
                              </>
                            )
                            : sim
                              ? `ML Win pct ${row.game.homeAbbr} ${(sim.hWinProb * 100).toFixed(1)}% / ${row.game.awayAbbr} ${(sim.aWinProb * 100).toFixed(1)}%`
                              : ""}
                        </div>
                        <div style={{ fontSize:9, color:"#dbeafe", marginTop:4, textAlign:"center" }}>
                          {row.editedOdds && sim && analysis
                            ? (
                              <>
                                {`Over / Under ${row.editedOdds.overUnder} vs Proj ${sim.total} · `}
                                <span style={{ color:edgeTone(analysis.ouEdgePct, analysis.ouRec === "pass"), fontWeight:700 }}>
                                  {analysis.ouRec !== "pass" ? `Edge ${ouEdgeLabel(analysis)}` : "Edge PASS - PASS"}
                                </span>
                              </>
                            )
                            : row.editedOdds && sim
                              ? `Over / Under ${row.editedOdds.overUnder} vs Proj ${sim.total}`
                              : ""}
                        </div>
                        <div style={{ fontSize:9, color:"#dbeafe", marginTop:4, textAlign:"center" }}>
                          {row.editedOdds && analysis
                            ? (
                              <>
                                {`Spread ${row.editedOdds.spread > 0 ? "+" : ""}${row.editedOdds.spread} · `}
                                <span style={{ color:edgeTone(analysis.spreadEdge, analysis.spreadRec === "pass"), fontWeight:700 }}>
                                  {analysis.spreadRec !== "pass" ? `Spread Edge ${spreadEdgeLabel(row, analysis)}` : "Spread Edge PASS - PASS"}
                                </span>
                              </>
                            )
                            : sim
                              ? `Fair ML ${mlAmerican(sim.hWinProb)} / ${mlAmerican(sim.aWinProb)}`
                              : ""}
                        </div>
                      </div>
                      <div style={{ background:"linear-gradient(180deg,rgba(255,200,80,0.06),rgba(15,8,0,0.96))", border:"1px solid rgba(255,200,80,0.16)", borderRadius:6, padding:"10px 10px 8px", boxShadow:"inset 0 0 0 1px rgba(255,200,80,0.04)", height:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-start" }}>
                        <div style={{ fontSize:9, fontWeight:700, color:"#f8e7b4", marginBottom:8, letterSpacing:1.5 }}>TEAM COMPARISON</div>
                        <div style={{ fontSize:9, marginTop:2 }}>
                          <span style={{ color:"#93c5fd" }} title={TEAM_CONTEXT_HELP.netRtg}>Net RTG per 100:</span>
                          <span style={{ color:"#e8d5a0" }}> {row.game.homeAbbr} {(homeStats.netRtg >= 0 ? "+" : "") + homeStats.netRtg.toFixed(1)} / {row.game.awayAbbr} {(awayStats.netRtg >= 0 ? "+" : "") + awayStats.netRtg.toFixed(1)}  Edge: {(homeStats.netRtg - awayStats.netRtg) >= 0 ? row.game.homeAbbr : row.game.awayAbbr} {(homeStats.netRtg - awayStats.netRtg) >= 0 ? "+" : ""}{(homeStats.netRtg - awayStats.netRtg).toFixed(1)}</span>
                        </div>
                        <div style={{ fontSize:9, marginTop:5 }}>
                          <span style={{ color:"#93c5fd" }} title={TEAM_CONTEXT_HELP.pace}>Pace:</span>
                          <span style={{ color:"#e8d5a0" }}> {homeStats.pace.toFixed(1)} / {awayStats.pace.toFixed(1)}</span>
                        </div>
                        <div style={{ fontSize:9, marginTop:5 }}>
                          <span style={{ color:"#93c5fd" }} title={TEAM_CONTEXT_HELP.efg}>eFG:</span>
                          <span style={{ color:"#e8d5a0" }}> {homeStats.efgPct.toFixed(1)}% / {awayStats.efgPct.toFixed(1)}%</span>
                        </div>
                        <div style={{ fontSize:9, marginTop:5 }}>
                          <span style={{ color:"#93c5fd" }} title={TEAM_CONTEXT_HELP.tov}>TOV:</span>
                          <span style={{ color:"#e8d5a0" }}> {homeStats.tovPct.toFixed(1)}% / {awayStats.tovPct.toFixed(1)}%</span>
                        </div>
                        <div style={{ fontSize:9, marginTop:5 }}>
                          <span style={{ color:"#93c5fd" }} title={TEAM_CONTEXT_HELP.orb}>ORB%:</span>
                          <span style={{ color:"#e8d5a0" }}> {homeStats.rebPct.toFixed(1)} / {awayStats.rebPct.toFixed(1)}</span>
                        </div>
                        <div style={{ fontSize:9, marginTop:5 }}>
                          <span style={{ color:"#93c5fd" }} title={TEAM_CONTEXT_HELP.threePar}>3PAr:</span>
                          <span style={{ color:"#e8d5a0" }}> {homeStats.threePAr.toFixed(3)} / {awayStats.threePAr.toFixed(3)}</span>
                        </div>
                        <div style={{ fontSize:9, marginTop:5 }}>
                          <span style={{ color:"#93c5fd" }} title={TEAM_CONTEXT_HELP.ast}>AST%:</span>
                          <span style={{ color:"#e8d5a0" }}> {homeStats.astPct.toFixed(1)} / {awayStats.astPct.toFixed(1)}</span>
                        </div>
                        <div style={{ fontSize:9, marginTop:5 }}>
                          <span style={{ color:"#93c5fd" }} title={TEAM_CONTEXT_HELP.b2b}>B2B:</span>
                          <span style={{ color:"#e8d5a0" }}> {row.homeB2B ? row.game.homeAbbr : "rest"} / {row.awayB2B ? row.game.awayAbbr : "rest"}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ background:"linear-gradient(180deg,rgba(255,200,80,0.06),rgba(15,8,0,0.96))", border:"1px solid rgba(255,200,80,0.16)", borderRadius:6, padding:12, marginTop:12, boxShadow:"inset 0 0 0 1px rgba(255,200,80,0.04)" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:8 }}>
                        <div style={{ fontSize:9, fontWeight:700, color:"#f8e7b4", letterSpacing:1.5 }}>SHARP INFORMATION</div>
                        <button onClick={() => { if (isContextEditing) setContextEditingIdx(null); else { setContextFields(toContext(row)); setContextEditingIdx(idx); } }} style={{ background:isContextEditing ? "rgba(96,165,250,0.16)" : "rgba(96,165,250,0.05)", border:`1px solid ${isContextEditing ? "rgba(96,165,250,0.35)" : "rgba(96,165,250,0.2)"}`, borderRadius:4, padding:"5px 8px", color:isContextEditing ? "#fbbf24" : "#9a8a5a", fontSize:8, fontWeight:700, fontFamily:"monospace", cursor:"pointer", whiteSpace:"nowrap" }}>
                          {isContextEditing ? "CLOSE CONTEXT" : "EDIT SHARP / INJURIES"}
                        </button>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"minmax(320px,1.1fr) minmax(300px,1fr)", gap:12, alignItems:"start" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                              <div style={{ fontSize:8, color:"#f8e7b4", fontWeight:700 }}>RECENT FORM</div>
                              <div style={{ fontSize:8, color:freshnessColor(row.recentForm.home?.lastUpdated ?? row.recentForm.away?.lastUpdated), fontStyle:"italic" }}>
                                {freshness(row.recentForm.home?.lastUpdated ?? row.recentForm.away?.lastUpdated)}
                              </div>
                            </div>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:6 }}>
                              <div>
                                <div style={{ fontSize:9, color:"#e8d5a0", fontWeight:700, marginBottom:4 }}>
                                  {row.recentForm.home ? `${row.recentForm.home.team} ${row.recentForm.home.wins}-${row.recentForm.home.losses}` : "No form"}
                                </div>
                                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                  {(row.recentForm.home?.games.slice(0, 5) ?? []).map((game, gameIndex) => (
                                    <div key={`${row.recentForm.home?.team ?? "home"}-${game.date}-${gameIndex}`} style={{ fontSize:8, color:game.result === "W" ? "#3fb950" : "#f87171" }}>
                                      {shortDate(game.date)} {game.result} {game.venue} {game.opponent} {game.pointsFor}-{game.pointsAgainst}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize:9, color:"#dbeafe", fontWeight:700, marginBottom:4 }}>
                                  {row.recentForm.away ? `${row.recentForm.away.team} ${row.recentForm.away.wins}-${row.recentForm.away.losses}` : "No form"}
                                </div>
                                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                  {(row.recentForm.away?.games.slice(0, 5) ?? []).map((game, gameIndex) => (
                                    <div key={`${row.recentForm.away?.team ?? "away"}-${game.date}-${gameIndex}`} style={{ fontSize:8, color:game.result === "W" ? "#3fb950" : "#f87171" }}>
                                      {shortDate(game.date)} {game.result} {game.venue} {game.opponent} {game.pointsFor}-{game.pointsAgainst}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                              <div style={{ fontSize:8, color:"#f8e7b4", fontWeight:700 }} title="Market-based betting context: line moves, split discrepancies, lean flags, consensus, and source freshness.">MARKET SIGNALS</div>
                              <div style={{ fontSize:8, color:freshnessColor(row.sharpContext?.lastUpdated), fontStyle:"italic" }}>
                                {freshness(row.sharpContext?.lastUpdated)}
                              </div>
                            </div>
                            {row.sharpContext ? (
                              <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:6 }}>
                                <div style={{ fontSize:8, color:"#bfdbfe", fontWeight:700, letterSpacing:0.6 }} title="Quick read of which side or total has the strongest combined market support from movement, splits, and lean flags.">
                                  {inferMarketRead(row)}
                                </div>
                                <div style={{ background:"rgba(96,165,250,0.04)", border:"1px solid rgba(96,165,250,0.14)", borderRadius:6, padding:"7px 8px" }}>
                                  <div style={{ fontSize:7, color:"#93c5fd", letterSpacing:1.2, marginBottom:6 }} title="Weighted snapshot of which side or total currently has the strongest sharp-style support.">SHARP SUPPORT BOARD</div>
                                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:6 }}>
                                    {buildMarketSignalScores(row).map((signal) => (
                                      <div
                                        key={signal.key}
                                        style={{
                                          background:supportBackground(signal.score),
                                          border:`1px solid ${supportBorder(signal.score)}`,
                                          borderRadius:6,
                                          padding:"7px 8px",
                                        }}
                                      >
                                        <div style={{ fontSize:7, color:"#7a6a3a", letterSpacing:1.1, marginBottom:4 }}>{signal.label}</div>
                                        <div style={{ fontSize:12, color:supportTone(signal.score), fontWeight:700, marginBottom:3 }}>
                                          {signal.score}/6
                                        </div>
                                        <div style={{ fontSize:8, color:"#dbeafe", lineHeight:1.4 }}>
                                          {signal.evidence > 0 ? `${signal.evidence} supporting flags` : "No support yet"}
                                        </div>
                                        <div style={{ fontSize:7, color:modelAgreementLabel(signal, row, analysis).startsWith("Model agrees") ? "#3fb950" : modelAgreementLabel(signal, row, analysis).startsWith("Model differs") ? "#fbbf24" : "#7a6a3a", marginTop:4, lineHeight:1.4 }}>
                                          {modelAgreementLabel(signal, row, analysis)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div style={{ background:"rgba(255,200,80,0.04)", border:"1px solid rgba(255,200,80,0.1)", borderRadius:6, padding:"7px 8px" }}>
                                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:6 }}>
                                    <div style={{ fontSize:7, color:"#7a6a3a", letterSpacing:1.2 }} title="Opening, manual, and current Vegas market references for this matchup.">LINE MOVES</div>
                                    <div style={{ fontSize:7, color:"#c9b27a", letterSpacing:1.2 }} title="The provider or origin for the current market-signals dataset.">
                                      Source: {row.sharpContext.source || "Manual"}
                                    </div>
                                  </div>
                                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:8 }}>
                                    <div style={{ background:"rgba(255,200,80,0.03)", border:"1px solid rgba(255,200,80,0.08)", borderRadius:6, padding:"7px 8px" }}>
                                      <div style={{ fontSize:8, color:"#f8e7b4", marginBottom:4 }} title="Opening line snapshot used for line-move calculations.">Vegas Open</div>
                                      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                        <div style={{ fontSize:8, color:"#e8d5a0" }} title="Opening moneyline snapshot used for line-move calculations.">
                                          ML: {row.sharpInput?.openingHomeMoneyline != null && row.sharpInput?.openingAwayMoneyline != null ? formatMoneylinePair(row.game.homeAbbr, row.game.awayAbbr, row.sharpInput.openingHomeMoneyline, row.sharpInput.openingAwayMoneyline) : "N/A"}
                                        </div>
                                        <div style={{ fontSize:8, color:"#e8d5a0" }} title="Opening spread snapshot used for line-move calculations.">
                                          Spread: {row.sharpInput?.openingSpread != null ? formatSpreadPair(row.game.homeAbbr, row.game.awayAbbr, row.sharpInput.openingSpread) : "N/A"}
                                        </div>
                                        <div style={{ fontSize:8, color:"#e8d5a0" }} title="Opening total snapshot used for line-move calculations.">
                                          Total: {row.sharpInput?.openingTotal != null ? formatTotalLabel(row.sharpInput.openingTotal) : "N/A"}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ background:"rgba(96,165,250,0.05)", border:"1px solid rgba(96,165,250,0.16)", borderRadius:6, padding:"7px 8px" }}>
                                      <div style={{ fontSize:8, color:"#bfdbfe", marginBottom:4 }} title="The currently active manual or imported line driving analysis on this card.">Manual Current</div>
                                      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                        <div style={{ fontSize:8, color:"#dbeafe" }} title="Active analysis moneyline snapshot.">
                                          ML: {row.editedOdds ? formatMoneylinePair(row.game.homeAbbr, row.game.awayAbbr, row.editedOdds.homeMoneyline, row.editedOdds.awayMoneyline) : "N/A"}
                                        </div>
                                        <div style={{ fontSize:8, color:"#dbeafe" }} title="Active analysis spread snapshot.">
                                          Spread: {row.editedOdds ? formatSpreadPair(row.game.homeAbbr, row.game.awayAbbr, row.editedOdds.spread) : "N/A"}
                                        </div>
                                        <div style={{ fontSize:8, color:"#dbeafe" }} title="Active analysis total snapshot.">
                                          Total: {row.editedOdds ? formatTotalLabel(row.editedOdds.overUnder) : "N/A"}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ background:"rgba(255,200,80,0.03)", border:"1px solid rgba(255,200,80,0.08)", borderRadius:6, padding:"7px 8px" }}>
                                      <div style={{ fontSize:8, color:"#f8e7b4", marginBottom:4 }} title="The current non-manual market line on the card, typically the ESPN/Vegas line.">Vegas Current</div>
                                      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                        <div style={{ fontSize:8, color:"#e8d5a0" }} title="Current market moneyline snapshot.">
                                          ML: {row.espnOdds ? formatMoneylinePair(row.game.homeAbbr, row.game.awayAbbr, row.espnOdds.homeMoneyline, row.espnOdds.awayMoneyline) : "N/A"}
                                        </div>
                                        <div style={{ fontSize:8, color:"#e8d5a0" }} title="Current market spread snapshot.">
                                          Spread: {row.espnOdds ? formatSpreadPair(row.game.homeAbbr, row.game.awayAbbr, row.espnOdds.spread) : "N/A"}
                                        </div>
                                        <div style={{ fontSize:8, color:"#e8d5a0" }} title="Current market total snapshot.">
                                          Total: {row.espnOdds ? formatTotalLabel(row.espnOdds.overUnder) : "N/A"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:8, alignItems:"start" }}>
                                  <div style={{ background:"rgba(96,165,250,0.04)", border:"1px solid rgba(96,165,250,0.12)", borderRadius:6, padding:"7px 8px" }}>
                                    <div style={{ fontSize:7, color:"#bfdbfe", letterSpacing:1.2, marginBottom:4 }} title="Numerical movement from the opening number to the active current line used in the Sharp calculation.">MOVE SUMMARY</div>
                                    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                      <div style={{ fontSize:8, color:"#dbeafe" }} title="Change in the home moneyline's implied probability versus the opener. Positive means the market is pricing the home team more strongly now.">Home ML: {row.sharpContext.homeMoneylineMove != null ? `${formatSignedNumber(row.sharpContext.homeMoneylineMove * 100)} pts` : "N/A"}</div>
                                      <div style={{ fontSize:8, color:"#dbeafe" }} title="Difference between the current spread and the opening spread. Negative means movement toward the home side.">Spread: {row.sharpContext.spreadMove != null ? formatSignedNumber(row.sharpContext.spreadMove) : "N/A"}</div>
                                      <div style={{ fontSize:8, color:"#dbeafe" }} title="Difference between the current total and the opening total. Positive means the market moved upward toward the over.">Total: {row.sharpContext.totalMove != null ? formatSignedNumber(row.sharpContext.totalMove) : "N/A"}</div>
                                    </div>
                                  </div>
                                  <div style={{ background:"rgba(96,165,250,0.04)", border:"1px solid rgba(96,165,250,0.12)", borderRadius:6, padding:"7px 8px" }}>
                                    <div style={{ fontSize:7, color:"#5a6a8a", letterSpacing:1.2, marginBottom:4 }} title="Money minus bets percentage gaps. A positive gap means more money than tickets on that side, which can hint at sharper participation.">SPLITS</div>
                                    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                      <div style={{ fontSize:8, color:"#dbeafe" }} title="Home moneyline money percentage minus home moneyline bet percentage.">ML gap: {formatPercentGap(row.sharpContext.moneylineHomeSplitGap) ?? "N/A"}</div>
                                      <div style={{ fontSize:8, color:"#dbeafe" }} title="Home spread money percentage minus home spread bet percentage.">Spread gap: {formatPercentGap(row.sharpContext.spreadHomeSplitGap) ?? "N/A"}</div>
                                      <div style={{ fontSize:8, color:"#dbeafe" }} title="Over money percentage minus over bet percentage.">Total gap: {formatPercentGap(row.sharpContext.totalOverSplitGap) ?? "N/A"}</div>
                                    </div>
                                  </div>
                                  <div style={{ background:"rgba(63,185,80,0.05)", border:"1px solid rgba(63,185,80,0.16)", borderRadius:6, padding:"7px 8px" }}>
                                    <div style={{ fontSize:7, color:"#6a5a3a", letterSpacing:1.2, marginBottom:4 }} title="Directional flags from external sharp-style reads such as CLV, steam, or reverse-line movement.">LEAN FLAGS</div>
                                    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                      <div style={{ fontSize:8, color:"#e8d5a0" }} title="Closing-line-value lean. Supports one or more comma-separated values like HOME or HOME, UNDER.">CLV: {formatLeanValue(row.sharpInput?.clvLean)}</div>
                                      <div style={{ fontSize:8, color:"#e8d5a0" }} title="Steam-move lean. Supports one or more comma-separated values like OVER or AWAY, UNDER.">Steam: {formatLeanValue(row.sharpInput?.steamMoveLean)}</div>
                                      <div style={{ fontSize:8, color:"#e8d5a0" }} title="Reverse-line-move lean. Supports one or more comma-separated values like HOME or HOME, UNDER.">RLM: {formatLeanValue(row.sharpInput?.reverseLineMoveLean)}</div>
                                    </div>
                                  </div>
                                  <div style={{ background:"rgba(255,200,80,0.04)", border:"1px solid rgba(255,200,80,0.1)", borderRadius:6, padding:"7px 8px" }}>
                                    <div style={{ fontSize:7, color:"#7a6a3a", letterSpacing:1.2, marginBottom:4 }} title="Normalized consensus-style market lean for each market.">CONSENSUS</div>
                                    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                      <div style={{ fontSize:8, color:"#e8d5a0" }} title="Consensus moneyline side.">ML: {sharpSideLabel(row.sharpInput?.consensusMoneyline, row)}</div>
                                      <div style={{ fontSize:8, color:"#e8d5a0" }} title="Consensus spread side.">Spread: {sharpSideLabel(row.sharpInput?.consensusSpread, row)}</div>
                                      <div style={{ fontSize:8, color:"#e8d5a0" }} title="Consensus total side.">Total: {sharpTotalLabel(row.sharpInput?.consensusTotal)}</div>
                                    </div>
                                  </div>
                                </div>
                                <div style={{ background:"rgba(255,200,80,0.04)", border:"1px solid rgba(255,200,80,0.1)", borderRadius:6, padding:"7px 8px" }}>
                                  <div style={{ fontSize:7, color:"#7a6a3a", letterSpacing:1.2, marginBottom:6 }} title="Compact summary of the sharp-style market signals currently detected for this game.">SIGNAL SUMMARY</div>
                                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                                    {row.sharpContext.tags.length ? row.sharpContext.tags.map((tag, tagIndex) => (
                                      <div key={`${tag.label}-${tagIndex}`} title={`${tag.label}: ${tag.aligned ? "supports the inferred sharp read" : "is mixed or cautionary"}.`} style={{ fontSize:8, color:sharpTone(tag.aligned), border:`1px solid ${tag.aligned ? "rgba(63,185,80,0.25)" : "rgba(245,158,11,0.25)"}`, background:tag.aligned ? "rgba(63,185,80,0.08)" : "rgba(245,158,11,0.08)", borderRadius:999, padding:"3px 7px" }}>
                                        {tag.detail}
                                      </div>
                                    )) : (
                                      <div style={{ fontSize:8, color:"#7a6a3a" }}>No sharp flags yet</div>
                                    )}
                                  </div>
                                </div>
                                {row.sharpInput?.notes ? <div style={{ fontSize:8, color:"#c9b27a", lineHeight:1.5 }} title="Freeform market-signals notes or context.">{row.sharpInput.notes}</div> : null}
                              </div>
                            ) : (
                              <div style={{ fontSize:9, color:"#7a6a3a" }}>No sharp data loaded</div>
                            )}
                          </div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                              <div style={{ fontSize:8, color:"#f8e7b4", fontWeight:700 }}>PROJECTED STARTERS</div>
                              <div style={{ fontSize:8, color:freshnessColor(row.projectedStarters.home?.lastUpdated ?? row.projectedStarters.away?.lastUpdated), fontStyle:"italic" }}>
                                {freshness(row.projectedStarters.home?.lastUpdated ?? row.projectedStarters.away?.lastUpdated)}
                              </div>
                            </div>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:6 }}>
                              <div>
                                <div style={{ fontSize:9, color:"#e8d5a0", fontWeight:700, marginBottom:4 }}>{row.game.homeAbbr}</div>
                                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                  {row.projectedStarters.home?.starters?.length ? (
                                    row.projectedStarters.home.starters.map((starter) => {
                                      const injuryTag = starterInjuryTag(starter.player, row.game.homeAbbr, row.injuries)
                                      const statLine = formatStarterStats(starter)
                                      return (
                                      <div key={`${row.game.homeAbbr}-${starter.position}-${starter.player}`} style={{ fontSize:8, color:"#e8d5a0" }}>
                                        {starter.position}: {starter.player}{statLine ? <span style={{ color:"#c9b27a" }}> - {statLine}</span> : null}{injuryTag ? <span style={{ color:"#f87171" }}> - {injuryTag}</span> : null}
                                      </div>
                                      )
                                    })
                                  ) : (
                                    <div style={{ fontSize:8, color:"#7a6a3a" }}>No projected starters</div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize:9, color:"#dbeafe", fontWeight:700, marginBottom:4 }}>{row.game.awayAbbr}</div>
                                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                  {row.projectedStarters.away?.starters?.length ? (
                                    row.projectedStarters.away.starters.map((starter) => {
                                      const injuryTag = starterInjuryTag(starter.player, row.game.awayAbbr, row.injuries)
                                      const statLine = formatStarterStats(starter)
                                      return (
                                      <div key={`${row.game.awayAbbr}-${starter.position}-${starter.player}`} style={{ fontSize:8, color:"#dbeafe" }}>
                                        {starter.position}: {starter.player}{statLine ? <span style={{ color:"#93c5fd" }}> - {statLine}</span> : null}{injuryTag ? <span style={{ color:"#f87171" }}> - {injuryTag}</span> : null}
                                      </div>
                                      )
                                    })
                                  ) : (
                                    <div style={{ fontSize:8, color:"#5a6a8a" }}>No projected starters</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                              <div style={{ fontSize:8, color:"#f8e7b4", fontWeight:700 }}>INJURIES</div>
                              <div style={{ fontSize:8, color:freshnessColor(row.injuries[0]?.lastUpdated), fontStyle:"italic" }}>{freshness(row.injuries[0]?.lastUpdated)}</div>
                            </div>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:6 }}>
                              <div>
                                <div style={{ fontSize:9, color:"#e8d5a0", fontWeight:700, marginBottom:4 }}>{row.game.homeAbbr}</div>
                                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                  {row.injuries.filter((injury) => injury.team === row.game.homeAbbr).length ? (
                                    row.injuries
                                      .filter((injury) => injury.team === row.game.homeAbbr)
                                      .map((injury, injuryIndex) => (
                                        <div key={`${injury.team}-${injury.player}-${injuryIndex}`} style={{ fontSize:8, color:"#e8d5a0" }}>
                                          {injury.note}
                                        </div>
                                      ))
                                  ) : (
                                    <div style={{ fontSize:8, color:"#7a6a3a" }}>No listed injuries</div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize:9, color:"#dbeafe", fontWeight:700, marginBottom:4 }}>{row.game.awayAbbr}</div>
                                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                  {row.injuries.filter((injury) => injury.team === row.game.awayAbbr).length ? (
                                    row.injuries
                                      .filter((injury) => injury.team === row.game.awayAbbr)
                                      .map((injury, injuryIndex) => (
                                        <div key={`${injury.team}-${injury.player}-${injuryIndex}`} style={{ fontSize:8, color:"#dbeafe" }}>
                                          {injury.note}
                                        </div>
                                      ))
                                  ) : (
                                    <div style={{ fontSize:8, color:"#5a6a8a" }}>No listed injuries</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {editingIdx === idx && (
                      <div style={{ background:"#0c0600", border:"1px solid #1a1000", borderRadius:6, padding:10 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(110px,1fr))", gap:6, alignItems:"end" }}>
                          {EDIT_FIELDS.map(({ label, field }) => (
                            <div key={field}>
                              <div style={{ fontSize:9, color:"#5a4a2a", marginBottom:3 }}>{label}</div>
                              <input value={editFields[field] ?? ""} onChange={(e) => setEditFields((prev) => ({ ...prev, [field]: e.target.value }))} style={{ width:"100%", background:"#0d0800", border:"1px solid rgba(255,200,80,0.2)", borderRadius:3, color:"#e8d5a0", fontFamily:"monospace", fontSize:11, padding:"6px", boxSizing:"border-box", outline:"none" }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ display:"flex", gap:6, marginTop:8 }}>
                          <button onClick={() => saveEdit(idx)} style={{ background:"linear-gradient(135deg,#065f46,#047857)", border:"none", borderRadius:4, padding:"6px 14px", color:"#d1fae5", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>SAVE ODDS</button>
                          <button onClick={() => setEditingIdx(null)} style={{ background:"transparent", border:"1px solid rgba(255,200,80,0.12)", borderRadius:4, padding:"6px 14px", color:"#6a5a3a", fontSize:10, fontFamily:"monospace", cursor:"pointer" }}>CANCEL</button>
                        </div>
                      </div>
                    )}

                    {isContextEditing && (
                      <div style={{ background:"#0c0600", border:"1px solid #1a1000", borderRadius:6, padding:10 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(110px,1fr))", gap:6 }}>
                          {([
                            ["Open H ML", "openingHomeMoneyline"],
                            ["Open A ML", "openingAwayMoneyline"],
                            ["Open Spread", "openingSpread"],
                            ["Open Total", "openingTotal"],
                            ["ML H Bets%", "moneylineHomeBetsPct"],
                            ["ML H Money%", "moneylineHomeMoneyPct"],
                            ["Spr H Bets%", "spreadHomeBetsPct"],
                            ["Spr H Money%", "spreadHomeMoneyPct"],
                            ["Ovr Bets%", "totalOverBetsPct"],
                            ["Ovr Money%", "totalOverMoneyPct"],
                          ] as const).map(([label, key]) => (
                            <div key={key}>
                              <div style={{ fontSize:9, color:"#5a4a2a", marginBottom:3 }}>{label}</div>
                              <input value={contextFields[key as keyof ContextFields] as string} onChange={(e) => setContextFields((prev) => ({ ...prev, [key]: e.target.value }))} style={{ width:"100%", background:"#0d0800", border:"1px solid rgba(96,165,250,0.2)", borderRadius:3, color:"#e8d5a0", fontFamily:"monospace", fontSize:11, padding:"6px", boxSizing:"border-box", outline:"none" }} />
                            </div>
                          ))}
                          {([
                            ["CLV Lean", "clvLean"],
                            ["Steam Lean", "steamMoveLean"],
                            ["RLM Lean", "reverseLineMoveLean"],
                          ] as const).map(([label, key]) => (
                            <div key={key}>
                              <div style={{ fontSize:9, color:"#5a4a2a", marginBottom:3 }}>{label}</div>
                              <input value={String(contextFields[key as keyof ContextFields])} onChange={(e) => setContextFields((prev) => ({ ...prev, [key]: e.target.value }))} placeholder="home, under" style={{ width:"100%", background:"#0d0800", border:"1px solid rgba(96,165,250,0.2)", borderRadius:3, color:"#e8d5a0", fontFamily:"monospace", fontSize:11, padding:"6px", boxSizing:"border-box", outline:"none" }} />
                            </div>
                          ))}
                          {([
                            ["Consensus ML", "consensusMoneyline", ["none", "home", "away"]],
                            ["Consensus SPR", "consensusSpread", ["none", "home", "away"]],
                            ["Consensus O/U", "consensusTotal", ["none", "over", "under"]],
                          ] as const).map(([label, key, options]) => (
                            <div key={key}>
                              <div style={{ fontSize:9, color:"#5a4a2a", marginBottom:3 }}>{label}</div>
                              <select value={String(contextFields[key as keyof ContextFields])} onChange={(e) => setContextFields((prev) => ({ ...prev, [key]: e.target.value }))} style={{ width:"100%", background:"#0d0800", border:"1px solid rgba(96,165,250,0.2)", borderRadius:3, color:"#e8d5a0", fontFamily:"monospace", fontSize:11, padding:"6px", boxSizing:"border-box", outline:"none" }}>
                                {options.map((option) => <option key={option} value={option}>{option.toUpperCase()}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
                          <textarea value={contextFields.homeInjuries} onChange={(e) => setContextFields((prev) => ({ ...prev, homeInjuries: e.target.value }))} placeholder={`${row.game.homeAbbr} injury notes`} style={{ width:"100%", minHeight:84, background:"#0d0800", border:"1px solid rgba(255,200,80,0.2)", borderRadius:3, color:"#e8d5a0", fontFamily:"monospace", fontSize:11, padding:"6px", boxSizing:"border-box", outline:"none", resize:"vertical" }} />
                          <textarea value={contextFields.awayInjuries} onChange={(e) => setContextFields((prev) => ({ ...prev, awayInjuries: e.target.value }))} placeholder={`${row.game.awayAbbr} injury notes`} style={{ width:"100%", minHeight:84, background:"#0d0800", border:"1px solid rgba(255,200,80,0.2)", borderRadius:3, color:"#e8d5a0", fontFamily:"monospace", fontSize:11, padding:"6px", boxSizing:"border-box", outline:"none", resize:"vertical" }} />
                        </div>
                        <textarea value={contextFields.notes} onChange={(e) => setContextFields((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Sharp notes" style={{ width:"100%", minHeight:64, marginTop:8, background:"#0d0800", border:"1px solid rgba(96,165,250,0.2)", borderRadius:3, color:"#e8d5a0", fontFamily:"monospace", fontSize:11, padding:"6px", boxSizing:"border-box", outline:"none", resize:"vertical" }} />
                        <div style={{ display:"flex", gap:6, marginTop:8 }}>
                          <button onClick={() => saveContext(idx)} style={{ background:"linear-gradient(135deg,#1d4ed8,#2563eb)", border:"none", borderRadius:4, padding:"6px 14px", color:"#eff6ff", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>SAVE CONTEXT</button>
                          <button onClick={() => setContextEditingIdx(null)} style={{ background:"transparent", border:"1px solid rgba(96,165,250,0.2)", borderRadius:4, padding:"6px 14px", color:"#93c5fd", fontSize:10, fontFamily:"monospace", cursor:"pointer" }}>CANCEL</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {hasSimResults && (
            <div style={{ background:"linear-gradient(180deg,rgba(255,200,80,0.06),rgba(15,8,0,0.96))", border:"1px solid rgba(255,200,80,0.16)", borderRadius:8, padding:14, boxShadow:"inset 0 0 0 1px rgba(255,200,80,0.04)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:10, color:"#f8e7b4", fontWeight:700, letterSpacing:2 }}>BEST BETS SUMMARY</div>
                  <div style={{ fontSize:10, color:"#7a6a3a", marginTop:4 }}>Top playable recommendations ranked by edge percentage.</div>
                </div>
                <div style={{ fontSize:9, color:"#9a8a5a", fontFamily:"monospace" }}>
                  {bestBetRows.length ? `${bestBetRows.length} playable pick${bestBetRows.length === 1 ? "" : "s"}` : "No playable picks yet"}
                </div>
              </div>

              {bestBetRows.length ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {bestBetRows.map(({ row, composite, bestEdge, pickOdds, projectionDetail, sharpDetail }, index) => {
                    const tone = recommendationTone(composite.tier)
                    return (
                      <div key={`best-bet-${row.game.homeAbbr}-${row.game.awayAbbr}-${composite.pick}`} style={{ display:"grid", gridTemplateColumns:"auto 1.3fr 1.2fr auto", gap:12, alignItems:"center", background:tone.background, border:`1px solid ${tone.border}`, borderRadius:6, padding:"10px 12px" }}>
                        <div style={{ fontSize:16, color:tone.color, fontWeight:700, fontFamily:"'Oswald',monospace" }}>
                          {index + 1}
                        </div>
                        <div>
                          <div style={{ fontSize:9, color:"#e8d5a0", fontWeight:700, letterSpacing:1.3, marginBottom:4 }}>{row.game.awayAbbr} at {row.game.homeAbbr}</div>
                          <div style={{ fontSize:13, color:tone.color, fontWeight:700, fontFamily:"'Oswald',monospace" }}>{composite.pick}</div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          <div style={{ fontSize:8, color:tone.color, border:`1px solid ${tone.border}`, background:"rgba(0,0,0,0.16)", borderRadius:999, padding:"2px 7px", fontWeight:700, letterSpacing:1.2, alignSelf:"flex-start" }}>
                            Tier {composite.tier} - {composite.score}
                          </div>
                          {projectionDetail ? (
                            <div style={{ fontSize:9, color:"#c9b27a" }}>
                              {projectionDetail}
                            </div>
                          ) : null}
                          <div style={{ fontSize:9, color:"#9a8a5a" }}>{sharpDetail}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:16, color:tone.color, fontWeight:700, fontFamily:"'Oswald',monospace" }}>
                            {bestEdge.value > 0 ? "+" : ""}{bestEdge.value.toFixed(1)}%
                          </div>
                          <div style={{ fontSize:9, color:"#c9b27a", marginTop:2 }}>{row.game.awayAbbr} at {row.game.homeAbbr}</div>
                          <div style={{ fontSize:9, color:"#c9b27a", marginTop:2 }}>{pickOdds ? `${composite.pick} (${pickOdds})` : composite.pick}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ fontSize:10, color:"#6a5a3a" }}>Run sims with odds loaded to populate the shortlist. If everything grades out as a pass, the summary will stay empty.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}





