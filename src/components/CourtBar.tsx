// @ts-nocheck
export default function CourtBar({ hProb, hColor, aColor }) {
  return (
    <div style={{ position:"relative", height:54, borderRadius:8, overflow:"hidden", border:"1px solid rgba(255,200,80,0.12)" }}>
      <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:2, background:"rgba(255,200,80,0.12)", zIndex:3 }} />
      <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", width:34, height:34, borderRadius:"50%", border:"2px solid rgba(255,200,80,0.12)", zIndex:3 }} />
      <div style={{ width:`${hProb*100}%`, background:`linear-gradient(90deg,${hColor}ee,${hColor}88)`, height:"100%", display:"flex", alignItems:"center", paddingLeft:14, transition:"width 1.2s cubic-bezier(.4,0,.2,1)", position:"relative", zIndex:1 }}>
        <span style={{ fontSize:16, fontWeight:900, color:"#fff", fontFamily:"'Oswald',sans-serif", textShadow:"0 2px 8px rgba(0,0,0,0.9)" }}>{(hProb*100).toFixed(1)}%</span>
      </div>
      <div style={{ position:"absolute", right:0, top:0, width:`${(1-hProb)*100}%`, background:`linear-gradient(90deg,${aColor}88,${aColor}ee)`, height:"100%", display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:14, transition:"width 1.2s cubic-bezier(.4,0,.2,1)", zIndex:1 }}>
        <span style={{ fontSize:16, fontWeight:900, color:"#fff", fontFamily:"'Oswald',sans-serif", textShadow:"0 2px 8px rgba(0,0,0,0.9)" }}>{((1-hProb)*100).toFixed(1)}%</span>
      </div>
    </div>
  );
}
