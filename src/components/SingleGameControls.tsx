import type { CSSProperties, Dispatch, SetStateAction } from 'react'

import StatBar from './StatBar'
import TeamCard from './TeamCard'
import type {
  ESPNTeamColorMap,
  GameType,
  LiveStatsMap,
  ManualOddsForm,
  OddsInput,
  TeamAbbr,
  TeamStats,
} from '../lib/nbaTypes'

type ManualOddsField = keyof ManualOddsForm

const MANUAL_ODDS_FIELDS: Array<[string, ManualOddsField, string]> = [
  ['HOME ML', 'homeMoneyline', '-165'],
  ['AWAY ML', 'awayMoneyline', '+140'],
  ['O/U LINE', 'overUnder', '224.5'],
  ['H SPD ODDS', 'spreadHomeOdds', '-110'],
  ['A SPD ODDS', 'spreadAwayOdds', '-110'],
  ['OVER ODDS', 'overOdds', '-110'],
]

type SingleGameControlsProps = {
  card: CSSProperties
  ss: CSSProperties
  divFilter: string
  setDivFilter: Dispatch<SetStateAction<string>>
  divOptions: string[]
  teams: Record<TeamAbbr, TeamStats>
  homeTeam: TeamAbbr
  setHomeTeam: Dispatch<SetStateAction<TeamAbbr>>
  awayTeam: TeamAbbr
  setAwayTeam: Dispatch<SetStateAction<TeamAbbr>>
  espnData: ESPNTeamColorMap | null
  liveStats: LiveStatsMap
  gameType: GameType
  gameTypes: readonly GameType[]
  setGameType: Dispatch<SetStateAction<GameType>>
  homeB2B: boolean
  setHomeB2B: Dispatch<SetStateAction<boolean>>
  awayB2B: boolean
  setAwayB2B: Dispatch<SetStateAction<boolean>>
  clearResult: () => void
  hasLive: boolean
  hColor: string
  aColor: string
  hTeam: TeamStats
  aTeam: TeamStats
  running: boolean
  simCount: number
  runSim: () => void
  odds: OddsInput | null
  setOdds: Dispatch<SetStateAction<OddsInput | null>>
  oddsSource: 'none' | 'fetching' | 'espn' | 'manual'
  setOddsSource: Dispatch<SetStateAction<'none' | 'fetching' | 'espn' | 'manual'>>
  oddsStatus: string
  setOddsStatus: Dispatch<SetStateAction<string>>
  handleFetchOdds: () => void | Promise<void>
  manualOdds: ManualOddsForm
  setManualOdds: Dispatch<SetStateAction<ManualOddsForm>>
  applyManualOdds: () => void
}

export default function SingleGameControls({
  card,
  ss,
  divFilter,
  setDivFilter,
  divOptions,
  teams,
  homeTeam,
  setHomeTeam,
  awayTeam,
  setAwayTeam,
  espnData,
  liveStats,
  gameType,
  gameTypes,
  setGameType,
  homeB2B,
  setHomeB2B,
  awayB2B,
  setAwayB2B,
  clearResult,
  hasLive,
  hColor,
  aColor,
  hTeam,
  aTeam,
  running,
  simCount,
  runSim,
  odds,
  setOdds,
  oddsSource,
  setOddsSource,
  oddsStatus,
  setOddsStatus,
  handleFetchOdds,
  manualOdds,
  setManualOdds,
  applyManualOdds,
}: SingleGameControlsProps) {
  const filteredTeams = (excludeKey: TeamAbbr): Array<[TeamAbbr, TeamStats]> =>
    Object.entries(teams).filter(
      ([abbr, team]) => abbr !== excludeKey && (divFilter === 'ALL' || team.div === divFilter),
    ) as Array<[TeamAbbr, TeamStats]>

  const b2bControls: Array<{
    abbr: TeamAbbr
    key: 'homeB2B' | 'awayB2B'
    value: boolean
    setter: Dispatch<SetStateAction<boolean>>
  }> = [
    { abbr: homeTeam, key: 'homeB2B', value: homeB2B, setter: setHomeB2B },
    { abbr: awayTeam, key: 'awayB2B', value: awayB2B, setter: setAwayB2B },
  ]

  return (
    <div style={{ animation: 'fadeUp 0.2s ease' }}>
      <div style={card}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 5 }}>FILTER BY DIVISION</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {divOptions.map((division) => (
              <button
                key={division}
                onClick={() => setDivFilter(division)}
                style={{
                  padding: '3px 9px',
                  borderRadius: 3,
                  fontSize: 10,
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  letterSpacing: 1,
                  background: divFilter === division ? '#b45309' : 'rgba(255,200,80,0.04)',
                  color: divFilter === division ? '#fef3c7' : '#6a5a3a',
                  border: divFilter === division ? 'none' : '1px solid rgba(255,200,80,0.1)',
                  fontWeight: divFilter === division ? 700 : 400,
                }}
              >
                {division}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {[
            { value: homeTeam, onChange: setHomeTeam, excludeKey: awayTeam, label: 'HOME TEAM' },
            { value: awayTeam, onChange: setAwayTeam, excludeKey: homeTeam, label: 'AWAY TEAM' },
          ].map(({ value, onChange, excludeKey, label }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 4, fontFamily: 'monospace' }}>{label}</div>
              <select
                value={value}
                onChange={(event) => {
                  onChange(event.target.value as TeamAbbr)
                  clearResult()
                }}
                style={ss}
              >
                {divOptions
                  .filter((division) => division !== 'ALL')
                  .map((division) => {
                    const options = filteredTeams(excludeKey).filter(([abbr]) => teams[abbr].div === division)
                    return options.length ? (
                      <optgroup key={division} label={division} style={{ background: '#1a0f00' }}>
                        {options.map(([abbr, team]) => (
                          <option key={abbr} value={abbr}>
                            {abbr} - {team.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : null
                  })}
              </select>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <TeamCard abbr={homeTeam} side="HOME" espnData={espnData} liveStats={liveStats} />
          <TeamCard abbr={awayTeam} side="AWAY" espnData={espnData} liveStats={liveStats} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 4 }}>GAME TYPE</div>
            <select
              value={gameType}
              onChange={(event) => {
                setGameType(event.target.value as GameType)
                clearResult()
              }}
              style={ss}
            >
              {gameTypes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {b2bControls.map(({ abbr, key, value, setter }) => (
            <div
              key={key}
              onClick={() => {
                setter(!value)
                clearResult()
              }}
              style={{
                background: value ? 'rgba(251,191,36,0.05)' : 'transparent',
                border: `1px solid ${value ? 'rgba(251,191,36,0.2)' : 'rgba(255,200,80,0.13)'}`,
                borderRadius: 4,
                padding: '9px 10px',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 2, marginBottom: 5 }}>BACK-TO-BACK</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: value ? '#fbbf24' : '#6a5a3a' }}>{teams[abbr].name}</span>
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 7px',
                    borderRadius: 2,
                    background: value ? 'rgba(251,191,36,0.1)' : 'rgba(255,200,80,0.05)',
                    color: value ? '#fbbf24' : '#4a3a2a',
                  }}
                >
                  {value ? 'YES' : 'NO'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 12 }}>
          ADVANCED STATS COMPARISON
          {hasLive ? <span style={{ color: '#fbbf24', marginLeft: 8 }}> · BBRef LIVE ✦</span> : <span style={{ color: '#4b5563', marginLeft: 8 }}> · ESTIMATES</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: hColor, fontFamily: "'Oswald',monospace" }}>{hTeam.name.toUpperCase()}</span>
          <span style={{ fontSize: 11, color: aColor, fontFamily: "'Oswald',monospace" }}>{aTeam.name.toUpperCase()}</span>
        </div>
        <StatBar label="OFFENSIVE RATING" hVal={hTeam.offRtg} aVal={aTeam.offRtg} hColor={hColor} aColor={aColor} lo={106} hi={124} />
        <StatBar label="DEFENSIVE RATING" hVal={hTeam.defRtg} aVal={aTeam.defRtg} hColor={hColor} aColor={aColor} lo={106} hi={122} invert />
        <StatBar label="NET RATING" hVal={hTeam.netRtg} aVal={aTeam.netRtg} hColor={hColor} aColor={aColor} lo={-12} hi={14} />
        <StatBar label="EFFECTIVE FG%" hVal={hTeam.efgPct} aVal={aTeam.efgPct} hColor={hColor} aColor={aColor} lo={49} hi={60} fmt="pct" />
        <StatBar label="TURNOVER %" hVal={hTeam.tovPct} aVal={aTeam.tovPct} hColor={hColor} aColor={aColor} lo={11} hi={16} fmt="pct" invert />
        <StatBar label="REBOUND %" hVal={hTeam.rebPct} aVal={aTeam.rebPct} hColor={hColor} aColor={aColor} lo={48} hi={55} fmt="pct" />
        <StatBar label="PACE (POSS / 48 MIN)" hVal={hTeam.pace} aVal={aTeam.pace} hColor={hColor} aColor={aColor} lo={94} hi={106} />
      </div>

      <button
        onClick={runSim}
        disabled={running}
        style={{
          width: '100%',
          padding: 14,
          background: running ? 'rgba(30,64,175,0.08)' : 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
          border: running ? '1px solid rgba(59,130,246,0.15)' : '1px solid rgba(147,197,253,0.4)',
          borderRadius: 4,
          color: running ? '#2d4a7a' : '#eff6ff',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 5,
          fontFamily: "'Oswald',sans-serif",
          cursor: running ? 'not-allowed' : 'pointer',
          marginBottom: 14,
          transition: 'all 0.3s',
        }}
      >
        {running ? `SIMULATING  ${simCount.toLocaleString()} / 100,000` : '▶  RUN SIMULATION'}
      </button>

      <div style={{ ...card, border: `1px solid ${oddsSource === 'espn' ? 'rgba(74,222,128,0.2)' : oddsSource === 'manual' && odds ? 'rgba(251,191,36,0.18)' : 'rgba(255,200,80,0.13)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: oddsSource === 'manual' ? 14 : 0 }}>
          <div>
            <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 5 }}>LIVE ODDS / LINES</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: oddsSource === 'espn' ? '#4ade80' : oddsSource === 'fetching' ? '#fbbf24' : oddsSource === 'manual' && odds ? '#f59e0b' : '#4b5563', animation: oddsSource === 'fetching' ? 'pulse 0.8s infinite' : 'none' }} />
              <span style={{ fontSize: 11, color: oddsSource === 'espn' ? '#4ade80' : oddsSource === 'manual' && odds ? '#fbbf24' : '#6a5a3a' }}>
                {oddsSource === 'none' ? 'Fetch today\'s lines or enter manually' : oddsStatus}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button
              onClick={handleFetchOdds}
              disabled={oddsSource === 'fetching'}
              style={{
                background: oddsSource === 'espn' ? 'rgba(74,222,128,0.07)' : oddsSource === 'fetching' ? 'rgba(30,64,175,0.08)' : 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                border: oddsSource === 'espn' ? '1px solid rgba(74,222,128,0.2)' : oddsSource === 'fetching' ? '1px solid rgba(59,130,246,0.15)' : '1px solid rgba(147,197,253,0.3)',
                borderRadius: 4,
                padding: '7px 14px',
                color: oddsSource === 'espn' ? '#4ade80' : oddsSource === 'fetching' ? '#2d4a7a' : '#eff6ff',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                fontFamily: 'monospace',
                cursor: oddsSource === 'fetching' ? 'not-allowed' : 'pointer',
              }}
            >
              {oddsSource === 'fetching' ? 'CHECKING…' : oddsSource === 'espn' ? '↻ REFRESH' : '⬇ FETCH LINES'}
            </button>
            <button
              onClick={() => {
                setOddsSource('manual')
                setOddsStatus('Enter lines below')
                setOdds(null)
              }}
              style={{ background: 'rgba(255,200,80,0.04)', border: '1px solid rgba(255,200,80,0.13)', borderRadius: 4, padding: '7px 14px', color: '#7a6a3a', fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', cursor: 'pointer' }}
            >
              MANUAL
            </button>
          </div>
        </div>

        {oddsSource === 'manual' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: '#6a5a3a' }}>SPREAD:</span>
              {['-3.5', '+3.5'].map((value) => {
                const active = (manualOdds.homeSpread ?? '-3.5') === value
                return (
                  <button
                    key={value}
                    onClick={() => setManualOdds((prev) => ({ ...prev, homeSpread: value }))}
                    style={{
                      background: active ? 'rgba(251,191,36,0.12)' : 'transparent',
                      border: `1px solid ${active ? '#fbbf24' : '#4b5563'}`,
                      borderRadius: 4,
                      padding: '3px 12px',
                      color: active ? '#fde68a' : '#4b5563',
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                    }}
                  >
                    HOME {value}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
              {MANUAL_ODDS_FIELDS.map(([label, key, placeholder]) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: '#6a5a3a', letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                  <input
                    value={manualOdds[key]}
                    onChange={(event) => setManualOdds((prev) => ({ ...prev, [key]: event.target.value }))}
                    placeholder={placeholder}
                    style={{ background: 'rgba(255,200,80,0.04)', border: '1px solid rgba(255,200,80,0.13)', borderRadius: 4, padding: '6px 8px', color: '#e8d5a0', fontFamily: 'monospace', fontSize: 12, width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={applyManualOdds}
              style={{ width: '100%', padding: '8px', background: 'linear-gradient(135deg,#065f46,#047857)', border: 'none', borderRadius: 4, color: '#d1fae5', fontSize: 11, fontWeight: 700, letterSpacing: 3, fontFamily: 'monospace', cursor: 'pointer' }}
            >
              ✓ APPLY MANUAL LINES
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
