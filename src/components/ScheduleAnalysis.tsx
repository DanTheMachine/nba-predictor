import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import type { UseResultsTrackerReturn } from "../hooks/useResultsTracker";
import { buildCompositeRecommendation, createCompositeFromSim, normalizeSharpSignals } from "../lib/compositeRecommendation";
import type { analyzeBetting as AnalyzeBettingFn, mlAmerican as MlAmericanFn } from "../lib/betting";
import type { predictGame as PredictGameFn } from "../lib/nbaModel";
import type {
  EditableOddsFields,
  InjuryInfo,
  LiveStatsMap,
  ScheduleRow,
  SharpLeanSide,
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
  startEdit: (...args: [number]) => void
  saveEdit: (...args: [number]) => void
}

type ContextFields = {
  openingHomeMoneyline: string
  openingAwayMoneyline: string
  openingSpread: string
  openingTotal: string
  moneylineHomeBetsPct: string
  moneylineHomeMoneyPct: string
  clvLean: SharpLeanSide
  steamMoveLean: SharpLeanSide
  reverseLineMoveLean: SharpLeanSide
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
  clvLean: "none",
  steamMoveLean: "none",
  reverseLineMoveLean: "none",
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

function shortDate(value: string): string {
  if (!value) return value
  const [year, month, day] = value.split("-")
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

function toContext(row: ScheduleRow): ContextFields {
  return {
    openingHomeMoneyline: row.sharpInput?.openingHomeMoneyline != null ? String(row.sharpInput.openingHomeMoneyline) : "",
    openingAwayMoneyline: row.sharpInput?.openingAwayMoneyline != null ? String(row.sharpInput.openingAwayMoneyline) : "",
    openingSpread: row.sharpInput?.openingSpread != null ? String(row.sharpInput.openingSpread) : "",
    openingTotal: row.sharpInput?.openingTotal != null ? String(row.sharpInput.openingTotal) : "",
    moneylineHomeBetsPct: row.sharpInput?.moneylineHomeBetsPct != null ? String(row.sharpInput.moneylineHomeBetsPct) : "",
    moneylineHomeMoneyPct: row.sharpInput?.moneylineHomeMoneyPct != null ? String(row.sharpInput.moneylineHomeMoneyPct) : "",
    clvLean: row.sharpInput?.clvLean ?? "none",
    steamMoveLean: row.sharpInput?.steamMoveLean ?? "none",
    reverseLineMoveLean: row.sharpInput?.reverseLineMoveLean ?? "none",
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

function formatSpreadLabel(team: TeamAbbr, spread: number, odds: number): string {
  return `${team} ${spread > 0 ? "+" : ""}${spread} (${formatSignedOdds(odds)})`
}

function awaySpreadFromHomeSpread(homeSpread: number): number {
  return -homeSpread
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
  card,
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
      clvLean: contextFields.clvLean,
      steamMoveLean: contextFields.steamMoveLean,
      reverseLineMoveLean: contextFields.reverseLineMoveLean,
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
        </div>
        <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
          <button onClick={handleLoadSchedule} disabled={schedLoading} style={{ background:schedLoading ? "#0f0800" : "#b45309", border:"none", borderRadius:5, padding:"8px 14px", color:schedLoading ? "#3a2a1a" : "#fef3c7", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:schedLoading ? "not-allowed" : "pointer" }}>{schedLoading ? "LOADING..." : linesRows.length ? "RELOAD" : "LOAD GAMES"}</button>
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

      {schedStatus && <div style={{ fontSize:11, color:linesRows.length > 0 ? "#3fb950" : "#5a4a2a", marginBottom:showLines && linesRows.length ? 12 : 0 }}>{schedStatus}</div>}

      {showLines && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {enrichedRows.map(({ row, analysis }, idx) => {
            const sim = row.simResult
            const homeStats = liveStats[row.game.homeAbbr] ? { ...TEAMS[row.game.homeAbbr], ...liveStats[row.game.homeAbbr] } : TEAMS[row.game.homeAbbr]
            const awayStats = liveStats[row.game.awayAbbr] ? { ...TEAMS[row.game.awayAbbr], ...liveStats[row.game.awayAbbr] } : TEAMS[row.game.awayAbbr]
            const isExpanded = expandedIdx === idx
            const isContextEditing = contextEditingIdx === idx
            return (
              <div key={`${row.game.homeAbbr}-${row.game.awayAbbr}-${idx}`} style={{ background:"#0a0600", border:"1px solid #1f1400", borderRadius:8, overflow:"hidden" }}>
                <div style={{ padding:"12px 14px", display:"grid", gridTemplateColumns:"1.5fr 1.6fr auto auto", gap:10, alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:9, color:"#7a6a3a", marginBottom:4 }}>{row.game.gameTime}{row.game.tvInfo ? ` · ${row.game.tvInfo}` : ""}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}><div style={{ fontSize:18, color:"#e8d5a0", fontWeight:700, fontFamily:"'Oswald',monospace" }}>{row.game.awayAbbr} at {row.game.homeAbbr}</div>{row.editedOdds?.source === "manual" && (<div style={{ fontSize:8, color:"#dbeafe", border:"1px solid rgba(96,165,250,0.28)", background:"rgba(96,165,250,0.08)", borderRadius:999, padding:"2px 7px", letterSpacing:1.4, fontWeight:700, lineHeight:1.2 }}>EDITED</div>)}</div>
                    <div style={{ fontSize:10, color:"#6a5a3a", marginTop:2 }}>
                      {sim ? `Proj ${sim.hScore}-${sim.aScore} · Total ${sim.total} · ${row.game.homeAbbr} ${(sim.hWinProb * 100).toFixed(1)}% / ${row.game.awayAbbr} ${(sim.aWinProb * 100).toFixed(1)}%` : "Run the model to generate projections"}
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
                              <div style={{ fontSize:8, color:"#f8e7b4", fontWeight:700 }}>SHARP</div>
                              <div style={{ fontSize:8, color:freshnessColor(row.sharpContext?.lastUpdated), fontStyle:"italic" }}>
                                {freshness(row.sharpContext?.lastUpdated)}
                              </div>
                            </div>
                            <div style={{ fontSize:9, color:"#7a6a3a" }}>{row.sharpContext?.tags.slice(0, 4).map((tag) => tag.detail).join(" � ") || "No sharp data loaded"}</div>
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
                                      return (
                                      <div key={`${row.game.homeAbbr}-${starter.position}-${starter.player}`} style={{ fontSize:8, color:"#e8d5a0" }}>
                                        {starter.position}: {starter.player}{injuryTag ? <span style={{ color:"#f87171" }}> - {injuryTag}</span> : null}
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
                                      return (
                                      <div key={`${row.game.awayAbbr}-${starter.position}-${starter.player}`} style={{ fontSize:8, color:"#dbeafe" }}>
                                        {starter.position}: {starter.player}{injuryTag ? <span style={{ color:"#f87171" }}> - {injuryTag}</span> : null}
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
                              <select value={String(contextFields[key as keyof ContextFields])} onChange={(e) => setContextFields((prev) => ({ ...prev, [key]: e.target.value }))} style={{ width:"100%", background:"#0d0800", border:"1px solid rgba(96,165,250,0.2)", borderRadius:3, color:"#e8d5a0", fontFamily:"monospace", fontSize:11, padding:"6px", boxSizing:"border-box", outline:"none" }}>
                                {["none", "home", "away", "over", "under"].map((option) => <option key={option} value={option}>{option.toUpperCase()}</option>)}
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
        </div>
      )}
    </div>
  )
}





