import { useState } from 'react'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { StarIcon as StarOutline } from '@heroicons/react/24/outline'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import type { Game } from '../types'
import { LEAGUE_COLORS } from '../utils/leagues'
import { classNames, formatGameTime, getStatusColor } from '../utils/formatters'

function SmallLogo({ logoUrl, name }: { logoUrl: string; name: string }) {
  const [err, setErr] = useState(false)
  if (err || !logoUrl) {
    return (
      <span className="size-6 rounded-full bg-gray-700 flex items-center justify-center text-[9px] font-bold text-gray-400">
        {name.slice(0, 2).toUpperCase()}
      </span>
    )
  }
  return <img src={logoUrl} alt={name} className="size-6 object-contain" onError={() => setErr(true)} />
}

interface Props {
  game: Game
  isFavoriteHome: boolean
  isFavoriteAway: boolean
  onToggleFavorite: (teamId: string) => void
  onClick: () => void
}

export default function GameListItem({ game, isFavoriteHome, isFavoriteAway, onToggleFavorite, onClick }: Props) {
  const isLive = game.status === 'live'
  const isFinal = game.status === 'final'
  const hasScore = isLive || isFinal
  const isFavoriteGame = isFavoriteHome || isFavoriteAway
  const bestOdds = game.odds?.[0]

  function handleFavClick(e: React.MouseEvent, teamId: string) {
    e.stopPropagation()
    onToggleFavorite(teamId)
  }

  return (
    <div
      onClick={onClick}
      className={classNames(
        'group flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-gray-800/60 last:border-0',
        isFavoriteGame
          ? 'bg-yellow-500/5 hover:bg-yellow-500/10'
          : 'hover:bg-gray-800/40',
        isLive && 'border-l-2 border-l-green-500',
      )}
    >
      {/* League badge */}
      <span className={classNames('rounded px-1.5 py-0.5 text-[10px] font-bold w-12 text-center shrink-0', LEAGUE_COLORS[game.leagueId])}>
        {game.leagueId}
      </span>

      {/* Away team */}
      <div className="flex items-center gap-1.5 w-28 shrink-0">
        <SmallLogo logoUrl={game.awayTeam.logoUrl} name={game.awayTeam.name} />
        <div className="min-w-0">
          <p className={classNames('text-sm font-semibold truncate', hasScore && game.awayScore !== undefined && game.homeScore !== undefined && game.awayScore > game.homeScore ? 'text-gray-100' : 'text-gray-300')}>
            {game.awayTeam.abbreviation}
          </p>
          {game.awayTeam.record && <p className="text-[10px] text-gray-600">{game.awayTeam.record}</p>}
        </div>
        <button
          onClick={(e) => handleFavClick(e, game.awayTeam.id)}
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {isFavoriteAway
            ? <StarSolid className="size-3 text-yellow-400" />
            : <StarOutline className="size-3 text-gray-600 hover:text-yellow-400" />
          }
        </button>
      </div>

      {/* Score / Time */}
      <div className="flex flex-col items-center w-24 shrink-0 text-center">
        {hasScore ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tabular-nums text-gray-100">{game.awayScore ?? 0}</span>
              <span className="text-xs text-gray-700">-</span>
              <span className="text-base font-black tabular-nums text-gray-100">{game.homeScore ?? 0}</span>
            </div>
            {isLive && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
                </span>
                <span className="text-[10px] text-green-400 font-medium">
                  {game.period}{game.clock ? ` · ${game.clock}` : ''}
                </span>
              </div>
            )}
            {isFinal && <span className="text-[10px] text-gray-600 mt-0.5">FINAL</span>}
          </>
        ) : (
          <>
            <span className="text-sm font-semibold text-gray-200">{formatGameTime(game.startTime).split(' ').slice(0, 2).join(' ')}</span>
            <span className={classNames('text-[10px] rounded-full px-1.5 py-0.5 ring-1 ring-inset mt-0.5', getStatusColor(game.status))}>
              {game.status === 'scheduled' ? 'UPCOMING' : game.status.toUpperCase()}
            </span>
          </>
        )}
      </div>

      {/* Home team */}
      <div className="flex items-center gap-1.5 w-28 shrink-0">
        <button
          onClick={(e) => handleFavClick(e, game.homeTeam.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {isFavoriteHome
            ? <StarSolid className="size-3 text-yellow-400" />
            : <StarOutline className="size-3 text-gray-600 hover:text-yellow-400" />
          }
        </button>
        <div className="min-w-0">
          <p className={classNames('text-sm font-semibold truncate', hasScore && game.homeScore !== undefined && game.awayScore !== undefined && game.homeScore > game.awayScore ? 'text-gray-100' : 'text-gray-300')}>
            {game.homeTeam.abbreviation}
          </p>
          {game.homeTeam.record && <p className="text-[10px] text-gray-600">{game.homeTeam.record}</p>}
        </div>
        <SmallLogo logoUrl={game.homeTeam.logoUrl} name={game.homeTeam.name} />
      </div>

      {/* Odds */}
      {bestOdds ? (
        <div className="hidden sm:flex items-center gap-3 ml-2 shrink-0">
          <div className="text-center">
            <p className="text-[9px] text-gray-700 uppercase">ML</p>
            <p className="text-xs font-mono text-gray-400">{bestOdds.moneyline.away} / {bestOdds.moneyline.home}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-gray-700 uppercase">O/U</p>
            <p className="text-xs font-mono text-gray-400">{bestOdds.total.line}</p>
          </div>
        </div>
      ) : (
        <div className="hidden sm:block w-24 shrink-0" />
      )}

      {/* Tickets */}
      {game.tickets?.lowestPrice && game.tickets.availability !== 'sold-out' ? (
        <div className="hidden md:block text-right shrink-0 ml-auto">
          <p className="text-[9px] text-gray-700 uppercase">From</p>
          <p className="text-xs font-semibold text-indigo-300">${game.tickets.lowestPrice}</p>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Venue */}
      <div className="hidden lg:block text-right shrink-0 min-w-0 max-w-[140px]">
        <p className="text-[10px] text-gray-600 truncate">{game.venue.name}</p>
        <p className="text-[10px] text-gray-700 truncate">{game.venue.city}{game.venue.state ? `, ${game.venue.state}` : ''}</p>
      </div>

      <ChevronRightIcon className="size-4 text-gray-700 group-hover:text-gray-500 shrink-0 ml-1 transition-colors" />
    </div>
  )
}
