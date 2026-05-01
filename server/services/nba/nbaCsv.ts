import { TEAMS } from '../../../src/lib/nbaModel.js'
import type { TeamAbbr } from '../../../src/lib/nbaTypes.js'
import type { NbaAutomationPredictionRow, NbaResultRow } from './nbaAutomation.js'

function csvEscape(value: string | number | boolean | null | undefined) {
  const text = value == null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function teamLabel(team: TeamAbbr) {
  return `${team} ${TEAMS[team]?.name ?? team}`
}

export function buildNbaPredictionsCsv(rows: NbaAutomationPredictionRow[]) {
  const header = [
    'Date',
    'GameTime',
    'Away',
    'Home',
    'AwayScore',
    'HomeScore',
    'Total',
    'ProjectedMargin',
    'HomeWinProb',
    'AwayWinProb',
    'MLRec',
    'MLEdgePct',
    'SpreadRec',
    'SpreadEdgePct',
    'OURec',
    'OUEdgePct',
    'VegasHomeML',
    'VegasAwayML',
    'VegasSpread',
    'VegasOU',
    'SpreadHomeOdds',
    'SpreadAwayOdds',
    'OverOdds',
    'UnderOdds',
    'CompositeMarket',
    'CompositePick',
    'CompositeScore',
    'CompositeTier',
    'CompositeReasons',
    'IsPlayoff',
    'LookupKey',
  ]

  const lines = rows.map((row) =>
    [
      row.date,
      row.gameTime,
      teamLabel(row.awayTeam),
      teamLabel(row.homeTeam),
      row.awayScore,
      row.homeScore,
      row.total,
      row.projectedMargin,
      (row.homeWinProb * 100).toFixed(1),
      (row.awayWinProb * 100).toFixed(1),
      row.mlRec,
      row.mlEdgePct.toFixed(1),
      row.spreadRec,
      row.spreadEdgePct.toFixed(1),
      row.ouRec,
      row.ouEdgePct.toFixed(1),
      row.vegasHomeML,
      row.vegasAwayML,
      row.vegasSpread,
      row.vegasOU,
      row.spreadHomeOdds,
      row.spreadAwayOdds,
      row.overOdds,
      row.underOdds,
      row.compositeMarket,
      row.compositePick,
      row.compositeScore.toFixed(1),
      row.compositeTier,
      row.compositeReasons.join(' | '),
      row.isPlayoff,
      row.lookupKey,
    ]
      .map(csvEscape)
      .join(','),
  )

  return [header.map(csvEscape).join(','), ...lines].join('\n')
}

export function buildNbaResultsCsv(rows: NbaResultRow[]) {
  const header = ['Date', 'Home', 'Away', 'HomeScore', 'AwayScore', 'Winner', 'Total', 'LookupKey']
  const lines = rows.map((row) =>
    [
      row.date,
      teamLabel(row.home),
      teamLabel(row.away),
      row.homeScore,
      row.awayScore,
      row.homeScore > row.awayScore ? row.home : row.away,
      row.homeScore + row.awayScore,
      row.lookupKey,
    ]
      .map(csvEscape)
      .join(','),
  )

  return [header.map(csvEscape).join(','), ...lines].join('\n')
}
