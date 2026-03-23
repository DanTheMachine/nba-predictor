import type { CSSProperties, Dispatch, SetStateAction } from 'react'

import type { LiveStatsMap } from '../lib/nbaTypes'

type BBRefImportPanelProps = {
  card: CSSProperties
  hasLive: boolean
  liveStats: LiveStatsMap
  statsUpdated: string
  bbrefStatus: string
  bbrefError: string
  showBBRef: boolean
  setShowBBRef: Dispatch<SetStateAction<boolean>>
  bbrefPaste: string
  setBbrefPaste: Dispatch<SetStateAction<string>>
  setBbrefError: Dispatch<SetStateAction<string>>
  handleBBRefImport: () => void
  setLiveStats: Dispatch<SetStateAction<LiveStatsMap>>
  setStatsUpdated: Dispatch<SetStateAction<string>>
  setBbrefStatus: Dispatch<SetStateAction<string>>
  clearResult: () => void
}

export default function BBRefImportPanel({
  card,
  hasLive,
  liveStats,
  statsUpdated,
  bbrefStatus,
  bbrefError,
  showBBRef,
  setShowBBRef,
  bbrefPaste,
  setBbrefPaste,
  setBbrefError,
  handleBBRefImport,
  setLiveStats,
  setStatsUpdated,
  setBbrefStatus,
  clearResult,
}: BBRefImportPanelProps) {
  return (
    <div style={{ ...card, border: `1px solid ${hasLive ? 'rgba(251,191,36,0.3)' : 'rgba(255,200,80,0.13)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: showBBRef ? 14 : 0 }}>
        <div>
          <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 5 }}>STATS · BASKETBALL REFERENCE IMPORT</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: hasLive ? '#fbbf24' : '#4b5563', boxShadow: hasLive ? '0 0 8px #fbbf24' : 'none' }} />
            <span style={{ fontSize: 11, color: hasLive ? '#fbbf24' : '#6a5a3a' }}>
              {hasLive ? `✓ Live stats active · ${Object.keys(liveStats).length} teams · ${statsUpdated}` : 'Paste BBRef Miscellaneous Stats CSV to update all 30 teams'}
            </span>
          </div>
          {bbrefStatus && !bbrefError && <div style={{ fontSize: 10, color: '#3fb950', marginTop: 4 }}>{bbrefStatus}</div>}
          {bbrefError && <div style={{ fontSize: 10, color: '#f87171', marginTop: 4 }}>⚠ {bbrefError}</div>}
        </div>

        <button
          onClick={() => setShowBBRef((current) => !current)}
          style={{
            background: showBBRef ? 'rgba(202,138,4,0.15)' : 'linear-gradient(135deg,#ca8a04,#eab308)',
            border: showBBRef ? '1px solid rgba(234,179,8,0.4)' : 'none',
            borderRadius: 4,
            padding: '8px 16px',
            color: showBBRef ? '#fbbf24' : '#1a1200',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            fontFamily: 'monospace',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {showBBRef ? '▲ HIDE' : hasLive ? '↻ UPDATE STATS' : '⬇ IMPORT STATS'}
        </button>
      </div>

      {showBBRef && (
        <div style={{ animation: 'fadeUp 0.2s ease' }}>
          <div style={{ background: 'rgba(255,200,80,0.04)', border: '1px solid rgba(255,200,80,0.1)', borderRadius: 6, padding: '12px 14px', marginBottom: 12, fontSize: 11, lineHeight: 1.9, color: '#9a8a5a' }}>
            <div style={{ fontSize: 10, color: '#fbbf24', letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>HOW TO GET THE DATA</div>
            <div>
              1. Go to{' '}
              <a href="https://www.basketball-reference.com/leagues/NBA_2026.html" target="_blank" rel="noopener noreferrer" style={{ color: '#fbbf24' }}>
                basketball-reference.com/leagues/NBA_2026.html
              </a>
            </div>
            <div>
              2. Scroll down to the <strong style={{ color: '#e8d5a0' }}>Advanced Stats</strong> table
            </div>
            <div>
              3. Click <strong style={{ color: '#e8d5a0' }}>Share &amp; Export</strong> → <strong style={{ color: '#e8d5a0' }}>Get table as CSV</strong>
            </div>
            <div>4. Select all the text (Ctrl+A / Cmd+A), copy it, and paste below</div>
            <div style={{ marginTop: 6, fontSize: 10, color: '#6a5a3a' }}>
              Imports: ORtg · DRtg · NRtg · Pace · eFG% · eFG%Opp · TOV% · ORB% · 3PAr · (AST% not in this table — baseline kept)
            </div>
          </div>

          <textarea
            value={bbrefPaste}
            onChange={(event) => {
              setBbrefPaste(event.target.value)
              setBbrefError('')
            }}
            placeholder={"Team,Age,W,L,...,ORtg,DRtg,NRtg,Pace,...,eFG%,...\nBoston Celtics,27.4,54,14,...,122.1,109.8,12.3,98.2,..."}
            style={{ width: '100%', minWidth: 0, height: 130, background: '#0d0800', border: '1px solid rgba(255,200,80,0.2)', borderRadius: 4, color: '#e8d5a0', fontSize: 11, fontFamily: 'monospace', padding: 10, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginTop: 8 }}>
            <button
              onClick={handleBBRefImport}
              disabled={!bbrefPaste.trim()}
              style={{
                padding: '10px 0',
                background: bbrefPaste.trim() ? 'linear-gradient(135deg,#b45309,#92400e)' : 'rgba(255,200,80,0.04)',
                border: bbrefPaste.trim() ? 'none' : '1px solid rgba(255,200,80,0.08)',
                borderRadius: 4,
                color: bbrefPaste.trim() ? '#fef3c7' : '#4a3a2a',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 3,
                fontFamily: 'monospace',
                cursor: bbrefPaste.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              ⬆ APPLY STATS TO MODEL
            </button>
            <button
              onClick={() => {
                setBbrefPaste('')
                setBbrefError('')
              }}
              style={{ padding: '10px 14px', background: 'transparent', border: '1px solid rgba(255,200,80,0.1)', borderRadius: 4, color: '#4a3a2a', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer' }}
            >
              CLEAR
            </button>
          </div>

          {hasLive && (
            <button
              onClick={() => {
                setLiveStats({})
                setStatsUpdated('')
                setBbrefStatus('')
                setBbrefError('')
                setShowBBRef(false)
                clearResult()
              }}
              style={{ marginTop: 8, width: '100%', padding: '7px 0', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, color: '#6b2424', fontSize: 10, fontFamily: 'monospace', cursor: 'pointer', letterSpacing: 2 }}
            >
              ✕ RESET TO ESTIMATES
            </button>
          )}
        </div>
      )}
    </div>
  )
}
