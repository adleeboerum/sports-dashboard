import { useMemo } from 'react'
import type { Game, GamePrediction } from '../types'
import { predictGame } from '../services/predictionEngine'

export interface PredictedGame {
  game: Game
  prediction: GamePrediction
}

export function usePredictions(games: Game[]): PredictedGame[] {
  return useMemo(() => {
    const out: PredictedGame[] = []
    for (const game of games) {
      // Only predict games that haven't started — finals/lives have settled lines.
      if (game.status !== 'scheduled') continue
      const prediction = predictGame(game)
      if (!prediction) continue
      out.push({ game, prediction })
    }
    return out
  }, [games])
}
