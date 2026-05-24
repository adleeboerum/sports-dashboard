import { useState, useEffect } from 'react'
import type { Game } from '../types'
import { fetchGameSummary, type GameSummaryData } from '../services/sportsApi'

// Module-level cache so data persists across modal open/close cycles
const cache = new Map<string, GameSummaryData>()

export function useGameSummary(game: Game | null) {
  const gameId = game?.id ?? null
  const leagueId = game?.leagueId

  // Initialize from cache so we don't render an empty state when reopening
  const [summaryData, setSummaryData] = useState<GameSummaryData | null>(
    gameId ? (cache.get(gameId) ?? null) : null,
  )
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    if (!gameId || !leagueId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSummaryData(null)
      return
    }

    if (cache.has(gameId)) {
      setSummaryData(cache.get(gameId)!)
      return
    }

    let cancelled = false
    setSummaryLoading(true)
    setSummaryData(null)

    fetchGameSummary(gameId, leagueId)
      .then((data) => {
        if (cancelled) return
        if (data) {
          cache.set(gameId, data)
          setSummaryData(data)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSummaryLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [gameId, leagueId])

  return { summaryData, summaryLoading }
}
