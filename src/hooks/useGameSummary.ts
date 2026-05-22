import { useState, useEffect } from 'react'
import type { Game } from '../types'
import { fetchGameSummary, type GameSummaryData } from '../services/sportsApi'

// Module-level cache so data persists across modal open/close cycles
const cache = new Map<string, GameSummaryData>()

export function useGameSummary(game: Game | null) {
  const [summaryData, setSummaryData] = useState<GameSummaryData | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    if (!game) {
      setSummaryData(null)
      return
    }

    const key = game.id
    if (cache.has(key)) {
      setSummaryData(cache.get(key)!)
      return
    }

    let cancelled = false
    setSummaryLoading(true)
    setSummaryData(null)

    fetchGameSummary(game.id, game.leagueId)
      .then((data) => {
        if (cancelled) return
        if (data) {
          cache.set(key, data)
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
  }, [game?.id])

  return { summaryData, summaryLoading }
}
