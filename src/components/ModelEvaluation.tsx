import { useMemo, useState, type CSSProperties } from 'react'

import {
  evaluatePredictions,
  parsePredictionsCsv,
  parseResultsCsv,
  type EvaluationReport,
  type EvaluationSummary,
} from '../lib/modelEvaluation'

type ModelEvaluationProps = {
  card: CSSProperties
}

function metricColor(value: number | null): string {
  if (value == null) return '#e8d5a0'
  if (value > 0) return '#3fb950'
  if (value < 0) return '#f87171'
  return '#fbbf24'
}

function SummaryCard({
  label,
  summary,
}: {
  label: string
  summary: EvaluationSummary
}) {
  return (
    <div
      style={{
        background: 'rgba(255,200,80,0.03)',
        border: '1px solid rgba(255,200,80,0.13)',
        borderRadius: 8,
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 9, color: '#7a6a3a', letterSpacing: 3, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#e8d5a0', fontFamily: "'Oswald',monospace", lineHeight: 1 }}>
        {summary.wins}-{summary.losses}
      </div>
      <div style={{ fontSize: 10, color: '#9a8a5a', marginTop: 4 }}>
        {summary.totalBets} bets | {summary.winPct}% | Units {summary.roiUnits >= 0 ? '+' : ''}
        {summary.roiUnits.toFixed(2)}u
      </div>
      <div style={{ fontSize: 9, color: '#5a4a2a', marginTop: 4 }}>
        ROI {summary.roiPct == null ? '-' : `${summary.roiPct >= 0 ? '+' : ''}${summary.roiPct.toFixed(1)}%`} | Push {summary.pushes} | Pending {summary.pending}
      </div>
    </div>
  )
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10, color: '#9a8a5a' }}>
      <span>{label}</span>
      <span style={{ color: '#e8d5a0', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

function DetailValueLine({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10, color: '#9a8a5a' }}>
      <span>{label}</span>
      <span style={{ color: valueColor ?? '#e8d5a0', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

function MarketBreakdownCard({ market }: { market: EvaluationReport['markets'][number] }) {
  return (
    <div style={{ background: 'rgba(255,200,80,0.03)', border: '1px solid rgba(255,200,80,0.13)', borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, color: '#fbbf24', letterSpacing: 3, marginBottom: 10 }}>{market.label}</div>
      <div style={{ fontSize: 9, color: '#7a6a3a', letterSpacing: 2, marginBottom: 6 }}>MODEL BETS</div>
      <DetailLine label="Bets" value={String(market.all.totalBets)} />
      <DetailLine label="Record" value={`${market.all.wins}-${market.all.losses}-${market.all.pushes}`} />
      <DetailLine label="Hit rate" value={`${market.all.winPct}%`} />
      <DetailValueLine label="Units" value={`${market.all.roiUnits >= 0 ? '+' : ''}${market.all.roiUnits.toFixed(2)}u`} valueColor={metricColor(market.all.roiUnits)} />
      <DetailValueLine label="ROI" value={market.all.roiPct == null ? '-' : `${market.all.roiPct >= 0 ? '+' : ''}${market.all.roiPct.toFixed(1)}%`} valueColor={metricColor(market.all.roiPct)} />
      <div style={{ height: 1, background: 'rgba(255,200,80,0.08)', margin: '10px 0' }} />
      <div style={{ fontSize: 9, color: '#7a6a3a', letterSpacing: 2, marginBottom: 6 }}>ACTUAL BETS</div>
      <DetailLine label="Bets" value={String(market.actual.totalBets)} />
      <DetailLine label="Record" value={`${market.actual.wins}-${market.actual.losses}-${market.actual.pushes}`} />
      <DetailLine label="Hit rate" value={`${market.actual.winPct}%`} />
      <DetailValueLine label="Units" value={`${market.actual.roiUnits >= 0 ? '+' : ''}${market.actual.roiUnits.toFixed(2)}u`} valueColor={metricColor(market.actual.roiUnits)} />
      <DetailValueLine label="ROI" value={market.actual.roiPct == null ? '-' : `${market.actual.roiPct >= 0 ? '+' : ''}${market.actual.roiPct.toFixed(1)}%`} valueColor={metricColor(market.actual.roiPct)} />
    </div>
  )
}

export default function ModelEvaluation({ card }: ModelEvaluationProps) {
  const [predictionsPaste, setPredictionsPaste] = useState('')
  const [resultsPaste, setResultsPaste] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [report, setReport] = useState<EvaluationReport | null>(null)

  const totalSettled = useMemo(() => {
    if (!report) return 0
    return report.rows.filter((row) => row.result !== 'PENDING').length
  }, [report])

  const handleEvaluate = () => {
    setError('')
    setStatus('')

    try {
      const predictions = parsePredictionsCsv(predictionsPaste)
      const results = parseResultsCsv(resultsPaste)
      const nextReport = evaluatePredictions(predictions, results)
      setReport(nextReport)
      setStatus(`Evaluated ${nextReport.rows.length} recommended bets across ${predictions.length} predictions.`)
    } catch (evaluationError) {
      const message = evaluationError instanceof Error ? evaluationError.message : 'Unable to evaluate CSV data.'
      setError(message)
      setReport(null)
    }
  }

  return (
    <div style={{ animation: 'fadeUp 0.2s ease' }}>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 8 }}>MODEL EVALUATION</div>
        <div style={{ fontSize: 11, color: '#6a5a3a', lineHeight: 1.8, marginBottom: 12 }}>
          Paste a predictions CSV and a results CSV to grade all recommended moneyline, spread, and total bets using the exported market odds.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 9, color: '#7a6a3a', letterSpacing: 2, marginBottom: 6 }}>PREDICTIONS CSV</div>
            <textarea
              value={predictionsPaste}
              onChange={(event) => setPredictionsPaste(event.target.value)}
              rows={10}
              placeholder="Paste nba-predictions-YYYY-MM-DD.csv here..."
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,200,80,0.2)',
                borderRadius: 4,
                padding: '8px 10px',
                color: '#e8d5a0',
                fontFamily: 'monospace',
                fontSize: 11,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#7a6a3a', letterSpacing: 2, marginBottom: 6 }}>RESULTS CSV</div>
            <textarea
              value={resultsPaste}
              onChange={(event) => setResultsPaste(event.target.value)}
              rows={10}
              placeholder="Paste nba-results-YYYY-MM-DD.csv here..."
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,200,80,0.2)',
                borderRadius: 4,
                padding: '8px 10px',
                color: '#e8d5a0',
                fontFamily: 'monospace',
                fontSize: 11,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handleEvaluate}
            disabled={!predictionsPaste.trim() || !resultsPaste.trim()}
            style={{
              background: predictionsPaste.trim() && resultsPaste.trim() ? 'linear-gradient(135deg,#ca8a04,#eab308)' : 'rgba(255,200,80,0.04)',
              border: predictionsPaste.trim() && resultsPaste.trim() ? 'none' : '1px solid rgba(255,200,80,0.08)',
              borderRadius: 4,
              padding: '8px 16px',
              color: predictionsPaste.trim() && resultsPaste.trim() ? '#1a1200' : '#4a3a2a',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              fontFamily: 'monospace',
              cursor: predictionsPaste.trim() && resultsPaste.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            EVALUATE MODEL
          </button>
          <button
            onClick={() => {
              setPredictionsPaste('')
              setResultsPaste('')
              setStatus('')
              setError('')
              setReport(null)
            }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,200,80,0.15)',
              borderRadius: 4,
              padding: '8px 14px',
              color: '#6a5a3a',
              fontSize: 10,
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            CLEAR
          </button>
        </div>
        {status && <div style={{ fontSize: 11, color: '#3fb950', marginTop: 10, fontFamily: 'monospace' }}>OK {status}</div>}
        {error && <div style={{ fontSize: 11, color: '#f87171', marginTop: 10, fontFamily: 'monospace' }}>WARN {error}</div>}
      </div>

      {report && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
            <SummaryCard label="MONEYLINE" summary={report.moneyline} />
            <SummaryCard label="SPREAD" summary={report.spread} />
            <SummaryCard label="TOTALS" summary={report.totals} />
          </div>

          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 10 }}>ROI BY MARKET</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {report.markets.map((market) => (
                <MarketBreakdownCard key={market.label} market={market} />
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div style={card}>
              <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 10 }}>EDGE THRESHOLDS</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {report.edgeThresholds.map((bucket) => (
                  <div key={bucket.label} style={{ background: 'rgba(255,200,80,0.03)', border: '1px solid rgba(255,200,80,0.08)', borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#fbbf24', marginBottom: 6 }}>{bucket.label}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, fontSize: 10 }}>
                      <DetailLine label="Bets" value={String(bucket.summary.totalBets)} />
                      <DetailLine label="Record" value={`${bucket.summary.wins}-${bucket.summary.losses}-${bucket.summary.pushes}`} />
                      <DetailLine label="Hit" value={`${bucket.summary.winPct}%`} />
                      <DetailValueLine label="ROI" value={bucket.summary.roiPct == null ? '-' : `${bucket.summary.roiPct >= 0 ? '+' : ''}${bucket.summary.roiPct.toFixed(1)}%`} valueColor={metricColor(bucket.summary.roiPct)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 10 }}>CALIBRATION</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {report.calibration.map((bucket) => (
                  <div key={bucket.label} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.7fr 0.9fr 1fr', gap: 8, fontSize: 10, background: 'rgba(255,200,80,0.03)', border: '1px solid rgba(255,200,80,0.08)', borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ color: '#fbbf24' }}>{bucket.label}</div>
                    <div style={{ color: '#e8d5a0' }}>Games: {bucket.games}</div>
                    <div style={{ color: '#e8d5a0' }}>Accuracy: {bucket.accuracy}</div>
                    <div style={{ color: '#e8d5a0' }}>Avg predicted: {bucket.avgPredicted}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div style={card}>
              <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 10 }}>O/U CALIBRATION</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {report.totalsCalibration.map((row) => (
                  <div key={row.label} style={{ background: 'rgba(255,200,80,0.03)', border: '1px solid rgba(255,200,80,0.08)', borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#fbbf24', marginBottom: 6 }}>{row.label}</div>
                    <DetailLine label="Games" value={String(row.games)} />
                    <DetailLine label="Avg edge" value={row.avgEdge} />
                    {row.passNote ? (
                      <div style={{ fontSize: 10, color: '#6a5a3a', marginTop: 6 }}>{row.passNote}</div>
                    ) : (
                      <>
                        <DetailLine label="Record" value={row.record ?? '-'} />
                        <DetailLine label="Hit rate" value={row.hitRate ?? '-'} />
                        <DetailValueLine label="Units" value={row.units ?? '-'} valueColor={row.units?.startsWith('+') ? '#3fb950' : row.units?.startsWith('-') ? '#f87171' : '#e8d5a0'} />
                        <DetailValueLine label="ROI" value={row.roi ?? '-'} valueColor={row.roi?.startsWith('+') ? '#3fb950' : row.roi?.startsWith('-') ? '#f87171' : '#e8d5a0'} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: 10, color: '#7a6a3a', letterSpacing: 3, marginBottom: 10 }}>O/U EDGE BUCKETS</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {report.totalsEdgeBuckets.map((row) => (
                  <div key={row.label} style={{ background: 'rgba(255,200,80,0.03)', border: '1px solid rgba(255,200,80,0.08)', borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#fbbf24', marginBottom: 6 }}>{row.label}</div>
                    <DetailLine label="Bets" value={String(row.games)} />
                    <DetailLine label="Avg edge" value={row.avgEdge} />
                    <DetailLine label="Record" value={row.record ?? '-'} />
                    <DetailLine label="Hit rate" value={row.hitRate ?? '-'} />
                    <DetailValueLine label="Units" value={row.units ?? '-'} valueColor={row.units?.startsWith('+') ? '#3fb950' : row.units?.startsWith('-') ? '#f87171' : '#e8d5a0'} />
                    <DetailValueLine label="ROI" value={row.roi ?? '-'} valueColor={row.roi?.startsWith('+') ? '#3fb950' : row.roi?.startsWith('-') ? '#f87171' : '#e8d5a0'} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ ...card }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#5a4a2a', letterSpacing: 3, marginBottom: 12 }}>
              BET LOG | {report.rows.length} bets | {totalSettled} settled
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 11, minWidth: 860 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,200,80,0.2)' }}>
                    {['DATE', 'MATCHUP', 'TYPE', 'REC', 'ODDS', 'RESULT', 'UNITS', 'KEY'].map((header) => (
                      <th
                        key={header}
                        style={{ padding: '6px 8px', textAlign: 'left', fontSize: 8, color: '#5a4a2a', letterSpacing: 2, fontWeight: 700, whiteSpace: 'nowrap' }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row, index) => {
                    const color =
                      row.result === 'WIN' ? '#3fb950' : row.result === 'LOSS' ? '#f87171' : row.result === 'PUSH' ? '#fbbf24' : '#5a4a2a'
                    return (
                      <tr
                        key={`${row.lookupKey}-${row.betType}`}
                        style={{
                          borderBottom: '1px solid rgba(255,200,80,0.05)',
                          background: index % 2 === 0 ? 'transparent' : 'rgba(255,200,80,0.015)',
                        }}
                      >
                        <td style={{ padding: '6px 8px', color: '#7a6a3a', whiteSpace: 'nowrap' }}>{row.date}</td>
                        <td style={{ padding: '6px 8px', color: '#e8d5a0', whiteSpace: 'nowrap' }}>{row.matchup}</td>
                        <td style={{ padding: '6px 8px', color: '#9a8a5a', whiteSpace: 'nowrap' }}>{row.betType}</td>
                        <td style={{ padding: '6px 8px', color: '#9a8a5a', whiteSpace: 'nowrap' }}>{row.recommendation}</td>
                        <td style={{ padding: '6px 8px', color: '#d4b870', whiteSpace: 'nowrap' }}>
                          {row.odds == null ? '-' : `${row.odds > 0 ? '+' : ''}${row.odds}`}
                        </td>
                        <td style={{ padding: '6px 8px', color, fontWeight: 700, whiteSpace: 'nowrap' }}>{row.result}</td>
                        <td style={{ padding: '6px 8px', color, whiteSpace: 'nowrap' }}>
                          {row.units > 0 ? '+' : ''}
                          {row.units.toFixed(2)}u
                        </td>
                        <td style={{ padding: '6px 8px', color: '#5a4a2a', whiteSpace: 'nowrap' }}>{row.lookupKey}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
