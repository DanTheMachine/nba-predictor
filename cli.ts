import {
  evaluateNba,
  exportNbaPredictionsCsv,
  exportNbaResultsCsv,
  generateNbaPredictions,
  getNbaLatestRuns,
  ingestNbaResults,
  runNbaDailyPipeline,
} from './server/services/nba/nbaAutomation.js'
import {
  approveOddsOverrides,
  importBulkOddsOverridesFromFile,
  listOddsOverrides,
  rejectOddsOverrides,
} from './server/services/nba/nbaOddsOverrides.js'
import { captureOddsOverrides } from './server/services/nba/nbaOddsCapture.js'

// eslint-disable-next-line no-unused-vars
type CommandHandler = (args: Record<string, string | boolean>) => Promise<unknown>

function parseArgs(argv: string[]) {
  const [command = 'help', ...rest] = argv
  const args: Record<string, string | boolean> = {}

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (!token?.startsWith('--')) continue
    const key = token.slice(2)
    const next = rest[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = next
    index += 1
  }

  return { command, args }
}

const commands: Record<string, CommandHandler> = {
  async 'nba:load-slate'(args) {
    const { fetchNbaSlate } = await import('./server/services/nba/nbaAutomation.js')
    return fetchNbaSlate(toStringArg(args.date) ?? new Date().toISOString().slice(0, 10))
  },
  async 'nba:run-predictions'(args) {
    return generateNbaPredictions(toStringArg(args.date), {
      useOddsOverrides: toBoolArg(args['use-odds-overrides']),
      overrideSource: toStringArg(args['override-source']),
    })
  },
  async 'nba:run-daily-pipeline'(args) {
    return runNbaDailyPipeline(toStringArg(args.date), {
      useOddsOverrides: toBoolArg(args['use-odds-overrides']),
      overrideSource: toStringArg(args['override-source']),
    })
  },
  async 'nba:export-predictions-csv'(args) {
    return exportNbaPredictionsCsv({
      date: toStringArg(args.date),
      runId: toStringArg(args.runId),
    })
  },
  async 'nba:ingest-results'(args) {
    return ingestNbaResults(toStringArg(args.date))
  },
  async 'nba:export-results-csv'(args) {
    return exportNbaResultsCsv(toStringArg(args.date))
  },
  async 'nba:evaluate'(args) {
    const from = toStringArg(args.from) ?? new Date().toISOString().slice(0, 10)
    const to = toStringArg(args.to) ?? from
    return evaluateNba({ from, to })
  },
  async 'nba:list-runs'() {
    return getNbaLatestRuns()
  },
  async 'nba:capture-odds-overrides'(args) {
    return captureOddsOverrides({
      date: toStringArg(args.date),
      source: toStringArg(args.source),
    })
  },
  async 'nba:import-odds-overrides'(args) {
    const file = toStringArg(args.file)
    if (!file) throw new Error('nba:import-odds-overrides requires --file PATH_TO_BULK_ODDS_TEXT')
    return importBulkOddsOverridesFromFile({
      date: toStringArg(args.date),
      file,
      source: toStringArg(args.source),
    })
  },
  async 'nba:list-odds-overrides'(args) {
    return listOddsOverrides(toStringArg(args.date))
  },
  async 'nba:approve-odds-overrides'(args) {
    return approveOddsOverrides({
      date: toStringArg(args.date),
      source: toStringArg(args.source),
      lookupKeys: toCsvArgs(args.lookupKeys),
    })
  },
  async 'nba:reject-odds-overrides'(args) {
    return rejectOddsOverrides({
      date: toStringArg(args.date),
      source: toStringArg(args.source),
      lookupKeys: toCsvArgs(args.lookupKeys),
    })
  },
}

async function main() {
  const { command, args } = parseArgs(process.argv.slice(2))
  const handler = commands[command]

  if (!handler) {
    console.log(
      [
        'Available commands:',
        '  nba:load-slate                --date YYYY-MM-DD',
        '  nba:run-predictions           --date YYYY-MM-DD [--use-odds-overrides] [--override-source LABEL]',
        '  nba:run-daily-pipeline        --date YYYY-MM-DD [--use-odds-overrides] [--override-source LABEL]',
        '  nba:export-predictions-csv    --date YYYY-MM-DD [--runId RUN_ID]',
        '  nba:ingest-results            --date YYYY-MM-DD',
        '  nba:export-results-csv        --date YYYY-MM-DD',
        '  nba:evaluate                  --from YYYY-MM-DD --to YYYY-MM-DD',
        '  nba:list-runs',
        '  nba:capture-odds-overrides    --date YYYY-MM-DD [--source LABEL]',
        '  nba:import-odds-overrides     --date YYYY-MM-DD --file PATH [--source LABEL]',
        '  nba:list-odds-overrides       --date YYYY-MM-DD',
        '  nba:approve-odds-overrides    --date YYYY-MM-DD [--source LABEL] [--lookupKeys KEY1,KEY2]',
        '  nba:reject-odds-overrides     --date YYYY-MM-DD [--source LABEL] [--lookupKeys KEY1,KEY2]',
      ].join('\n'),
    )
    process.exitCode = command === 'help' ? 0 : 1
    return
  }

  try {
    const result = await handler(args)
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Command failed.')
    process.exitCode = 1
  }
}

function toStringArg(value: string | boolean | undefined) {
  return typeof value === 'string' ? value : undefined
}

function toBoolArg(value: string | boolean | undefined) {
  return value === true || value === 'true'
}

function toCsvArgs(value: string | boolean | undefined) {
  if (typeof value !== 'string') return undefined
  return value.split(',').map((entry) => entry.trim()).filter(Boolean)
}

void main()
