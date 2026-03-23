import type { CSSProperties } from 'react'

import CourtBar from './CourtBar'
import { americanToImplied } from '../lib/betting'
import type { analyzeBetting as AnalyzeBettingFn, mlAmerican as MlAmericanFn } from '../lib/betting'
import type { BettingAnalysis, OddsInput, PredictionResult, TeamStats } from '../lib/nbaTypes'

type SingleGameResultsProps = {
  card: CSSProperties
  result: PredictionResult
  odds: OddsInput | null
  homeTeam: string
  awayTeam: string
  hColor: string
  aColor: string
  hTeam: TeamStats
  aTeam: TeamStats
  hasLive: boolean
  statsUpdated: string
  analyzeBetting: typeof AnalyzeBettingFn
  mlAmerican: typeof MlAmericanFn
}

type MoneylineCard = {
  abbr: string
  probability: number
  color: string
  vegaMoneyline?: number
}

type BetRecommendation = {
  label: string
  rec: string
  good: boolean
  detail: string
}

export default function SingleGameResults({
  card,
  result,
  odds,
  homeTeam,
  awayTeam,
  hColor,
  aColor,
  hTeam,
  aTeam,
  hasLive,
  statsUpdated,
  analyzeBetting,
  mlAmerican,
}: SingleGameResultsProps) {
  const moneylineCards: MoneylineCard[] = [
    { abbr: homeTeam, probability: result.hWinProb, color: hColor, vegaMoneyline: odds?.homeMoneyline },
    { abbr: awayTeam, probability: result.aWinProb, color: aColor, vegaMoneyline: odds?.awayMoneyline },
  ]

  const totalEdge = odds ? parseFloat(result.total) - odds.overUnder : null
  const totalRecommendation = totalEdge == null ? 'PASS' : totalEdge > 2 ? 'OVER' : totalEdge < -2 ? 'UNDER' : 'PASS'
  const bettingAnalysis = odds ? analyzeBetting(result, odds) : null

  const recommendations: BetRecommendation[] =
    odds && bettingAnalysis
      ? [
          {
            label: 'MONEYLINE VALUE',
            rec: bettingAnalysis.mlValueSide === 'none' ? 'PASS' : `${bettingAnalysis.mlValueSide.toUpperCase()} ML`,
            good: bettingAnalysis.mlValueSide !== 'none',
            detail:
              bettingAnalysis.mlValueSide !== 'none'
                ? `+${bettingAnalysis.mlValuePct.toFixed(1)}% edge`
                : `¼ Kelly: ${(Math.max(bettingAnalysis.kellyHome, bettingAnalysis.kellyAway) * 100).toFixed(1)}%`,
          },
          {
            label: `SPREAD H${odds.spread > 0 ? '+' : ''}${odds.spread}`,
            rec: bettingAnalysis.spreadRec === 'pass' ? 'PASS' : bettingAnalysis.spreadRec.toUpperCase(),
            good: bettingAnalysis.spreadRec !== 'pass',
            detail:
              bettingAnalysis.spreadRec !== 'pass'
                ? `+${bettingAnalysis.spreadEdge.toFixed(1)}% edge`
                : `Proj diff: ${parseFloat(result.projDiff) > 0 ? '+' : ''}${result.projDiff} pts`,
          },
          {
            label: `O/U ${odds.overUnder}`,
            rec: bettingAnalysis.ouRec === 'pass' ? 'PASS' : bettingAnalysis.ouRec.toUpperCase(),
            good: bettingAnalysis.ouRec !== 'pass',
            detail: `Model: ${result.total} (${bettingAnalysis.ouEdge > 0 ? '+' : ''}${bettingAnalysis.ouEdge.toFixed(1)})`,
          },
        ]
      : []

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      {result.isPlayoff && (
        <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 5, padding: '8px 14px', marginBottom: 12, fontSize: 10, color: '#fbbf24', letterSpacing: 2 }}>
          PLAYOFF MODE - Defensive intensity amplified, scoring suppressed about 3%
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 12 }}>WIN PROBABILITY</div>
        <CourtBar hProb={result.hWinProb} hColor={hColor} aColor={aColor} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10 }}>
          <span style={{ color: hColor, fontFamily: "'Oswald',monospace" }}>{hTeam.name.toUpperCase()} (HOME)</span>
          <span style={{ color: aColor, fontFamily: "'Oswald',monospace" }}>{aTeam.name.toUpperCase()} (AWAY)</span>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 14 }}>PROJECTED SCORE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: hColor, letterSpacing: 2, marginBottom: 3 }}>{homeTeam}</div>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 66, lineHeight: 1, color: '#e8d5a0', fontWeight: 700 }}>{result.hScore}</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#6a5a3a', letterSpacing: 2, marginBottom: 3 }}>TOTAL</div>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 32, color: '#fbbf24', fontWeight: 700 }}>{result.total}</div>
            {odds && totalEdge !== null && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 9, color: '#4b5563' }}>VEGAS</div>
                <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 22, color: '#d4b870', fontWeight: 700 }}>{odds.overUnder.toFixed(1)}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: totalRecommendation === 'OVER' ? '#38bdf8' : totalRecommendation === 'UNDER' ? '#f87171' : '#4b5563', fontFamily: 'monospace', marginTop: 2 }}>
                  {totalRecommendation}
                  {totalRecommendation !== 'PASS' ? ` (${totalEdge > 0 ? '+' : ''}${totalEdge.toFixed(1)})` : ''}
                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: aColor, letterSpacing: 2, marginBottom: 3 }}>{awayTeam}</div>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 66, lineHeight: 1, color: '#e8d5a0', fontWeight: 700 }}>{result.aScore}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {moneylineCards.map(({ abbr, probability, color, vegaMoneyline }) => {
            const edge = vegaMoneyline ? (probability - americanToImplied(vegaMoneyline)) * 100 : null

            return (
              <div key={abbr} style={{ background: 'rgba(255,200,80,0.04)', border: `1px solid ${color}28`, borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#6a5a3a', letterSpacing: 2, marginBottom: 8 }}>{abbr} MONEYLINE</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 9, color: '#4b5563', marginBottom: 2 }}>MODEL</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'Oswald',sans-serif" }}>{mlAmerican(probability)}</div>
                    <div style={{ fontSize: 10, color: '#4b5563' }}>{(probability * 100).toFixed(1)}% win</div>
                  </div>
                  {vegaMoneyline && (
                    <>
                      <div style={{ color: '#2d2010', fontSize: 18, alignSelf: 'center' }}>|</div>
                      <div>
                        <div style={{ fontSize: 9, color: '#4b5563', marginBottom: 2 }}>VEGAS</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#d4b870', fontFamily: "'Oswald',sans-serif" }}>{vegaMoneyline > 0 ? '+' : ''}{vegaMoneyline}</div>
                        {edge !== null && <div style={{ fontSize: 10, fontWeight: 700, color: edge > 2 ? '#3fb950' : edge < -2 ? '#f85149' : '#6a5a3a' }}>{edge > 0 ? '+' : ''}{edge.toFixed(1)}% edge</div>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {odds && bettingAnalysis && (
        <div style={{ ...card, border: '1px solid rgba(74,222,128,0.18)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#5aaa7a', letterSpacing: 3 }}>BETTING ANALYSIS</div>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 2, background: odds.source === 'espn' ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)', color: odds.source === 'espn' ? '#4ade80' : '#fbbf24', border: `1px solid ${odds.source === 'espn' ? 'rgba(74,222,128,0.25)' : 'rgba(251,191,36,0.2)'}`, fontFamily: 'monospace' }}>
              {odds.source === 'espn' ? 'LIVE ESPN' : 'MANUAL'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {recommendations.map(({ label, rec, good, detail }) => (
              <div key={label} style={{ background: 'rgba(255,200,80,0.03)', border: `1px solid ${good ? 'rgba(74,222,128,0.2)' : 'rgba(255,200,80,0.1)'}`, borderRadius: 5, padding: '10px' }}>
                <div style={{ fontSize: 9, color: '#5aaa7a', letterSpacing: 2, marginBottom: 7 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: good ? '#4ade80' : '#4b5563', fontFamily: "'Oswald',sans-serif", marginBottom: 5 }}>{rec}</div>
                <div style={{ fontSize: 10, color: good ? '#6abe88' : '#4b5563' }}>{detail}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(251,191,36,0.03)', border: '1px solid rgba(251,191,36,0.08)', borderRadius: 4, fontSize: 9, color: '#7a6a3a' }}>
            For entertainment only. Edge assumes a roughly efficient market. Always verify lines.
          </div>
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 10 }}>MODEL INPUTS</div>
        {result.features.map((feature) => (
          <div key={feature.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,200,80,0.05)' }}>
            <span style={{ fontSize: 10, color: '#7a6a3a' }}>{feature.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 10, color: '#e8d5a0', fontFamily: 'monospace' }}>{feature.detail}</span>
              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 2, background: feature.good ? 'rgba(251,191,36,0.08)' : 'rgba(100,100,100,0.1)', color: feature.good ? '#fbbf24' : '#4b5563', border: `1px solid ${feature.good ? 'rgba(251,191,36,0.15)' : 'rgba(100,100,100,0.12)'}` }}>{feature.good ? '▲' : '▼'}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(255,200,80,0.02)', border: '1px solid rgba(255,200,80,0.06)', borderRadius: 4, padding: '10px 14px', fontSize: 10, color: '#6a5a3a', lineHeight: 1.8, marginBottom: 14 }}>
        <span style={{ color: '#fbbf24' }}>MODEL: </span>
        Net Rating is the strongest predictor, and a 10-point gap is roughly a 5% win probability swing. eFG% weights 3s correctly (1.5x). Home court is about +3.2 points. B2B penalty is about -2.8 points.{' '}
        Stats: {hasLive ? <span style={{ color: '#fbbf24' }}>Basketball Reference · {statsUpdated}</span> : <span style={{ color: '#4b5563' }}>2024-25 estimates - import BBRef Misc Stats to update</span>}.
      </div>
    </div>
  )
}
