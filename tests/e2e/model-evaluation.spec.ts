import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

const predictionsCsv = `"Date","Home","Away","ML Rec","Vegas H ML","Vegas A ML","Vegas Spread","Spread Home Odds","Spread Away Odds","Vegas O/U","Over Odds","Under Odds","Spread Rec","O/U Rec","LookupKey"
"2026-03-20","BOS Celtics","LAL Lakers","BOS ML","-150","+130","-4.5","-110","-110","224.5","-105","-115","BOS -4.5","OVER","20260320BOSLAL"`

const resultsCsv = `"Date","Home","Away","Home Score","Away Score","LookupKey"
"2026-03-20","BOS","LAL","118","110","20260320BOSLAL"`

test('evaluates pasted prediction and results CSVs', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /model eval/i }).click()

  const textareas = page.getByRole('textbox')
  await textareas.nth(0).fill(predictionsCsv)
  await textareas.nth(1).fill(resultsCsv)

  await page.getByRole('button', { name: /evaluate model/i }).click()

  await expect(page.getByText(/evaluated 3 recommended bets across 1 predictions/i)).toBeVisible()
  await expect(page.getByText(/bet log \| 3 bets \| 3 settled/i)).toBeVisible()
  await expect(page.getByRole('cell', { name: 'BOS ML' })).toBeVisible()
})

test('opens the single-game tools panel from the predictor tab', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /open single game/i }).click()

  await expect(page.getByText(/filter by division/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /close panel/i })).toBeVisible()
})

test('exports predictions csv from the today games flow', async ({ page }) => {
  let scoreboardCalls = 0

  await page.route('http://localhost:3001/proxy?url=*', async (route) => {
    const requestUrl = route.request().url()
    const parsed = new URL(requestUrl)
    const target = decodeURIComponent(parsed.searchParams.get('url') ?? '')

    if (target.includes('/scoreboard?dates=')) {
      scoreboardCalls += 1
      const events = scoreboardCalls === 1
        ? [
            {
              date: '2026-03-20T19:30:00Z',
              competitions: [
                {
                  broadcasts: [{ names: ['ESPN'] }],
                  competitors: [
                    { homeAway: 'home', team: { abbreviation: 'BOS' } },
                    { homeAway: 'away', team: { abbreviation: 'LAL' } },
                  ],
                  odds: [
                    {
                      moneyline: {
                        home: { close: { odds: '-145' } },
                        away: { close: { odds: '+125' } },
                      },
                      pointSpread: {
                        home: { close: { line: '-4.5', odds: '-110' } },
                        away: { close: { line: '+4.5', odds: '-105' } },
                      },
                      total: {
                        over: { close: { line: '220.5', odds: '-112' } },
                        under: { close: { odds: '-108' } },
                      },
                    },
                  ],
                },
              ],
            },
          ]
        : []

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ events }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ events: [] }),
    })
  })

  await page.goto('/')

  await page.getByRole('button', { name: /load games/i }).click()
  await expect(page.getByRole('button', { name: /run all sims/i })).toBeVisible()

  await page.getByRole('button', { name: /run all sims/i }).click()
  await expect(page.getByRole('button', { name: /predictions csv/i })).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /predictions csv/i }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^nba-predictions-\d{4}-\d{2}-\d{2}\.csv$/)

  const filePath = await download.path()
  expect(filePath).toBeTruthy()

  const csvText = await readFile(filePath!, 'utf8')
  const [headerRow, dataRow] = csvText.trim().split('\n')

  expect(headerRow).toContain('"ML Rec"')
  expect(headerRow).toContain('"Over Odds"')
  expect(headerRow).toContain('"Under Odds"')
  expect(headerRow).toContain('"Vegas Spread"')
  expect(headerRow).toContain('"Spread Home Odds"')
  expect(headerRow).toContain('"Spread Away Odds"')
  expect(headerRow).toContain('"LookupKey"')

  expect(dataRow).toContain('"BOS ML"')
  expect(dataRow).toContain('"-112"')
  expect(dataRow).toContain('"-108"')
  expect(dataRow).toContain('"-4.5"')
  expect(dataRow).toContain('"-110"')
  expect(dataRow).toContain('"-105"')
  expect(dataRow).toContain('"BOS Celtics"')
  expect(dataRow).toContain('"LAL Lakers"')
})
