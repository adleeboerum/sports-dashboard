import axios from 'axios'
import type { TicketInfo } from '../types'

const SEATGEEK_KEY = import.meta.env.VITE_SEATGEEK_CLIENT_ID
const SEATGEEK_BASE = 'https://api.seatgeek.com/2'

export async function fetchTicketsForGame(homeTeam: string, awayTeam: string): Promise<TicketInfo | null> {
  if (!SEATGEEK_KEY) return null

  try {
    const res = await axios.get(`${SEATGEEK_BASE}/events`, {
      params: {
        client_id: SEATGEEK_KEY,
        q: `${homeTeam} vs ${awayTeam}`,
        per_page: 1,
      },
    })
    return parseSeatGeekResponse(res.data)
  } catch {
    return null
  }
}

function parseSeatGeekResponse(_data: unknown): TicketInfo | null {
  return null
}
