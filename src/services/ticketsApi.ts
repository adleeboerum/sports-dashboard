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

function parseSeatGeekResponse(data: unknown): TicketInfo | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event = (data as any)?.events?.[0]
  if (!event) return null
  const stats = event.stats ?? {}
  const lowestPrice: number | undefined = typeof stats.lowest_price === 'number' ? stats.lowest_price : undefined
  const averagePrice: number | undefined = typeof stats.average_price === 'number' ? stats.average_price : undefined
  const listingCount: number = typeof stats.listing_count === 'number' ? stats.listing_count : 0

  const availability: TicketInfo['availability'] =
    listingCount === 0 ? 'sold-out' : listingCount < 25 ? 'limited' : 'available'

  return {
    provider: 'SeatGeek',
    lowestPrice,
    averagePrice,
    ticketUrl: event.url ?? 'https://seatgeek.com',
    availability,
  }
}
