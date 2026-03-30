import { americanToImplied } from './betting'
import type {
  BettingAnalysis,
  CompositeRecommendation,
  OddsInput,
  PredictionResult,
  SharpLeanSide,
  SharpLeanValue,
  SharpMarketContext,
  SharpSignalInput,
  ScheduleRow,
} from './nbaTypes'

function pushTag(tags: SharpMarketContext['tags'], label: string, aligned: boolean, detail: string): void {
  tags.push({ label, aligned, detail })
}

function signedGap(money: number | null | undefined, bets: number | null | undefined): number | null {
  if (money == null || bets == null) return null
  return money - bets
}

function leanValues(lean: SharpLeanValue | undefined): SharpLeanSide[] {
  if (!lean) return []
  const values = Array.isArray(lean) ? lean : [lean]
  return values.filter((value): value is SharpLeanSide => value != null && value !== 'none')
}

export function normalizeSharpSignals(
  sharpInput: SharpSignalInput | null | undefined,
  odds: OddsInput | null | undefined,
): SharpMarketContext | null {
  if (!sharpInput || !odds) return null

  const homeMoneylineMove =
    sharpInput.openingHomeMoneyline != null
      ? americanToImplied(odds.homeMoneyline) - americanToImplied(sharpInput.openingHomeMoneyline)
      : null
  const awayMoneylineMove =
    sharpInput.openingAwayMoneyline != null
      ? americanToImplied(odds.awayMoneyline) - americanToImplied(sharpInput.openingAwayMoneyline)
      : null
  const spreadMove = sharpInput.openingSpread != null ? odds.spread - sharpInput.openingSpread : null
  const totalMove = sharpInput.openingTotal != null ? odds.overUnder - sharpInput.openingTotal : null
  const moneylineHomeSplitGap = signedGap(sharpInput.moneylineHomeMoneyPct, sharpInput.moneylineHomeBetsPct)
  const spreadHomeSplitGap = signedGap(sharpInput.spreadHomeMoneyPct, sharpInput.spreadHomeBetsPct)
  const totalOverSplitGap = signedGap(sharpInput.totalOverMoneyPct, sharpInput.totalOverBetsPct)
  const tags: SharpMarketContext['tags'] = []

  if (homeMoneylineMove != null) {
    pushTag(tags, 'ML move', homeMoneylineMove > 0, `Home implied move ${(homeMoneylineMove * 100).toFixed(1)} pts`)
  }
  if (spreadMove != null) {
    pushTag(tags, 'Spread move', spreadMove < 0, `Home spread moved ${spreadMove > 0 ? '+' : ''}${spreadMove.toFixed(1)}`)
  }
  if (totalMove != null) {
    pushTag(tags, 'Total move', totalMove > 0, `Total moved ${totalMove > 0 ? '+' : ''}${totalMove.toFixed(1)}`)
  }
  if (moneylineHomeSplitGap != null) {
    pushTag(tags, 'ML splits', moneylineHomeSplitGap > 0, `Money-bets gap ${moneylineHomeSplitGap > 0 ? '+' : ''}${moneylineHomeSplitGap.toFixed(1)}%`)
  }
  if (spreadHomeSplitGap != null) {
    pushTag(tags, 'Spread splits', spreadHomeSplitGap > 0, `Money-bets gap ${spreadHomeSplitGap > 0 ? '+' : ''}${spreadHomeSplitGap.toFixed(1)}%`)
  }
  if (totalOverSplitGap != null) {
    pushTag(tags, 'Total splits', totalOverSplitGap > 0, `Money-bets gap ${totalOverSplitGap > 0 ? '+' : ''}${totalOverSplitGap.toFixed(1)}%`)
  }
  const clvValues = leanValues(sharpInput.clvLean)
  const steamValues = leanValues(sharpInput.steamMoveLean)
  const rlmValues = leanValues(sharpInput.reverseLineMoveLean)

  if (clvValues.length) {
    pushTag(tags, 'CLV lean', true, `CLV lean ${clvValues.map((value) => value.toUpperCase()).join(', ')}`)
  }
  if (steamValues.length) {
    pushTag(tags, 'Steam', true, `Steam on ${steamValues.map((value) => value.toUpperCase()).join(', ')}`)
  }
  if (rlmValues.length) {
    pushTag(tags, 'RLM', true, `Reverse line move on ${rlmValues.map((value) => value.toUpperCase()).join(', ')}`)
  }

  return {
    source: sharpInput.source,
    lastUpdated: sharpInput.lastUpdated,
    homeMoneylineMove,
    awayMoneylineMove,
    spreadMove,
    totalMove,
    moneylineHomeSplitGap,
    spreadHomeSplitGap,
    totalOverSplitGap,
    tags,
  }
}

function scoreLineMove(candidateSide: SharpLeanSide, sharp: SharpSignalInput | null | undefined, odds: OddsInput): number {
  if (!sharp) return 0
  if (candidateSide === 'home' && sharp.openingHomeMoneyline != null) {
    return americanToImplied(odds.homeMoneyline) - americanToImplied(sharp.openingHomeMoneyline) > 0.015 ? 8 : -4
  }
  if (candidateSide === 'away' && sharp.openingAwayMoneyline != null) {
    return americanToImplied(odds.awayMoneyline) - americanToImplied(sharp.openingAwayMoneyline) > 0.015 ? 8 : -4
  }
  if ((candidateSide === 'home' || candidateSide === 'away') && sharp.openingSpread != null) {
    const move = odds.spread - sharp.openingSpread
    if (candidateSide === 'home') return move < -0.5 ? 7 : move > 0.5 ? -5 : 0
    return move > 0.5 ? 7 : move < -0.5 ? -5 : 0
  }
  if ((candidateSide === 'over' || candidateSide === 'under') && sharp.openingTotal != null) {
    const move = odds.overUnder - sharp.openingTotal
    if (candidateSide === 'over') return move > 1 ? 7 : move < -1 ? -5 : 0
    return move < -1 ? 7 : move > 1 ? -5 : 0
  }
  return 0
}

function scoreSplit(gap: number | null | undefined, isAlignedPositive: boolean): number {
  if (gap == null) return 0
  if (isAlignedPositive) return gap >= 10 ? 6 : gap <= -10 ? -4 : 0
  return gap <= -10 ? 6 : gap >= 10 ? -4 : 0
}

function scoreLean(candidate: SharpLeanSide, lean: SharpLeanValue | undefined, weight: number): number {
  const values = leanValues(lean)
  if (!values.length) return 0
  return values.includes(candidate) ? weight : -Math.floor(weight / 2)
}

function scoreConsensus(
  market: 'ML' | 'SPR' | 'O/U',
  side: SharpLeanSide,
  sharp: SharpSignalInput | null | undefined,
): number {
  if (!sharp) return 0
  if (market === 'ML') {
    return sharp.consensusMoneyline === side ? 4 : sharp.consensusMoneyline && sharp.consensusMoneyline !== 'none' ? -2 : 0
  }
  if (market === 'SPR') {
    return sharp.consensusSpread === side ? 4 : sharp.consensusSpread && sharp.consensusSpread !== 'none' ? -2 : 0
  }
  return sharp.consensusTotal === side ? 4 : sharp.consensusTotal && sharp.consensusTotal !== 'none' ? -2 : 0
}

type Candidate = {
  market: 'ML' | 'SPR' | 'O/U'
  side: SharpLeanSide
  pick: string
  modelStrength: number
}

function candidateFromAnalysis(
  row: ScheduleRow,
  analysis: BettingAnalysis,
): Candidate[] {
  const candidates: Candidate[] = []
  if (analysis.mlValueSide !== 'none') {
    candidates.push({
      market: 'ML',
      side: analysis.mlValueSide,
      pick: `${analysis.mlValueSide === 'home' ? row.game.homeAbbr : row.game.awayAbbr} ML`,
      modelStrength: analysis.mlValuePct,
    })
  }
  if (analysis.spreadRec !== 'pass') {
    const side = analysis.spreadRec.startsWith('home') ? 'home' : 'away'
    const pick =
      side === 'home'
        ? `${row.game.homeAbbr} ${row.editedOdds?.spread != null && row.editedOdds.spread > 0 ? '+' : ''}${row.editedOdds?.spread ?? ''}`
        : `${row.game.awayAbbr} +${Math.abs(row.editedOdds?.spread ?? 0)}`
    candidates.push({
      market: 'SPR',
      side,
      pick,
      modelStrength: analysis.spreadEdge,
    })
  }
  if (analysis.ouRec !== 'pass') {
    candidates.push({
      market: 'O/U',
      side: analysis.ouRec,
      pick: `${analysis.ouRec.toUpperCase()} ${row.editedOdds?.overUnder ?? ''}`,
      modelStrength: analysis.ouEdgePct,
    })
  }
  return candidates
}

function tierFromScore(score: number): CompositeRecommendation['tier'] {
  if (score >= 80) return 'A'
  if (score >= 68) return 'B'
  if (score >= 55) return 'C'
  return 'PASS'
}

export function buildCompositeCandidates(
  row: ScheduleRow,
  analysis: BettingAnalysis | null,
): CompositeRecommendation[] {
  if (!analysis || !row.editedOdds) {
    return []
  }

  const candidates = candidateFromAnalysis(row, analysis)
  if (!candidates.length) {
    return []
  }

  return candidates
    .map((candidate) => {
      const modelStrength = Math.min(60, candidate.modelStrength * 3.2)
      const sharp = row.sharpInput
      let sharpStrength = 0

      sharpStrength += scoreLineMove(candidate.side, sharp, row.editedOdds as OddsInput)
      if (candidate.market === 'ML') {
        sharpStrength += scoreSplit(row.sharpContext?.moneylineHomeSplitGap, candidate.side === 'home')
      } else if (candidate.market === 'SPR') {
        sharpStrength += scoreSplit(row.sharpContext?.spreadHomeSplitGap, candidate.side === 'home')
      } else {
        sharpStrength += scoreSplit(row.sharpContext?.totalOverSplitGap, candidate.side === 'over')
      }
      sharpStrength += scoreLean(candidate.side, sharp?.clvLean, 5)
      sharpStrength += scoreLean(candidate.side, sharp?.steamMoveLean, 5)
      sharpStrength += scoreLean(candidate.side, sharp?.reverseLineMoveLean, 5)
      sharpStrength += scoreConsensus(candidate.market, candidate.side, sharp)

      const score = Math.max(0, Math.min(99, Math.round(modelStrength + 40 + sharpStrength)))
      const reasons: string[] = [`Model edge ${candidate.modelStrength.toFixed(1)}% on ${candidate.pick}`]
      if (sharpStrength > 0) reasons.push(`Sharp signals add ${sharpStrength} pts of support`)
      if (sharpStrength < 0) reasons.push(`Sharp signals conflict by ${Math.abs(sharpStrength)} pts`)
      if (!row.sharpInput) reasons.push('No sharp data loaded yet')

      const tier = tierFromScore(score)

      return {
        primaryMarket: candidate.market,
        pick: candidate.pick,
        score,
        tier,
        pass: false,
        reasons,
        modelStrength: Number(candidate.modelStrength.toFixed(1)),
        sharpStrength,
      } satisfies CompositeRecommendation
    })
    .sort((a, b) => b.score - a.score)
}

export function buildCompositeRecommendation(
  row: ScheduleRow,
  analysis: BettingAnalysis | null,
): CompositeRecommendation {
  if (!analysis || !row.editedOdds) {
    return {
      primaryMarket: 'PASS',
      pick: 'PASS',
      score: 0,
      tier: 'PASS',
      pass: true,
      reasons: ['Run a simulation and add odds to unlock recommendations'],
      modelStrength: 0,
      sharpStrength: 0,
    }
  }

  const scored = buildCompositeCandidates(row, analysis)
  if (!scored.length) {
    return {
      primaryMarket: 'PASS',
      pick: 'PASS',
      score: 38,
      tier: 'PASS',
      pass: true,
      reasons: ['Model edges are below play thresholds'],
      modelStrength: 0,
      sharpStrength: 0,
    }
  }

  const best = scored[0]
  if (!best) {
    return {
      primaryMarket: 'PASS',
      pick: 'PASS',
      score: 0,
      tier: 'PASS',
      pass: true,
      reasons: ['No valid recommendation candidates'],
      modelStrength: 0,
      sharpStrength: 0,
    }
  }
  const tier = tierFromScore(best.score)
  const pass = tier === 'PASS'

  return {
    primaryMarket: pass ? 'PASS' : best.primaryMarket,
    pick: pass ? 'PASS' : best.pick,
    score: best.score,
    tier,
    pass,
    reasons: pass ? [...best.reasons, 'Composite score remains below playable threshold'] : best.reasons,
    modelStrength: Number(best.modelStrength.toFixed(1)),
    sharpStrength: best.sharpStrength,
  }
}

export function createCompositeFromSim(
  row: ScheduleRow,
  result: PredictionResult,
  analysis: BettingAnalysis | null,
): ScheduleRow {
  const sharpContext = normalizeSharpSignals(row.sharpInput, row.editedOdds)
  return {
    ...row,
    simResult: result,
    sharpContext,
    compositeRecommendation: buildCompositeRecommendation({ ...row, simResult: result, sharpContext }, analysis),
  }
}
