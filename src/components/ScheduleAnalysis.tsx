// @ts-nocheck
import { Fragment } from "react";

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
}) {
  const hasSimResults = linesRows.some((row) => row.simResult);

  return (
    <div style={{ background:"#0f0800", border:"1px solid #251800", borderRadius:8, padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:schedStatus ? 12 : 0 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:"#5a4a2a", letterSpacing:3, marginBottom:3 }}>TODAY&apos;S GAMES & EXPORT</div>
          <div style={{ fontSize:11, color:"#3a2a1a" }}>Load schedule | toggle B2B | run all sims | export CSV</div>
        </div>
        <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
          <button onClick={handleLoadSchedule} disabled={schedLoading} style={{ background:schedLoading ? "#0f0800" : "#b45309", border:"none", borderRadius:5, padding:"8px 14px", color:schedLoading ? "#3a2a1a" : "#fef3c7", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:schedLoading ? "not-allowed" : "pointer" }}>
            {schedLoading ? "LOADING..." : linesRows.length ? "RELOAD" : "LOAD GAMES"}
          </button>
          {linesRows.length > 0 && (
            <button onClick={() => { setShowBulkImport(!showBulkImport); }} style={{ background:showBulkImport ? "rgba(251,191,36,0.12)" : "rgba(255,200,80,0.06)", border:"1px solid rgba(255,200,80,0.2)", borderRadius:5, padding:"8px 14px", color:showBulkImport ? "#fbbf24" : "#9a8a5a", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>
              {showBulkImport ? "HIDE" : "BULK EDIT LINES"}
            </button>
          )}
          {linesRows.length > 0 && (
            <button onClick={handleRunAllSims} disabled={simsRunning} style={{ background:simsRunning ? "#0f0800" : "#d29922", border:"none", borderRadius:5, padding:"8px 14px", color:simsRunning ? "#3a2a1a" : "#1a0f00", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:simsRunning ? "not-allowed" : "pointer" }}>
              {simsRunning ? "RUNNING..." : "RUN ALL SIMS"}
            </button>
          )}
          {hasSimResults && (
            <button onClick={handleExport} style={{ background:"#3fb950", border:"none", borderRadius:5, padding:"8px 14px", color:"#0d1117", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>
              PREDICTIONS CSV
            </button>
          )}
          {hasSimResults && (
            <button onClick={() => handleFetchResults(true)} disabled={fetchingResults} style={{ background:fetchingResults ? "#0f0800" : "linear-gradient(135deg,#1d4ed8,#3b82f6)", border:"none", borderRadius:5, padding:"8px 14px", color:fetchingResults ? "#3a2a1a" : "#eff6ff", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:fetchingResults ? "not-allowed" : "pointer" }}>
              {fetchingResults ? "FETCHING..." : "RESULTS CSV"}
            </button>
          )}
        </div>
      </div>

      {showBulkImport && linesRows.length > 0 && (
        <div style={{ background:"rgba(255,200,80,0.03)", border:"1px solid rgba(255,200,80,0.15)", borderRadius:6, padding:14, marginBottom:12, animation:"fadeUp 0.2s ease" }}>
          <div style={{ fontSize:10, color:"#fbbf24", letterSpacing:3, marginBottom:8, fontWeight:700 }}>BULK ODDS IMPORT</div>
          <div style={{ fontSize:10, color:"#6a5a3a", lineHeight:1.8, marginBottom:10 }}>
            Paste the sportsbook odds text (one game pair at a time). Format per team:
            <br />
            <span style={{ color:"#8a7a5a", fontFamily:"monospace" }}>TEAM NAME -&gt; rotation # -&gt; spread -&gt; spread odds -&gt; O/U line -&gt; over odds -&gt; moneyline</span>
          </div>
          <textarea
            value={bulkPaste}
            onChange={(e) => setBulkPaste(e.target.value)}
            placeholder={"ORLANDO MAGIC\n515\n+ 6.5\nEven\nO 224\n- 105\n+ 225\nMINNESOTA TIMBERWOLVES\n516\n- 6.5\n- 110\nU 224\n- 105\n- 255\n..."}
            style={{ width:"100%", height:160, background:"#0d0800", border:"1px solid rgba(255,200,80,0.15)", borderRadius:4, color:"#e8d5a0", fontSize:11, fontFamily:"monospace", padding:10, resize:"vertical", boxSizing:"border-box", outline:"none" }}
          />
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, marginTop:8 }}>
            <button
              onClick={handleBulkImport}
              disabled={!bulkPaste.trim()}
              style={{ padding:"9px 0", background:bulkPaste.trim() ? "linear-gradient(135deg,#b45309,#92400e)" : "rgba(255,200,80,0.04)", border:bulkPaste.trim() ? "none" : "1px solid rgba(255,200,80,0.08)", borderRadius:4, color:bulkPaste.trim() ? "#fef3c7" : "#4a3a2a", fontSize:11, fontWeight:700, letterSpacing:3, fontFamily:"monospace", cursor:bulkPaste.trim() ? "pointer" : "not-allowed" }}
            >
              APPLY TO TODAY&apos;S GAMES
            </button>
            <button onClick={() => setBulkPaste("")} style={{ padding:"9px 14px", background:"transparent", border:"1px solid rgba(255,200,80,0.1)", borderRadius:4, color:"#4a3a2a", fontSize:10, fontFamily:"monospace", cursor:"pointer" }}>
              CLEAR
            </button>
          </div>
          {bulkStatus && <div style={{ fontSize:10, color:"#3fb950", marginTop:6 }}>{bulkStatus}</div>}
          {bulkError && <div style={{ fontSize:10, color:"#f87171", marginTop:6 }}>WARN {bulkError}</div>}
        </div>
      )}

      {schedStatus && (
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:showLines && linesRows.length ? 12 : 0, marginTop:2 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", flexShrink:0, background:schedLoading || simsRunning ? "#fbbf24" : hasSimResults ? "#3fb950" : "#5a4a2a", animation:schedLoading || simsRunning ? "pulse 0.8s infinite" : "none" }} />
          <span style={{ fontSize:11, color:schedLoading || simsRunning ? "#fbbf24" : hasSimResults ? "#3fb950" : "#5a4a2a" }}>{schedStatus}</span>
        </div>
      )}

      {showLines && linesRows.length > 0 && (
        <div style={{ overflowX:"auto", borderRadius:5, border:"1px solid #251800", marginBottom:16 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"monospace", fontSize:11 }}>
            <thead>
              <tr style={{ background:"#0a0600" }}>
                {["Time","Matchup","H ML","A ML","Spread","O/U","H Win%","A Win%","H Proj","A Proj","Total","ML Edge","Spr Rec","O/U Rec","B2B","Sim","Edit"].map((header) => (
                  <th key={header} style={{ padding:"6px", textAlign:"left", fontSize:9, color:"#5a4a2a", letterSpacing:1, borderBottom:"1px solid #251800", whiteSpace:"nowrap" }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linesRows.map((row, idx) => {
                const odds = row.editedOdds;
                const sim = row.simResult;
                const analysis = odds && odds.homeMoneyline !== 0 && sim ? analyzeBetting(sim, odds) : null;
                const hasValue = analysis && analysis.mlValueSide !== "none";

                return (
                  <Fragment key={idx}>
                    <tr style={{ background:hasValue ? "rgba(63,185,80,0.06)" : idx % 2 === 0 ? "#0f0800" : "#0a0600" }}>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000", color:"#5a4a2a", whiteSpace:"nowrap" }}>{row.game.gameTime}</td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000", whiteSpace:"nowrap" }}>
                        <span style={{ fontWeight:700, color:"#e8d5a0" }}>{row.game.homeAbbr}</span>
                        <span style={{ color:"#3a2a1a", margin:"0 4px" }}>vs</span>
                        <span style={{ fontWeight:700, color:"#e8d5a0" }}>{row.game.awayAbbr}</span>
                      </td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000", color:odds?.homeMoneyline ? "#d4b870" : "#3a2a1a" }}>{odds?.homeMoneyline ? (odds.homeMoneyline > 0 ? "+" : "") + odds.homeMoneyline : "-"}</td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000", color:odds?.awayMoneyline ? "#d4b870" : "#3a2a1a" }}>{odds?.awayMoneyline ? (odds.awayMoneyline > 0 ? "+" : "") + odds.awayMoneyline : "-"}</td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000", color:odds?.spread != null ? "#d4b870" : "#3a2a1a" }}>{odds?.spread != null ? `H${odds.spread > 0 ? "+" : ""}${odds.spread}` : "-"}</td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000", color:odds?.overUnder ? "#d4b870" : "#3a2a1a" }}>{odds?.overUnder?.toFixed(1) ?? "-"}</td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000", color:sim ? "#3fb950" : "#3a2a1a", fontWeight:sim ? 700 : 400 }}>{sim ? `${(sim.hWinProb * 100).toFixed(1)}%` : "-"}</td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000", color:sim ? "#3fb950" : "#3a2a1a", fontWeight:sim ? 700 : 400 }}>{sim ? `${(sim.aWinProb * 100).toFixed(1)}%` : "-"}</td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000", color:sim ? "#fbbf24" : "#3a2a1a" }}>{sim ? sim.hScore : "-"}</td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000", color:sim ? "#fbbf24" : "#3a2a1a" }}>{sim ? sim.aScore : "-"}</td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000", color:sim ? "#b45309" : "#3a2a1a" }}>{sim ? sim.total : "-"}</td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000", whiteSpace:"nowrap" }}>
                        {analysis ? <span style={{ color:hasValue ? "#3fb950" : "#3a2a1a", fontWeight:hasValue ? 700 : 400 }}>{hasValue ? `${analysis.mlValueSide.toUpperCase()} +${analysis.mlValuePct.toFixed(1)}%` : "PASS"}</span> : "-"}
                      </td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000", color:analysis && analysis.spreadRec !== "pass" ? "#3fb950" : "#3a2a1a", fontWeight:analysis && analysis.spreadRec !== "pass" ? 700 : 400, whiteSpace:"nowrap" }}>
                        {analysis ? (analysis.spreadRec === "pass" ? "PASS" : analysis.spreadRec.toUpperCase()) : "-"}
                      </td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000", color:analysis && analysis.ouRec !== "pass" ? "#3fb950" : "#3a2a1a", fontWeight:analysis && analysis.ouRec !== "pass" ? 700 : 400 }}>
                        {analysis ? (analysis.ouRec === "pass" ? "PASS" : `${analysis.ouRec.toUpperCase()}${analysis.ouEdge !== 0 ? ` (${analysis.ouEdge > 0 ? "+" : ""}${analysis.ouEdge.toFixed(1)})` : ""}`) : "-"}
                      </td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          {[["homeB2B", row.game.homeAbbr], ["awayB2B", row.game.awayAbbr]].map(([field, abbr]) => (
                            <button key={field} onClick={() => setLinesRows((prev) => prev.map((currentRow, rowIndex) => rowIndex === idx ? { ...currentRow, [field]: !currentRow[field], simResult:null } : currentRow))} style={{ background:row[field] ? "rgba(251,113,133,0.12)" : "transparent", border:`1px solid ${row[field] ? "rgba(251,113,133,0.35)" : "#251800"}`, borderRadius:3, padding:"2px 5px", color:row[field] ? "#fda4af" : "#3a2a1a", fontSize:9, fontWeight:700, fontFamily:"monospace", cursor:"pointer", whiteSpace:"nowrap" }}>
                              {abbr} B2B
                            </button>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000" }}>
                        <button onClick={() => setLinesRows((prev) => prev.map((currentRow, rowIndex) => rowIndex === idx ? { ...currentRow, simResult:predictGame({ homeTeam:currentRow.game.homeAbbr, awayTeam:currentRow.game.awayAbbr, gameType:"Regular Season", homeB2B:currentRow.homeB2B, awayB2B:currentRow.awayB2B, liveStats }) } : currentRow))} style={{ background:sim ? "rgba(63,185,80,0.08)" : "rgba(251,191,36,0.08)", border:`1px solid ${sim ? "#3fb95040" : "#fbbf2440"}`, borderRadius:4, padding:"2px 8px", color:sim ? "#3fb950" : "#fbbf24", fontSize:9, fontWeight:700, fontFamily:"monospace", cursor:"pointer" }}>
                          {sim ? "RERUN" : "RUN"}
                        </button>
                      </td>
                      <td style={{ padding:"5px 6px", borderBottom:"1px solid #1a1000" }}>
                        <button onClick={() => { if (editingIdx === idx) setEditingIdx(null); else startEdit(idx); }} style={{ background:editingIdx === idx ? "rgba(251,191,36,0.15)" : "rgba(255,200,80,0.06)", border:`1px solid ${editingIdx === idx ? "rgba(251,191,36,0.4)" : "rgba(255,200,80,0.15)"}`, borderRadius:4, padding:"2px 8px", color:editingIdx === idx ? "#fbbf24" : "#9a8a5a", fontSize:9, fontWeight:700, fontFamily:"monospace", cursor:"pointer", whiteSpace:"nowrap" }}>
                          {editingIdx === idx ? "CLOSE" : "EDIT"}
                        </button>
                      </td>
                    </tr>
                    {editingIdx === idx && (
                      <tr style={{ background:"#0c0600" }}>
                        <td colSpan={17} style={{ padding:"10px 8px", borderBottom:"1px solid #251800" }}>
                          <div style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:6, alignItems:"end" }}>
                            {[
                              ["H ML", "homeMoneyline"],
                              ["A ML", "awayMoneyline"],
                              ["Spread", "spread"],
                              ["Spr H Odds", "spreadHomeOdds"],
                              ["Spr A Odds", "spreadAwayOdds"],
                              ["O/U", "overUnder"],
                              ["Over", "overOdds"],
                              ["Under", "underOdds"],
                            ].map(([label, field]) => (
                              <div key={field}>
                                <div style={{ fontSize:9, color:"#5a4a2a", letterSpacing:1, marginBottom:3 }}>{label}</div>
                                <input value={editFields[field] ?? ""} onChange={(e) => setEditFields((prev) => ({ ...prev, [field]: e.target.value }))} style={{ width:"100%", background:"#0d0800", border:"1px solid rgba(255,200,80,0.2)", borderRadius:3, color:"#e8d5a0", fontFamily:"monospace", fontSize:11, padding:"4px 6px", boxSizing:"border-box", outline:"none" }} />
                              </div>
                            ))}
                          </div>
                          <div style={{ display:"flex", gap:6, marginTop:8 }}>
                            <button onClick={() => saveEdit(idx)} style={{ background:"linear-gradient(135deg,#065f46,#047857)", border:"none", borderRadius:4, padding:"5px 16px", color:"#d1fae5", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>
                              SAVE
                            </button>
                            <button onClick={() => setEditingIdx(null)} style={{ background:"transparent", border:"1px solid rgba(255,200,80,0.12)", borderRadius:4, padding:"5px 14px", color:"#6a5a3a", fontSize:10, fontFamily:"monospace", cursor:"pointer" }}>
                              CANCEL
                            </button>
                            <button onClick={() => { setLinesRows((prev) => prev.map((currentRow, rowIndex) => rowIndex === idx ? { ...currentRow, editedOdds:currentRow.espnOdds ? { ...currentRow.espnOdds } : null, simResult:null } : currentRow)); setEditingIdx(null); }} style={{ background:"transparent", border:"1px solid rgba(239,68,68,0.18)", borderRadius:4, padding:"5px 14px", color:"#6b2424", fontSize:10, fontFamily:"monospace", cursor:"pointer" }}>
                              RESET
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasSimResults && (() => {
        const simmed = linesRows.filter((row) => row.simResult);
        if (!simmed.length) return null;
        return (
          <div>
            <div style={{ fontSize:9, fontWeight:700, color:"#5a4a2a", letterSpacing:3, marginBottom:12 }}>SIM RESULTS SUMMARY</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))", gap:10 }}>
              {simmed.map((row, index) => {
                const sim = row.simResult;
                const odds = row.editedOdds || { homeMoneyline:null, awayMoneyline:null, spread:null, spreadHomeOdds:-110, spreadAwayOdds:-110, overUnder:null, overOdds:-110, underOdds:-110 };
                const hasOdds = !!(row.editedOdds && odds.homeMoneyline != null && odds.overUnder != null);
                const analysis = hasOdds ? analyzeBetting(sim, odds) : null;
                const homePct = sim.hWinProb * 100;
                const awayPct = sim.aWinProb * 100;
                const hasValue = analysis && (analysis.mlValueSide !== "none" || analysis.spreadRec !== "pass" || analysis.ouRec !== "pass");
                const homeStats = liveStats[row.game.homeAbbr] ? { ...TEAMS[row.game.homeAbbr], ...liveStats[row.game.homeAbbr] } : TEAMS[row.game.homeAbbr];
                const awayStats = liveStats[row.game.awayAbbr] ? { ...TEAMS[row.game.awayAbbr], ...liveStats[row.game.awayAbbr] } : TEAMS[row.game.awayAbbr];
                const netDiff = homeStats.netRtg - awayStats.netRtg;

                return (
                  <div key={index} style={{ background:hasValue ? "rgba(63,185,80,0.05)" : "#0f0800", border:`1px solid ${hasValue ? "rgba(63,185,80,0.2)" : "#251800"}`, borderRadius:7, padding:13 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#e8d5a0", fontFamily:"'Oswald',monospace" }}>
                        {row.game.homeAbbr} <span style={{ color:"#3a2a1a", fontWeight:400 }}>vs</span> {row.game.awayAbbr}
                      </div>
                      <div style={{ display:"flex", gap:4 }}>
                        {row.homeB2B && <span style={{ fontSize:8, background:"rgba(251,113,133,0.12)", border:"1px solid rgba(251,113,133,0.35)", borderRadius:3, padding:"1px 5px", color:"#fda4af" }}>{row.game.homeAbbr} B2B</span>}
                        {row.awayB2B && <span style={{ fontSize:8, background:"rgba(251,113,133,0.12)", border:"1px solid rgba(251,113,133,0.35)", borderRadius:3, padding:"1px 5px", color:"#fda4af" }}>{row.game.awayAbbr} B2B</span>}
                        {hasValue && <span style={{ fontSize:8, background:"rgba(63,185,80,0.1)", border:"1px solid rgba(63,185,80,0.25)", borderRadius:3, padding:"1px 5px", color:"#3fb950" }}>VALUE</span>}
                      </div>
                    </div>
                    <div style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", borderRadius:4, overflow:"hidden", height:22 }}>
                        <div style={{ width:`${homePct}%`, background:"linear-gradient(90deg,#b45309,#d97706)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <span style={{ fontSize:10, fontWeight:700, color:"#fff" }}>{homePct.toFixed(1)}%</span>
                        </div>
                        <div style={{ flex:1, background:"linear-gradient(90deg,#78350f,#92400e)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <span style={{ fontSize:10, fontWeight:700, color:"#fde68a" }}>{awayPct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#3a2a1a", marginTop:2 }}>
                        <span>{row.game.homeAbbr} | {row.game.gameTime}</span>
                        <span>{row.game.awayAbbr} away</span>
                      </div>
                    </div>
                    {!hasOdds && (
                      <div style={{ background:"#0a0600", borderRadius:5, padding:"9px 10px", border:"1px solid #1a1000", marginBottom:6, fontSize:10, color:"#5a4a2a", textAlign:"center", letterSpacing:2 }}>
                        NO LINES | ADD ODDS VIA BULK EDIT OR EDIT TO UNLOCK ANALYSIS
                      </div>
                    )}
                    {hasOdds && (() => {
                      const modelHomeML = mlAmerican(sim.hWinProb);
                      const modelAwayML = mlAmerican(sim.aWinProb);
                      const mlGood = analysis.mlValueSide !== "none";
                      const mlSideLabel = analysis.mlValueSide === "home" ? row.game.homeAbbr : analysis.mlValueSide === "away" ? row.game.awayAbbr : null;
                      const mlKelly = analysis.mlValueSide === "home" ? analysis.kellyHome : analysis.kellyAway;
                      return (
                        <div style={{ background:"#0a0600", borderRadius:5, padding:"9px 10px", border:`1px solid ${mlGood ? "rgba(63,185,80,0.3)" : "#1a1000"}`, marginBottom:6 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                            <div style={{ fontSize:8, color:"#5a4a2a", letterSpacing:2, fontWeight:700 }}>MONEYLINE</div>
                            <div style={{ fontSize:10, fontWeight:700, color:mlGood ? "#3fb950" : "#3a2a1a" }}>
                              {mlGood ? `${mlSideLabel} +${analysis.mlValuePct.toFixed(1)}% EDGE` : "PASS"}
                            </div>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:4 }}>
                            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:3, padding:"5px 6px" }}>
                              <div style={{ fontSize:7, color:"#5a4a2a", letterSpacing:1, marginBottom:2 }}>VEGAS H/A</div>
                              <div style={{ fontSize:10, fontWeight:700, color:"#d4b870", fontFamily:"monospace" }}>{odds.homeMoneyline > 0 ? "+" : ""}{odds.homeMoneyline} / {odds.awayMoneyline > 0 ? "+" : ""}{odds.awayMoneyline}</div>
                            </div>
                            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:3, padding:"5px 6px" }}>
                              <div style={{ fontSize:7, color:"#5a4a2a", letterSpacing:1, marginBottom:2 }}>IMPLIED H/A</div>
                              <div style={{ fontSize:10, fontWeight:700, color:"#9a8a5a", fontFamily:"monospace" }}>{(analysis.homeImpliedProb * 100).toFixed(1)}% / {(analysis.awayImpliedProb * 100).toFixed(1)}%</div>
                            </div>
                            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:3, padding:"5px 6px" }}>
                              <div style={{ fontSize:7, color:"#5a4a2a", letterSpacing:1, marginBottom:2 }}>MODEL H/A</div>
                              <div style={{ fontSize:10, fontWeight:700, color:"#e8d5a0", fontFamily:"monospace" }}>{(sim.hWinProb * 100).toFixed(1)}% / {(sim.aWinProb * 100).toFixed(1)}%</div>
                              <div style={{ fontSize:8, color:"#6a5a3a", marginTop:1 }}>{modelHomeML} / {modelAwayML}</div>
                            </div>
                            <div style={{ background:mlGood ? "rgba(63,185,80,0.08)" : "rgba(0,0,0,0.3)", borderRadius:3, padding:"5px 6px", border:mlGood ? "1px solid rgba(63,185,80,0.2)" : "none" }}>
                              <div style={{ fontSize:7, color:"#5a4a2a", letterSpacing:1, marginBottom:2 }}>EDGE / KELLY</div>
                              <div style={{ fontSize:10, fontWeight:700, color:mlGood ? "#3fb950" : "#3a2a1a", fontFamily:"monospace" }}>{mlGood ? `+${analysis.mlValuePct.toFixed(1)}%` : "-"}</div>
                              <div style={{ fontSize:8, color:mlGood ? "#3fb950" : "#3a2a1a", marginTop:1 }}>0.25K: {mlGood ? `${(mlKelly * 100).toFixed(1)}%` : "-"}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {hasOdds && (() => {
                      const spreadGood = analysis.spreadRec !== "pass";
                      const sideHome = spreadGood && analysis.spreadRec.startsWith("home");
                      const spreadLabel = spreadGood ? (sideHome ? `${row.game.homeAbbr} ${odds.spread > 0 ? "+" : ""}${odds.spread}` : `${row.game.awayAbbr} ${odds.spread <= 0 ? "+" : ""}${Math.abs(odds.spread)}`) : null;
                      const vegasSpreadHome = odds.spreadHomeOdds || -110;
                      const vegasSpreadAway = odds.spreadAwayOdds || -110;
                      return (
                        <div style={{ background:"#0a0600", borderRadius:5, padding:"9px 10px", border:`1px solid ${spreadGood ? "rgba(63,185,80,0.3)" : "#1a1000"}`, marginBottom:6 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                            <div style={{ fontSize:8, color:"#5a4a2a", letterSpacing:2, fontWeight:700 }}>SPREAD H{odds.spread > 0 ? "+" : ""}{odds.spread}</div>
                            <div style={{ fontSize:10, fontWeight:700, color:spreadGood ? "#3fb950" : "#3a2a1a" }}>
                              {spreadGood ? `${spreadLabel} +${analysis.spreadEdge.toFixed(1)}% EDGE` : "PASS"}
                            </div>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:4 }}>
                            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:3, padding:"5px 6px" }}>
                              <div style={{ fontSize:7, color:"#5a4a2a", letterSpacing:1, marginBottom:2 }}>VEGAS H/A ODDS</div>
                              <div style={{ fontSize:10, fontWeight:700, color:"#d4b870", fontFamily:"monospace" }}>{vegasSpreadHome > 0 ? "+" : ""}{vegasSpreadHome} / {vegasSpreadAway > 0 ? "+" : ""}{vegasSpreadAway}</div>
                            </div>
                            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:3, padding:"5px 6px" }}>
                              <div style={{ fontSize:7, color:"#5a4a2a", letterSpacing:1, marginBottom:2 }}>IMPLIED H/A</div>
                              <div style={{ fontSize:10, fontWeight:700, color:"#9a8a5a", fontFamily:"monospace" }}>{(analysis.spHIC * 100).toFixed(1)}% / {(analysis.spAIC * 100).toFixed(1)}%</div>
                            </div>
                            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:3, padding:"5px 6px" }}>
                              <div style={{ fontSize:7, color:"#5a4a2a", letterSpacing:1, marginBottom:2 }}>MODEL COVER H/A</div>
                              <div style={{ fontSize:10, fontWeight:700, color:"#e8d5a0", fontFamily:"monospace" }}>{(analysis.homeCoverProb * 100).toFixed(1)}% / {(analysis.awayCoverProb * 100).toFixed(1)}%</div>
                              <div style={{ fontSize:8, color:"#6a5a3a", marginTop:1 }}>Proj diff: {parseFloat(sim.projDiff) > 0 ? "+" : ""}{sim.projDiff} pts</div>
                            </div>
                            <div style={{ background:spreadGood ? "rgba(63,185,80,0.08)" : "rgba(0,0,0,0.3)", borderRadius:3, padding:"5px 6px", border:spreadGood ? "1px solid rgba(63,185,80,0.2)" : "none" }}>
                              <div style={{ fontSize:7, color:"#5a4a2a", letterSpacing:1, marginBottom:2 }}>EDGE / KELLY</div>
                              <div style={{ fontSize:10, fontWeight:700, color:spreadGood ? "#3fb950" : "#3a2a1a", fontFamily:"monospace" }}>{spreadGood ? `+${analysis.spreadEdge.toFixed(1)}%` : "-"}</div>
                              <div style={{ fontSize:8, color:spreadGood ? "#3fb950" : "#3a2a1a", marginTop:1 }}>0.25K: {spreadGood ? `${(analysis.kellySpread * 100).toFixed(1)}%` : "-"}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {hasOdds && (() => {
                      const ouGood = analysis.ouRec !== "pass";
                      const overOdds = odds.overOdds || -110;
                      const underOdds = odds.underOdds || -110;
                      return (
                        <div style={{ background:"#0a0600", borderRadius:5, padding:"9px 10px", border:`1px solid ${ouGood ? "rgba(63,185,80,0.3)" : "#1a1000"}`, marginBottom:6 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                            <div style={{ fontSize:8, color:"#5a4a2a", letterSpacing:2, fontWeight:700 }}>O/U {odds.overUnder}</div>
                            <div style={{ fontSize:10, fontWeight:700, color:ouGood ? "#3fb950" : "#3a2a1a" }}>
                              {ouGood ? `${analysis.ouRec.toUpperCase()} +${analysis.ouEdgePct.toFixed(1)}% EDGE` : "PASS"}
                            </div>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:4 }}>
                            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:3, padding:"5px 6px" }}>
                              <div style={{ fontSize:7, color:"#5a4a2a", letterSpacing:1, marginBottom:2 }}>VEGAS O/U ODDS</div>
                              <div style={{ fontSize:10, fontWeight:700, color:"#d4b870", fontFamily:"monospace" }}>O{overOdds > 0 ? "+" : ""}{overOdds} / U{underOdds > 0 ? "+" : ""}{underOdds}</div>
                            </div>
                            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:3, padding:"5px 6px" }}>
                              <div style={{ fontSize:7, color:"#5a4a2a", letterSpacing:1, marginBottom:2 }}>IMPLIED O/U</div>
                              <div style={{ fontSize:10, fontWeight:700, color:"#9a8a5a", fontFamily:"monospace" }}>{(analysis.ovIC * 100).toFixed(1)}% / {(analysis.unIC * 100).toFixed(1)}%</div>
                            </div>
                            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:3, padding:"5px 6px" }}>
                              <div style={{ fontSize:7, color:"#5a4a2a", letterSpacing:1, marginBottom:2 }}>MODEL TOTAL / P(OVER)</div>
                              <div style={{ fontSize:10, fontWeight:700, color:"#e8d5a0", fontFamily:"monospace" }}>{sim.total} ({analysis.ouEdge > 0 ? "+" : ""}{analysis.ouEdge.toFixed(1)} pts)</div>
                              <div style={{ fontSize:8, color:"#6a5a3a", marginTop:1 }}>P(over): {(analysis.pOver * 100).toFixed(1)}%</div>
                            </div>
                            <div style={{ background:ouGood ? "rgba(63,185,80,0.08)" : "rgba(0,0,0,0.3)", borderRadius:3, padding:"5px 6px", border:ouGood ? "1px solid rgba(63,185,80,0.2)" : "none" }}>
                              <div style={{ fontSize:7, color:"#5a4a2a", letterSpacing:1, marginBottom:2 }}>EDGE / KELLY</div>
                              <div style={{ fontSize:10, fontWeight:700, color:ouGood ? "#3fb950" : "#3a2a1a", fontFamily:"monospace" }}>{ouGood ? `+${analysis.ouEdgePct.toFixed(1)}%` : "-"}</div>
                              <div style={{ fontSize:8, color:ouGood ? "#3fb950" : "#3a2a1a", marginTop:1 }}>0.25K: {ouGood ? `${(analysis.kellyOU * 100).toFixed(1)}%` : "-"}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{ display:"grid", gridTemplateColumns:hasOdds ? "1fr 1fr" : "1fr", gap:6 }}>
                      {hasOdds && (
                        <div style={{ background:"#0a0600", borderRadius:5, padding:"9px 10px", border:"1px solid #1a1000" }}>
                          <div style={{ fontSize:8, color:"#5a4a2a", letterSpacing:2, fontWeight:700, marginBottom:6 }}>MODEL EDGE SUMMARY</div>
                          {[
                            { label:"ML", value:analysis.mlValueSide !== "none", text:analysis.mlValueSide !== "none" ? `${analysis.mlValueSide === "home" ? row.game.homeAbbr : row.game.awayAbbr} +${analysis.mlValuePct.toFixed(1)}%` : "-" },
                            { label:"SPR", value:analysis.spreadRec !== "pass", text:analysis.spreadRec !== "pass" ? `+${analysis.spreadEdge.toFixed(1)}%` : "-" },
                            { label:"O/U", value:analysis.ouRec !== "pass", text:analysis.ouRec !== "pass" ? `${analysis.ouRec.toUpperCase()} +${analysis.ouEdgePct.toFixed(1)}%` : "-" },
                          ].map((item) => (
                            <div key={item.label} style={{ display:"flex", justifyContent:"space-between", padding:"2px 0", borderBottom:"1px solid rgba(255,200,80,0.04)" }}>
                              <span style={{ fontSize:9, color:"#5a4a2a" }}>{item.label}</span>
                              <span style={{ fontSize:9, fontWeight:700, color:item.value ? "#3fb950" : "#3a2a1a", fontFamily:"monospace" }}>{item.text}</span>
                            </div>
                          ))}
                          <div style={{ marginTop:6, paddingTop:5, borderTop:"1px solid rgba(255,200,80,0.08)" }}>
                            <div style={{ fontSize:7, color:"#5a4a2a", letterSpacing:1, marginBottom:3 }}>0.25 KELLY STAKE</div>
                            <div style={{ display:"flex", gap:8 }}>
                              {[
                                { label:"ML", amount:analysis.mlValueSide !== "none" ? (analysis.mlValueSide === "home" ? analysis.kellyHome : analysis.kellyAway) : 0 },
                                { label:"SPR", amount:analysis.kellySpread },
                                { label:"O/U", amount:analysis.kellyOU },
                              ].map((item) => (
                                <div key={item.label} style={{ flex:1, background:"rgba(0,0,0,0.3)", borderRadius:3, padding:"3px 5px", textAlign:"center" }}>
                                  <div style={{ fontSize:7, color:"#5a4a2a" }}>{item.label}</div>
                                  <div style={{ fontSize:10, fontWeight:700, color:item.amount > 0 ? "#fbbf24" : "#3a2a1a", fontFamily:"monospace" }}>{item.amount > 0 ? `${(item.amount * 100).toFixed(1)}%` : "-"}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        <div style={{ background:"#0a0600", borderRadius:5, padding:"7px 8px", border:"1px solid #1a1000", flex:1 }}>
                          <div style={{ fontSize:8, color:"#5a4a2a", marginBottom:3 }}>PROJECTED SCORE</div>
                          <div style={{ fontSize:16, fontWeight:700, color:"#e8d5a0", fontFamily:"'Oswald',monospace" }}>{sim.hScore} - {sim.aScore}</div>
                          <div style={{ fontSize:9, color:"#3a2a1a", marginTop:2 }}>Total: {sim.total}</div>
                        </div>
                        <div style={{ background:"#0a0600", borderRadius:5, padding:"7px 8px", border:"1px solid #1a1000", flex:1 }}>
                          <div style={{ fontSize:8, color:"#5a4a2a", marginBottom:3 }}>NET RTG EDGE</div>
                          <div style={{ fontSize:16, fontWeight:700, color:netDiff > 0 ? "#fbbf24" : "#f87171", fontFamily:"monospace" }}>{netDiff > 0 ? "+" : ""}{netDiff.toFixed(1)}</div>
                          <div style={{ fontSize:9, color:"#3a2a1a", marginTop:2 }}>{row.game.homeAbbr} {homeStats.netRtg >= 0 ? "+" : ""}{homeStats.netRtg.toFixed(1)} / {row.game.awayAbbr} {awayStats.netRtg >= 0 ? "+" : ""}{awayStats.netRtg.toFixed(1)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {hasSimResults && (() => {
        const bets = [];
        for (const row of linesRows) {
          const sim = row.simResult;
          if (!sim) continue;
          const odds = row.editedOdds;
          if (!odds || odds.homeMoneyline == null || odds.overUnder == null) continue;
          const analysis = analyzeBetting(sim, odds);
          const matchup = `${row.game.homeAbbr} vs ${row.game.awayAbbr}`;
          if (analysis.mlValueSide !== "none") {
            const side = analysis.mlValueSide === "home" ? row.game.homeAbbr : row.game.awayAbbr;
            const vegasML = analysis.mlValueSide === "home" ? odds.homeMoneyline : odds.awayMoneyline;
            const modelML = analysis.mlValueSide === "home" ? mlAmerican(sim.hWinProb) : mlAmerican(sim.aWinProb);
            const modelPct = analysis.mlValueSide === "home" ? sim.hWinProb * 100 : sim.aWinProb * 100;
            const kelly = analysis.mlValueSide === "home" ? analysis.kellyHome : analysis.kellyAway;
            bets.push({ matchup, type:"ML", pick:`${side} ML`, proj:`${modelPct.toFixed(1)}% win (fair ${modelML})`, odds:(vegasML > 0 ? "+" : "") + vegasML, edge:analysis.mlValuePct, kelly });
          }
          if (analysis.spreadRec !== "pass") {
            const side = analysis.spreadRec.startsWith("home") ? `${row.game.homeAbbr} ${odds.spread > 0 ? "+" : ""}${odds.spread}` : `${row.game.awayAbbr} +${Math.abs(odds.spread)}`;
            const coverPct = analysis.spreadRec.startsWith("home") ? analysis.homeCoverProb * 100 : analysis.awayCoverProb * 100;
            const spreadOdds = analysis.spreadRec.startsWith("home") ? odds.spreadHomeOdds : odds.spreadAwayOdds;
            bets.push({ matchup, type:"SPR", pick:side, proj:`${coverPct.toFixed(1)}% cover | proj ${sim.hScore}-${sim.aScore}`, odds:(spreadOdds > 0 ? "+" : "") + spreadOdds, edge:analysis.spreadEdge, kelly:analysis.kellySpread });
          }
          if (analysis.ouRec !== "pass") {
            const ouSide = analysis.ouRec.toUpperCase();
            const ouPct = analysis.ouRec === "over" ? analysis.pOver * 100 : analysis.pUnder * 100;
            const ouOdds = analysis.ouRec === "over" ? odds.overOdds : odds.underOdds;
            bets.push({ matchup, type:"O/U", pick:`${ouSide} ${odds.overUnder}`, proj:`Model total ${sim.total} | P(${ouSide.toLowerCase()}) ${ouPct.toFixed(1)}%`, odds:(ouOdds > 0 ? "+" : "") + ouOdds, edge:analysis.ouEdgePct, kelly:analysis.kellyOU });
          }
        }
        if (!bets.length) return null;
        bets.sort((a, b) => b.edge - a.edge);
        const typeColor = { ML:"#fbbf24", SPR:"#60a5fa", "O/U":"#a78bfa" };
        return (
          <div style={{ ...card, marginTop:10, border:"1px solid rgba(63,185,80,0.25)", padding:"10px 12px", maxWidth:"66%" }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#3fb950", letterSpacing:3, marginBottom:8 }}>BEST BETS | {bets.length} PLAYS | SORTED BY EDGE</div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {bets.map((bet, index) => (
                <div key={index} style={{ display:"grid", gridTemplateColumns:"auto 1fr auto auto auto", gap:8, alignItems:"center", background:"#0a0600", borderRadius:4, padding:"5px 8px", border:"1px solid #1a1000" }}>
                  <span style={{ fontSize:8, fontWeight:700, background:`${typeColor[bet.type]}22`, border:`1px solid ${typeColor[bet.type]}55`, borderRadius:3, padding:"1px 5px", color:typeColor[bet.type], fontFamily:"monospace", whiteSpace:"nowrap" }}>{bet.type}</span>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#e8d5a0", fontFamily:"'Oswald',monospace" }}>{bet.matchup} | <span style={{ color:"#3fb950" }}>{bet.pick}</span></div>
                    <div style={{ fontSize:9, color:"#5a4a2a" }}>{bet.proj}</div>
                  </div>
                  <div style={{ textAlign:"center", minWidth:38 }}>
                    <div style={{ fontSize:8, color:"#5a4a2a" }}>ODDS</div>
                    <div style={{ fontSize:10, fontWeight:700, color:"#e8d5a0", fontFamily:"monospace" }}>{bet.odds}</div>
                  </div>
                  <div style={{ textAlign:"center", minWidth:42 }}>
                    <div style={{ fontSize:8, color:"#5a4a2a" }}>EDGE</div>
                    <div style={{ fontSize:10, fontWeight:700, color:"#3fb950", fontFamily:"monospace" }}>+{bet.edge.toFixed(1)}%</div>
                  </div>
                  <div style={{ textAlign:"center", minWidth:46 }}>
                    <div style={{ fontSize:8, color:"#5a4a2a" }}>0.25 K</div>
                    <div style={{ fontSize:10, fontWeight:700, color:"#fbbf24", fontFamily:"monospace" }}>{(bet.kelly * 100).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
