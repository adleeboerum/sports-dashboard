import { useState, useEffect } from 'react'
import type { Game } from '../types'
import { fetchTodaysGames } from '../services/sportsApi'

export function useGames() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load({ initial }: { initial: boolean }) {
      if (initial) setLoading(true)
      try {
        const data = await fetchTodaysGames()
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

    const interval = setInterval(() => load({ initial: false }), 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { games, loading, error }
}
