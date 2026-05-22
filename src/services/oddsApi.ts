import axios from 'axios'
import type { GameOdds } from '../types'

const ODDS_API_KEY = import.meta.env.VITE_ODDS_API_KEY
const ODDS_BASE = 'https://api.the-odds-api.com/v4'

const oddsClient = axios.create({ baseURL: ODDS_BASE })

export async function fetchOddsForGame(sportKey: string, gameId: string): Promise<GameOdds[]> {
  if (!ODDS_API_KEY) return []

  try {
    const res = await oddsClient.get(`/sports/${sportKey}/odds`, {
      params: {
        apiKey: ODDS_API_KEY,
        regions: 'us',
        markets: 'h2h,spreads,totals',
        eventIds: gameId,
      },
    })
    return parseOddsResponse(res.data)
  } catch {
    return []
  }
}

function parseOddsResponse(_data: unknown): GameOdds[] {
  return []
}
