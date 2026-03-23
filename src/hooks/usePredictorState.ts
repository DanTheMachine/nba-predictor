import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { fetchTodaySchedule, parseOddsFromEvent } from '../lib/espn'
import { predictGame } from '../lib/nbaModel'
import type {
  GameType,
  LiveStatsMap,
  ManualOddsForm,
  OddsInput,
  PredictionResult,
  TeamAbbr,
} from '../lib/nbaTypes'

export type OddsSource = 'none' | 'fetching' | 'espn' | 'manual'

type UsePredictorStateArgs = {
  liveStats: LiveStatsMap
}

type UsePredictorStateResult = {
  homeTeam: TeamAbbr
  setHomeTeam: Dispatch<SetStateAction<TeamAbbr>>
  awayTeam: TeamAbbr
  setAwayTeam: Dispatch<SetStateAction<TeamAbbr>>
  gameType: GameType
  setGameType: Dispatch<SetStateAction<GameType>>
  homeB2B: boolean
  setHomeB2B: Dispatch<SetStateAction<boolean>>
  awayB2B: boolean
  setAwayB2B: Dispatch<SetStateAction<boolean>>
  result: PredictionResult | null
  setResult: Dispatch<SetStateAction<PredictionResult | null>>
  running: boolean
  simCount: number
  odds: OddsInput | null
  setOdds: Dispatch<SetStateAction<OddsInput | null>>
  oddsSource: OddsSource
  setOddsSource: Dispatch<SetStateAction<OddsSource>>
  oddsStatus: string
  setOddsStatus: Dispatch<SetStateAction<string>>
  manualOdds: ManualOddsForm
  setManualOdds: Dispatch<SetStateAction<ManualOddsForm>>
  clearResult: () => void
  runSim: () => void
  handleFetchOdds: () => Promise<void>
  applyManualOdds: () => void
}

export function usePredictorState({ liveStats }: UsePredictorStateArgs): UsePredictorStateResult {
  const [homeTeam, setHomeTeam] = useState<TeamAbbr>('BOS')
  const [awayTeam, setAwayTeam] = useState<TeamAbbr>('LAL')
  const homeRef = useRef<TeamAbbr>('BOS')
  const awayRef = useRef<TeamAbbr>('LAL')

  useEffect(() => {
    homeRef.current = homeTeam
  }, [homeTeam])

  useEffect(() => {
    awayRef.current = awayTeam
  }, [awayTeam])

  const [gameType, setGameType] = useState<GameType>('Regular Season')
  const [homeB2B, setHomeB2B] = useState(false)
  const [awayB2B, setAwayB2B] = useState(false)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [running, setRunning] = useState(false)
  const [simCount, setSimCount] = useState(0)

  const [odds, setOdds] = useState<OddsInput | null>(null)
  const [oddsSource, setOddsSource] = useState<OddsSource>('none')
  const [oddsStatus, setOddsStatus] = useState('')
  const [manualOdds, setManualOdds] = useState<ManualOddsForm>({
    homeMoneyline: '-165',
    awayMoneyline: '+140',
    homeSpread: '-3.5',
    spreadHomeOdds: '-110',
    spreadAwayOdds: '-110',
    overUnder: '224.5',
    overOdds: '-110',
    underOdds: '-110',
  })

  const clearResult = () => setResult(null)

  const runSim = () => {
    setRunning(true)
    setSimCount(0)
    setResult(null)

    let count = 0
    const intervalId = window.setInterval(() => {
      count += Math.floor(Math.random() * 3200 + 1500)
      setSimCount(Math.min(count, 100000))

      if (count >= 100000) {
        window.clearInterval(intervalId)
        window.setTimeout(() => {
          setResult(predictGame({ homeTeam, awayTeam, gameType, homeB2B, awayB2B, liveStats }))
          setRunning(false)
        }, 80)
      }
    }, 38)
  }

  const handleFetchOdds = async () => {
    setOddsSource('fetching')
    setOddsStatus("Checking ESPN for today's lines…")

    try {
      const { rawEvents } = await fetchTodaySchedule(setOddsStatus)
      let found: OddsInput | null = null

      for (const event of rawEvents) {
        found = parseOddsFromEvent(event, homeRef.current, awayRef.current)
        if (found) break
      }

      if (found) {
        setOdds(found)
        setOddsSource('espn')

        const formatOdds = (value: number | null | undefined) =>
          value != null ? (value > 0 ? `+${value}` : `${value}`) : '—'

        setOddsStatus(
          `ESPN · H ${formatOdds(found.homeMoneyline)} / A ${formatOdds(found.awayMoneyline)} · O/U ${found.overUnder ?? '—'} · SPD ${found.spread ?? '—'}`,
        )

        setManualOdds({
          homeMoneyline: String(found.homeMoneyline ?? ''),
          awayMoneyline: String(found.awayMoneyline ?? ''),
          homeSpread: String(found.spread ?? '-3.5'),
          spreadHomeOdds: String(found.spreadHomeOdds ?? '-110'),
          spreadAwayOdds: String(found.spreadAwayOdds ?? '-110'),
          overUnder: String(found.overUnder ?? ''),
          overOdds: String(found.overOdds ?? '-110'),
          underOdds: String(found.underOdds ?? '-110'),
        })

        if (!result) {
          runSim()
        }
      } else {
        setOddsSource('manual')
        setOddsStatus("Game not on today's ESPN slate — enter manually")
      }
    } catch {
      setOddsSource('manual')
      setOddsStatus('ESPN unreachable — enter lines manually')
    }
  }

  const applyManualOdds = () => {
    setOdds({
      source: 'manual',
      homeMoneyline: parseFloat(manualOdds.homeMoneyline),
      awayMoneyline: parseFloat(manualOdds.awayMoneyline),
      spread: parseFloat(manualOdds.homeSpread) || -3.5,
      spreadHomeOdds: parseFloat(manualOdds.spreadHomeOdds),
      spreadAwayOdds: parseFloat(manualOdds.spreadAwayOdds),
      overUnder: parseFloat(manualOdds.overUnder),
      overOdds: parseFloat(manualOdds.overOdds),
      underOdds: parseFloat(manualOdds.underOdds),
    })
    setOddsSource('manual')
    setOddsStatus('Manual lines applied')

    if (!result) {
      runSim()
    }
  }

  return {
    homeTeam,
    setHomeTeam,
    awayTeam,
    setAwayTeam,
    gameType,
    setGameType,
    homeB2B,
    setHomeB2B,
    awayB2B,
    setAwayB2B,
    result,
    setResult,
    running,
    simCount,
    odds,
    setOdds,
    oddsSource,
    setOddsSource,
    oddsStatus,
    setOddsStatus,
    manualOdds,
    setManualOdds,
    clearResult,
    runSim,
    handleFetchOdds,
    applyManualOdds,
  }
}
