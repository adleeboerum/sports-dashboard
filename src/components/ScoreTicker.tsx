import { useState } from 'react'
import type { Game } from '../types'
import { formatGameTime } from '../utils/formatters'

interface TickerItem {
  game: Game
}

function TickerGame({ game, onClick }: { game: Game; onClick: () => void }) {
  const isLive = game.status === 'live'
  const isFinal = game.status === 'final'
  const hasScore = isLive || isFinal

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-1.5 hover:bg-gray-800/50 transition-colors rounded shrink-0 cursor-pointer"
    >
      {isLive && (
        <span className="relative flex size-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
        </span>
      )}

      <span className="text-xs text-gray-400 font-medium shrink-0">{game.awayTeam.abbreviation}</span>

      {hasScore ? (
        <span className="text-xs font-bold tabular-nums text-gray-100">
          {game.awayScore ?? 0} - {game.homeScore ?? 0}
        </span>
      ) : (
        <span className="text-xs text-gray-500 shrink-0">vs</span>
      )}

      <span className="text-xs text-gray-400 font-medium shrink-0">{game.homeTeam.abbreviation}</span>

      {isLive && game.period && (
        <span className="text-[10px] text-green-400 font-semibold shrink-0">{game.period}{game.clock ? ` ${game.clock}` : ''}</span>
      )}
      {isFinal && (
        <span className="text-[10px] text-gray-600 font-medium shrink-0">FINAL</span>
      )}
      {!isLive && !isFinal && (
        <span className="text-[10px] text-gray-600 shrink-0">{formatGameTime(game.startTime)}</span>
      )}
    </button>
  )
}

function Divider() {
  return <span className="text-gray-800 text-xs shrink-0">|</span>
}

interface Props {
  games: Game[]
  onGameClick: (game: Game) => void
}

export default function ScoreTicker({ games, onGameClick }: Props) {
  const [paused, setPaused] = useState(false)

  if (games.length === 0) return null

  // Sort: live first, then scheduled by time, then final
  const sorted = [...games].sort((a, b) => {
    const order = { live: 0, scheduled: 1, final: 2, postponed: 3, canceled: 4 }
    const ao = order[a.status] ?? 5
    const bo = order[b.status] ?? 5
    if (ao !== bo) return ao - bo
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  })

  const items: TickerItem[] = sorted.map((g) => ({ game: g }))
  const needsScroll = items.length > 4

  return (
    <div
      className="border-b border-gray-800 bg-gray-950/80 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative flex items-center h-8">
        {/* League label */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 border-r border-gray-800 h-full bg-gray-900/50 z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Scores</span>
        </div>

        {needsScroll ? (
          <div className="flex-1 overflow-hidden">
            <div
              className="flex items-center"
              style={{
                animation: paused ? 'none' : `ticker-scroll ${Math.max(items.length * 7, 30)}s linear infinite`,
                width: 'max-content',
              }}
            >
              {/* Duplicate for seamless loop */}
              {[...items, ...items].map(({ game }, i) => (
                <span key={`${game.id}-${i}`} className="flex items-center">
                  <TickerGame game={game} onClick={() => onGameClick(game)} />
                  <Divider />
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center overflow-x-auto scrollbar-none">
            {items.map(({ game }, i) => (
              <span key={game.id} className="flex items-center">
                <TickerGame game={game} onClick={() => onGameClick(game)} />
                {i < items.length - 1 && <Divider />}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
