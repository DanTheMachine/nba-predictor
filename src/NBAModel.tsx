// @ts-nocheck
import { useState } from "react";
import { analyzeBetting, mlAmerican } from "./lib/betting";
import { parseBulkOdds } from "./lib/bulkOddsParser";
import { buildCompositeRecommendation, createCompositeFromSim, normalizeSharpSignals } from "./lib/compositeRecommendation";
import { DIVISIONS, GAME_TYPES, TEAMS, parseBBRefCSV, predictGame } from "./lib/nbaModel";
import { downloadCSV, fetchB2BTeams, fetchNBAColors, fetchProjectedStarters, fetchRecentForm, fetchTeamInjuries, fetchTodaySchedule, parseOddsFromEvent } from "./lib/espn";
import { usePredictorState } from "./hooks/usePredictorState";
import { useResultsTracker } from "./hooks/useResultsTracker";
import BBRefImportPanel from "./components/BBRefImportPanel";
import ModelEvaluation from "./components/ModelEvaluation";
import ResultsTracker from "./components/ResultsTracker";
import ScheduleAnalysis from "./components/ScheduleAnalysis";
import SingleGameControls from "./components/SingleGameControls";
import SingleGameResults from "./components/SingleGameResults";
import type {
  EditableOddsFields,
  ESPNTeamColorMap,
  LiveStatsMap,
  OddsInput,
  ScheduleRow,
  TeamAbbr,
} from "./lib/nbaTypes";

type ActiveTab = "predictor" | "results" | "evaluation";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ─── Betting Math ─────────────────────────────────────────────────────────────



// ─── Main Component ───────────────────────────────────────────────────────────
export default function NBAModel() {
  const [divFilter,setDivFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState<ActiveTab>("predictor");
  const [showSingleGameTools, setShowSingleGameTools] = useState(false);

  // BBRef import
  const [liveStats,    setLiveStats]    = useState<LiveStatsMap>({});
  const [bbrefPaste,   setBbrefPaste]   = useState("");
  const [bbrefStatus,  setBbrefStatus]  = useState("");
  const [bbrefError,   setBbrefError]   = useState("");
  const [showBBRef,    setShowBBRef]    = useState(false);
  const [statsUpdated, setStatsUpdated] = useState("");

  const {
    homeTeam,
    setHomeTeam,
    awayTeam,
    setAwayTeam,
    gameType,
    setGameType,
    homeB2B,
    setHomeB2B,
    awayB2B,
    setAwayB2B,
    result,
    running,
    simCount,
    odds,
    setOdds,
    oddsSource,
    setOddsSource,
    oddsStatus,
    setOddsStatus,
    manualOdds,
    setManualOdds,
    clearResult,
    runSim,
    handleFetchOdds,
    applyManualOdds,
  } = usePredictorState({ liveStats });

  // ESPN colors (no stats)
  const [espnData,    setEspnData]    = useState<ESPNTeamColorMap | null>(null);
  const [espnStatus,  setEspnStatus]  = useState("");
  const [espnError,   setEspnError]   = useState("");
  const [espnLoading, setEspnLoading] = useState(false);

  // Schedule / export
  const [linesRows,    setLinesRows]    = useState<ScheduleRow[]>([]);
  const [schedStatus,  setSchedStatus]  = useState("");
  const [schedLoading, setSchedLoading] = useState(false);
  const [simsRunning,  setSimsRunning]  = useState(false);
  const [showLines,    setShowLines]    = useState(false);

  // Inline row editing
  const [editingIdx,   setEditingIdx]   = useState<number | null>(null);
  const [editFields,   setEditFields]   = useState<Partial<EditableOddsFields>>({});

  // Bulk odds import
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkPaste,      setBulkPaste]      = useState("");
  const [bulkStatus,     setBulkStatus]     = useState("");
  const [bulkError,      setBulkError]      = useState("");

  // Results tracker
  const {
    resultsPaste,
    setResultsPaste,
    resultsLog,
    setResultsLog,
    resultsStatus,
    setResultsStatus,
    resultsError,
    fetchingResults,
    showResultsPaste,
    setShowResultsPaste,
    predPaste,
    setPredPaste,
    predLog,
    setPredLog,
    showPredPaste,
    setShowPredPaste,
    handleFetchResults,
    handleImportResults,
    handleImportPredictions,
    gradedRows,
    stats,
  } = useResultsTracker();

  const hasLive = Object.keys(liveStats).length >= 25;
  const getColor = (abbr: TeamAbbr, which: "primary" | "alt" = "primary"): string => {
    if (espnData?.[abbr]) return which==="primary" ? espnData[abbr].color : espnData[abbr].altColor;
    return which==="primary" ? (TEAMS[abbr]?.color ?? "#888") : (TEAMS[abbr]?.alt ?? "#444");
  };

  // ── ESPN colors only (no stats API) ──────────────────────────────────────
  const handleFetchESPN = async () => {
    setEspnLoading(true); setEspnError(""); setEspnStatus("Fetching ESPN colors…");
    try {
      const colors = await fetchNBAColors(setEspnStatus);
      setEspnData(colors);
      setEspnStatus(`✓ ESPN team colors loaded · ${Object.keys(colors).length} teams`);
    } catch(e) {
      setEspnError(getErrorMessage(e));
      setEspnStatus("");
    }
    setEspnLoading(false);
  };

  // ── BBRef paste handler ───────────────────────────────────────────────────
  const handleBBRefImport = () => {
    setBbrefError("");
    if (!bbrefPaste.trim()) { setBbrefError("Paste is empty"); return; }
    try {
      const { stats, count, timestamp } = parseBBRefCSV(bbrefPaste);
      setLiveStats(stats);
      setStatsUpdated(timestamp);
      setBbrefStatus(`✓ Updated ${count} teams from Basketball Reference · ${timestamp}`);
      setBbrefPaste("");
      setShowBBRef(false);
      clearResult();
    } catch(e) {
      setBbrefError(getErrorMessage(e));
    }
  };


  const handleLoadSchedule = async () => {
    setSchedLoading(true); setSchedStatus("Fetching today's schedule…"); setLinesRows([]); setShowLines(false);
    try {
      const { games, rawEvents } = await fetchTodaySchedule(setSchedStatus);
      if (!games.length) { setSchedStatus("No NBA games found today."); setSchedLoading(false); return; }
      const rows = games.map(g => {
        let eo = null;
        for (const ev of rawEvents) { eo = parseOddsFromEvent(ev, g.homeAbbr, g.awayAbbr); if (eo) break; }
        return {
          game:g,
          espnOdds:eo,
          editedOdds:eo?{...eo}:null,
          simResult:null,
          homeB2B:false,
          awayB2B:false,
          sharpInput:null,
          sharpContext:normalizeSharpSignals(null, eo),
          injuries:[],
          projectedStarters:{ home:null, away:null },
          recentForm:{ home:null, away:null },
          compositeRecommendation:null,
        };
      });
      setSchedStatus("Checking back-to-back games…");
      const allAbbrs = [...new Set(rows.flatMap(r => [r.game.homeAbbr, r.game.awayAbbr]))];
      const b2bSet   = await fetchB2BTeams(allAbbrs);
      setSchedStatus("Pulling recent form context...");
      const recentFormMap = await fetchRecentForm(allAbbrs);
      const injuryMap = await fetchTeamInjuries(allAbbrs, setSchedStatus);
      const starterMap = await fetchProjectedStarters(allAbbrs, setSchedStatus);
      const withB2B  = rows.map(r => ({
        ...r,
        homeB2B:b2bSet.has(r.game.homeAbbr),
        awayB2B:b2bSet.has(r.game.awayAbbr),
        injuries:[...(injuryMap[r.game.homeAbbr] ?? []), ...(injuryMap[r.game.awayAbbr] ?? [])],
        projectedStarters:{
          home:starterMap[r.game.homeAbbr] ?? null,
          away:starterMap[r.game.awayAbbr] ?? null,
        },
        recentForm:{
          home:recentFormMap[r.game.homeAbbr] ?? null,
          away:recentFormMap[r.game.awayAbbr] ?? null,
        },
      }));
      setLinesRows(withB2B); setShowLines(true);
      setSchedStatus(`${games.length} games loaded · ${rows.filter(r=>r.espnOdds).length} with ESPN lines${b2bSet.size>0?` · B2B: ${[...b2bSet].join(", ")}`:" · No B2B detected"}`);
    } catch(e) { setSchedStatus("Error: " + getErrorMessage(e)); }
    setSchedLoading(false);
  };

  const handleRunAllSims = () => {
    setSimsRunning(true);
    setTimeout(() => {
      setLinesRows(prev => prev.map(r => {
        const simResult = predictGame({ homeTeam:r.game.homeAbbr, awayTeam:r.game.awayAbbr, gameType:"Regular Season", homeB2B:r.homeB2B, awayB2B:r.awayB2B, liveStats });
        const analysis = r.editedOdds && r.editedOdds.homeMoneyline !== 0 ? analyzeBetting(simResult, r.editedOdds) : null;
        return createCompositeFromSim(r, simResult, analysis);
      }));
      setSimsRunning(false); setSchedStatus("All simulations complete — ready to export");
    }, 80);
  };

  // ── Inline edit helpers ──────────────────────────────────────────────────
  const startEdit = (idx: number) => {
    const od = linesRows[idx].editedOdds ?? {};
    setEditFields({
      homeMoneyline:  od.homeMoneyline != null ? String(od.homeMoneyline) : "",
      awayMoneyline:  od.awayMoneyline != null ? String(od.awayMoneyline) : "",
      spread:         od.spread        != null ? String(od.spread)        : "",
      spreadHomeOdds: od.spreadHomeOdds != null ? String(od.spreadHomeOdds) : "-110",
      spreadAwayOdds: od.spreadAwayOdds != null ? String(od.spreadAwayOdds) : "-110",
      overUnder:      od.overUnder     != null ? String(od.overUnder)     : "",
      overOdds:       od.overOdds      != null ? String(od.overOdds)      : "-110",
      underOdds:      od.underOdds     != null ? String(od.underOdds)     : "-110",
    });
    setEditingIdx(idx);
  };

  const saveEdit = (idx: number) => {
    const pf = (v: string | number | undefined, fallback: number | null = null): number | null => { const n = parseFloat(String(v).replace(/\s/g,"")); return isNaN(n) ? fallback : n; };
    const updated: OddsInput = {
      source:         "manual",
      homeMoneyline:  pf(editFields.homeMoneyline, 0) ?? 0,
      awayMoneyline:  pf(editFields.awayMoneyline, 0) ?? 0,
      spread:         pf(editFields.spread, -3.5) ?? -3.5,
      spreadHomeOdds: pf(editFields.spreadHomeOdds, -110) ?? -110,
      spreadAwayOdds: pf(editFields.spreadAwayOdds, -110) ?? -110,
      overUnder:      pf(editFields.overUnder, 220) ?? 220,
      overOdds:       pf(editFields.overOdds, -110) ?? -110,
      underOdds:      pf(editFields.underOdds, -110) ?? -110,
    };
    setLinesRows(prev => prev.map((r,i) => i===idx ? { ...r, editedOdds:updated, simResult:null } : r));
    setEditingIdx(null);
  };

  // ── Bulk odds import parser ───────────────────────────────────────────────
  // Format (per pair of teams):
  //   TEAM NAME            (all caps)
  //   rotation number      (3–4 digits, ignored)
  //   spread               (e.g. "+ 6 ½" or "- 6 ½" or "+ 10")
  //   spread odds          (e.g. "Even" or "- 110")
  //   O/U line             (e.g. "O 224" or "O 215 ½")
  //   over odds            (e.g. "- 105")
  //   moneyline            (e.g. "+ 225" or "- 255")
  //   [TV / time line]     (skipped if present)
  const handleBulkImport = () => {
    setBulkError(""); setBulkStatus("");
    if (!bulkPaste.trim()) { setBulkError("Paste is empty"); return; }
    try {
      const games = parseBulkOdds(bulkPaste);
      if (!games.length) throw new Error("No games parsed — check that team names match exactly");
      // Compute update synchronously against current linesRows
      let matched = 0;
      const next = linesRows.map(row => {
        const g = games.find(g =>
          (g.homeAbbr === row.game.homeAbbr && g.awayAbbr === row.game.awayAbbr) ||
          (g.homeAbbr === row.game.awayAbbr && g.awayAbbr === row.game.homeAbbr)
        );
        if (!g) return row;
        let odds = { ...g.odds };
        // If sportsbook home/away is flipped vs ESPN schedule, swap
        if (g.homeAbbr !== row.game.homeAbbr) {
          odds = {
            ...odds,
            homeMoneyline:  g.odds.awayMoneyline,
            awayMoneyline:  g.odds.homeMoneyline,
            spread:         -g.odds.spread,
            spreadHomeOdds: g.odds.spreadAwayOdds,
            spreadAwayOdds: g.odds.spreadHomeOdds,
          };
        }
        matched++;
        return { ...row, editedOdds: odds, simResult: null, sharpContext: normalizeSharpSignals(row.sharpInput, odds), compositeRecommendation: null };
      });
      setLinesRows(next);
      if (matched === 0) {
        setBulkError(`Parsed ${games.length} game(s) but none matched today's schedule. Parsed teams: ${games.map(g => g.homeAbbr + " vs " + g.awayAbbr).join(", ")}`);
      } else {
        setBulkStatus(`✓ Updated ${matched} of ${games.length} parsed games`);
        setBulkPaste("");
        setShowBulkImport(false);
      }
    } catch(e) {
      setBulkError(getErrorMessage(e));
    }
  };

  const handleExport = () => {
    const today = new Date().toISOString().slice(0,10);
    const esc   = (v: unknown) => `"${String(v).replace(/"/g,'""')}"`;
    const hdrs  = [
      // A–X: core prediction data
      "Date","Time","Home","Away","H Win%","A Win%","H Proj","A Proj","Model Total",
      "Vegas O/U","O/U Rec","O/U Edge","H ML (model)","A ML (model)","ML Rec","Over Odds","Under Odds","Vegas Spread","Spread Home Odds","Spread Away Odds","Vegas H ML","Vegas A ML",
      "Spread Rec","Spread Edge","H Net Rtg","A Net Rtg","H eFG%","A eFG%","H TOV%","A TOV%",
      // Y–Z: edge/kelly
      "ML Edge%","ML Kelly","SPR Edge%","SPR Kelly","OU Edge%","OU Kelly",
      "Composite Market","Composite Pick","Composite Score","Composite Tier","Composite Reasons",
      "Stats Source","Odds Source","Sharp Source","Sharp Updated","Injury Updated",
      // AC–AJ: lookup + results (filled by spreadsheet XLOOKUP)
      "LookupKey",
    ];
    const csvRows = linesRows.map(r => {
      const sim = r.simResult ?? predictGame({ homeTeam:r.game.homeAbbr, awayTeam:r.game.awayAbbr, gameType:"Regular Season", homeB2B:r.homeB2B, awayB2B:r.awayB2B, liveStats });
      const od  = r.editedOdds;
      const ba  = od && od.homeMoneyline !== 0 ? analyzeBetting(sim, od) : null;
      const sharpContext = normalizeSharpSignals(r.sharpInput, od);
      const composite = r.compositeRecommendation ?? buildCompositeRecommendation({ ...r, simResult:sim, sharpContext }, ba);
      const h   = liveStats[r.game.homeAbbr] ? { ...TEAMS[r.game.homeAbbr], ...liveStats[r.game.homeAbbr] } : TEAMS[r.game.homeAbbr];
      const a   = liveStats[r.game.awayAbbr] ? { ...TEAMS[r.game.awayAbbr], ...liveStats[r.game.awayAbbr] } : TEAMS[r.game.awayAbbr];
      const mlRec = !ba || ba.mlValueSide === "none"
        ? "PASS"
        : ba.mlValueSide === "home"
          ? `HOME - ${r.game.homeAbbr}`
          : `AWAY - ${r.game.awayAbbr}`;
      // LookupKey: YYYYMMDD + HomeAbbr + AwayAbbr  (matches Results CSV)
      const dateYMD = today.replace(/-/g,"");
      const lookupKey = `${dateYMD}${r.game.homeAbbr}${r.game.awayAbbr}`;
      return [
        // A–I
        today, r.game.gameTime,
        `${r.game.homeAbbr} ${h.name}`, `${r.game.awayAbbr} ${a.name}`,
        (sim.hWinProb*100).toFixed(1)+"%", (sim.aWinProb*100).toFixed(1)+"%",
        sim.hScore, sim.aScore, sim.total,
        // J–P
        od?.overUnder?.toFixed(1)??"—", ba?.ouRec?.toUpperCase()??"—",
        ba?(ba.ouEdge>0?"+":"")+ba.ouEdge.toFixed(1):"—",
        mlAmerican(sim.hWinProb), mlAmerican(sim.aWinProb),
        mlRec,
        od?.overOdds?(od.overOdds>0?"+":"")+od.overOdds:"â€”",
        od?.underOdds?(od.underOdds>0?"+":"")+od.underOdds:"â€”",
        od?.spread != null ? `${od.spread > 0 ? "+" : ""}${od.spread}` : "â€”",
        od?.spreadHomeOdds?(od.spreadHomeOdds>0?"+":"")+od.spreadHomeOdds:"â€”",
        od?.spreadAwayOdds?(od.spreadAwayOdds>0?"+":"")+od.spreadAwayOdds:"â€”",
        od?.homeMoneyline?(od.homeMoneyline>0?"+":"")+od.homeMoneyline:"—",
        od?.awayMoneyline?(od.awayMoneyline>0?"+":"")+od.awayMoneyline:"—",
        // Q–X
        ba?(ba.spreadRec==="pass"?"PASS":ba.spreadRec.toUpperCase()):"—",
        ba&&ba.spreadRec!=="pass"?"+"+ba.spreadEdge.toFixed(1)+"%":"—",
        (h.netRtg>=0?"+":"")+h.netRtg.toFixed(1), (a.netRtg>=0?"+":"")+a.netRtg.toFixed(1),
        h.efgPct.toFixed(1)+"%", a.efgPct.toFixed(1)+"%",
        h.tovPct.toFixed(1)+"%", a.tovPct.toFixed(1)+"%",
        // Y–Z: edge/kelly
        ba&&ba.mlValueSide!=="none"?"+"+ba.mlValuePct.toFixed(1)+"%":"—",
        ba&&ba.mlValueSide!=="none"?(ba.mlValueSide==="home"?ba.kellyHome:ba.kellyAway).toFixed(4):"—",
        ba&&ba.spreadRec!=="pass"?"+"+ba.spreadEdge.toFixed(1)+"%":"—",
        ba&&ba.spreadRec!=="pass"?ba.kellySpread.toFixed(4):"—",
        ba&&ba.ouRec!=="pass"?"+"+ba.ouEdgePct.toFixed(1)+"%":"—",
        ba&&ba.ouRec!=="pass"?ba.kellyOU.toFixed(4):"—",
        // AA–AB: source
        composite.primaryMarket,
        composite.pick,
        String(composite.score),
        composite.tier,
        composite.reasons.join(" | "),
        hasLive?"BBRef live":"Estimates",
        od?(od.source==="espn"?"ESPN":"Manual"):"No odds",
        r.sharpInput?.source ?? "None",
        r.sharpInput?.lastUpdated ?? "-",
        r.injuries[0]?.lastUpdated ?? "-",
          // AC: lookup key
        lookupKey,
      ];
    });
    downloadCSV([hdrs.map(esc).join(","), ...csvRows.map(r => r.map(esc).join(","))].join("\n"), `nba-predictions-${today}.csv`);
    setSchedStatus(`✓ Exported ${csvRows.length} games to nba-predictions-${today}.csv`);
  };

  // ── Fetch ESPN scoreboard for results ──────────────────────────────────────

  const hColor = getColor(homeTeam);
  const aColor = getColor(awayTeam);
  const hTeam  = liveStats[homeTeam] ? { ...TEAMS[homeTeam], ...liveStats[homeTeam] } : TEAMS[homeTeam];
  const aTeam  = liveStats[awayTeam] ? { ...TEAMS[awayTeam], ...liveStats[awayTeam] } : TEAMS[awayTeam];

  const ss = { background:"rgba(255,200,80,0.04)", border:"1px solid rgba(255,200,80,0.15)", color:"#e8d5a0", padding:"8px 10px", borderRadius:4, fontFamily:"monospace", fontSize:12, width:"100%", cursor:"pointer" };
  const card = { background:"rgba(255,200,80,0.03)", border:"1px solid rgba(255,200,80,0.13)", borderRadius:8, padding:16, marginBottom:12 };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(170deg,#0d0800 0%,#140e02 50%,#0d0800 100%)", color:"#e8d5a0", fontFamily:"monospace", padding:"22px 18px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.15} }
        @keyframes glint  { 0%,100%{opacity:0.75} 50%{opacity:1} }
        select option, select optgroup { background:#1a0f00; color:#e8d5a0; }
      `}</style>
      <div style={{ position:"fixed", top:0, left:0, right:0, height:3, zIndex:100, background:"linear-gradient(90deg,#f59e0b,#fbbf24,#fde68a,#fbbf24,#f59e0b)", animation:"glint 3s ease infinite" }} />

      <div style={{ maxWidth:1100, width:"100%", margin:"0 auto", boxSizing:"border-box", overflowX:"hidden" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom:20, paddingTop:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:"#fbbf24", boxShadow:"0 0 12px #fbbf24", animation:"pulse 2s infinite" }} />
            <span style={{ fontSize:10, color:"#fbbf24", letterSpacing:5, fontFamily:"'Oswald',monospace" }}>NBA · ANALYTICS ENGINE · NET RTG / EFG MODEL</span>
          </div>
          <h1 style={{ fontFamily:"'Oswald',sans-serif", fontSize:"clamp(30px,5.5vw,60px)", fontWeight:700, margin:"4px 0 2px", lineHeight:1, letterSpacing:3, color:"#e8d5a0" }}>
            FAST BREAK <span style={{ color:"#fbbf24" }}>PREDICTOR</span>
          </h1>
          <p style={{ fontSize:10, color:"#6a5a2a", letterSpacing:3, margin:0 }}>OFF/DEF RATING · EFG% · NET RATING · PACE · TOV% · 100K SIMULATIONS</p>
        </div>

        {/* ── Tab Navigation ── */}
        <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:"1px solid rgba(255,200,80,0.15)" }}>
          {[["predictor","⚡ PREDICTOR"],["results","📊 RESULTS TRACKER"],["evaluation","MODEL EVAL"]].map(([id,label]) => (
            <button key={id} onClick={()=>setActiveTab(id)} style={{ background:"transparent", border:"none", borderBottom:activeTab===id?"2px solid #fbbf24":"2px solid transparent", padding:"10px 20px", color:activeTab===id?"#fbbf24":"#5a4a2a", fontSize:11, fontWeight:700, letterSpacing:3, fontFamily:"'Oswald',monospace", cursor:"pointer", transition:"all 0.2s", marginBottom:-1 }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "predictor" && <>

        {/* ── ESPN Colors Banner ── */}
        <div style={{ ...card, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <div>
            <div style={{ fontSize:10, color:"#7a6a3a", letterSpacing:3, marginBottom:5 }}>ESPN TEAM COLORS</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:espnData?"#4ade80":"#4b5563", boxShadow:espnData?"0 0 8px #4ade80":"none", animation:espnLoading?"pulse 0.8s infinite":"none" }} />
              <span style={{ fontSize:11, color:espnData?"#4ade80":espnLoading?"#f59e0b":"#6a5a3a" }}>
                {espnLoading ? espnStatus : espnData ? espnStatus : "Load ESPN colors for team-colored UI elements"}
              </span>
            </div>
            {espnError && <div style={{ fontSize:10, color:"#f87171", marginTop:4 }}>⚠ {espnError}</div>}
          </div>
          <button onClick={handleFetchESPN} disabled={espnLoading} style={{ background:espnData?"rgba(74,222,128,0.07)":"linear-gradient(135deg,#b45309,#92400e)", border:espnData?"1px solid rgba(74,222,128,0.2)":"none", borderRadius:4, padding:"8px 16px", color:espnData?"#4ade80":"#fef3c7", fontSize:11, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:espnLoading?"not-allowed":"pointer", whiteSpace:"nowrap" }}>
            {espnLoading?"LOADING…":espnData?"↻ REFRESH":"⬇ FETCH COLORS"}
          </button>
        </div>

        {/* ── Basketball Reference Import ── */}
        <BBRefImportPanel
          card={card}
          hasLive={hasLive}
          liveStats={liveStats}
          statsUpdated={statsUpdated}
          bbrefStatus={bbrefStatus}
          bbrefError={bbrefError}
          showBBRef={showBBRef}
          setShowBBRef={setShowBBRef}
          bbrefPaste={bbrefPaste}
          setBbrefPaste={setBbrefPaste}
          setBbrefError={setBbrefError}
          handleBBRefImport={handleBBRefImport}
          setLiveStats={setLiveStats}
          setStatsUpdated={setStatsUpdated}
          setBbrefStatus={setBbrefStatus}
          clearResult={clearResult}
        />

        <div style={{ ...card, display:"none", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div>
            <div style={{ fontSize:10, color:"#7a6a3a", letterSpacing:3, marginBottom:4 }}>SINGLE GAME TOOLS</div>
            <div style={{ fontSize:11, color:"#6a5a3a" }}>Home/away setup, single-game sim, and manual lines</div>
          </div>
          <button onClick={()=>setShowSingleGameTools(v=>!v)} style={{ background:showSingleGameTools?"rgba(202,138,4,0.15)":"rgba(255,200,80,0.04)", border:`1px solid ${showSingleGameTools?"rgba(234,179,8,0.4)":"rgba(255,200,80,0.13)"}`, borderRadius:4, padding:"8px 16px", color:showSingleGameTools?"#fbbf24":"#9a8a5a", fontSize:11, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer", whiteSpace:"nowrap" }}>
            {showSingleGameTools ? "CLOSE PANEL" : "OPEN PANEL"}
          </button>
        </div>

        {showSingleGameTools && (
          <SingleGameControls
            card={card}
            ss={ss}
            divFilter={divFilter}
            setDivFilter={setDivFilter}
            divOptions={["ALL", ...DIVISIONS]}
            teams={TEAMS}
            homeTeam={homeTeam}
            setHomeTeam={setHomeTeam}
            awayTeam={awayTeam}
            setAwayTeam={setAwayTeam}
            espnData={espnData}
            liveStats={liveStats}
            gameType={gameType}
            gameTypes={GAME_TYPES}
            setGameType={setGameType}
            homeB2B={homeB2B}
            setHomeB2B={setHomeB2B}
            awayB2B={awayB2B}
            setAwayB2B={setAwayB2B}
            clearResult={clearResult}
            hasLive={hasLive}
            hColor={hColor}
            aColor={aColor}
            hTeam={hTeam}
            aTeam={aTeam}
            running={running}
            simCount={simCount}
            runSim={runSim}
            odds={odds}
            setOdds={setOdds}
            oddsSource={oddsSource}
            setOddsSource={setOddsSource}
            oddsStatus={oddsStatus}
            setOddsStatus={setOddsStatus}
            handleFetchOdds={handleFetchOdds}
            manualOdds={manualOdds}
            setManualOdds={setManualOdds}
            applyManualOdds={applyManualOdds}
          />
        )}

        {/* ── Results ── */}
        {result && (
          <SingleGameResults
            card={card}
            result={result}
            odds={odds}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            hColor={hColor}
            aColor={aColor}
            hTeam={hTeam}
            aTeam={aTeam}
            hasLive={hasLive}
            statsUpdated={statsUpdated}
            analyzeBetting={analyzeBetting}
            mlAmerican={mlAmerican}
          />
        )}

        {/* ── Today's Games & Export ── */}
        <ScheduleAnalysis
          card={card}
          analyzeBetting={analyzeBetting}
          mlAmerican={mlAmerican}
          predictGame={predictGame}
          liveStats={liveStats}
          TEAMS={TEAMS}
          showBulkImport={showBulkImport}
          setShowBulkImport={(next) => {
            const value = typeof next === "function" ? next(showBulkImport) : next;
            setShowBulkImport(value);
            setBulkError("");
            setBulkStatus("");
          }}
          bulkError={bulkError}
          bulkStatus={bulkStatus}
          bulkPaste={bulkPaste}
          setBulkPaste={(value) => {
            setBulkPaste(value);
            setBulkError("");
            setBulkStatus("");
          }}
          handleBulkImport={handleBulkImport}
          linesRows={linesRows}
          setLinesRows={setLinesRows}
          showLines={showLines}
          schedStatus={schedStatus}
          schedLoading={schedLoading}
          simsRunning={simsRunning}
          handleLoadSchedule={handleLoadSchedule}
          handleRunAllSims={handleRunAllSims}
          handleExport={handleExport}
          handleFetchResults={handleFetchResults}
          fetchingResults={fetchingResults}
          editingIdx={editingIdx}
          setEditingIdx={setEditingIdx}
          editFields={editFields}
          setEditFields={setEditFields}
          startEdit={startEdit}
          saveEdit={saveEdit}
        />

        <div style={{ ...card, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div>
            <div style={{ fontSize:10, color:"#7a6a3a", letterSpacing:3, marginBottom:4 }}>SINGLE GAME TOOLS</div>
            <div style={{ fontSize:11, color:"#6a5a3a" }}>Home/away setup, single-game sim, and manual lines</div>
          </div>
          <button onClick={()=>setShowSingleGameTools(v=>!v)} style={{ background:showSingleGameTools?"rgba(202,138,4,0.15)":"rgba(255,200,80,0.04)", border:`1px solid ${showSingleGameTools?"rgba(234,179,8,0.4)":"rgba(255,200,80,0.13)"}`, borderRadius:4, padding:"8px 16px", color:showSingleGameTools?"#fbbf24":"#9a8a5a", fontSize:11, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer", whiteSpace:"nowrap" }}>
            {showSingleGameTools ? "CLOSE PANEL" : "OPEN SINGLE GAME"}
          </button>
        </div>
        </>}

        {/* ══════════ RESULTS TRACKER TAB ══════════ */}
        {activeTab === "results" && (
          <ResultsTracker
            resultsStatus={resultsStatus}
            resultsError={resultsError}
            gradedRows={gradedRows}
            stats={stats}
            handleFetchResults={handleFetchResults}
            fetchingResults={fetchingResults}
            showResultsPaste={showResultsPaste}
            setShowResultsPaste={setShowResultsPaste}
            showPredPaste={showPredPaste}
            setShowPredPaste={setShowPredPaste}
            resultsLog={resultsLog}
            predLog={predLog}
            setResultsLog={setResultsLog}
            setPredLog={setPredLog}
            setResultsStatus={setResultsStatus}
            resultsPaste={resultsPaste}
            setResultsPaste={setResultsPaste}
            handleImportResults={handleImportResults}
            predPaste={predPaste}
            setPredPaste={setPredPaste}
            handleImportPredictions={handleImportPredictions}
          />
        )}

        {activeTab === "evaluation" && (
          <ModelEvaluation card={card} />
        )}

      </div>
    </div>
  );
}


