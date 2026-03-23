import type { Dispatch, SetStateAction } from 'react'

import type { UseResultsTrackerReturn } from '../hooks/useResultsTracker'
import type { GradedPredictionRow, PredictionLogEntry, ResultLogEntry, TrackerStats } from '../lib/nbaTypes'

type ResultsTrackerProps = {
  resultsStatus: string
  resultsError: string
  gradedRows: GradedPredictionRow[]
  stats: TrackerStats
  handleFetchResults: UseResultsTrackerReturn['handleFetchResults']
  fetchingResults: boolean
  showResultsPaste: boolean
  setShowResultsPaste: Dispatch<SetStateAction<boolean>>
  showPredPaste: boolean
  setShowPredPaste: Dispatch<SetStateAction<boolean>>
  resultsLog: ResultLogEntry[]
  predLog: PredictionLogEntry[]
  setResultsLog: Dispatch<SetStateAction<ResultLogEntry[]>>
  setPredLog: Dispatch<SetStateAction<PredictionLogEntry[]>>
  setResultsStatus: Dispatch<SetStateAction<string>>
  resultsPaste: string
  setResultsPaste: Dispatch<SetStateAction<string>>
  handleImportResults: () => void
  predPaste: string
  setPredPaste: Dispatch<SetStateAction<string>>
  handleImportPredictions: () => void
}

export default function ResultsTracker({
  resultsStatus,
  resultsError,
  gradedRows,
  stats,
  handleFetchResults,
  fetchingResults,
  showResultsPaste,
  setShowResultsPaste,
  showPredPaste,
  setShowPredPaste,
  resultsLog,
  predLog,
  setResultsLog,
  setPredLog,
  setResultsStatus,
  resultsPaste,
  setResultsPaste,
  handleImportResults,
  predPaste,
  setPredPaste,
  handleImportPredictions,
}: ResultsTrackerProps) {
  return (
    <div style={{ animation:"fadeUp 0.2s ease" }}>
      {resultsStatus && <div style={{ fontSize:11, color:"#3fb950", marginBottom:10, fontFamily:"monospace" }}>OK {resultsStatus}</div>}
      {resultsError  && <div style={{ fontSize:11, color:"#f87171", marginBottom:10, fontFamily:"monospace" }}>WARN {resultsError}</div>}

      {gradedRows.some(r => r.graded) && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
          {[{label:"MONEYLINE",s:stats.ml},{label:"SPREAD ATS",s:stats.spr},{label:"OVER / UNDER",s:stats.ou}].map(({label,s}) => (
            <div key={label} style={{ background:"rgba(255,200,80,0.03)", border:"1px solid rgba(255,200,80,0.13)", borderRadius:8, padding:"14px 16px" }}>
              <div style={{ fontSize:9, color:"#7a6a3a", letterSpacing:3, marginBottom:8 }}>{label}</div>
              <div style={{ fontSize:28, fontWeight:700, color:"#e8d5a0", fontFamily:"'Oswald',monospace", lineHeight:1 }}>{s.w}-{s.l}</div>
              <div style={{ fontSize:10, color:"#9a8a5a", marginTop:4 }}>{s.pct}% | ROI {parseFloat(s.roi)>=0?"+":""}{s.roi}u</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
        <button onClick={()=>handleFetchResults(false)} disabled={fetchingResults} style={{ background:fetchingResults?"#0f0800":"linear-gradient(135deg,#1d4ed8,#3b82f6)", border:"none", borderRadius:5, padding:"8px 16px", color:fetchingResults?"#3a2a1a":"#eff6ff", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:fetchingResults?"not-allowed":"pointer" }}>
          {fetchingResults ? "FETCHING..." : "DOWNLOAD YESTERDAY'S RESULTS"}
        </button>
        <button onClick={()=>setShowResultsPaste(v=>!v)} style={{ background:showResultsPaste?"rgba(251,191,36,0.12)":"rgba(255,200,80,0.06)", border:"1px solid rgba(255,200,80,0.2)", borderRadius:5, padding:"8px 16px", color:showResultsPaste?"#fbbf24":"#9a8a5a", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>
          {showResultsPaste ? "HIDE" : "PASTE RESULTS CSV"}
        </button>
        <button onClick={()=>setShowPredPaste(v=>!v)} style={{ background:showPredPaste?"rgba(251,191,36,0.12)":"rgba(255,200,80,0.06)", border:"1px solid rgba(255,200,80,0.2)", borderRadius:5, padding:"8px 16px", color:showPredPaste?"#fbbf24":"#9a8a5a", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>
          {showPredPaste ? "HIDE" : "PASTE PREDICTIONS CSV"}
        </button>
        {(resultsLog.length>0||predLog.length>0) && (
          <button onClick={()=>{ setResultsLog([]); setPredLog([]); setResultsStatus("Cleared all data"); }} style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:5, padding:"8px 16px", color:"#f87171", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>
            CLEAR ALL
          </button>
        )}
      </div>

      {showResultsPaste && (
        <div style={{ background:"rgba(255,200,80,0.03)", border:"1px solid rgba(255,200,80,0.15)", borderRadius:6, padding:14, marginBottom:12, animation:"fadeUp 0.2s ease" }}>
          <div style={{ fontSize:9, color:"#7a6a3a", letterSpacing:3, marginBottom:8 }}>PASTE RESULTS CSV Â· columns: Date, Home, Away, Home Score, Away Score</div>
          <textarea value={resultsPaste} onChange={e=>setResultsPaste(e.target.value)} rows={6} style={{ width:"100%", background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,200,80,0.2)", borderRadius:4, padding:"8px 10px", color:"#e8d5a0", fontFamily:"monospace", fontSize:11, resize:"vertical", boxSizing:"border-box" }} placeholder={"Date,Home,Away,Home Score,Away Score\n2026-03-09,BOS,LAL,112,108"} />
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button onClick={handleImportResults} style={{ background:"linear-gradient(135deg,#ca8a04,#eab308)", border:"none", borderRadius:4, padding:"7px 16px", color:"#1a1200", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>IMPORT</button>
            <button onClick={()=>{ setResultsPaste(""); setShowResultsPaste(false); }} style={{ background:"transparent", border:"1px solid rgba(255,200,80,0.15)", borderRadius:4, padding:"7px 14px", color:"#6a5a3a", fontSize:10, fontFamily:"monospace", cursor:"pointer" }}>CANCEL</button>
          </div>
        </div>
      )}

      {showPredPaste && (
        <div style={{ background:"rgba(255,200,80,0.03)", border:"1px solid rgba(255,200,80,0.15)", borderRadius:6, padding:14, marginBottom:12, animation:"fadeUp 0.2s ease" }}>
          <div style={{ fontSize:9, color:"#7a6a3a", letterSpacing:3, marginBottom:8 }}>PASTE PREDICTIONS CSV | export from the Predictor tab using EXPORT CSV</div>
          <textarea value={predPaste} onChange={e=>setPredPaste(e.target.value)} rows={6} style={{ width:"100%", background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,200,80,0.2)", borderRadius:4, padding:"8px 10px", color:"#e8d5a0", fontFamily:"monospace", fontSize:11, resize:"vertical", boxSizing:"border-box" }} placeholder="Paste the full nba-predictions-YYYY-MM-DD.csv content here..." />
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button onClick={handleImportPredictions} style={{ background:"linear-gradient(135deg,#ca8a04,#eab308)", border:"none", borderRadius:4, padding:"7px 16px", color:"#1a1200", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>IMPORT</button>
            <button onClick={()=>{ setPredPaste(""); setShowPredPaste(false); }} style={{ background:"transparent", border:"1px solid rgba(255,200,80,0.15)", borderRadius:4, padding:"7px 14px", color:"#6a5a3a", fontSize:10, fontFamily:"monospace", cursor:"pointer" }}>CANCEL</button>
          </div>
        </div>
      )}

      {predLog.length > 0 && (
        <div style={{ background:"#0f0800", border:"1px solid #251800", borderRadius:8, padding:16 }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#5a4a2a", letterSpacing:3, marginBottom:12 }}>
            GAME LOG | {predLog.length} predictions | {gradedRows.filter(r=>r.graded).length} graded
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"monospace", fontSize:11, minWidth:900 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(255,200,80,0.2)" }}>
                  {["DATE","MATCHUP","PROJ","ACTUAL","TOTAL","V.OU","O/U REC","ML REC","ML","SPR REC","SPR","RESULT"].map(h=>(
                    <th key={h} style={{ padding:"6px 8px", textAlign:"left", fontSize:8, color:"#5a4a2a", letterSpacing:2, fontWeight:700, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gradedRows.map((row,i) => {
                  const has = row.graded;
                  const resultRow = row.res
                  const wC  = (v: boolean | null | undefined) => v===true?"#3fb950":v===false?"#f87171":"#5a4a2a";
                  return (
                    <tr key={i} style={{ borderBottom:"1px solid rgba(255,200,80,0.05)", background:i%2===0?"transparent":"rgba(255,200,80,0.015)" }}>
                      <td style={{ padding:"6px 8px", color:"#7a6a3a", whiteSpace:"nowrap" }}>{row.date}</td>
                      <td style={{ padding:"6px 8px", color:"#e8d5a0", fontWeight:700, whiteSpace:"nowrap" }}>{row.home} vs {row.away}</td>
                      <td style={{ padding:"6px 8px", color:"#9a8a5a", whiteSpace:"nowrap" }}>{row.hProj&&row.aProj?`${row.hProj}-${row.aProj}`:"-"}</td>
                      <td style={{ padding:"6px 8px", color:has?"#e8d5a0":"#3a2a1a", fontWeight:has?700:400, whiteSpace:"nowrap" }}>{has&&resultRow?`${resultRow.hScore}-${resultRow.aScore}`:"pending"}</td>
                      <td style={{ padding:"6px 8px", color:has?wC(row.ouWin):"#5a4a2a", whiteSpace:"nowrap" }}>{has?row.actualTotal:"-"}{row.modelTotal?` (m${row.modelTotal})`:""}</td>
                      <td style={{ padding:"6px 8px", color:"#7a6a3a" }}>{row.vegaOU??"-"}</td>
                      <td style={{ padding:"6px 8px", whiteSpace:"nowrap" }}>
                        <span style={{ color:has?wC(row.ouWin):"#3a2a1a", fontWeight:700 }}>{row.ouRec&&row.ouRec!=="-"?row.ouRec:"PASS"}</span>
                        {has&&row.ouWin!==null&&<span style={{ fontSize:9, color:wC(row.ouWin), marginLeft:4 }}>{row.ouWin?"W":"L"}</span>}
                      </td>
                      <td style={{ padding:"6px 8px", color:"#9a8a5a", whiteSpace:"nowrap" }}>
                        {row.mlRec && row.mlRec !== "-" ? row.mlRec : "PASS"}
                      </td>
                      <td style={{ padding:"6px 8px", whiteSpace:"nowrap" }}>
                        <span style={{ color:has&&row.mlWin!==null?wC(row.mlWin):"#3a2a1a", fontWeight:700 }}>{has&&row.mlWin!==null?(row.mlWin?"WIN":"LOSS"):"-"}</span>
                        {has&&row.mlWin!==null&&row.mlROI!=null&&<span style={{ fontSize:9, color:wC(row.mlWin), marginLeft:4 }}>{row.mlROI>=0?"+":""}{row.mlROI.toFixed(2)}u</span>}
                      </td>
                      <td style={{ padding:"6px 8px", color:"#9a8a5a", whiteSpace:"nowrap", fontSize:10 }}>{row.sprRec&&row.sprRec!=="-"&&row.sprRec!=="PASS"?row.sprRec:"PASS"}</td>
                      <td style={{ padding:"6px 8px", whiteSpace:"nowrap" }}>
                        <span style={{ color:has&&row.sprWin!==null?wC(row.sprWin):"#3a2a1a", fontWeight:700 }}>{has&&row.sprWin!==null?(row.sprWin?"WIN":"LOSS"):"-"}</span>
                        {has&&row.sprWin!==null&&row.sprROI!=null&&<span style={{ fontSize:9, color:wC(row.sprWin), marginLeft:4 }}>{row.sprROI>=0?"+":""}{row.sprROI.toFixed(2)}u</span>}
                      </td>
                      <td style={{ padding:"6px 8px", whiteSpace:"nowrap" }}>
                        {has&&resultRow?(
                          <span style={{ fontSize:9, padding:"2px 7px", borderRadius:3, background:resultRow.hScore>resultRow.aScore?"rgba(251,191,36,0.1)":"rgba(255,100,100,0.08)", color:resultRow.hScore>resultRow.aScore?"#fbbf24":"#f87171", border:`1px solid ${resultRow.hScore>resultRow.aScore?"rgba(251,191,36,0.25)":"rgba(255,100,100,0.2)"}` }}>
                            {resultRow.hScore>resultRow.aScore?row.home:row.away} +{Math.abs(resultRow.hScore-resultRow.aScore)}
                          </span>
                        ):<span style={{ color:"#3a2a1a" }}>-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {predLog.length===0&&resultsLog.length===0&&(
        <div style={{ background:"rgba(255,200,80,0.02)", border:"1px solid rgba(255,200,80,0.08)", borderRadius:8, padding:40, textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:12, opacity:0.3 }}>STATS</div>
          <div style={{ fontSize:11, color:"#5a4a2a", letterSpacing:2 }}>NO DATA YET</div>
          <div style={{ fontSize:10, color:"#3a2a1a", marginTop:8, lineHeight:2 }}>
            1. Run sims in the Predictor tab and export CSV<br/>
            2. Come back here and paste predictions CSV<br/>
            3. After games finish, fetch results or paste manually<br/>
            4. Model grades itself automatically
          </div>
        </div>
      )}
    </div>
  );
}
