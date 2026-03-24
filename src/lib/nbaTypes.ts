export type TeamAbbr =
  | 'ATL'
  | 'BKN'
  | 'BOS'
  | 'CHA'
  | 'CHI'
  | 'CLE'
  | 'DAL'
  | 'DEN'
  | 'DET'
  | 'GSW'
  | 'HOU'
  | 'IND'
  | 'LAC'
  | 'LAL'
  | 'MEM'
  | 'MIA'
  | 'MIL'
  | 'MIN'
  | 'NOP'
  | 'NYK'
  | 'OKC'
  | 'ORL'
  | 'PHI'
  | 'PHX'
  | 'POR'
  | 'SAC'
  | 'SAS'
  | 'TOR'
  | 'UTA'
  | 'WAS'

export type GameType =
  | 'Regular Season'
  | 'Playoff (Round 1)'
  | 'Playoff (Conf Semi)'
  | 'Playoff (Conf Final)'
  | 'NBA Finals'

export type TeamStats = {
  name: string
  color: string
  alt: string
  div: string
  conf: string
  offRtg: number
  defRtg: number
  pace: number
  netRtg: number
  tsPct: number
  rebPct: number
  astPct: number
  tovPct: number
  efgPct: number
  oppEfgPct: number
  threePAr: number
  arena: string
  capacity: number
}

export type LiveTeamStats = Partial<
  Pick<
    TeamStats,
    'offRtg' | 'defRtg' | 'pace' | 'netRtg' | 'rebPct' | 'astPct' | 'tovPct' | 'efgPct' | 'oppEfgPct' | 'threePAr'
  >
> & {
  lastUpdated?: string
}

export type LiveStatsMap = Partial<Record<TeamAbbr, LiveTeamStats>>

export type PredictionFeature = {
  label: string
  good: boolean
  detail: string
}

export type PredictionResult = {
  hWinProb: number
  aWinProb: number
  hScore: string
  aScore: string
  total: string
  projDiff: string
  isPlayoff: boolean
  features: PredictionFeature[]
}

export type OddsInput = {
  source: string
  homeMoneyline: number
  awayMoneyline: number
  spread: number
  spreadHomeOdds: number
  spreadAwayOdds: number
  overUnder: number
  overOdds: number
  underOdds: number
}

export type BettingAnalysis = {
  homeImpliedProb: number
  awayImpliedProb: number
  homeEdge: number
  awayEdge: number
  mlValueSide: 'home' | 'away' | 'none'
  mlValuePct: number
  spreadRec: string
  spreadEdge: number
  ouRec: 'over' | 'under' | 'pass'
  ouEdge: number
  ouEdgePct: number
  homeCoverProb: number
  awayCoverProb: number
  spHIC: number
  spAIC: number
  ovIC: number
  unIC: number
  pOver: number
  pUnder: number
  kellyHome: number
  kellyAway: number
  kellySpread: number
  kellyOU: number
}

export type SharpLeanSide = 'home' | 'away' | 'over' | 'under' | 'none'
export type SharpLeanValue = SharpLeanSide | SharpLeanSide[]

export type SharpSignalInput = {
  source: string
  lastUpdated?: string
  openingHomeMoneyline?: number | null
  openingAwayMoneyline?: number | null
  openingSpread?: number | null
  openingTotal?: number | null
  moneylineHomeBetsPct?: number | null
  moneylineHomeMoneyPct?: number | null
  spreadHomeBetsPct?: number | null
  spreadHomeMoneyPct?: number | null
  totalOverBetsPct?: number | null
  totalOverMoneyPct?: number | null
  clvLean?: SharpLeanValue
  steamMoveLean?: SharpLeanValue
  reverseLineMoveLean?: SharpLeanValue
  consensusMoneyline?: 'home' | 'away' | 'none'
  consensusSpread?: 'home' | 'away' | 'none'
  consensusTotal?: 'over' | 'under' | 'none'
  notes?: string
}

export type SharpSignalTag = {
  label: string
  aligned: boolean
  detail: string
}

export type SharpMarketContext = {
  source: string
  lastUpdated?: string
  homeMoneylineMove?: number | null
  awayMoneylineMove?: number | null
  spreadMove?: number | null
  totalMove?: number | null
  moneylineHomeSplitGap?: number | null
  spreadHomeSplitGap?: number | null
  totalOverSplitGap?: number | null
  tags: SharpSignalTag[]
}

export type InjuryInfo = {
  team: TeamAbbr
  player: string
  status: string
  note: string
  source?: string
  lastUpdated?: string
}

export type StarterPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C'

export type ProjectedStarter = {
  position: StarterPosition
  player: string
}

export type ProjectedStarterInfo = {
  team: TeamAbbr
  starters: ProjectedStarter[]
  source?: string
  lastUpdated?: string
}

export type RecentGameResult = {
  date: string
  opponent: TeamAbbr
  venue: 'vs.' | 'at'
  result: 'W' | 'L'
  pointsFor: number
  pointsAgainst: number
}

export type RecentFormSummary = {
  team: TeamAbbr
  games: RecentGameResult[]
  wins: number
  losses: number
  avgMargin: number
  streak: string
  source?: string
  lastUpdated?: string
}

export type CompositeRecommendation = {
  primaryMarket: 'ML' | 'SPR' | 'O/U' | 'PASS'
  pick: string
  score: number
  tier: 'A' | 'B' | 'C' | 'PASS'
  pass: boolean
  reasons: string[]
  modelStrength: number
  sharpStrength: number
}

export type TeamColors = {
  color: string
  altColor: string
}

export type ESPNTeamColorMap = Partial<Record<TeamAbbr, TeamColors>>

export type ScheduleGame = {
  homeAbbr: TeamAbbr
  awayAbbr: TeamAbbr
  gameTime: string
  tvInfo: string
}

export type ScheduleRow = {
  game: ScheduleGame
  espnOdds: OddsInput | null
  editedOdds: OddsInput | null
  simResult: PredictionResult | null
  homeB2B: boolean
  awayB2B: boolean
  sharpInput: SharpSignalInput | null
  sharpContext: SharpMarketContext | null
  injuries: InjuryInfo[]
  projectedStarters: {
    home: ProjectedStarterInfo | null
    away: ProjectedStarterInfo | null
  }
  recentForm: {
    home: RecentFormSummary | null
    away: RecentFormSummary | null
  }
  compositeRecommendation: CompositeRecommendation | null
}

export type EditableOddsFields = {
  homeMoneyline: string
  awayMoneyline: string
  spread: string
  spreadHomeOdds: string
  spreadAwayOdds: string
  overUnder: string
  overOdds: string
  underOdds: string
}

export type ManualOddsForm = {
  homeMoneyline: string
  awayMoneyline: string
  homeSpread: string
  spreadHomeOdds: string
  spreadAwayOdds: string
  overUnder: string
  overOdds: string
  underOdds: string
}

export type ParsedBulkGame = {
  homeAbbr: TeamAbbr
  awayAbbr: TeamAbbr
  odds: OddsInput
}

export type ResultLogEntry = {
  date: string
  home: TeamAbbr
  away: TeamAbbr
  hScore: number
  aScore: number
  completed?: boolean
}

export type PredictionLogEntry = {
  date: string
  home: TeamAbbr
  away: TeamAbbr
  hProj: number | null
  aProj: number | null
  modelTotal: number | null
  vegaOU: number | null
  vegasSpread: number | null
  spreadHomeOdds: number | null
  spreadAwayOdds: number | null
  overOdds: number | null
  underOdds: number | null
  ouRec: string
  ouEdge: string
  hMLmodel: string
  aMLmodel: string
  vegaHML: string
  vegaAML: string
  mlRec: string
  mlEdge: string
  sprRec: string
  sprEdge: string
  hWinPct: number | null
  aWinPct: number | null
}

export type GradedPredictionRow = PredictionLogEntry & {
  res: ResultLogEntry | null
  graded: boolean
  actualTotal?: number
  actualDiff?: number
  mlWin?: boolean
  mlROI?: number
  sprWin?: boolean | null
  sprROI?: number | null
  ouWin?: boolean | null
  ouROI?: number | null
}

export type RecordSummary = {
  w: number
  l: number
  roi: string
  pct: string
}

export type TrackerStats = {
  ml: RecordSummary
  spr: RecordSummary
  ou: RecordSummary
}
