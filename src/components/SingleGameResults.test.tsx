import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import SingleGameResults from './SingleGameResults'
import type { BettingAnalysis, OddsInput, PredictionResult, TeamStats } from '../lib/nbaTypes'

const makeTeam = (name: string): TeamStats => ({
  name,
  color: '#123456',
  alt: '#654321',
  div: 'Atlantic',
  conf: 'East',
  offRtg: 118,
  defRtg: 110,
  pace: 99,
  netRtg: 8,
  tsPct: 58,
  rebPct: 52,
  astPct: 61,
  tovPct: 12.5,
  efgPct: 55.2,
  oppEfgPct: 52.1,
  threePAr: 0.41,
  arena: 'Arena',
  capacity: 18000,
})

const prediction: PredictionResult = {
  hWinProb: 0.62,
  aWinProb: 0.38,
  hScore: '114.0',
  aScore: '108.0',
  total: '222.0',
  projDiff: '6.0',
  isPlayoff: false,
  features: [{ label: 'Net Rating', good: true, detail: '+6.0' }],
}

const odds: OddsInput = {
  source: 'manual',
  homeMoneyline: -140,
  awayMoneyline: 120,
  spread: -3.5,
  spreadHomeOdds: -110,
  spreadAwayOdds: -110,
  overUnder: 218.5,
  overOdds: -110,
  underOdds: -110,
}

const analysis: BettingAnalysis = {
  homeImpliedProb: 0.58,
  awayImpliedProb: 0.42,
  homeEdge: 0.04,
  awayEdge: -0.04,
  mlValueSide: 'home',
  mlValuePct: 4.2,
  spreadRec: 'home -3.5',
  spreadEdge: 3.1,
  ouRec: 'over',
  ouEdge: 3.5,
  ouEdgePct: 2.6,
  homeCoverProb: 0.55,
  awayCoverProb: 0.45,
  spHIC: 0,
  spAIC: 0,
  ovIC: 0,
  unIC: 0,
  pOver: 0.54,
  pUnder: 0.46,
  kellyHome: 0.08,
  kellyAway: 0,
  kellySpread: 0.04,
  kellyOU: 0.03,
}

describe('SingleGameResults', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders projected total and betting analysis when odds are present', () => {
    render(
      <SingleGameResults
        card={{}}
        result={prediction}
        odds={odds}
        homeTeam="BOS"
        awayTeam="LAL"
        hColor="#008000"
        aColor="#0000ff"
        hTeam={makeTeam('Boston Celtics')}
        aTeam={makeTeam('Los Angeles Lakers')}
        hasLive
        statsUpdated="2026-03-22"
        analyzeBetting={() => analysis}
        mlAmerican={(probability) => (probability >= 0.5 ? '-163' : '+163')}
      />,
    )

    expect(screen.getByText('PROJECTED SCORE')).toBeInTheDocument()
    expect(screen.getByText('BETTING ANALYSIS')).toBeInTheDocument()
    expect(screen.getByText('OVER (+3.5)')).toBeInTheDocument()
    expect(screen.getByText('HOME ML')).toBeInTheDocument()
    expect(screen.getByText(/Basketball Reference/)).toBeInTheDocument()
  })

  it('omits odds-driven sections when odds are unavailable', () => {
    render(
      <SingleGameResults
        card={{}}
        result={prediction}
        odds={null}
        homeTeam="BOS"
        awayTeam="LAL"
        hColor="#008000"
        aColor="#0000ff"
        hTeam={makeTeam('Boston Celtics')}
        aTeam={makeTeam('Los Angeles Lakers')}
        hasLive={false}
        statsUpdated=""
        analyzeBetting={() => analysis}
        mlAmerican={(probability) => (probability >= 0.5 ? '-163' : '+163')}
      />,
    )

    expect(screen.queryByText('BETTING ANALYSIS')).not.toBeInTheDocument()
    expect(screen.queryByText('VEGAS')).not.toBeInTheDocument()
    expect(screen.getByText('MODEL INPUTS')).toBeInTheDocument()
  })
})
