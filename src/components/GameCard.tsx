import { useState } from 'react'
import type { Game } from '../types'
import FavoriteTeamButton from './FavoriteTeamButton'
import { LEAGUE_COLORS } from '../data/mockData'
import { classNames, formatGameTime, getStatusColor, getStatusLabel } from '../utils/formatters'
import { StarIcon } from '@heroicons/react/24/solid'

interface Props {
  game: Game
  isFavoriteHome: boolean
  isFavoriteAway: boolean
  onToggleFavorite: (teamId: string) => void
  onClick: () => void
}

function TeamLogo({ logoUrl, name, size = 'md' }: { logoUrl: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = { sm: 'size-8', md: 'size-12', lg: 'size-16' }[size]
  const [errored, setErrored] = useState(false)

  if (errored || !logoUrl) {
    return (
      <div className={`${dim} rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs font-bold`}>
        {name.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={logoUrl}
      alt={name}
      className={`${dim} object-contain drop-shadow-lg`}
      onError={() => setErrored(true)}
    />
  )
}

export default function GameCard({ game, isFavoriteHome, isFavoriteAway, onToggleFavorite, onClick }: Props) {
  const isLive = game.status === 'live'
  const isFinal = game.status === 'final'
  const isFavoriteGame = isFavoriteHome || isFavoriteAway
  const bestOdds = game.odds?.[0]

  return (
    <div
      onClick={onClick}
      className={classNames(
        'group relative flex flex-col rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden',
        isFavoriteGame
          ? 'border-yellow-500/40 bg-gray-900 hover:border-yellow-400/60 hover:bg-gray-800/80'
          : 'border-gray-800 bg-gray-900 hover:border-gray-600 hover:bg-gray-800/80',
        isLive && 'ring-1 ring-green-500/30',
      )}
    >
      {/* Live pulse indicator */}
      {isLive && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          <span className="text-xs font-semibold text-green-400">LIVE</span>
        </div>
      )}

      {/* Favorite indicator */}
      {isFavoriteGame && (
        <div className="absolute top-3 left-3">
          <StarIcon className="size-3.5 text-yellow-400" />
        </div>
      )}

      <div className="p-4 pb-3">
        {/* League badge */}
        <div className="mb-3 flex items-center justify-between">
          <span className={classNames('rounded-full px-2 py-0.5 text-xs font-semibold', LEAGUE_COLORS[game.leagueId])}>
            {game.leagueId}
          </span>
          {!isLive && (
            <span className={classNames('rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', getStatusColor(game.status))}>
              {getStatusLabel(game.status)}
            </span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-3">
          {/* Away team */}
          <div className="flex flex-1 flex-col items-center gap-2">
            <div className="relative">
              <TeamLogo logoUrl={game.awayTeam.logoUrl} name={game.awayTeam.name} />
              <div className="absolute -bottom-1 -right-1">
                <FavoriteTeamButton
                  teamId={game.awayTeam.id}
                  teamName={game.awayTeam.name}
                  isFavorite={isFavoriteAway}
                  onToggle={onToggleFavorite}
                />
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-gray-100 leading-tight">{game.awayTeam.abbreviation}</p>
              {game.awayTeam.ranking && (
                <p className="text-xs text-indigo-400">#{game.awayTeam.ranking}</p>
              )}
              {game.awayTeam.record && (
                <p className="text-xs text-gray-500">{game.awayTeam.record}</p>
              )}
            </div>
          </div>

          {/* Score / Time */}
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            {(isLive || isFinal) ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black tabular-nums text-gray-100">{game.awayScore ?? 0}</span>
                  <span className="text-sm text-gray-600">-</span>
                  <span className="text-2xl font-black tabular-nums text-gray-100">{game.homeScore ?? 0}</span>
                </div>
                {isLive && game.period && (
                  <div className="text-center">
                    <p className="text-xs font-semibold text-green-400">{game.period}</p>
                    {game.clock && <p className="text-xs text-gray-500">{game.clock}</p>}
                  </div>
                )}
                {isFinal && <p className="text-xs text-gray-500">Final</p>}
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-gray-100">{formatGameTime(game.startTime)}</span>
                <span className="text-xs text-gray-600">vs</span>
              </>
            )}
          </div>

          {/* Home team */}
          <div className="flex flex-1 flex-col items-center gap-2">
            <div className="relative">
              <TeamLogo logoUrl={game.homeTeam.logoUrl} name={game.homeTeam.name} />
              <div className="absolute -bottom-1 -right-1">
                <FavoriteTeamButton
                  teamId={game.homeTeam.id}
                  teamName={game.homeTeam.name}
                  isFavorite={isFavoriteHome}
                  onToggle={onToggleFavorite}
                />
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-gray-100 leading-tight">{game.homeTeam.abbreviation}</p>
              {game.homeTeam.ranking && (
                <p className="text-xs text-indigo-400">#{game.homeTeam.ranking}</p>
              )}
              {game.homeTeam.record && (
                <p className="text-xs text-gray-500">{game.homeTeam.record}</p>
              )}
            </div>
          </div>
        </div>

        {/* Venue & broadcast */}
        <div className="mt-3 border-t border-gray-800 pt-2">
          <p className="truncate text-xs text-gray-500">{game.venue.name}, {game.venue.city}</p>
          {game.broadcast && game.broadcast.length > 0 && (
            <p className="text-xs text-gray-600 mt-0.5">📺 {game.broadcast.join(' · ')}</p>
          )}
        </div>
      </div>

      {/* Odds strip */}
      {bestOdds && (
        <div className="border-t border-gray-800 bg-gray-800/40 px-4 py-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-gray-600">{bestOdds.sportsbook.name}</span>
            <div className="flex gap-3 font-mono">
              <span className="text-gray-400">ML <span className="text-gray-200">{bestOdds.moneyline.away}/{bestOdds.moneyline.home}</span></span>
              <span className="text-gray-400">O/U <span className="text-gray-200">{bestOdds.total.line}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Ticket price strip */}
      {game.tickets && game.tickets.lowestPrice && game.tickets.availability !== 'sold-out' && (
        <div className="border-t border-gray-800 bg-indigo-900/20 px-4 py-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Tickets from</span>
            <span className="font-semibold text-indigo-300">${game.tickets.lowestPrice}</span>
          </div>
        </div>
      )}
    </div>
  )
}
