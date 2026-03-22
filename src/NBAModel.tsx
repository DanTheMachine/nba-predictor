// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { analyzeBetting, americanToImplied, mlAmerican } from "./lib/betting";
import { DIVISIONS, GAME_TYPES, TEAMS, normalizeAbbr, parseBBRefCSV, predictGame } from "./lib/nbaModel";
import { downloadCSV, fetchB2BTeams, fetchNBAColors, fetchTodaySchedule, parseOddsFromEvent } from "./lib/espn";
import CourtBar from "./components/CourtBar";
import ModelEvaluation from "./components/ModelEvaluation";
import ResultsTracker from "./components/ResultsTracker";
import ScheduleAnalysis from "./components/ScheduleAnalysis";
import StatBar from "./components/StatBar";
import TeamCard from "./components/TeamCard";

// ─── Betting Math ─────────────────────────────────────────────────────────────



// ─── Main Component ───────────────────────────────────────────────────────────
export default function NBAModel() {
  const [homeTeam, setHomeTeam] = useState("BOS");
  const [awayTeam, setAwayTeam] = useState("LAL");
  const homeRef = useRef("BOS"), awayRef = useRef("LAL");
  useEffect(() => { homeRef.current = homeTeam; }, [homeTeam]);
  useEffect(() => { awayRef.current = awayTeam; }, [awayTeam]);

  const [gameType, setGameType]  = useState("Regular Season");
  const [homeB2B,  setHomeB2B]   = useState(false);
  const [awayB2B,  setAwayB2B]   = useState(false);
  const [result,   setResult]    = useState(null);
  const [running,  setRunning]   = useState(false);
  const [simCount, setSimCount]  = useState(0);
  const [divFilter,setDivFilter] = useState("ALL");

  // ESPN colors (no stats)
  const [espnData,    setEspnData]    = useState(null);
  const [espnStatus,  setEspnStatus]  = useState("");
  const [espnError,   setEspnError]   = useState("");
  const [espnLoading, setEspnLoading] = useState(false);

  // BBRef import
  const [liveStats,    setLiveStats]    = useState({});
  const [bbrefPaste,   setBbrefPaste]   = useState("");
  const [bbrefStatus,  setBbrefStatus]  = useState("");
  const [bbrefError,   setBbrefError]   = useState("");
  const [showBBRef,    setShowBBRef]    = useState(false);
  const [statsUpdated, setStatsUpdated] = useState("");

  // Odds
  const [odds,       setOdds]       = useState(null);
  const [oddsSource, setOddsSource] = useState("none");
  const [oddsStatus, setOddsStatus] = useState("");
  const [manualOdds, setManualOdds] = useState({
    homeMoneyline:"-165", awayMoneyline:"+140",
    homeSpread:"-3.5", spreadHomeOdds:"-110", spreadAwayOdds:"-110",
    overUnder:"224.5", overOdds:"-110", underOdds:"-110",
  });

  // Schedule / export
  const [linesRows,    setLinesRows]    = useState([]);
  const [schedStatus,  setSchedStatus]  = useState("");
  const [schedLoading, setSchedLoading] = useState(false);
  const [simsRunning,  setSimsRunning]  = useState(false);
  const [showLines,    setShowLines]    = useState(false);

  // Inline row editing
  const [editingIdx,   setEditingIdx]   = useState(null);
  const [editFields,   setEditFields]   = useState({});

  // Bulk odds import
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkPaste,      setBulkPaste]      = useState("");
  const [bulkStatus,     setBulkStatus]     = useState("");
  const [bulkError,      setBulkError]      = useState("");

  // Tab navigation
  const [activeTab, setActiveTab] = useState("predictor");
  const [showSingleGameTools, setShowSingleGameTools] = useState(false);

  // Results tracker
  const [resultsPaste,   setResultsPaste]   = useState("");
  const [resultsLog,     setResultsLog]     = useState([]); // [{date,home,away,hScore,aScore}]
  const [resultsStatus,  setResultsStatus]  = useState("");
  const [resultsError,   setResultsError]   = useState("");
  const [fetchingResults,setFetchingResults]= useState(false);
  const [showResultsPaste,setShowResultsPaste]= useState(false);
  const [predPaste,      setPredPaste]      = useState("");
  const [predLog,        setPredLog]        = useState([]); // parsed predictions rows
  const [showPredPaste,  setShowPredPaste]  = useState(false);

  const hasLive = Object.keys(liveStats).length >= 25;
  const getColor = (abbr, which="primary") => {
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
      setEspnError(e.message);
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
      setResult(null);
    } catch(e) {
      setBbrefError(e.message);
    }
  };

  const runSim = () => {
    setRunning(true); setSimCount(0); setResult(null);
    let c = 0;
    const iv = setInterval(() => {
      c += Math.floor(Math.random() * 3200 + 1500);
      setSimCount(Math.min(c, 100000));
      if (c >= 100000) {
        clearInterval(iv);
        setTimeout(() => {
          setResult(predictGame({ homeTeam, awayTeam, gameType, homeB2B, awayB2B, liveStats }));
          setRunning(false);
        }, 80);
      }
    }, 38);
  };

  const handleFetchOdds = async () => {
    setOddsSource("fetching"); setOddsStatus("Checking ESPN for today's lines…");
    try {
      const { rawEvents } = await fetchTodaySchedule(setOddsStatus);
      let found = null;
      for (const ev of rawEvents) { found = parseOddsFromEvent(ev, homeRef.current, awayRef.current); if (found) break; }
      if (found) {
        setOdds(found); setOddsSource("espn");
        const fmt = v => v != null ? (v > 0 ? `+${v}` : `${v}`) : "—";
        setOddsStatus(`ESPN · H ${fmt(found.homeMoneyline)} / A ${fmt(found.awayMoneyline)} · O/U ${found.overUnder ?? "—"} · SPD ${found.spread ?? "—"}`);
        // Pre-populate manual fields so switching to MANUAL inherits ESPN values
        setManualOdds({
          homeMoneyline:  String(found.homeMoneyline ?? ""),
          awayMoneyline:  String(found.awayMoneyline ?? ""),
          homeSpread:     String(found.spread ?? "-3.5"),
          spreadHomeOdds: String(found.spreadHomeOdds ?? "-110"),
          spreadAwayOdds: String(found.spreadAwayOdds ?? "-110"),
          overUnder:      String(found.overUnder ?? ""),
          overOdds:       String(found.overOdds ?? "-110"),
          underOdds:      String(found.underOdds ?? "-110"),
        });
        if (!result) runSim();
      } else {
        setOddsSource("manual"); setOddsStatus("Game not on today's ESPN slate — enter manually");
      }
    } catch { setOddsSource("manual"); setOddsStatus("ESPN unreachable — enter lines manually"); }
  };

  const applyManualOdds = () => {
    setOdds({
      source:"manual",
      homeMoneyline:  parseFloat(manualOdds.homeMoneyline),
      awayMoneyline:  parseFloat(manualOdds.awayMoneyline),
      spread:         parseFloat(manualOdds.homeSpread) || -3.5,
      spreadHomeOdds: parseFloat(manualOdds.spreadHomeOdds),
      spreadAwayOdds: parseFloat(manualOdds.spreadAwayOdds),
      overUnder:      parseFloat(manualOdds.overUnder),
      overOdds:       parseFloat(manualOdds.overOdds),
      underOdds:      parseFloat(manualOdds.underOdds),
    });
    setOddsSource("manual"); setOddsStatus("Manual lines applied");
    if (!result) runSim();
  };

  const handleLoadSchedule = async () => {
    setSchedLoading(true); setSchedStatus("Fetching today's schedule…"); setLinesRows([]); setShowLines(false);
    try {
      const { games, rawEvents } = await fetchTodaySchedule(setSchedStatus);
      if (!games.length) { setSchedStatus("No NBA games found today."); setSchedLoading(false); return; }
      const rows = games.map(g => {
        let eo = null;
        for (const ev of rawEvents) { eo = parseOddsFromEvent(ev, g.homeAbbr, g.awayAbbr); if (eo) break; }
        return { game:g, espnOdds:eo, editedOdds:eo?{...eo}:null, simResult:null, homeB2B:false, awayB2B:false };
      });
      setSchedStatus("Checking back-to-back games…");
      const allAbbrs = [...new Set(rows.flatMap(r => [r.game.homeAbbr, r.game.awayAbbr]))];
      const b2bSet   = await fetchB2BTeams(allAbbrs);
      const withB2B  = b2bSet.size > 0 ? rows.map(r => ({ ...r, homeB2B:b2bSet.has(r.game.homeAbbr), awayB2B:b2bSet.has(r.game.awayAbbr) })) : rows;
      setLinesRows(withB2B); setShowLines(true);
      setSchedStatus(`${games.length} games loaded · ${rows.filter(r=>r.espnOdds).length} with ESPN lines${b2bSet.size>0?` · B2B: ${[...b2bSet].join(", ")}`:" · No B2B detected"}`);
    } catch(e) { setSchedStatus("Error: " + e.message); }
    setSchedLoading(false);
  };

  const handleRunAllSims = () => {
    setSimsRunning(true);
    setTimeout(() => {
      setLinesRows(prev => prev.map(r => ({ ...r, simResult: predictGame({ homeTeam:r.game.homeAbbr, awayTeam:r.game.awayAbbr, gameType:"Regular Season", homeB2B:r.homeB2B, awayB2B:r.awayB2B, liveStats }) })));
      setSimsRunning(false); setSchedStatus("All simulations complete — ready to export");
    }, 80);
  };

  // ── Inline edit helpers ──────────────────────────────────────────────────
  const startEdit = (idx) => {
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

  const saveEdit = (idx) => {
    const pf = (v, fallback=null) => { const n = parseFloat(String(v).replace(/\s/g,"")); return isNaN(n) ? fallback : n; };
    const updated = {
      source:         "manual",
      homeMoneyline:  pf(editFields.homeMoneyline, 0),
      awayMoneyline:  pf(editFields.awayMoneyline, 0),
      spread:         pf(editFields.spread, -3.5),
      spreadHomeOdds: pf(editFields.spreadHomeOdds, -110),
      spreadAwayOdds: pf(editFields.spreadAwayOdds, -110),
      overUnder:      pf(editFields.overUnder, 220),
      overOdds:       pf(editFields.overOdds, -110),
      underOdds:      pf(editFields.underOdds, -110),
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
  const BULK_NAME_MAP = {
    "ATLANTA HAWKS":"ATL",        "BOSTON CELTICS":"BOS",       "BROOKLYN NETS":"BKN",
    "CHARLOTTE HORNETS":"CHA",    "CHICAGO BULLS":"CHI",        "CLEVELAND CAVALIERS":"CLE",
    "DALLAS MAVERICKS":"DAL",     "DENVER NUGGETS":"DEN",       "DETROIT PISTONS":"DET",
    "GOLDEN STATE WARRIORS":"GSW","HOUSTON ROCKETS":"HOU",      "INDIANA PACERS":"IND",
    "LOS ANGELES CLIPPERS":"LAC", "LOS ANGELES LAKERS":"LAL",   "MEMPHIS GRIZZLIES":"MEM",
    "MIAMI HEAT":"MIA",           "MILWAUKEE BUCKS":"MIL",      "MINNESOTA TIMBERWOLVES":"MIN",
    "NEW ORLEANS PELICANS":"NOP", "NEW YORK KNICKS":"NYK",       "OKLAHOMA CITY THUNDER":"OKC",
    "ORLANDO MAGIC":"ORL",        "PHILADELPHIA 76ERS":"PHI",   "PHOENIX SUNS":"PHX",
    "PORTLAND TRAIL BLAZERS":"POR","SACRAMENTO KINGS":"SAC",    "SAN ANTONIO SPURS":"SAS",
    "TORONTO RAPTORS":"TOR",      "UTAH JAZZ":"UTA",            "WASHINGTON WIZARDS":"WAS",
  };

  const parseBulkOdds = (raw) => {
    const parseOddsNum = (s) => {
      if (!s) return null;
      const clean = s.trim()
                     .replace(/\s*½/g,".5").replace(/\s*¼/g,".25").replace(/\s*¾/g,".75")
                     .replace(/\s+/g," ");
      if (/^even$/i.test(clean)) return 100;
      const m = clean.match(/^([+-])\s*([\d.]+)$/);
      if (!m) return null;
      const n = parseFloat(m[2]);
      return m[1]==="-" ? -n : n;
    };
    const parseSpreadNum = (s) => {
      if (!s) return null;
      const clean = s.trim()
                     .replace(/\s*½/g,".5").replace(/\s*¼/g,".25").replace(/\s*¾/g,".75")
                     .replace(/\s+/g," ");
      const m = clean.match(/^([+-])\s*([\d.]+)$/);
      if (!m) return null;
      const n = parseFloat(m[2]);
      return m[1]==="-" ? -n : n;
    };
    const parseOU = (s) => {
      if (!s) return null;
      const clean = s.trim()
                     .replace(/\s*½/g,".5").replace(/\s*¼/g,".25").replace(/\s*¾/g,".75")
                     .replace(/\s+/g," ");
      const m = clean.match(/^[OoUu]\s*([\d.]+)$/);
      return m ? parseFloat(m[1]) : null;
    };

    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length);
    const isTeamName = (l) => BULK_NAME_MAP[l.toUpperCase()] !== undefined;
    const isRotNum   = (l) => /^\d{3,4}$/.test(l);
    // Find all team-name indices
    const teamIndices = [];
    for (let i = 0; i < lines.length; i++) {
      if (isTeamName(lines[i].toUpperCase())) teamIndices.push(i);
    }

    if (teamIndices.length < 2) {
      const sample = lines.slice(0,5).map(l => JSON.stringify(l)).join(", ");
      throw new Error(`Could not find team names. First lines seen: ${sample}`);
    }

    const games = [];
    for (let t = 0; t < teamIndices.length - 1; t += 2) {
      const i1 = teamIndices[t];
      const i2 = teamIndices[t+1];
      // Collect the 7 data lines after each team name (skip rotation number)
      const team1Name = lines[i1].toUpperCase();
      const team2Name = lines[i2].toUpperCase();
      const abbr1 = BULK_NAME_MAP[team1Name];
      const abbr2 = BULK_NAME_MAP[team2Name];
      if (!abbr1 || !abbr2) continue;

      // Data lines for team1: spread, spread-odds, O/U line, over-odds, moneyline
      let j = i1 + 1;
      if (j < lines.length && isRotNum(lines[j])) j++;
      const t1lines = [];
      while (j < i2 && t1lines.length < 5) { t1lines.push(lines[j]); j++; }

      let k = i2 + 1;
      if (k < lines.length && isRotNum(lines[k])) k++;
      const t2lines = [];
      const stopIdx = t < teamIndices.length - 2 ? teamIndices[t+2] : lines.length;
      while (k < stopIdx && t2lines.length < 5) { t2lines.push(lines[k]); k++; }

      // team1 lines: [spread, spreadOdds, O/U, overOdds, ML]
      const [spr1, sprO1, ou1, ovO1, ml1] = t1lines;
      const [spr2, sprO2, ou2, ovO2, ml2] = t2lines;

      const spread1 = parseSpreadNum(spr1);  // team1's spread (positive = dog, negative = fav)
      const spread2 = parseSpreadNum(spr2);  // should be inverse
      const ouLine  = parseOU(ou1) ?? parseOU(ou2);
      const ml1val  = parseOddsNum(ml1);
      const ml2val  = parseOddsNum(ml2);
      const spO1val = parseOddsNum(sprO1);
      const spO2val = parseOddsNum(sprO2);
      const overO   = parseOddsNum(ovO1);
      const underO  = parseOddsNum(ovO2);

      // Determine home/away — team2 is home if listed second in the block
      // In standard sportsbook format: road team listed first, home team second
      const awayAbbr = abbr1;
      const homeAbbr = abbr2;

      // home spread = spread2 (team2 is home)
      const homeSpread = spread2 ?? (spread1 != null ? -spread1 : null);

      games.push({
        homeAbbr, awayAbbr,
        odds: {
          source: "manual",
          homeMoneyline:  ml2val ?? 0,
          awayMoneyline:  ml1val ?? 0,
          spread:         homeSpread ?? -3.5,
          spreadHomeOdds: spO2val ?? -110,
          spreadAwayOdds: spO1val ?? -110,
          overUnder:      ouLine ?? 220,
          overOdds:       overO  ?? -110,
          underOdds:      underO ?? -110,
        }
      });
    }
    return games;
  };

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
        return { ...row, editedOdds: odds, simResult: null };
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
      setBulkError(e.message);
    }
  };

  const handleExport = () => {
    const today = new Date().toISOString().slice(0,10);
    const esc   = v => `"${String(v).replace(/"/g,'""')}"`;
    const hdrs  = [
      // A–X: core prediction data
      "Date","Time","Home","Away","H Win%","A Win%","H Proj","A Proj","Model Total",
      "Vegas O/U","O/U Rec","O/U Edge","H ML (model)","A ML (model)","ML Rec","Over Odds","Under Odds","Vegas Spread","Spread Home Odds","Spread Away Odds","Vegas H ML","Vegas A ML",
      "Spread Rec","Spread Edge","H Net Rtg","A Net Rtg","H eFG%","A eFG%","H TOV%","A TOV%",
      // Y–Z: edge/kelly
      "ML Edge%","ML Kelly","SPR Edge%","SPR Kelly","OU Edge%","OU Kelly",
      // AA–AB: source
      "Stats Source","Odds Source",
      // AC–AJ: lookup + results (filled by spreadsheet XLOOKUP)
      "LookupKey",
    ];
    const csvRows = linesRows.map(r => {
      const sim = r.simResult ?? predictGame({ homeTeam:r.game.homeAbbr, awayTeam:r.game.awayAbbr, gameType:"Regular Season", homeB2B:r.homeB2B, awayB2B:r.awayB2B, liveStats });
      const od  = r.editedOdds;
      const ba  = od && od.homeMoneyline !== 0 ? analyzeBetting(sim, od) : null;
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
        hasLive?"BBRef live":"Estimates",
        od?(od.source==="espn"?"ESPN":"Manual"):"No odds",
          // AC: lookup key
        lookupKey,
      ];
    });
    downloadCSV([hdrs.map(esc).join(","), ...csvRows.map(r => r.map(esc).join(","))].join("\n"), `nba-predictions-${today}.csv`);
    setSchedStatus(`✓ Exported ${csvRows.length} games to nba-predictions-${today}.csv`);
  };

  // ── Fetch ESPN scoreboard for results ──────────────────────────────────────
  const handleFetchResults = async (forPredictor=false) => {
    setFetchingResults(true); setResultsError(""); setResultsStatus("Fetching yesterday's scores…");
    try {
      // Build yesterday's date string in YYYYMMDD for ESPN API
      const yest = new Date(); yest.setDate(yest.getDate()-1);
      const pad  = n => String(n).padStart(2,"0");
      const dateStr = `${yest.getFullYear()}${pad(yest.getMonth()+1)}${pad(yest.getDate())}`;
      const isoDate = `${yest.getFullYear()}-${pad(yest.getMonth()+1)}-${pad(yest.getDate())}`;
      const res  = await fetch(`http://localhost:3001/proxy?url=${encodeURIComponent(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateStr}`)}`);
      const data = await res.json();
      const events = data?.events ?? [];
      const rows = [];
      for (const ev of events) {
        const comp   = ev.competitions?.[0];
        if (!comp) continue;
        const status = comp.status?.type?.completed;
        const home   = comp.competitors?.find(t => t.homeAway==="home");
        const away   = comp.competitors?.find(t => t.homeAway==="away");
        if (!home || !away) continue;
        rows.push({
          date:  isoDate,
          home:  normalizeAbbr(home.team?.abbreviation?.toUpperCase() ?? ""),
          away:  normalizeAbbr(away.team?.abbreviation?.toUpperCase() ?? ""),
          hScore: status ? parseInt(home.score??0) : null,
          aScore: status ? parseInt(away.score??0) : null,
          completed: !!status,
        });
      }
      const completed = rows.filter(r => r.completed);
      if (!completed.length) { setResultsStatus(`No completed games found for ${isoDate}`); setFetchingResults(false); return; }
      const esc = v => `"${String(v).replace(/"/g,'""')}"`;
      const hdrs = ["Date","Home","Away","Home Score","Away Score","Winner","Total","LookupKey"];
      const csvRows = completed.map(r => {
        const winner    = r.hScore > r.aScore ? r.home : r.away;
        const total     = r.hScore + r.aScore;
        const lookupKey = `${dateStr}${r.home}${r.away}`;   // YYYYMMDD+HomeAbbr+AwayAbbr
        return [r.date, r.home, r.away, r.hScore, r.aScore, winner, total, lookupKey];
      });
      const csvStr  = [hdrs.map(esc).join(","), ...csvRows.map(r => r.map(esc).join(","))].join("\n");
      downloadCSV(csvStr, `nba-results-${isoDate}.csv`);
      setResultsStatus(`✓ ${completed.length} games from ${isoDate} — CSV downloading`);
      // If called from predictor tab, also auto-import into resultsLog
      if (forPredictor) {
        setResultsLog(prev => {
          const existing = new Set(prev.map(r => r.date+"_"+r.home+"_"+r.away));
          const added = completed.filter(r => !existing.has(r.date+"_"+r.home+"_"+r.away));
          return [...prev, ...added].sort((a,b) => b.date.localeCompare(a.date));
        });
      }
    } catch(e) {
      setResultsError("ESPN fetch failed — ensure proxy is running on :3001. " + e.message);
    }
    setFetchingResults(false);
  };

  // ── Parse pasted results CSV ─────────────────────────────────────────────
  const handleImportResults = () => {
    setResultsError("");
    try {
      const lines = resultsPaste.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error("Need at least a header row + 1 data row");
      const hdrs  = lines[0].split(",").map(h => h.trim().replace(/"/g,"").toLowerCase());
      const iDate = hdrs.findIndex(h => h.includes("date"));
      const iHome = hdrs.findIndex(h => h==="home");
      const iAway = hdrs.findIndex(h => h==="away");
      const iHS   = hdrs.findIndex(h => h.includes("home score"));
      const iAS   = hdrs.findIndex(h => h.includes("away score"));
      if ([iDate,iHome,iAway,iHS,iAS].some(i => i<0)) throw new Error("Missing columns — expected: Date, Home, Away, Home Score, Away Score");
      const parsed = lines.slice(1).map(line => {
        const cols = line.split(",").map(v => v.trim().replace(/"/g,""));
        return { date:cols[iDate], home:cols[iHome]?.toUpperCase(), away:cols[iAway]?.toUpperCase(), hScore:parseInt(cols[iHS]), aScore:parseInt(cols[iAS]) };
      }).filter(r => !isNaN(r.hScore) && !isNaN(r.aScore));
      if (!parsed.length) throw new Error("No valid rows found");
      setResultsLog(prev => {
        const existing = new Set(prev.map(r => r.date+"_"+r.home+"_"+r.away));
        const added = parsed.filter(r => !existing.has(r.date+"_"+r.home+"_"+r.away));
        return [...prev, ...added].sort((a,b) => b.date.localeCompare(a.date));
      });
      setResultsStatus(`✓ Imported ${parsed.length} results`);
      setResultsPaste("");
      setShowResultsPaste(false);
    } catch(e) { setResultsError(e.message); }
  };

  // ── Parse pasted predictions CSV ─────────────────────────────────────────
  const handleImportPredictions = () => {
    setResultsError("");
    try {
      const lines = predPaste.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error("Need header + data rows");
      const hdrs = lines[0].split(",").map(h => h.trim().replace(/"/g,"").toLowerCase());
      const gi = n => hdrs.findIndex(h => h.includes(n));
      const idx = {
        date: gi("date"), home: gi("home"), away: gi("away"),
        hProj: gi("h proj"), aProj: gi("a proj"), total: gi("model total"),
        vegaOU: gi("vegas o/u"), overOdds: gi("over odds"), underOdds: gi("under odds"), ouRec: gi("o/u rec"), ouEdge: gi("o/u edge"),
        hML: gi("h ml (model)"), aML: gi("a ml (model)"),
        vegaHML: gi("vegas h ml"), vegaAML: gi("vegas a ml"),
        vegasSpread: gi("vegas spread"), spreadHomeOdds: gi("spread home odds"), spreadAwayOdds: gi("spread away odds"),
        mlRec: gi("ml rec"), mlEdge: gi("ml edge"),
        sprRec: gi("spread rec"), sprEdge: gi("spread edge"),
        hWin: gi("h win"), aWin: gi("a win"),
      };
      const parsed = lines.slice(1).map(line => {
        const cols = line.split(",").map(v => v.trim().replace(/"/g,""));
        const get  = i => i>=0 ? cols[i] : "";
        // extract home/away abbr from "BOS Celtics" format
        const homeRaw = get(idx.home), awayRaw = get(idx.away);
        const homeAbbr = homeRaw.split(" ")[0], awayAbbr = awayRaw.split(" ")[0];
        return {
          date: get(idx.date), home: homeAbbr, away: awayAbbr,
          hProj: parseFloat(get(idx.hProj))||null, aProj: parseFloat(get(idx.aProj))||null,
          modelTotal: parseFloat(get(idx.total))||null,
          vegaOU: parseFloat(get(idx.vegaOU))||null, vegasSpread: parseFloat(get(idx.vegasSpread))||null,
          spreadHomeOdds: parseFloat(get(idx.spreadHomeOdds))||null, spreadAwayOdds: parseFloat(get(idx.spreadAwayOdds))||null,
          overOdds: parseFloat(get(idx.overOdds))||null, underOdds: parseFloat(get(idx.underOdds))||null,
          ouRec: get(idx.ouRec), ouEdge: get(idx.ouEdge),
          hMLmodel: get(idx.hML), aMLmodel: get(idx.aML),
          vegaHML: get(idx.vegaHML), vegaAML: get(idx.vegaAML),
          mlRec: get(idx.mlRec), mlEdge: get(idx.mlEdge),
          sprRec: get(idx.sprRec), sprEdge: get(idx.sprEdge),
          hWinPct: parseFloat(get(idx.hWin))||null, aWinPct: parseFloat(get(idx.aWin))||null,
        };
      });
      setPredLog(prev => {
        const existing = new Set(prev.map(r => r.date+"_"+r.home+"_"+r.away));
        const added = parsed.filter(r => r.date && r.home && r.away && !existing.has(r.date+"_"+r.home+"_"+r.away));
        return [...prev, ...added].sort((a,b) => b.date.localeCompare(a.date));
      });
      setResultsStatus(`✓ Imported ${parsed.length} predictions`);
      setPredPaste("");
      setShowPredPaste(false);
    } catch(e) { setResultsError(e.message); }
  };

  // ── Grade predictions against results ────────────────────────────────────
  const gradedRows = predLog.map(p => {
    const res = resultsLog.find(r => r.home===p.home && r.away===p.away && r.date===p.date);
    if (!res) return { ...p, res:null, graded:false };
    const actualTotal  = res.hScore + res.aScore;
    const actualDiff   = res.hScore - res.aScore;  // positive = home won
    // ML result
    const mlRecRaw = (p.mlRec || "").trim();
    const mlRecLower = mlRecRaw.toLowerCase();
    const fallbackMlSide = p.hWinPct > 50 ? "home" : "away";
    const mlRecSide =
      mlRecLower === "pass" || mlRecLower === "â€”" || mlRecLower === "-" ? null
      : mlRecLower.includes(`${p.home.toLowerCase()} ml`) || mlRecLower.includes(`ml - ${p.home.toLowerCase()}`) || mlRecLower === "home ml" ? "home"
      : mlRecLower.includes(`${p.away.toLowerCase()} ml`) || mlRecLower.includes(`ml - ${p.away.toLowerCase()}`) || mlRecLower === "away ml" ? "away"
      : !mlRecRaw && p.mlEdge && p.mlEdge !== "â€”" ? fallbackMlSide
      : !mlRecRaw && !p.mlEdge && p.hWinPct !== null ? fallbackMlSide
      : null;
    const mlWin    = mlRecSide === "home"
      ? res.hScore > res.aScore
      : mlRecSide === "away"
        ? res.aScore > res.hScore
        : null;
    const mlOdds   = mlRecSide === "home"
      ? parseInt(p.vegaHML||p.hMLmodel||0)
      : mlRecSide === "away"
        ? parseInt(p.vegaAML||p.aMLmodel||0)
        : 0;
    const mlPayout = mlOdds >= 0 ? mlOdds/100 : 100/Math.abs(mlOdds);
    const mlROI    = mlRecSide === null ? null : (mlWin ? mlPayout : -1);
    // Spread result — parse "HOME -3.5" or "AWAY +6" from sprRec
    let sprWin = null, sprROI = null;
    const sprRecL = (p.sprRec||"").toLowerCase();
    if (sprRecL && sprRecL !== "pass" && sprRecL !== "—") {
      const isHomeSpr = sprRecL.startsWith("home");
      const spreadNum = parseFloat((p.sprRec||"").match(/[-+]?[\d.]+/)?.[0]??0);
      // home covers if actualDiff + spreadNum > 0 (taking home side)
      const coverDiff = isHomeSpr ? actualDiff + spreadNum : -actualDiff - spreadNum;
      sprWin  = coverDiff > 0;
      sprROI  = sprWin ? (100/110) : -1;  // standard -110 odds
    }
    // O/U result
    let ouWin = null, ouROI = null;
    const ouRecL = (p.ouRec||"").toLowerCase();
    if (ouRecL && ouRecL !== "pass" && ouRecL !== "—") {
      ouWin  = ouRecL==="over" ? actualTotal > p.vegaOU : actualTotal < p.vegaOU;
      ouROI  = ouWin ? (100/110) : -1;
    }
    const normalizedMlRec = mlRecSide === "home"
      ? `HOME - ${p.home}`
      : mlRecSide === "away"
        ? `AWAY - ${p.away}`
        : "PASS";
    return { ...p, mlRec: normalizedMlRec, res, graded:true, actualTotal, actualDiff, mlWin, mlROI, sprWin, sprROI, ouWin, ouROI };
  });

  // ── Aggregate record/ROI ─────────────────────────────────────────────────
  const agg = graded => {
    const g = graded.filter(r => r.graded);
    const ml  = g.filter(r => r.mlROI  !== null);
    const spr = g.filter(r => r.sprROI !== null);
    const ou  = g.filter(r => r.ouROI  !== null);
    const rec = (arr, key) => {
      const w = arr.filter(r => r[key]===true).length;
      const l = arr.filter(r => r[key]===false).length;
      const roi = arr.reduce((s,r) => s + (r[key+"ROI"]??0), 0);
      return { w, l, roi: roi.toFixed(2), pct: arr.length ? ((w/arr.length)*100).toFixed(1) : "—" };
    };
    return { ml: rec(ml,"mlWin"), spr: rec(spr,"sprWin"), ou: rec(ou,"ouWin") };
  };
  const stats = agg(gradedRows);

  const hColor = getColor(homeTeam);
  const aColor = getColor(awayTeam);
  const hTeam  = liveStats[homeTeam] ? { ...TEAMS[homeTeam], ...liveStats[homeTeam] } : TEAMS[homeTeam];
  const aTeam  = liveStats[awayTeam] ? { ...TEAMS[awayTeam], ...liveStats[awayTeam] } : TEAMS[awayTeam];

  const ss = { background:"rgba(255,200,80,0.04)", border:"1px solid rgba(255,200,80,0.15)", color:"#e8d5a0", padding:"8px 10px", borderRadius:4, fontFamily:"monospace", fontSize:12, width:"100%", cursor:"pointer" };
  const card = { background:"rgba(255,200,80,0.03)", border:"1px solid rgba(255,200,80,0.13)", borderRadius:8, padding:16, marginBottom:12 };

  const filteredTeams = excl => Object.entries(TEAMS).filter(([k]) => k !== excl && (divFilter==="ALL" || TEAMS[k].div===divFilter));
  const TeamSelect = ({ value, onChange, excludeKey, label }) => (
    <div>
      <div style={{ fontSize:10, color:"#7a6a3a", letterSpacing:3, marginBottom:4, fontFamily:"monospace" }}>{label}</div>
      <select value={value} onChange={e=>{ onChange(e.target.value); setResult(null); }} style={ss}>
        {DIVISIONS.map(div => {
          const opts = filteredTeams(excludeKey).filter(([k]) => TEAMS[k].div===div);
          return opts.length ? <optgroup key={div} label={div} style={{ background:"#1a0f00" }}>{opts.map(([k,v]) => <option key={k} value={k}>{k} - {v.name}</option>)}</optgroup> : null;
        })}
      </select>
    </div>
  );

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
        <div style={{ ...card, border:`1px solid ${hasLive?"rgba(251,191,36,0.3)":"rgba(255,200,80,0.13)"}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:showBBRef?14:0 }}>
            <div>
              <div style={{ fontSize:10, color:"#7a6a3a", letterSpacing:3, marginBottom:5 }}>STATS · BASKETBALL REFERENCE IMPORT</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:hasLive?"#fbbf24":"#4b5563", boxShadow:hasLive?"0 0 8px #fbbf24":"none" }} />
                <span style={{ fontSize:11, color:hasLive?"#fbbf24":"#6a5a3a" }}>
                  {hasLive
                    ? `✓ Live stats active · ${Object.keys(liveStats).length} teams · ${statsUpdated}`
                    : "Paste BBRef Miscellaneous Stats CSV to update all 30 teams"}
                </span>
              </div>
              {bbrefStatus && !bbrefError && <div style={{ fontSize:10, color:"#3fb950", marginTop:4 }}>{bbrefStatus}</div>}
              {bbrefError  && <div style={{ fontSize:10, color:"#f87171", marginTop:4 }}>⚠ {bbrefError}</div>}
            </div>
            <button onClick={()=>setShowBBRef(!showBBRef)} style={{ background:showBBRef?"rgba(202,138,4,0.15)":"linear-gradient(135deg,#ca8a04,#eab308)", border:showBBRef?"1px solid rgba(234,179,8,0.4)":"none", borderRadius:4, padding:"8px 16px", color:showBBRef?"#fbbf24":"#1a1200", fontSize:11, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:"pointer", whiteSpace:"nowrap" }}>
              {showBBRef ? "▲ HIDE" : hasLive ? "↻ UPDATE STATS" : "⬇ IMPORT STATS"}
            </button>
          </div>

          {showBBRef && (
            <div style={{ animation:"fadeUp 0.2s ease" }}>
              {/* Step-by-step instructions */}
              <div style={{ background:"rgba(255,200,80,0.04)", border:"1px solid rgba(255,200,80,0.1)", borderRadius:6, padding:"12px 14px", marginBottom:12, fontSize:11, lineHeight:1.9, color:"#9a8a5a" }}>
                <div style={{ fontSize:10, color:"#fbbf24", letterSpacing:3, marginBottom:8, fontWeight:700 }}>HOW TO GET THE DATA</div>
                <div>1. Go to <a href="https://www.basketball-reference.com/leagues/NBA_2026.html" target="_blank" rel="noopener noreferrer" style={{ color:"#fbbf24" }}>basketball-reference.com/leagues/NBA_2026.html</a></div>
                <div>2. Scroll down to the <strong style={{ color:"#e8d5a0" }}>Advanced Stats</strong> table</div>
                <div>3. Click <strong style={{ color:"#e8d5a0" }}>Share &amp; Export</strong> → <strong style={{ color:"#e8d5a0" }}>Get table as CSV</strong></div>
                <div>4. Select all the text (Ctrl+A / Cmd+A), copy it, and paste below</div>
                <div style={{ marginTop:6, fontSize:10, color:"#6a5a3a" }}>
                  Imports: ORtg · DRtg · NRtg · Pace · eFG% · eFG%Opp · TOV% · ORB% · 3PAr · (AST% not in this table — baseline kept)
                </div>
              </div>

              <textarea
                value={bbrefPaste}
                onChange={e => { setBbrefPaste(e.target.value); setBbrefError(""); }}
                placeholder={"Team,Age,W,L,...,ORtg,DRtg,NRtg,Pace,...,eFG%,...\nBoston Celtics,27.4,54,14,...,122.1,109.8,12.3,98.2,..."}
                style={{ width:"100%", minWidth:0, height:130, background:"#0d0800", border:"1px solid rgba(255,200,80,0.2)", borderRadius:4, color:"#e8d5a0", fontSize:11, fontFamily:"monospace", padding:10, resize:"vertical", boxSizing:"border-box", outline:"none" }}
              />

              <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, marginTop:8 }}>
                <button
                  onClick={handleBBRefImport}
                  disabled={!bbrefPaste.trim()}
                  style={{ padding:"10px 0", background:bbrefPaste.trim()?"linear-gradient(135deg,#b45309,#92400e)":"rgba(255,200,80,0.04)", border:bbrefPaste.trim()?"none":"1px solid rgba(255,200,80,0.08)", borderRadius:4, color:bbrefPaste.trim()?"#fef3c7":"#4a3a2a", fontSize:12, fontWeight:700, letterSpacing:3, fontFamily:"monospace", cursor:bbrefPaste.trim()?"pointer":"not-allowed", transition:"all 0.2s" }}>
                  ⬆ APPLY STATS TO MODEL
                </button>
                <button onClick={()=>{ setBbrefPaste(""); setBbrefError(""); }} style={{ padding:"10px 14px", background:"transparent", border:"1px solid rgba(255,200,80,0.1)", borderRadius:4, color:"#4a3a2a", fontSize:11, fontFamily:"monospace", cursor:"pointer" }}>
                  CLEAR
                </button>
              </div>

              {hasLive && (
                <button onClick={()=>{ setLiveStats({}); setStatsUpdated(""); setBbrefStatus(""); setBbrefError(""); setShowBBRef(false); setResult(null); }} style={{ marginTop:8, width:"100%", padding:"7px 0", background:"transparent", border:"1px solid rgba(239,68,68,0.2)", borderRadius:4, color:"#6b2424", fontSize:10, fontFamily:"monospace", cursor:"pointer", letterSpacing:2 }}>
                  ✕ RESET TO ESTIMATES
                </button>
              )}
            </div>
          )}
        </div>

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
          <div style={{ animation:"fadeUp 0.2s ease" }}>
        {/* ── Team Selection ── */}
        <div style={card}>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, color:"#7a6a3a", letterSpacing:3, marginBottom:5 }}>FILTER BY DIVISION</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {["ALL",...DIVISIONS].map(d => (
                <button key={d} onClick={()=>setDivFilter(d)} style={{ padding:"3px 9px", borderRadius:3, fontSize:10, fontFamily:"monospace", cursor:"pointer", letterSpacing:1, background:divFilter===d?"#b45309":"rgba(255,200,80,0.04)", color:divFilter===d?"#fef3c7":"#6a5a3a", border:divFilter===d?"none":"1px solid rgba(255,200,80,0.1)", fontWeight:divFilter===d?700:400 }}>{d}</button>
              ))}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <TeamSelect value={homeTeam} onChange={setHomeTeam} excludeKey={awayTeam} label="HOME TEAM" />
            <TeamSelect value={awayTeam} onChange={setAwayTeam} excludeKey={homeTeam} label="AWAY TEAM" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            <TeamCard abbr={homeTeam} side="HOME" espnData={espnData} liveStats={liveStats} />
            <TeamCard abbr={awayTeam} side="AWAY" espnData={espnData} liveStats={liveStats} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <div>
              <div style={{ fontSize:10, color:"#7a6a3a", letterSpacing:3, marginBottom:4 }}>GAME TYPE</div>
              <select value={gameType} onChange={e=>{ setGameType(e.target.value); setResult(null); }} style={ss}>
                {GAME_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            {[[homeTeam,"homeB2B",homeB2B,setHomeB2B],[awayTeam,"awayB2B",awayB2B,setAwayB2B]].map(([abbr,key,val,setter]) => (
              <div key={key} onClick={()=>{ setter(!val); setResult(null); }} style={{ background:val?"rgba(251,191,36,0.05)":"transparent", border:`1px solid ${val?"rgba(251,191,36,0.2)":"rgba(255,200,80,0.13)"}`, borderRadius:4, padding:"9px 10px", cursor:"pointer" }}>
                <div style={{ fontSize:10, color:"#7a6a3a", letterSpacing:2, marginBottom:5 }}>BACK-TO-BACK</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:11, color:val?"#fbbf24":"#6a5a3a" }}>{TEAMS[abbr].name}</span>
                  <span style={{ fontSize:10, padding:"1px 7px", borderRadius:2, background:val?"rgba(251,191,36,0.1)":"rgba(255,200,80,0.05)", color:val?"#fbbf24":"#4a3a2a" }}>{val?"YES":"NO"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stat Comparison ── */}
        <div style={card}>
          <div style={{ fontSize:10, color:"#7a6a3a", letterSpacing:3, marginBottom:12 }}>
            ADVANCED STATS COMPARISON{hasLive ? <span style={{ color:"#fbbf24", marginLeft:8 }}>· BBRef LIVE ✦</span> : <span style={{ color:"#4b5563", marginLeft:8 }}>· ESTIMATES</span>}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:11, color:hColor, fontFamily:"'Oswald',monospace" }}>{hTeam.name.toUpperCase()}</span>
            <span style={{ fontSize:11, color:aColor, fontFamily:"'Oswald',monospace" }}>{aTeam.name.toUpperCase()}</span>
          </div>
          <StatBar label="OFFENSIVE RATING"     hVal={hTeam.offRtg} aVal={aTeam.offRtg} hColor={hColor} aColor={aColor} lo={106} hi={124} />
          <StatBar label="DEFENSIVE RATING"     hVal={hTeam.defRtg} aVal={aTeam.defRtg} hColor={hColor} aColor={aColor} lo={106} hi={122} invert />
          <StatBar label="NET RATING"           hVal={hTeam.netRtg} aVal={aTeam.netRtg} hColor={hColor} aColor={aColor} lo={-12} hi={14} />
          <StatBar label="EFFECTIVE FG%"        hVal={hTeam.efgPct} aVal={aTeam.efgPct} hColor={hColor} aColor={aColor} lo={49}  hi={60}  fmt="pct" />
          <StatBar label="TURNOVER %"           hVal={hTeam.tovPct} aVal={aTeam.tovPct} hColor={hColor} aColor={aColor} lo={11}  hi={16}  fmt="pct" invert />
          <StatBar label="REBOUND %"            hVal={hTeam.rebPct} aVal={aTeam.rebPct} hColor={hColor} aColor={aColor} lo={48}  hi={55}  fmt="pct" />
          <StatBar label="PACE (POSS / 48 MIN)" hVal={hTeam.pace}   aVal={aTeam.pace}   hColor={hColor} aColor={aColor} lo={94}  hi={106} />
        </div>

        {/* ── Run Button ── */}
        <button onClick={runSim} disabled={running} style={{ width:"100%", padding:14, background:running?"rgba(30,64,175,0.08)":"linear-gradient(135deg,#1d4ed8,#3b82f6)", border:running?"1px solid rgba(59,130,246,0.15)":"1px solid rgba(147,197,253,0.4)", borderRadius:4, color:running?"#2d4a7a":"#eff6ff", fontSize:13, fontWeight:700, letterSpacing:5, fontFamily:"'Oswald',sans-serif", cursor:running?"not-allowed":"pointer", marginBottom:14, transition:"all 0.3s" }}>
          {running ? `SIMULATING  ${simCount.toLocaleString()} / 100,000` : "▶  RUN SIMULATION"}
        </button>

        {/* ── Odds Panel ── */}
        <div style={{ ...card, border:`1px solid ${oddsSource==="espn"?"rgba(74,222,128,0.2)":oddsSource==="manual"&&odds?"rgba(251,191,36,0.18)":"rgba(255,200,80,0.13)"}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:oddsSource==="manual"?14:0 }}>
            <div>
              <div style={{ fontSize:10, color:"#7a6a3a", letterSpacing:3, marginBottom:5 }}>LIVE ODDS / LINES</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:oddsSource==="espn"?"#4ade80":oddsSource==="fetching"?"#fbbf24":oddsSource==="manual"&&odds?"#f59e0b":"#4b5563", animation:oddsSource==="fetching"?"pulse 0.8s infinite":"none" }} />
                <span style={{ fontSize:11, color:oddsSource==="espn"?"#4ade80":oddsSource==="manual"&&odds?"#fbbf24":"#6a5a3a" }}>
                  {oddsSource==="none" ? "Fetch today's lines or enter manually" : oddsStatus}
                </span>
              </div>
            </div>
            <div style={{ display:"flex", gap:7 }}>
              <button onClick={handleFetchOdds} disabled={oddsSource==="fetching"} style={{ background:oddsSource==="espn"?"rgba(74,222,128,0.07)":oddsSource==="fetching"?"rgba(30,64,175,0.08)":"linear-gradient(135deg,#1d4ed8,#3b82f6)", border:oddsSource==="espn"?"1px solid rgba(74,222,128,0.2)":oddsSource==="fetching"?"1px solid rgba(59,130,246,0.15)":"1px solid rgba(147,197,253,0.3)", borderRadius:4, padding:"7px 14px", color:oddsSource==="espn"?"#4ade80":oddsSource==="fetching"?"#2d4a7a":"#eff6ff", fontSize:10, fontWeight:700, letterSpacing:2, fontFamily:"monospace", cursor:oddsSource==="fetching"?"not-allowed":"pointer" }}>
                {oddsSource==="fetching"?"CHECKING…":oddsSource==="espn"?"↻ REFRESH":"⬇ FETCH LINES"}
              </button>
              <button onClick={()=>{ setOddsSource("manual"); setOddsStatus("Enter lines below"); setOdds(null); }} style={{ background:"rgba(255,200,80,0.04)", border:"1px solid rgba(255,200,80,0.13)", borderRadius:4, padding:"7px 14px", color:"#7a6a3a", fontSize:10, letterSpacing:2, fontFamily:"monospace", cursor:"pointer" }}>
                MANUAL
              </button>
            </div>
          </div>
          {oddsSource==="manual" && (
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{ fontSize:10, color:"#6a5a3a" }}>SPREAD:</span>
                {["-3.5","+3.5"].map(v => {
                  const active = (manualOdds.homeSpread??"-3.5")===v;
                  return <button key={v} onClick={()=>setManualOdds(p=>({...p,homeSpread:v}))} style={{ background:active?"rgba(251,191,36,0.12)":"transparent", border:`1px solid ${active?"#fbbf24":"#4b5563"}`, borderRadius:4, padding:"3px 12px", color:active?"#fde68a":"#4b5563", fontSize:10, fontWeight:700, fontFamily:"monospace", cursor:"pointer" }}>HOME {v}</button>;
                })}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:10 }}>
                {[["HOME ML","homeMoneyline","-165"],["AWAY ML","awayMoneyline","+140"],["O/U LINE","overUnder","224.5"],
                  [`H SPD ODDS`,"spreadHomeOdds","-110"],[`A SPD ODDS`,"spreadAwayOdds","-110"],["OVER ODDS","overOdds","-110"]
                ].map(([label,key,ph]) => (
                  <div key={key}>
                    <div style={{ fontSize:10, color:"#6a5a3a", letterSpacing:1, marginBottom:3 }}>{label}</div>
                    <input value={manualOdds[key]} onChange={e=>setManualOdds(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={{ background:"rgba(255,200,80,0.04)", border:"1px solid rgba(255,200,80,0.13)", borderRadius:4, padding:"6px 8px", color:"#e8d5a0", fontFamily:"monospace", fontSize:12, width:"100%", boxSizing:"border-box" }} />
                  </div>
                ))}
              </div>
              <button onClick={applyManualOdds} style={{ width:"100%", padding:"8px", background:"linear-gradient(135deg,#065f46,#047857)", border:"none", borderRadius:4, color:"#d1fae5", fontSize:11, fontWeight:700, letterSpacing:3, fontFamily:"monospace", cursor:"pointer" }}>
                ✓ APPLY MANUAL LINES
              </button>
            </div>
          )}
        </div>

          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <div style={{ animation:"fadeUp 0.4s ease" }}>
            {result.isPlayoff && (
              <div style={{ background:"rgba(251,191,36,0.05)", border:"1px solid rgba(251,191,36,0.18)", borderRadius:5, padding:"8px 14px", marginBottom:12, fontSize:10, color:"#fbbf24", letterSpacing:2 }}>
                🏀 PLAYOFF MODE — Defensive intensity amplified · scoring suppressed ~3%
              </div>
            )}

            <div style={card}>
              <div style={{ fontSize:10, color:"#7a6a3a", letterSpacing:3, marginBottom:12 }}>WIN PROBABILITY</div>
              <CourtBar hProb={result.hWinProb} hColor={hColor} aColor={aColor} />
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:10 }}>
                <span style={{ color:hColor, fontFamily:"'Oswald',monospace" }}>{hTeam.name.toUpperCase()} (HOME)</span>
                <span style={{ color:aColor, fontFamily:"'Oswald',monospace" }}>{aTeam.name.toUpperCase()} (AWAY)</span>
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize:10, color:"#7a6a3a", letterSpacing:3, marginBottom:14 }}>PROJECTED SCORE</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:14, marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:10, color:hColor, letterSpacing:2, marginBottom:3 }}>{homeTeam}</div>
                  <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:66, lineHeight:1, color:"#e8d5a0", fontWeight:700 }}>{result.hScore}</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#6a5a3a", letterSpacing:2, marginBottom:3 }}>TOTAL</div>
                  <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:32, color:"#fbbf24", fontWeight:700 }}>{result.total}</div>
                  {odds && (() => {
                    const edge = parseFloat(result.total) - odds.overUnder;
                    const rec  = edge > 2 ? "OVER" : edge < -2 ? "UNDER" : "PASS";
                    return (
                      <div style={{ marginTop:6 }}>
                        <div style={{ fontSize:9, color:"#4b5563" }}>VEGAS</div>
                        <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:22, color:"#d4b870", fontWeight:700 }}>{odds.overUnder.toFixed(1)}</div>
                        <div style={{ fontSize:11, fontWeight:700, color:rec==="OVER"?"#38bdf8":rec==="UNDER"?"#f87171":"#4b5563", fontFamily:"monospace", marginTop:2 }}>{rec}{rec!=="PASS"?` (${edge>0?"+":""}${edge.toFixed(1)})`:""}</div>
                      </div>
                    );
                  })()}
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10, color:aColor, letterSpacing:2, marginBottom:3 }}>{awayTeam}</div>
                  <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:66, lineHeight:1, color:"#e8d5a0", fontWeight:700 }}>{result.aScore}</div>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {[[homeTeam,result.hWinProb,hColor,odds?.homeMoneyline],[awayTeam,result.aWinProb,aColor,odds?.awayMoneyline]].map(([abbr,prob,col,vegaML]) => {
                  const edge = vegaML ? (prob - americanToImplied(vegaML)) * 100 : null;
                  return (
                    <div key={abbr} style={{ background:"rgba(255,200,80,0.04)", border:`1px solid ${col}28`, borderRadius:6, padding:"10px 12px" }}>
                      <div style={{ fontSize:10, color:"#6a5a3a", letterSpacing:2, marginBottom:8 }}>{abbr} MONEYLINE</div>
                      <div style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
                        <div>
                          <div style={{ fontSize:9, color:"#4b5563", marginBottom:2 }}>MODEL</div>
                          <div style={{ fontSize:22, fontWeight:700, color:col, fontFamily:"'Oswald',sans-serif" }}>{mlAmerican(prob)}</div>
                          <div style={{ fontSize:10, color:"#4b5563" }}>{(prob*100).toFixed(1)}% win</div>
                        </div>
                        {vegaML && <>
                          <div style={{ color:"#2d2010", fontSize:18, alignSelf:"center" }}>|</div>
                          <div>
                            <div style={{ fontSize:9, color:"#4b5563", marginBottom:2 }}>VEGAS</div>
                            <div style={{ fontSize:22, fontWeight:700, color:"#d4b870", fontFamily:"'Oswald',sans-serif" }}>{vegaML>0?"+":""}{vegaML}</div>
                            {edge!==null && <div style={{ fontSize:10, fontWeight:700, color:edge>2?"#3fb950":edge<-2?"#f85149":"#6a5a3a" }}>{edge>0?"+":""}{edge.toFixed(1)}% edge</div>}
                          </div>
                        </>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {odds && (() => {
              const ba = analyzeBetting(result, odds);
              return (
                <div style={{ ...card, border:"1px solid rgba(74,222,128,0.18)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <div style={{ fontSize:10, color:"#5aaa7a", letterSpacing:3 }}>BETTING ANALYSIS</div>
                    <span style={{ fontSize:10, padding:"2px 7px", borderRadius:2, background:odds.source==="espn"?"rgba(74,222,128,0.1)":"rgba(251,191,36,0.1)", color:odds.source==="espn"?"#4ade80":"#fbbf24", border:`1px solid ${odds.source==="espn"?"rgba(74,222,128,0.25)":"rgba(251,191,36,0.2)"}`, fontFamily:"monospace" }}>
                      {odds.source==="espn"?"● LIVE ESPN":"◎ MANUAL"}
                    </span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                    {[
                      { label:"MONEYLINE VALUE", rec:ba.mlValueSide==="none"?"PASS":`${ba.mlValueSide.toUpperCase()} ML`, good:ba.mlValueSide!=="none", detail:ba.mlValueSide!=="none"?`+${ba.mlValuePct.toFixed(1)}% edge`:`¼ Kelly: ${(Math.max(ba.kellyHome,ba.kellyAway)*100).toFixed(1)}%` },
                      { label:`SPREAD H${odds.spread>0?"+":""}${odds.spread}`, rec:ba.spreadRec==="pass"?"PASS":ba.spreadRec.toUpperCase(), good:ba.spreadRec!=="pass", detail:ba.spreadRec!=="pass"?`+${ba.spreadEdge.toFixed(1)}% edge`:`Proj diff: ${parseFloat(result.projDiff)>0?"+":""}${result.projDiff} pts` },
                      { label:`O/U ${odds.overUnder}`, rec:ba.ouRec==="pass"?"PASS":ba.ouRec.toUpperCase(), good:ba.ouRec!=="pass", detail:`Model: ${result.total} (${ba.ouEdge>0?"+":""}${ba.ouEdge.toFixed(1)})` },
                    ].map(({ label, rec, good, detail }) => (
                      <div key={label} style={{ background:"rgba(255,200,80,0.03)", border:`1px solid ${good?"rgba(74,222,128,0.2)":"rgba(255,200,80,0.1)"}`, borderRadius:5, padding:"10px" }}>
                        <div style={{ fontSize:9, color:"#5aaa7a", letterSpacing:2, marginBottom:7 }}>{label}</div>
                        <div style={{ fontSize:14, fontWeight:700, color:good?"#4ade80":"#4b5563", fontFamily:"'Oswald',sans-serif", marginBottom:5 }}>{rec}</div>
                        <div style={{ fontSize:10, color:good?"#6abe88":"#4b5563" }}>{detail}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:10, padding:"7px 10px", background:"rgba(251,191,36,0.03)", border:"1px solid rgba(251,191,36,0.08)", borderRadius:4, fontSize:9, color:"#7a6a3a" }}>
                    ⚠ For entertainment only. Edge assumes ~50% efficient market. Always verify lines.
                  </div>
                </div>
              );
            })()}

            <div style={card}>
              <div style={{ fontSize:10, color:"#7a6a3a", letterSpacing:3, marginBottom:10 }}>MODEL INPUTS</div>
              {result.features.map(f => (
                <div key={f.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:"1px solid rgba(255,200,80,0.05)" }}>
                  <span style={{ fontSize:10, color:"#7a6a3a" }}>{f.label}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ fontSize:10, color:"#e8d5a0", fontFamily:"monospace" }}>{f.detail}</span>
                    <span style={{ fontSize:9, padding:"1px 5px", borderRadius:2, background:f.good?"rgba(251,191,36,0.08)":"rgba(100,100,100,0.1)", color:f.good?"#fbbf24":"#4b5563", border:`1px solid ${f.good?"rgba(251,191,36,0.15)":"rgba(100,100,100,0.12)"}` }}>{f.good?"▲":"▼"}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background:"rgba(255,200,80,0.02)", border:"1px solid rgba(255,200,80,0.06)", borderRadius:4, padding:"10px 14px", fontSize:10, color:"#6a5a3a", lineHeight:1.8, marginBottom:14 }}>
              <span style={{ color:"#fbbf24" }}>MODEL: </span>
              Net Rating is the strongest predictor — a 10-pt gap ≈ 5% win probability swing. eFG% weights 3s correctly (1.5×). Home court ≈ +3.2 pts. B2B penalty: −2.8 pts.{" "}
              Stats: {hasLive ? <span style={{ color:"#fbbf24" }}>Basketball Reference · {statsUpdated}</span> : <span style={{ color:"#4b5563" }}>2024-25 estimates — import BBRef Misc Stats to update</span>}.
            </div>
          </div>
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
        </> /* end predictor tab */}

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
