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
