import { useState, useEffect } from 'react'
import type { Game } from '../types'
import { fetchGamesInRange, fetchTodaysGames } from '../services/sportsApi'
import { todayYmd } from '../utils/formatters'

export type UseGamesMode =
  | { kind: 'day'; dateYmd: string }
  | { kind: 'range'; daysAhead: number }

export function useGames(mode: UseGamesMode) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const key = mode.kind === 'day' ? `day:${mode.dateYmd}` : `range:${mode.daysAhead}`

  useEffect(() => {
    let cancelled = false

    async function load({ initial }: { initial: boolean }) {
      if (initial) setLoading(true)
      try {
        const data =
          mode.kind === 'day'
            ? await fetchTodaysGames(mode.dateYmd)
            : await fetchGamesInRange(mode.daysAhead)
        if (cancelled) return
        setGames(data)
        setError(null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load games')
      } finally {
        if (!cancelled && initial) setLoading(false)
      }
    }

    load({ initial: true })

    // Only poll when showing today's live day view.
    const isLiveToday = mode.kind === 'day' && mode.dateYmd === todayYmd()
    if (isLiveToday) {
      const interval = setInterval(() => load({ initial: false }), 30_000)
      return () => {
        cancelled = true
        clearInterval(interval)
      }
    }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { games, loading, error }
}
