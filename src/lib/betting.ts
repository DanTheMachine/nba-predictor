import type { BettingAnalysis, OddsInput, PredictionResult } from './nbaTypes'

const ML_RECOMMENDATION_EDGE = 0.04
const SPREAD_RECOMMENDATION_EDGE = 0.05
const TOTAL_RECOMMENDATION_POINTS = 3

export function americanToImplied(ml: number): number {
  if (!ml || Number.isNaN(ml)) return 0.5
  return ml < 0 ? -ml / (-ml + 100) : 100 / (ml + 100)
}

export function normCDF(z: number): number {
  return 0.5 * (1 + Math.sign(z) * (1 - Math.exp(-0.7071 * z * z * (1 + 0.2316419 * Math.abs(z)))))
}

export function mlAmerican(prob: number): string {
  if (prob <= 0 || prob >= 1) return 'N/A'
  return prob >= 0.5
    ? `-${Math.round((prob / (1 - prob)) * 100)}`
    : `+${Math.round(((1 - prob) / prob) * 100)}`
}

export function analyzeBetting(result: PredictionResult, odds: OddsInput): BettingAnalysis {
  const hI = americanToImplied(odds.homeMoneyline)
  const aI = americanToImplied(odds.awayMoneyline)
  const vig = hI + aI
  const hIC = hI / vig
  const aIC = aI / vig
  const hEdge = result.hWinProb - hIC
  const aEdge = result.aWinProb - aIC
  const mlSide = hEdge > ML_RECOMMENDATION_EDGE ? 'home' : aEdge > ML_RECOMMENDATION_EDGE ? 'away' : 'none'
  const mlPct = Math.max(hEdge, aEdge) * 100

  const diff = parseFloat(result.hScore) - parseFloat(result.aScore)
  const std = 11.5
  const homeFav = odds.spread <= 0
  const spAbs = Math.abs(odds.spread)
  const favDiff = homeFav ? diff : -diff
  const favCover = 1 - normCDF((spAbs - favDiff) / std)
  const hCover = homeFav ? favCover : 1 - favCover
  const aCover = 1 - hCover
  const spHI = americanToImplied(odds.spreadHomeOdds || -110)
  const spAI = americanToImplied(odds.spreadAwayOdds || -110)
  const spVig = spHI + spAI
  const spHEdge = hCover - spHI / spVig
  const spAEdge = aCover - spAI / spVig
  const spHLabel = homeFav ? `home ${odds.spread}` : `home +${spAbs}`
  const spALabel = homeFav ? `away +${spAbs}` : `away -${spAbs}`
  const spreadRec = spHEdge > SPREAD_RECOMMENDATION_EDGE ? spHLabel : spAEdge > SPREAD_RECOMMENDATION_EDGE ? spALabel : 'pass'
  const spreadEdge = Math.max(spHEdge, spAEdge) * 100
  const proj = parseFloat(result.total)
  const ouEdge = proj - odds.overUnder
  const ouRec =
    ouEdge > TOTAL_RECOMMENDATION_POINTS
      ? 'over'
      : ouEdge < -TOTAL_RECOMMENDATION_POINTS
        ? 'under'
        : 'pass'

  const pOver = 1 - normCDF((odds.overUnder - proj) / std)
  const pUnder = 1 - pOver
  const ovI = americanToImplied(odds.overOdds || -110)
  const unI = americanToImplied(odds.underOdds || -110)
  const ouVig = ovI + unI
  const ouOverEdge = pOver - ovI / ouVig
  const ouUnderEdge = pUnder - unI / ouVig
  const ouEdgePct =
    (ouRec === 'over' ? ouOverEdge : ouRec === 'under' ? ouUnderEdge : Math.max(ouOverEdge, ouUnderEdge)) * 100

  const spHIC = spHI / spVig
  const spAIC = spAI / spVig
  const ovIC = ovI / ouVig
  const unIC = unI / ouVig
  const spreadSideIsHome = spreadRec !== 'pass' && spreadRec.startsWith('home')
  const spreadSideIC = spreadSideIsHome ? spHIC : spAIC
  const kellySpread = spreadRec !== 'pass' && spreadEdge > 0 ? (spreadEdge / 100 / (1 - spreadSideIC)) * 0.25 : 0
  const ouSideIC = ouRec === 'over' ? ovIC : unIC
  const kellyOU = ouRec !== 'pass' && ouEdgePct > 0 ? (ouEdgePct / 100 / (1 - ouSideIC)) * 0.25 : 0

  return {
    homeImpliedProb: hIC,
    awayImpliedProb: aIC,
    homeEdge: hEdge,
    awayEdge: aEdge,
    mlValueSide: mlSide,
    mlValuePct: mlPct,
    spreadRec,
    spreadEdge,
    ouRec,
    ouEdge,
    ouEdgePct,
    homeCoverProb: hCover,
    awayCoverProb: aCover,
    spHIC,
    spAIC,
    ovIC,
    unIC,
    pOver,
    pUnder,
    kellyHome: hEdge > 0 ? (hEdge / (1 - hIC)) * 0.25 : 0,
    kellyAway: aEdge > 0 ? (aEdge / (1 - aIC)) * 0.25 : 0,
    kellySpread,
    kellyOU,
  }
}
