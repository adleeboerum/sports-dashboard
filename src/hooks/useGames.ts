import { useState, useEffect } from 'react'
import type { Game } from '../types'
import type { OddsWarning } from '../services/sportsApi'
import { fetchGamesInRangeWithStatus, fetchTodaysGamesWithStatus } from '../services/sportsApi'
import { todayYmd } from '../utils/formatters'

export type UseGamesMode =
  | { kind: 'day';   dateYmd: string }
  | { kind: 'range'; daysAhead: number }

export function useGames(mode: UseGamesMode) {
  const [games, setGames]           = useState<Game[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [oddsWarning, setOddsWarning] = useState<OddsWarning | null>(null)

  const key = mode.kind === 'day' ? `day:${mode.dateYmd}` : `range:${mode.daysAhead}`

  useEffect(() => {
    let cancelled = false

    async function load(initial: boolean) {
      if (initial) setLoading(true)
      try {
        const result = mode.kind === 'day'
          ? await fetchTodaysGamesWithStatus(mode.dateYmd)
          : await fetchGamesInRangeWithStatus(mode.daysAhead)
        if (cancelled) return
        setGames(result.games)
        setOddsWarning(result.oddsWarning ?? null)
        setError(null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load games')
      } finally {
        if (!cancelled && initial) setLoading(false)
      }
    }

    load(true)

    const liveToday = mode.kind === 'day' && mode.dateYmd === todayYmd()
    if (liveToday) {
      const timer = setInterval(() => load(false), 30_000)
      return () => { cancelled = true; clearInterval(timer) }
    }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { games, loading, error, oddsWarning }
}
