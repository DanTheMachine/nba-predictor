import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the DB repositories so no real DB connection is needed
vi.mock('../../db/repositories.js', () => ({
  saveNbaOddsOverrides: vi.fn().mockResolvedValue(2),
  listNbaOddsOverridesByDate: vi.fn().mockResolvedValue([]),
  updateNbaOddsOverrideStatus: vi.fn().mockResolvedValue({ count: 1 }),
}))

import * as repos from '../../db/repositories.js'
import { importBulkOddsOverrides, approveOddsOverrides, rejectOddsOverrides } from './nbaOddsOverrides.js'

const TWO_GAME_PASTE = `
BOSTON CELTICS
501
- 4.5
- 110
O 218.5
- 110
- 175
NEW YORK KNICKS
502
+ 4.5
- 110
U 218.5
- 110
+ 155

GOLDEN STATE WARRIORS
503
+ 2
- 110
O 222
- 110
+ 130
LOS ANGELES LAKERS
504
- 2
- 110
U 222
- 110
- 150
`

describe('importBulkOddsOverrides', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('parses raw text and returns correct importedCount and lookupKeys', async () => {
    const result = await importBulkOddsOverrides({ date: '2026-04-30', raw: TWO_GAME_PASTE })

    expect(result.importedCount).toBe(2)
    expect(result.date).toBe('2026-04-30')
    expect(result.source).toBe('manual-paste')
    // lookup key = date + homeTeam + awayTeam (second team listed is home)
    expect(result.lookupKeys).toEqual(['20260430NYKBOS', '20260430LALGSW'])
  })

  it('uses provided source label', async () => {
    const result = await importBulkOddsOverrides({
      date: '2026-04-30',
      raw: TWO_GAME_PASTE,
      source: 'betlotus-nba',
    })
    expect(result.source).toBe('betlotus-nba')
  })

  it('falls back to manual-paste when source is blank', async () => {
    const result = await importBulkOddsOverrides({ date: '2026-04-30', raw: TWO_GAME_PASTE, source: '   ' })
    expect(result.source).toBe('manual-paste')
  })

  it('calls saveNbaOddsOverrides with staged status for all rows', async () => {
    await importBulkOddsOverrides({ date: '2026-04-30', raw: TWO_GAME_PASTE })

    const [, rows] = (repos.saveNbaOddsOverrides as ReturnType<typeof vi.fn>).mock.calls[0] as [string, { status: string }[]]
    expect(rows.every((r) => r.status === 'staged')).toBe(true)
  })

  it('deduplicates doubleheader lookup keys with _2 suffix', async () => {
    // Same matchup repeated twice
    const doubleheader = TWO_GAME_PASTE.replace(/GOLDEN STATE WARRIORS[\s\S]*LOS ANGELES LAKERS[\s\S]*- 150/, '')
      + `
BOSTON CELTICS
601
- 4.5
- 110
O 218.5
- 110
- 175
NEW YORK KNICKS
602
+ 4.5
- 110
U 218.5
- 110
+ 155
`

    const result = await importBulkOddsOverrides({ date: '2026-04-30', raw: doubleheader })
    expect(result.lookupKeys).toContain('20260430NYKBOS')
    expect(result.lookupKeys).toContain('20260430NYKBOS_2')
  })

  it('throws when the raw text has no recognizable team names', async () => {
    await expect(importBulkOddsOverrides({ date: '2026-04-30', raw: 'not odds text' })).rejects.toThrow()
  })

  it('throws on an invalid date format', async () => {
    await expect(importBulkOddsOverrides({ date: '30-04-2026', raw: TWO_GAME_PASTE })).rejects.toThrow(/YYYY-MM-DD/)
  })
})

describe('approveOddsOverrides', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls updateNbaOddsOverrideStatus with approved and returns result shape', async () => {
    const result = await approveOddsOverrides({ date: '2026-04-30', source: 'betlotus-nba' })

    expect(repos.updateNbaOddsOverrideStatus).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-04-30', source: 'betlotus-nba', status: 'approved' }),
    )
    expect(result.status).toBe('approved')
    expect(result.updatedCount).toBe(1)
  })

  it('passes specific lookupKeys through when provided', async () => {
    await approveOddsOverrides({ date: '2026-04-30', lookupKeys: ['20260430BOSLAL', '20260430GSWNYK'] })

    const calls = (repos.updateNbaOddsOverrideStatus as ReturnType<typeof vi.fn>).mock.calls
    const call = calls[0]?.[0] as { lookupKeys: string[] }
    expect(call.lookupKeys).toEqual(['20260430BOSLAL', '20260430GSWNYK'])
  })
})

describe('rejectOddsOverrides', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls updateNbaOddsOverrideStatus with rejected status', async () => {
    const result = await rejectOddsOverrides({ date: '2026-04-30' })

    expect(repos.updateNbaOddsOverrideStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected' }),
    )
    expect(result.status).toBe('rejected')
  })
})
