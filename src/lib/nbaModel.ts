import type {
  GameType,
  LiveStatsMap,
  PredictionResult,
  TeamAbbr,
  TeamStats,
} from './nbaTypes'

export const TEAMS: Record<TeamAbbr, TeamStats> = {
  "BKN": { name:"Nets",          color:"#000000", alt:"#FFFFFF", div:"Atlantic",  conf:"East", offRtg:110.0, defRtg:119.2, pace:96.6,  netRtg:-9.2,  tsPct:56.1, rebPct:48.8, astPct:57.2, tovPct:14.1, efgPct:52.3, oppEfgPct:57.0, threePAr:46.3, arena:"Barclays Center",             capacity:17732 },
  "BOS": { name:"Celtics",       color:"#007A33", alt:"#BA9653", div:"Atlantic",  conf:"East", offRtg:120.6, defRtg:112.6, pace:94.7,  netRtg:8.0,   tsPct:57.9, rebPct:53.6, astPct:64.2, tovPct:11.0, efgPct:55.0, oppEfgPct:52.1, threePAr:46.7, arena:"TD Garden",                   capacity:19156 },
  "NYK": { name:"Knicks",        color:"#F58426", alt:"#006BB6", div:"Atlantic",  conf:"East", offRtg:119.5, defRtg:112.8, pace:97.6,  netRtg:6.7,   tsPct:58.7, rebPct:53.1, astPct:58.9, tovPct:12.0, efgPct:55.5, oppEfgPct:53.6, threePAr:43.5, arena:"Madison Square Garden",       capacity:19812 },
  "PHI": { name:"76ers",         color:"#006BB6", alt:"#ED174C", div:"Atlantic",  conf:"East", offRtg:115.3, defRtg:115.5, pace:99.1,  netRtg:-0.2,  tsPct:57.2, rebPct:50.3, astPct:60.1, tovPct:11.9, efgPct:52.8, oppEfgPct:54.4, threePAr:39.8, arena:"Wells Fargo Center",          capacity:20478 },
  "TOR": { name:"Raptors",       color:"#CE1141", alt:"#000000", div:"Atlantic",  conf:"East", offRtg:114.6, defRtg:113.0, pace:98.4,  netRtg:1.6,   tsPct:57.3, rebPct:49.7, astPct:62.4, tovPct:12.3, efgPct:53.7, oppEfgPct:53.9, threePAr:37.0, arena:"Scotiabank Arena",            capacity:19800 },
  "CHI": { name:"Bulls",         color:"#CE1141", alt:"#000000", div:"Central",   conf:"East", offRtg:113.2, defRtg:117.3, pace:101.7, netRtg:-4.1,  tsPct:58.2, rebPct:46.8, astPct:61.8, tovPct:13.2, efgPct:55.0, oppEfgPct:54.9, threePAr:44.6, arena:"United Center",               capacity:20917 },
  "CLE": { name:"Cavaliers",     color:"#860038", alt:"#FDBB30", div:"Central",   conf:"East", offRtg:118.3, defRtg:114.1, pace:100.2, netRtg:4.2,   tsPct:58.9, rebPct:51.3, astPct:63.1, tovPct:12.4, efgPct:55.6, oppEfgPct:54.0, threePAr:44.4, arena:"Rocket Mortgage FieldHouse",  capacity:19432 },
  "DET": { name:"Pistons",       color:"#C8102E", alt:"#006BB6", div:"Central",   conf:"East", offRtg:116.8, defRtg:109.4, pace:99.7,  netRtg:7.4,   tsPct:57.5, rebPct:54.9, astPct:58.2, tovPct:13.0, efgPct:53.8, oppEfgPct:51.6, threePAr:34.9, arena:"Little Caesars Arena",        capacity:20332 },
  "IND": { name:"Pacers",        color:"#002D62", alt:"#FDBB30", div:"Central",   conf:"East", offRtg:109.7, defRtg:118.0, pace:101.0, netRtg:-8.3,  tsPct:55.9, rebPct:46.2, astPct:66.8, tovPct:12.7, efgPct:52.3, oppEfgPct:55.5, threePAr:41.6, arena:"Gainbridge Fieldhouse",       capacity:17923 },
  "MIL": { name:"Bucks",         color:"#00471B", alt:"#EEE1C6", div:"Central",   conf:"East", offRtg:113.4, defRtg:117.9, pace:97.7,  netRtg:-4.5,  tsPct:58.9, rebPct:44.8, astPct:62.8, tovPct:13.4, efgPct:56.4, oppEfgPct:55.0, threePAr:43.9, arena:"Fiserv Forum",                capacity:17341 },
  "ATL": { name:"Hawks",         color:"#E03A3E", alt:"#C1D32F", div:"Southeast", conf:"East", offRtg:114.8, defRtg:114.5, pace:102.1, netRtg:0.3,   tsPct:58.1, rebPct:47.2, astPct:65.2, tovPct:12.3, efgPct:55.0, oppEfgPct:54.5, threePAr:42.8, arena:"State Farm Arena",             capacity:18118 },
  "CHA": { name:"Hornets",       color:"#1D1160", alt:"#00788C", div:"Southeast", conf:"East", offRtg:118.8, defRtg:115.1, pace:97.3,  netRtg:3.7,   tsPct:58.8, rebPct:54.3, astPct:60.8, tovPct:13.7, efgPct:55.1, oppEfgPct:54.2, threePAr:47.7, arena:"Spectrum Center",              capacity:19077 },
  "MIA": { name:"Heat",          color:"#98002E", alt:"#F9A01B", div:"Southeast", conf:"East", offRtg:115.6, defRtg:112.3, pace:103.7, netRtg:3.3,   tsPct:57.4, rebPct:49.7, astPct:61.2, tovPct:11.8, efgPct:53.7, oppEfgPct:53.0, threePAr:39.6, arena:"Kaseya Center",               capacity:19600 },
  "ORL": { name:"Magic",         color:"#0077C0", alt:"#C4CED4", div:"Southeast", conf:"East", offRtg:114.5, defRtg:114.1, pace:99.4,  netRtg:0.4,   tsPct:57.3, rebPct:48.9, astPct:60.4, tovPct:12.0, efgPct:52.8, oppEfgPct:54.3, threePAr:38.3, arena:"Kia Center",                  capacity:18846 },
  "WAS": { name:"Wizards",       color:"#002B5C", alt:"#E31837", div:"Southeast", conf:"East", offRtg:110.8, defRtg:121.5, pace:100.9, netRtg:-10.7, tsPct:56.3, rebPct:49.0, astPct:59.8, tovPct:13.5, efgPct:53.0, oppEfgPct:55.4, threePAr:40.0, arena:"Capital One Arena",            capacity:20356 },
  "DEN": { name:"Nuggets",       color:"#0E2240", alt:"#FEC524", div:"Northwest", conf:"West", offRtg:121.4, defRtg:117.6, pace:97.9,  netRtg:3.8,   tsPct:61.2, rebPct:47.6, astPct:66.8, tovPct:11.8, efgPct:57.1, oppEfgPct:54.4, threePAr:40.5, arena:"Ball Arena",                  capacity:19520 },
  "MIN": { name:"Timberwolves",  color:"#0C2340", alt:"#236192", div:"Northwest", conf:"West", offRtg:117.7, defRtg:113.1, pace:100.7, netRtg:4.6,   tsPct:59.6, rebPct:50.2, astPct:62.4, tovPct:12.8, efgPct:56.4, oppEfgPct:53.2, threePAr:42.4, arena:"Target Center",               capacity:18978 },
  "OKC": { name:"Thunder",       color:"#007AC1", alt:"#EF3B24", div:"Northwest", conf:"West", offRtg:118.4, defRtg:107.3, pace:99.5,  netRtg:11.1,  tsPct:59.8, rebPct:45.9, astPct:64.8, tovPct:11.3, efgPct:55.8, oppEfgPct:51.6, threePAr:42.3, arena:"Paycom Center",               capacity:18203 },
  "POR": { name:"Trail Blazers", color:"#E03A3E", alt:"#000000", div:"Northwest", conf:"West", offRtg:113.6, defRtg:116.6, pace:101.0, netRtg:-3.0,  tsPct:56.6, rebPct:55.0, astPct:59.8, tovPct:14.5, efgPct:52.9, oppEfgPct:54.9, threePAr:46.8, arena:"Moda Center",                 capacity:19980 },
  "UTA": { name:"Jazz",          color:"#002B5C", alt:"#00471B", div:"Northwest", conf:"West", offRtg:114.7, defRtg:122.1, pace:101.6, netRtg:-7.4,  tsPct:57.8, rebPct:50.4, astPct:61.8, tovPct:13.3, efgPct:53.8, oppEfgPct:57.4, threePAr:41.1, arena:"Delta Center",                 capacity:18306 },
  "GSW": { name:"Warriors",      color:"#1D428A", alt:"#FFC72C", div:"Pacific",   conf:"West", offRtg:115.3, defRtg:114.0, pace:99.5,  netRtg:1.3,   tsPct:58.6, rebPct:49.3, astPct:67.8, tovPct:13.7, efgPct:55.2, oppEfgPct:54.4, threePAr:50.7, arena:"Chase Center",                capacity:18064 },
  "LAC": { name:"Clippers",      color:"#C8102E", alt:"#1D428A", div:"Pacific",   conf:"West", offRtg:116.3, defRtg:115.9, pace:96.2,  netRtg:0.4,   tsPct:60.0, rebPct:47.5, astPct:62.1, tovPct:13.7, efgPct:55.5, oppEfgPct:54.1, threePAr:41.0, arena:"Intuit Dome",                 capacity:18000 },
  "LAL": { name:"Lakers",        color:"#552583", alt:"#FDB927", div:"Pacific",   conf:"West", offRtg:117.7, defRtg:117.0, pace:98.6,  netRtg:0.7,   tsPct:60.8, rebPct:47.8, astPct:62.8, tovPct:13.3, efgPct:57.1, oppEfgPct:55.9, threePAr:40.0, arena:"Crypto.com Arena",            capacity:18997 },
  "PHX": { name:"Suns",          color:"#1D1160", alt:"#E56020", div:"Pacific",   conf:"West", offRtg:114.7, defRtg:113.7, pace:97.3,  netRtg:1.0,   tsPct:56.5, rebPct:53.2, astPct:63.8, tovPct:13.1, efgPct:53.3, oppEfgPct:53.9, threePAr:45.4, arena:"Footprint Center",            capacity:18422 },
  "SAC": { name:"Kings",         color:"#5A2D81", alt:"#63727A", div:"Pacific",   conf:"West", offRtg:110.3, defRtg:121.2, pace:99.6,  netRtg:-10.9, tsPct:55.6, rebPct:49.3, astPct:64.2, tovPct:12.6, efgPct:51.9, oppEfgPct:57.0, threePAr:33.7, arena:"Golden 1 Center",             capacity:17608 },
  "DAL": { name:"Mavericks",     color:"#00538C", alt:"#002B5E", div:"Southwest", conf:"West", offRtg:110.6, defRtg:114.9, pace:101.6, netRtg:-4.3,  tsPct:56.4, rebPct:46.5, astPct:65.8, tovPct:12.8, efgPct:52.9, oppEfgPct:53.5, threePAr:35.0, arena:"American Airlines Center",    capacity:19200 },
  "HOU": { name:"Rockets",       color:"#CE1141", alt:"#C4CED4", div:"Southwest", conf:"West", offRtg:117.9, defRtg:112.5, pace:95.9,  netRtg:5.4,   tsPct:57.3, rebPct:59.3, astPct:62.8, tovPct:13.6, efgPct:53.9, oppEfgPct:52.5, threePAr:34.3, arena:"Toyota Center",               capacity:18055 },
  "MEM": { name:"Grizzlies",     color:"#5D76A9", alt:"#12173F", div:"Southwest", conf:"West", offRtg:113.7, defRtg:115.8, pace:101.3, netRtg:-2.1,  tsPct:57.3, rebPct:49.6, astPct:59.8, tovPct:13.1, efgPct:53.6, oppEfgPct:54.9, threePAr:42.0, arena:"FedExForum",                  capacity:17794 },
  "NOP": { name:"Pelicans",      color:"#0C2340", alt:"#C8102E", div:"Southwest", conf:"West", offRtg:114.0, defRtg:119.0, pace:100.2, netRtg:-5.0,  tsPct:56.6, rebPct:51.3, astPct:60.4, tovPct:12.4, efgPct:52.5, oppEfgPct:55.5, threePAr:35.9, arena:"Smoothie King Center",         capacity:17805 },
  "SAS": { name:"Spurs",         color:"#C4CED4", alt:"#000000", div:"Southwest", conf:"West", offRtg:117.8, defRtg:111.0, pace:100.1, netRtg:6.8,   tsPct:59.0, rebPct:49.6, astPct:61.8, tovPct:12.1, efgPct:55.3, oppEfgPct:52.1, threePAr:42.1, arena:"Frost Bank Center",           capacity:18418 },
};

const BBREF_NAME_MAP: Record<string, TeamAbbr> = {
  "atlanta hawks":"ATL",       "boston celtics":"BOS",      "brooklyn nets":"BKN",
  "charlotte hornets":"CHA",   "chicago bulls":"CHI",       "cleveland cavaliers":"CLE",
  "dallas mavericks":"DAL",    "denver nuggets":"DEN",      "detroit pistons":"DET",
  "golden state warriors":"GSW","houston rockets":"HOU",    "indiana pacers":"IND",
  "los angeles clippers":"LAC","los angeles lakers":"LAL",  "memphis grizzlies":"MEM",
  "miami heat":"MIA",          "milwaukee bucks":"MIL",     "minnesota timberwolves":"MIN",
  "new orleans pelicans":"NOP","new york knicks":"NYK",     "oklahoma city thunder":"OKC",
  "orlando magic":"ORL",       "philadelphia 76ers":"PHI",  "phoenix suns":"PHX",
  "portland trail blazers":"POR","sacramento kings":"SAC",  "san antonio spurs":"SAS",
  "toronto raptors":"TOR",     "utah jazz":"UTA",           "washington wizards":"WAS",
};

export const DIVISIONS = [...new Set(Object.values(TEAMS).map(t => t.div))];
export const GAME_TYPES: GameType[] = ["Regular Season","Playoff (Round 1)","Playoff (Conf Semi)","Playoff (Conf Final)","NBA Finals"];

const ESPN_ABBR_MAP: Record<string, TeamAbbr> = { "GS":"GSW","SA":"SAS","NO":"NOP","NY":"NYK","BK":"BKN","WSH":"WAS","PHO":"PHX","UTAH":"UTA" };
export const normalizeAbbr = (espn: string): string => ESPN_ABBR_MAP[espn] ?? espn;

const LEAGUE_AVG_RTG = 115.3;
const LEAGUE_AVG_PACE = 99.0;
const HOME_COURT_EDGE = 2.3;
const BACK_TO_BACK_EDGE = 1.4;
const PLAYOFF_PACE_MULTIPLIER = 0.975;
const MARGIN_STD_DEV = 12.0;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalWinProb(margin: number): number {
  const z = margin / MARGIN_STD_DEV;
  return clamp(1 / (1 + Math.exp(-1.7 * z)), 0.03, 0.97);
}

export function parseBBRefCSV(raw: string): { stats: LiveStatsMap; count: number; timestamp: string } {
  const now   = new Date().toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" });
  const lines = raw.trim().split(/\r?\n/).filter(l => l.trim() && !l.startsWith(",,"));

  if (lines.length < 2) throw new Error("Paste appears empty — copy all rows including the header");

  const headerLine = lines[0];
  if (!headerLine) throw new Error("Paste appears empty - copy all rows including the header");
  const delim  = headerLine.includes("\t") ? "\t" : ",";
  const headers = headerLine.split(delim).map(h => h.trim().replace(/"/g, "").toLowerCase());

  const col = (...names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex(h => h === n.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };

  const iTeam   = col("team");
  const iORtg   = col("ortg", "o_rtg");
  const iDRtg   = col("drtg", "d_rtg");
  const iNRtg   = col("nrtg", "n_rtg");
  const iPace   = col("pace");
  const iEFG    = col("efg%", "efg_pct");
  const iOppEFG = col("efg%opp", "efg%_opp", "oefg%opp");
  const iTOV    = col("tov%", "tov_pct");
  const iORB    = col("orb%", "orb_pct");
  const i3PAr   = col("3par", "3pa_r");

  if (iTeam < 0) throw new Error("Could not find Team column — make sure you copied the header row");
  if (iORtg < 0 && iDRtg < 0) throw new Error("Could not find ORtg/DRtg columns — use the Advanced Stats table");

  const result: LiveStatsMap = {};
  let updated  = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(delim).map(c => c.trim().replace(/"/g, ""));
    if (cols.length < 3) continue;

    const rawName = (cols[iTeam] ?? "").toLowerCase().replace(/\*/g, "").trim();
    const abbr    = BBREF_NAME_MAP[rawName];
    if (!abbr || !TEAMS[abbr]) continue;

    const p = (idx: number, fallback: number | null) => {
      if (idx < 0 || !cols[idx] || cols[idx] === "") return fallback;
      const v = parseFloat(cols[idx]);
      return isNaN(v) ? fallback : v;
    };

    const fb      = TEAMS[abbr];
    const offRtg  = p(iORtg, fb.offRtg) ?? fb.offRtg;
    const defRtg  = p(iDRtg, fb.defRtg) ?? fb.defRtg;
    const netRtgRaw = p(iNRtg, null);
    const netRtg    = netRtgRaw !== null ? netRtgRaw : offRtg - defRtg;
    const pace   = p(iPace,   fb.pace) ?? fb.pace;
    const toPercent = (v: number | null, fallback: number | null) =>
      v != null && !isNaN(v) ? (v <= 1 ? +(v * 100).toFixed(1) : +v.toFixed(1)) : fallback;
    const efgRaw    = p(iEFG,    null);
    const efgPct    = toPercent(efgRaw,    fb.efgPct) ?? fb.efgPct;
    const oppEfgRaw = p(iOppEFG, null);
    const oppEfgPct = toPercent(oppEfgRaw, fb.oppEfgPct) ?? fb.oppEfgPct;
    const tovRaw    = p(iTOV, null);
    const tovPct    = toPercent(tovRaw,    fb.tovPct) ?? fb.tovPct;
    const orbRaw    = p(iORB, null);
    const rebPct    = orbRaw !== null
      ? toPercent(orbRaw, null) !== null
        ? +(50 + (orbRaw <= 1 ? orbRaw * 100 : orbRaw) - 25).toFixed(1)
        : fb.rebPct
      : fb.rebPct;
    const threePArRaw = p(i3PAr, null);
    const threePAr    = toPercent(threePArRaw, fb.threePAr) ?? fb.threePAr;

    result[abbr] = {
      offRtg:    +offRtg.toFixed(1),
      defRtg:    +defRtg.toFixed(1),
      netRtg:    +netRtg.toFixed(1),
      pace:      +pace.toFixed(1),
      efgPct, oppEfgPct, tovPct, rebPct, threePAr,
      astPct:    fb.astPct,
      lastUpdated: `BBRef · ${now}`,
    };
    updated++;
  }

  if (updated === 0) throw new Error("No teams matched — check you copied the Miscellaneous Stats table (not Per Game)");
  return { stats: result, count: updated, timestamp: now };
}

export function predictGame({
  homeTeam,
  awayTeam,
  gameType,
  homeB2B,
  awayB2B,
  liveStats,
}: {
  homeTeam: TeamAbbr
  awayTeam: TeamAbbr
  gameType: GameType
  homeB2B: boolean
  awayB2B: boolean
  liveStats: LiveStatsMap
}): PredictionResult {
  const fb_h = TEAMS[homeTeam], fb_a = TEAMS[awayTeam];
  const h = liveStats?.[homeTeam] ? { ...fb_h, ...liveStats[homeTeam] } : { ...fb_h };
  const a = liveStats?.[awayTeam] ? { ...fb_a, ...liveStats[awayTeam] } : { ...fb_a };

  const isPlayoff = gameType !== "Regular Season";
  const playoffPaceFactor = isPlayoff ? PLAYOFF_PACE_MULTIPLIER : 1;

  const expectedPace = clamp(((h.pace + a.pace) / 2) * playoffPaceFactor, 92, 103);

  // Blend team offense with opponent defense instead of multiplying ratios.
  const homeBaseRtg = (h.offRtg + a.defRtg) / 2;
  const awayBaseRtg = (a.offRtg + h.defRtg) / 2;

  // Matchup adjustments are kept modest so ratings remain the primary driver.
  const homeMatchupAdj =
    (h.efgPct - a.oppEfgPct) * 0.45 +
    (a.tovPct - h.tovPct) * 0.25 +
    (h.rebPct - a.rebPct) * 0.10 +
    (h.threePAr - a.threePAr) * 0.05;

  const awayMatchupAdj =
    (a.efgPct - h.oppEfgPct) * 0.45 +
    (h.tovPct - a.tovPct) * 0.25 +
    (a.rebPct - h.rebPct) * 0.10 +
    (a.threePAr - h.threePAr) * 0.05;

  // Net rating works as a light prior so matchup stats do not dominate.
  const netRatingEdge = (h.netRtg - a.netRtg) * 0.18;
  const situationalEdge =
    HOME_COURT_EDGE +
    (homeB2B ? -BACK_TO_BACK_EDGE : 0) +
    (awayB2B ? BACK_TO_BACK_EDGE : 0);

  const homeExpectedRtg = clamp(homeBaseRtg + homeMatchupAdj + netRatingEdge / 2, 101, 125);
  const awayExpectedRtg = clamp(awayBaseRtg + awayMatchupAdj - netRatingEdge / 2, 101, 125);

  const baseHomeScore = (homeExpectedRtg / 100) * expectedPace;
  const baseAwayScore = (awayExpectedRtg / 100) * expectedPace;

  const projectedMargin = (baseHomeScore - baseAwayScore) + situationalEdge;
  const projectedTotal = baseHomeScore + baseAwayScore;

  const hScore = Math.max(85, projectedTotal / 2 + projectedMargin / 2);
  const aScore = Math.max(85, projectedTotal / 2 - projectedMargin / 2);
  const diff = hScore - aScore;
  const hWinProb = normalWinProb(diff);
  const displayHScore = Number(hScore.toFixed(1));
  const displayAScore = Number(aScore.toFixed(1));
  const displayTotal = displayHScore + displayAScore;
  const displayDiff = displayHScore - displayAScore;

  return {
    hWinProb, aWinProb: 1 - hWinProb,
    hScore:   displayHScore.toFixed(1),
    aScore:   displayAScore.toFixed(1),
    total:    displayTotal.toFixed(1),
    projDiff: displayDiff.toFixed(1),
    isPlayoff,
    features: [
      { label:`${homeTeam} Offensive Rating`, good: h.offRtg >= 117,  detail: h.offRtg.toFixed(1) },
      { label:`${homeTeam} Defensive Rating`, good: h.defRtg <= 112,  detail: h.defRtg.toFixed(1) },
      { label:`${awayTeam} Offensive Rating`, good: a.offRtg >= 117,  detail: a.offRtg.toFixed(1) },
      { label:`${awayTeam} Defensive Rating`, good: a.defRtg <= 112,  detail: a.defRtg.toFixed(1) },
      { label:`${homeTeam} Net Rating`,       good: h.netRtg >= 4,    detail: `${h.netRtg >= 0 ? "+" : ""}${h.netRtg.toFixed(1)}` },
      { label:`${awayTeam} Net Rating`,       good: a.netRtg >= 4,    detail: `${a.netRtg >= 0 ? "+" : ""}${a.netRtg.toFixed(1)}` },
      { label:`${homeTeam} eFG%`,             good: h.efgPct >= 55,   detail: `${h.efgPct.toFixed(1)}%` },
      { label:`${awayTeam} eFG%`,             good: a.efgPct >= 55,   detail: `${a.efgPct.toFixed(1)}%` },
      { label:`${homeTeam} TOV%`,             good: h.tovPct <= 12,   detail: `${h.tovPct.toFixed(1)}%` },
      { label:`${awayTeam} TOV%`,             good: a.tovPct <= 12,   detail: `${a.tovPct.toFixed(1)}%` },
      { label:"Home Court Advantage",         good: true,             detail: `+${HOME_COURT_EDGE.toFixed(1)} pts` },
      { label:"Game Type",                    good: !isPlayoff,       detail: gameType },
    ],
  };
}
