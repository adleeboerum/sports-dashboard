import axios from 'axios'
import type { GameOdds, LeagueId } from '../types'

const ODDS_API_KEY = import.meta.env.VITE_ODDS_API_KEY
const ODDS_BASE = 'https://api.the-odds-api.com/v4'

const oddsClient = axios.create({ baseURL: ODDS_BASE })

const LEAGUE_TO_SPORT_KEY: Partial<Record<LeagueId, string>> = {
  NBA: 'basketball_nba',
  NCAAB: 'basketball_ncaab',
  NFL: 'americanfootball_nfl',
  NCAAF: 'americanfootball_ncaaf',
  MLB: 'baseball_mlb',
  NHL: 'icehockey_nhl',
  MLS: 'soccer_usa_mls',
  EPL: 'soccer_epl',
  UCL: 'soccer_uefa_champs_league',
}

export interface OddsByMatchup {
  // key = `${awayName.toLowerCase()}|${homeName.toLowerCase()}`
  [key: string]: GameOdds[]
}

function fmtAmerican(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n > 0 ? `+${n}` : `${n}`
}

function matchupKey(away: string, home: string): string {
  return `${away.toLowerCase()}|${home.toLowerCase()}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGame(g: any): { key: string; odds: GameOdds[] } | null {
  const homeName: string | undefined = g.home_team
  const awayName: string | undefined = g.away_team
  if (!homeName || !awayName) return null

  const out: GameOdds[] = []
  for (const book of g.bookmakers ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markets: any[] = book.markets ?? []
    const h2h = markets.find((m) => m.key === 'h2h')
    const spreads = markets.find((m) => m.key === 'spreads')
    const totals = markets.find((m) => m.key === 'totals')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const homeML = h2h?.outcomes?.find((o: any) => o.name === homeName)?.price
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const awayML = h2h?.outcomes?.find((o: any) => o.name === awayName)?.price

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const homeSpreadOut = spreads?.outcomes?.find((o: any) => o.name === homeName)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const awaySpreadOut = spreads?.outcomes?.find((o: any) => o.name === awayName)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overOut = totals?.outcomes?.find((o: any) => o.name === 'Over')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const underOut = totals?.outcomes?.find((o: any) => o.name === 'Under')

    if (homeML == null && awayML == null && !homeSpreadOut && !overOut) continue

    out.push({
      sportsbook: { id: book.key ?? book.title ?? `book-${out.length}`, name: book.title ?? 'Sportsbook' },
      moneyline: { home: fmtAmerican(homeML), away: fmtAmerican(awayML) },
      spread: {
        home: fmtAmerican(homeSpreadOut?.point),
        homeSpread: fmtAmerican(homeSpreadOut?.price),
        away: fmtAmerican(awaySpreadOut?.point),
        awaySpread: fmtAmerican(awaySpreadOut?.price),
      },
      total: {
        over: fmtAmerican(overOut?.price),
        under: fmtAmerican(underOut?.price),
        line: typeof overOut?.point === 'number' ? overOut.point : 0,
      },
      lastUpdated: book.last_update ?? new Date().toISOString(),
    })
  }

  if (!out.length) return null
  return { key: matchupKey(awayName, homeName), odds: out }
}

export type OddsFetchStatus =
  | { kind: 'ok' }
  | { kind: 'no-key' }
  | { kind: 'unsupported' }
  | { kind: 'quota-exceeded' }
  | { kind: 'error'; message: string }

export interface OddsFetchResult {
  map: OddsByMatchup
  status: OddsFetchStatus
}

export async function fetchOddsForLeague(leagueId: LeagueId): Promise<OddsFetchResult> {
  if (!ODDS_API_KEY) return { map: {}, status: { kind: 'no-key' } }
  const sportKey = LEAGUE_TO_SPORT_KEY[leagueId]
  if (!sportKey) return { map: {}, status: { kind: 'unsupported' } }

  try {
    const res = await oddsClient.get(`/sports/${sportKey}/odds`, {
      params: {
        apiKey: ODDS_API_KEY,
        regions: 'us',
        markets: 'h2h,spreads,totals',
        oddsFormat: 'american',
      },
    })

    const map: OddsByMatchup = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const g of (res.data as any[]) ?? []) {
      const parsed = parseGame(g)
      if (parsed) map[parsed.key] = parsed.odds
    }
    return { map, status: { kind: 'ok' } }
  } catch (err) {
    // The Odds API returns 401/429 with a JSON body on quota exhaustion.
    if (axios.isAxiosError(err)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = err.response?.data
      const code: string | undefined = body?.error_code
      if (code === 'OUT_OF_USAGE_CREDITS' || err.response?.status === 401 || err.response?.status === 429) {
        return { map: {}, status: { kind: 'quota-exceeded' } }
      }
      return { map: {}, status: { kind: 'error', message: err.message } }
    }
    return { map: {}, status: { kind: 'error', message: 'Unknown error' } }
  }
}

export function lookupOdds(map: OddsByMatchup, awayName: string, homeName: string): GameOdds[] | undefined {
  return map[matchupKey(awayName, homeName)]
}
