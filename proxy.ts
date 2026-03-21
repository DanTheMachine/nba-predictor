import express, { type Request, type Response } from 'express'
import fetch from 'node-fetch'

const app = express()

type ScoreboardQuery = { dates?: string | string[] }
type ProxyQuery = { url?: string | string[] }
type ErrorBody = { error: string; url?: string; body?: string }

const readQueryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

const ESPN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://www.espn.com/',
  Origin: 'https://www.espn.com',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
}

app.get('/espn/scoreboard', async (req: Request<Record<string, never>, unknown, unknown, ScoreboardQuery>, res: Response) => {
  const dates = readQueryValue(req.query.dates)
  const url = dates
    ? `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dates}`
    : 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'

  try {
    const upstream = await fetch(url, { headers: ESPN_HEADERS })
    console.log(`[espn/scoreboard] ${upstream.status} dates=${dates ?? 'today'}`)
    const data = await upstream.json()
    res.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

app.get('/espn/teams', async (_req: Request, res: Response) => {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=40'

  try {
    const upstream = await fetch(url, { headers: ESPN_HEADERS })
    console.log(`[espn/teams] ${upstream.status}`)
    const data = await upstream.json()
    res.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

app.get('/proxy', async (req: Request<Record<string, never>, unknown, unknown, ProxyQuery>, res: Response<ErrorBody | unknown>) => {
  const encodedUrl = readQueryValue(req.query.url)
  const url = encodedUrl ? decodeURIComponent(encodedUrl) : undefined

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Missing or invalid url parameter' })
  }

  const isEspn = url.includes('espn.com')
  const headers = isEspn
    ? ESPN_HEADERS
    : {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      }

  try {
    const upstream = await fetch(url, { headers })
    console.log(`[proxy] ${upstream.status} ${url.slice(0, 90)}...`)

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => '')
      return res
        .status(upstream.status)
        .json({ error: `Upstream returned ${upstream.status}`, url, body: body.slice(0, 300) })
    }

    const data = await upstream.json()
    res.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown proxy error'
    console.error('[proxy] error:', message)
    res.status(500).json({ error: message, url })
  }
})

app.listen(3001, () => {
  console.log('Proxy running on http://localhost:3001')
  console.log("  /espn/scoreboard -> today's games")
  console.log('  /espn/scoreboard?dates=YYYYMMDD -> historical scores')
  console.log('  /espn/teams -> team colors')
  console.log('  /proxy?url=<encoded> -> generic passthrough')
})
