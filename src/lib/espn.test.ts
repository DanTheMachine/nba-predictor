import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./nbaModel', () => ({
  TEAMS: {
    BOS: {},
    LAL: {},
  },
  normalizeAbbr: (value: string) => value,
}))

import { fetchTeamInjuries, parseProjectedStartersFromHtml } from './espn'

describe('fetchTeamInjuries', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps ESPN roster injuries into InjuryInfo rows', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sports: [
            {
              leagues: [
                {
                  teams: [
                    { team: { id: '2', abbreviation: 'BOS' } },
                    { team: { id: '13', abbreviation: 'LAL' } },
                  ],
                },
              ],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          athletes: [
            {
              displayName: 'Jaylen Brown',
              injuries: [{ status: 'Day-To-Day', detail: 'Knee soreness', date: '2026-03-23T12:30:00.000Z' }],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          athletes: [
            {
              displayName: 'LeBron James',
              injuries: [{ status: 'Out', date: '2026-03-23T16:15:00.000Z' }],
            },
            {
              displayName: 'Austin Reaves',
              injuries: [],
            },
          ],
        }),
      })

    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchTeamInjuries(['BOS', 'LAL'])

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(result.BOS).toEqual([
      {
        team: 'BOS',
        player: 'Jaylen Brown',
        status: 'Day-To-Day',
        note: 'Jaylen Brown - Day-To-Day (Knee soreness)',
        source: 'ESPN roster',
        lastUpdated: '2026-03-23T12:30:00.000Z',
      },
    ])
    expect(result.LAL).toEqual([
      {
        team: 'LAL',
        player: 'LeBron James',
        status: 'Out',
        note: 'LeBron James - Out',
        source: 'ESPN roster',
        lastUpdated: '2026-03-23T16:15:00.000Z',
      },
    ])
  })

  it('parses projected starters from an ESPN depth chart table', () => {
    const html = `
      <html>
        <body>
          <table>
            <tr>
              <th></th>
              <th>PG</th>
              <th>SG</th>
              <th>SF</th>
              <th>PF</th>
              <th>C</th>
            </tr>
            <tr>
              <td>Starter</td>
              <td>Luka Doncic</td>
              <td>Austin Reaves</td>
              <td>LeBron James O</td>
              <td>Rui Hachimura</td>
              <td>Jaxson Hayes</td>
            </tr>
          </table>
        </body>
      </html>
    `

    const starters = parseProjectedStartersFromHtml(html, 'LAL')

    expect(starters).toEqual({
      team: 'LAL',
      starters: [
        { position: 'PG', player: 'Luka Doncic' },
        { position: 'SG', player: 'Austin Reaves' },
        { position: 'SF', player: 'LeBron James' },
        { position: 'PF', player: 'Rui Hachimura' },
        { position: 'C', player: 'Jaxson Hayes' },
      ],
      source: 'ESPN depth chart',
      lastUpdated: expect.any(String),
    })
  })

  it('parses projected starters from ESPN split depth tables', () => {
    const html = `
      <html>
        <body>
          <table>
            <tr><th></th></tr>
            <tr><td>PG</td></tr>
            <tr><td>SG</td></tr>
            <tr><td>SF</td></tr>
            <tr><td>PF</td></tr>
            <tr><td>C</td></tr>
          </table>
          <table>
            <tr>
              <th>Starter</th>
              <th>2nd</th>
              <th>3rd</th>
            </tr>
            <tr><td>Luka Doncic</td><td>Bench 1</td><td>Bench 2</td></tr>
            <tr><td>Austin Reaves</td><td>Bench 1</td><td>Bench 2</td></tr>
            <tr><td>LeBron James DD</td><td>Bench 1</td><td>Bench 2</td></tr>
            <tr><td>Rui Hachimura</td><td>Bench 1</td><td>Bench 2</td></tr>
            <tr><td>Jaxson Hayes</td><td>Bench 1</td><td>Bench 2</td></tr>
          </table>
        </body>
      </html>
    `

    const starters = parseProjectedStartersFromHtml(html, 'LAL')

    expect(starters).toEqual({
      team: 'LAL',
      starters: [
        { position: 'PG', player: 'Luka Doncic' },
        { position: 'SG', player: 'Austin Reaves' },
        { position: 'SF', player: 'LeBron James' },
        { position: 'PF', player: 'Rui Hachimura' },
        { position: 'C', player: 'Jaxson Hayes' },
      ],
      source: 'ESPN depth chart',
      lastUpdated: expect.any(String),
    })
  })
})
