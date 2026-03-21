// @ts-nocheck
export default function StatBar({ label, hVal, aVal, hColor, aColor, lo, hi, invert=false, fmt="num" }) {
  const norm = v => Math.max(0, Math.min(100, ((v-lo)/(hi-lo))*100));
  const disp = v => fmt==="pct" ? `${v.toFixed(1)}%` : v.toFixed(1);
  const mid  = (lo+hi)/2;
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ fontSize:10, color:"#7a6a3a", letterSpacing:2, marginBottom:4, fontFamily:"monospace" }}>{label}</div>
      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
        <span style={{ fontSize:12, fontWeight:700, color:(invert?hVal<=mid:hVal>=mid)?"#fbbf24":"#4b5563", width:52, textAlign:"right", fontFamily:"monospace" }}>{disp(hVal)}</span>
        <div style={{ flex:1, height:4, background:"rgba(255,200,80,0.1)", borderRadius:2, position:"relative" }}>
          <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${norm(hVal)}%`, background:hColor, opacity:0.8, borderRadius:2, transition:"width 1s ease" }} />
        </div>
        <div style={{ flex:1, height:4, background:"rgba(255,200,80,0.1)", borderRadius:2, position:"relative" }}>
          <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${norm(aVal)}%`, background:aColor, opacity:0.8, borderRadius:2, transition:"width 1s ease" }} />
        </div>
        <span style={{ fontSize:12, fontWeight:700, color:(invert?aVal<=mid:aVal>=mid)?"#fbbf24":"#4b5563", width:52, fontFamily:"monospace" }}>{disp(aVal)}</span>
      </div>
    </div>
  );
}
