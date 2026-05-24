import { useEffect, useRef, useState } from 'react'
import type { LeagueId, LeagueStandings } from '../types'
import { fetchStandings } from '../services/sportsApi'

export function useStandings(leagueId: LeagueId) {
  const [standings, setStandings] = useState<LeagueStandings | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)
  const cache = useRef<Partial<Record<LeagueId, LeagueStandings>>>({})

  useEffect(() => {
    const cached = cache.current[leagueId]
    if (cached) { setStandings(cached); setLoading(false); return }

    let cancelled = false
    setLoading(true); setError(false)

    fetchStandings(leagueId).then((result) => {
      if (cancelled) return
      if (result) {
        cache.current[leagueId] = result
        setStandings(result)
        setError(false)
      } else {
        setError(true)
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [leagueId])

  return { standings, loading, error }
}
