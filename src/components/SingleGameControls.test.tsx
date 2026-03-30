import type { ComponentProps } from 'react'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SingleGameControls from './SingleGameControls'
import type {
  ESPNTeamColorMap,
  GameType,
  LiveStatsMap,
  ManualOddsForm,
  OddsInput,
  TeamAbbr,
  TeamStats,
} from '../lib/nbaTypes'

const makeTeam = (
  name: string,
  div: string,
  conf: string,
  overrides: Partial<TeamStats> = {},
): TeamStats => ({
  name,
  color: '#123456',
  alt: '#654321',
  div,
  conf,
  offRtg: 118,
  defRtg: 110,
  pace: 99,
  netRtg: 8,
  tsPct: 58,
  rebPct: 26,
  astPct: 61,
  tovPct: 12.5,
  efgPct: 55.2,
  oppEfgPct: 52.1,
  threePAr: 41,
  arena: 'Arena',
  capacity: 18000,
  ...overrides,
})

const teams: Record<TeamAbbr, TeamStats> = {
  ATL: makeTeam('Hawks', 'Southeast', 'East'),
  BKN: makeTeam('Nets', 'Atlantic', 'East'),
  BOS: makeTeam('Celtics', 'Atlantic', 'East'),
  CHA: makeTeam('Hornets', 'Southeast', 'East'),
  CHI: makeTeam('Bulls', 'Central', 'East'),
  CLE: makeTeam('Cavaliers', 'Central', 'East'),
  DAL: makeTeam('Mavericks', 'Southwest', 'West'),
  DEN: makeTeam('Nuggets', 'Northwest', 'West'),
  DET: makeTeam('Pistons', 'Central', 'East'),
  GSW: makeTeam('Warriors', 'Pacific', 'West'),
  HOU: makeTeam('Rockets', 'Southwest', 'West'),
  IND: makeTeam('Pacers', 'Central', 'East'),
  LAC: makeTeam('Clippers', 'Pacific', 'West'),
  LAL: makeTeam('Lakers', 'Pacific', 'West'),
  MEM: makeTeam('Grizzlies', 'Southwest', 'West'),
  MIA: makeTeam('Heat', 'Southeast', 'East'),
  MIL: makeTeam('Bucks', 'Central', 'East'),
  MIN: makeTeam('Timberwolves', 'Northwest', 'West'),
  NOP: makeTeam('Pelicans', 'Southwest', 'West'),
  NYK: makeTeam('Knicks', 'Atlantic', 'East'),
  OKC: makeTeam('Thunder', 'Northwest', 'West'),
  ORL: makeTeam('Magic', 'Southeast', 'East'),
  PHI: makeTeam('76ers', 'Atlantic', 'East'),
  PHX: makeTeam('Suns', 'Pacific', 'West'),
  POR: makeTeam('Trail Blazers', 'Northwest', 'West'),
  SAC: makeTeam('Kings', 'Pacific', 'West'),
  SAS: makeTeam('Spurs', 'Southwest', 'West'),
  TOR: makeTeam('Raptors', 'Atlantic', 'East'),
  UTA: makeTeam('Jazz', 'Northwest', 'West'),
  WAS: makeTeam('Wizards', 'Southeast', 'East'),
}

const manualOdds: ManualOddsForm = {
  homeMoneyline: '-165',
  awayMoneyline: '+140',
  homeSpread: '-3.5',
  spreadHomeOdds: '-110',
  spreadAwayOdds: '-110',
  overUnder: '224.5',
  overOdds: '-110',
  underOdds: '-110',
}

type OverrideProps = Partial<ComponentProps<typeof SingleGameControls>>

function renderSingleGameControls(overrides: OverrideProps = {}) {
  const setDivFilter = vi.fn()
  const setHomeTeam = vi.fn()
  const setAwayTeam = vi.fn()
  const setGameType = vi.fn()
  const setHomeB2B = vi.fn()
  const setAwayB2B = vi.fn()
  const setOdds = vi.fn()
  const setOddsSource = vi.fn()
  const setOddsStatus = vi.fn()
  const setManualOdds = vi.fn()
  const clearResult = vi.fn()
  const runSim = vi.fn()
  const handleFetchOdds = vi.fn()
  const applyManualOdds = vi.fn()

  render(
    <SingleGameControls
      card={{}}
      ss={{}}
      divFilter="ALL"
      setDivFilter={setDivFilter}
      divOptions={['ALL', 'Atlantic', 'Pacific']}
      teams={teams}
      homeTeam="BOS"
      setHomeTeam={setHomeTeam}
      awayTeam="LAL"
      setAwayTeam={setAwayTeam}
      espnData={null as ESPNTeamColorMap | null}
      liveStats={{} as LiveStatsMap}
      gameType={'Regular Season' as GameType}
      gameTypes={['Regular Season', 'NBA Finals']}
      setGameType={setGameType}
      homeB2B={false}
      setHomeB2B={setHomeB2B}
      awayB2B={false}
      setAwayB2B={setAwayB2B}
      clearResult={clearResult}
      hasLive={false}
      hColor="#008000"
      aColor="#0000ff"
      hTeam={teams.BOS}
      aTeam={teams.LAL}
      running={false}
      simCount={0}
      runSim={runSim}
      odds={null as OddsInput | null}
      setOdds={setOdds}
      oddsSource="none"
      setOddsSource={setOddsSource}
      oddsStatus=""
      setOddsStatus={setOddsStatus}
      handleFetchOdds={handleFetchOdds}
      manualOdds={manualOdds}
      setManualOdds={setManualOdds}
      applyManualOdds={applyManualOdds}
      {...overrides}
    />,
  )

  return {
    setDivFilter,
    setHomeTeam,
    setGameType,
    setHomeB2B,
    setOdds,
    setOddsSource,
    setOddsStatus,
    setManualOdds,
    clearResult,
    applyManualOdds,
  }
}

describe('SingleGameControls', () => {
  afterEach(() => {
    cleanup()
  })

  it('lets the user switch divisions, teams, game type, and back-to-back flags', () => {
    const { setDivFilter, setHomeTeam, setGameType, setHomeB2B, clearResult } = renderSingleGameControls()

    fireEvent.click(screen.getByRole('button', { name: 'Atlantic' }))
    expect(setDivFilter).toHaveBeenCalledWith('Atlantic')

    const selectors = screen.getAllByRole('combobox')
    fireEvent.change(selectors[0]!, { target: { value: 'NYK' } })
    expect(setHomeTeam).toHaveBeenCalledWith('NYK')
    expect(clearResult).toHaveBeenCalled()

    fireEvent.change(selectors[2]!, { target: { value: 'NBA Finals' } })
    expect(setGameType).toHaveBeenCalledWith('NBA Finals')

    fireEvent.click(screen.getByText('Celtics'))
    expect(setHomeB2B).toHaveBeenCalledWith(true)
  })

  it('switches to manual odds mode and applies edited lines', () => {
    const { setOddsSource, setOddsStatus, setOdds } = renderSingleGameControls()

    fireEvent.click(screen.getByRole('button', { name: 'MANUAL' }))
    expect(setOddsSource).toHaveBeenCalledWith('manual')
    expect(setOddsStatus).toHaveBeenCalledWith('Enter lines below')
    expect(setOdds).toHaveBeenCalledWith(null)

    cleanup()

    const { setManualOdds, applyManualOdds } = renderSingleGameControls({ oddsSource: 'manual' })

    fireEvent.click(screen.getByRole('button', { name: 'HOME +3.5' }))
    expect(setManualOdds).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /APPLY MANUAL LINES/i }))
    expect(applyManualOdds).toHaveBeenCalled()
  })
})
