import { americanToImplied } from './betting'
import type { OddsInput, SharpLeanSide, SharpLeanValue, SharpSignalInput } from './nbaTypes'
import type { MarketDataBookSnapshot, MarketDataGameSnapshot } from './marketData'

function mean(values: Array<number | null | undefined>, digits = 0): number | null {
  const filtered = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (!filtered.length) return null
  const average = filtered.reduce((sum, value) => sum + value, 0) / filtered.length
  return digits > 0 ? Number(average.toFixed(digits)) : Math.round(average)
}

function pushLean(target: SharpLeanSide[], value: SharpLeanSide | null): void {
  if (!value || value === 'none' || target.includes(value)) return
  target.push(value)
}

function finalizeLean(values: SharpLeanSide[]): SharpLeanValue | undefined {
  if (!values.length) return undefined
  return values.length === 1 ? values[0] : values
}

function mlMoveLean(openingHomeMoneyline: number | null, currentHomeMoneyline: number | null): SharpLeanSide | null {
  if (openingHomeMoneyline == null || currentHomeMoneyline == null) return null
  const move = americanToImplied(currentHomeMoneyline) - americanToImplied(openingHomeMoneyline)
  if (move >= 0.02) return 'home'
  if (move <= -0.02) return 'away'
  return null
}

function spreadMoveLean(openingSpread: number | null, currentSpread: number | null): SharpLeanSide | null {
  if (openingSpread == null || currentSpread == null) return null
  const move = currentSpread - openingSpread
  if (move <= -0.75) return 'home'
  if (move >= 0.75) return 'away'
  return null
}

function totalMoveLean(openingTotal: number | null, currentTotal: number | null): SharpLeanSide | null {
  if (openingTotal == null || currentTotal == null) return null
  const move = currentTotal - openingTotal
  if (move >= 1.5) return 'over'
  if (move <= -1.5) return 'under'
  return null
}

function range(values: Array<number | null | undefined>, digits = 1): number | null {
  const filtered = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (filtered.length < 2) return null
  const spread = Math.max(...filtered) - Math.min(...filtered)
  return Number(spread.toFixed(digits))
}

function majoritySide<T extends SharpLeanSide>(values: T[], thresholdRatio = 0.6): T | 'none' {
  if (!values.length) return 'none'
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1
    return acc
  }, {})
  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (!winner) return 'none'
  return winner[1] / values.length >= thresholdRatio ? (winner[0] as T) : 'none'
}

function bookMoneylineConsensus(books: MarketDataBookSnapshot[]): 'home' | 'away' | 'none' {
  const votes = books.flatMap((book) => {
    if (book.homeMoneyline == null || book.awayMoneyline == null) return []
    return [americanToImplied(book.homeMoneyline) > americanToImplied(book.awayMoneyline) ? 'home' : 'away'] as const
  })
  return majoritySide(votes)
}

function bookSpreadConsensus(books: MarketDataBookSnapshot[]): 'home' | 'away' | 'none' {
  const votes = books.flatMap((book) => {
    const spread = book.spread?.home?.line
    if (spread == null) return []
    if (spread <= -0.5) return ['home'] as const
    if (spread >= 0.5) return ['away'] as const
    return []
  })
  return majoritySide(votes)
}

function totalConsensus(snapshot: MarketDataGameSnapshot, activeOdds: OddsInput | null | undefined): 'over' | 'under' | 'none' {
  const currentTotal = snapshot.current?.total ?? null
  const activeTotal = activeOdds?.overUnder ?? null
  if (currentTotal == null || activeTotal == null) return 'none'
  if (currentTotal >= activeTotal + 1) return 'over'
  if (currentTotal <= activeTotal - 1) return 'under'
  return 'none'
}

function buildNotes(snapshot: MarketDataGameSnapshot, activeOdds: OddsInput | null | undefined): string {
  const notes: string[] = []
  notes.push(`${snapshot.sourceLabel}: ${snapshot.books.length} books in consensus sample.`)

  const spreadRange = range(snapshot.books.map((book) => book.spread?.home?.line))
  if (spreadRange != null && spreadRange >= 0.5) notes.push(`Spread range ${spreadRange.toFixed(1)} points across books.`)

  const totalRange = range(snapshot.books.map((book) => book.total?.over?.line))
  if (totalRange != null && totalRange >= 1) notes.push(`Total range ${totalRange.toFixed(1)} points across books.`)

  if (snapshot.opener?.spread != null && snapshot.current?.spread != null) {
    const move = snapshot.current.spread - snapshot.opener.spread
    if (Math.abs(move) >= 0.5) notes.push(`Spread moved ${move > 0 ? '+' : ''}${move.toFixed(1)} from opener.`)
  }

  if (snapshot.opener?.total != null && snapshot.current?.total != null) {
    const move = snapshot.current.total - snapshot.opener.total
    if (Math.abs(move) >= 1) notes.push(`Total moved ${move > 0 ? '+' : ''}${move.toFixed(1)} from opener.`)
  }

  if (activeOdds?.source && snapshot.current?.spread != null && activeOdds.spread != null) {
    const diff = snapshot.current.spread - activeOdds.spread
    if (Math.abs(diff) >= 0.5) notes.push(`Consensus spread differs from active ${activeOdds.source} line by ${diff > 0 ? '+' : ''}${diff.toFixed(1)}.`)
  }

  return notes.join(' ')
}

export function deriveSharpInputFromMarketData(
  snapshot: MarketDataGameSnapshot | null | undefined,
  activeOdds: OddsInput | null | undefined,
): SharpSignalInput | null {
  if (!snapshot || !snapshot.current) return null

  const openingHomeMoneyline = snapshot.opener?.homeMoneyline ?? null
  const openingAwayMoneyline = snapshot.opener?.awayMoneyline ?? null
  const openingSpread = snapshot.opener?.spread ?? null
  const openingTotal = snapshot.opener?.total ?? null
  const currentHomeMoneyline = snapshot.current.homeMoneyline ?? null
  const currentSpread = snapshot.current.spread ?? null
  const currentTotal = snapshot.current.total ?? null

  const clvLeans: SharpLeanSide[] = []
  const steamLeans: SharpLeanSide[] = []
  const reverseLineMoveLeans: SharpLeanSide[] = []

  const mlLean = mlMoveLean(openingHomeMoneyline, currentHomeMoneyline)
  const spreadLean = spreadMoveLean(openingSpread, currentSpread)
  const totalLean = totalMoveLean(openingTotal, currentTotal)

  pushLean(clvLeans, mlLean)
  pushLean(clvLeans, spreadLean)
  pushLean(clvLeans, totalLean)

  if (openingSpread != null && currentSpread != null && Math.abs(currentSpread - openingSpread) >= 1) {
    pushLean(steamLeans, spreadLean)
  }
  if (openingTotal != null && currentTotal != null && Math.abs(currentTotal - openingTotal) >= 2) {
    pushLean(steamLeans, totalLean)
  }
  if (openingHomeMoneyline != null && currentHomeMoneyline != null) {
    const impliedMove = americanToImplied(currentHomeMoneyline) - americanToImplied(openingHomeMoneyline)
    if (Math.abs(impliedMove) >= 0.03) pushLean(steamLeans, mlLean)
  }

  if (activeOdds?.spread != null && currentSpread != null) {
    const diff = currentSpread - activeOdds.spread
    if (diff <= -0.75) pushLean(reverseLineMoveLeans, 'home')
    if (diff >= 0.75) pushLean(reverseLineMoveLeans, 'away')
  }
  if (activeOdds?.overUnder != null && currentTotal != null) {
    const diff = currentTotal - activeOdds.overUnder
    if (diff >= 1.5) pushLean(reverseLineMoveLeans, 'over')
    if (diff <= -1.5) pushLean(reverseLineMoveLeans, 'under')
  }

  return {
    source: snapshot.sourceLabel,
    lastUpdated: snapshot.current.timestamp ?? snapshot.lastUpdated,
    openingHomeMoneyline,
    openingAwayMoneyline,
    openingSpread,
    openingTotal,
    clvLean: finalizeLean(clvLeans),
    steamMoveLean: finalizeLean(steamLeans),
    reverseLineMoveLean: finalizeLean(reverseLineMoveLeans),
    consensusMoneyline: bookMoneylineConsensus(snapshot.books),
    consensusSpread: bookSpreadConsensus(snapshot.books),
    consensusTotal: totalConsensus(snapshot, activeOdds),
    notes: buildNotes(snapshot, activeOdds),
  }
}
