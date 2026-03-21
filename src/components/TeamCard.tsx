// @ts-nocheck
import { TEAMS } from "../lib/nbaModel";

export default function TeamCard({ abbr, side, espnData, liveStats }) {
  const base  = TEAMS[abbr];
  const live  = liveStats?.[abbr];
  const s     = live ? { ...base, ...live } : base;
  const color = espnData?.[abbr]?.color ?? base.color;
  return (
    <div style={{ background:`linear-gradient(135deg,${color}16,transparent)`, border:`1px solid ${color}30`, borderRadius:8, padding:"12px 14px" }}>
      <div style={{ fontSize:10, color, letterSpacing:3, fontFamily:"monospace", marginBottom:2 }}>{side} Â· {base.div}</div>
      <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:18, color:"#e8d5a0", letterSpacing:2, marginBottom:10, display:"flex", alignItems:"center", gap:7 }}>
        {base.name.toUpperCase()}
        {live && <span style={{ fontSize:9, color:"#3fb950", background:"rgba(63,185,80,0.1)", border:"1px solid rgba(63,185,80,0.25)", borderRadius:3, padding:"1px 5px", fontFamily:"monospace" }}>BBRef</span>}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
        {[["OFF RTG",s.offRtg.toFixed(1)],["DEF RTG",s.defRtg.toFixed(1)],["NET RTG",`${s.netRtg>=0?"+":""}${s.netRtg.toFixed(1)}`],
          ["eFG%",`${s.efgPct.toFixed(1)}%`],["TOV%",`${s.tovPct.toFixed(1)}%`],["REB%",`${s.rebPct.toFixed(1)}%`],
          ["AST%",`${s.astPct.toFixed(1)}%`],["PACE",s.pace.toFixed(1)],["3PA%",`${s.threePAr.toFixed(1)}%`]
        ].map(([l,v]) => (
          <div key={l}>
            <div style={{ fontSize:9, color:"#7a6a3a", letterSpacing:1 }}>{l}</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#e8d5a0", fontFamily:"monospace" }}>{v}</div>
          </div>
        ))}
      </div>
      {live && <div style={{ marginTop:7, fontSize:9, color:"#5a9a6a", fontFamily:"monospace" }}>Updated: {live.lastUpdated}</div>}
      <div style={{ marginTop:live?4:7 }}>
        <span style={{ fontSize:10, padding:"2px 6px", borderRadius:2, background:"rgba(255,200,80,0.06)", color:"#7a6a3a" }}>{base.arena}</span>
      </div>
    </div>
  );
}
