import { useState, type ReactNode } from 'react'
import { StarIcon } from '@heroicons/react/24/solid'
import type { Game, Team } from '../../types'
import FavoriteTeamButton from '../FavoriteTeamButton'
import { LEAGUE_COLORS } from '../../utils/leagues'
import { classNames, getStatusColor, getStatusLabel } from '../../utils/formatters'

export interface CardProps {
  game: Game
  isFavoriteHome: boolean
  isFavoriteAway: boolean
  onToggleFavorite: (teamId: string) => void
  onClick: () => void
}

export function TeamLogo({ logoUrl, name, size = 'md' }: { logoUrl: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = { sm: 'size-9', md: 'size-12', lg: 'size-16' }[size]
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

export function MoneylineChip({ value, size = 'md' }: { value?: string; size?: 'sm' | 'md' }) {
  if (!value) {
    return (
      <span className="inline-flex items-center rounded-md bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-gray-500">
        —
      </span>
    )
  }
  const isFavorite = value.startsWith('-')
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-md font-mono font-bold tabular-nums ring-1 ring-inset',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
        isFavorite
          ? 'bg-rose-500/10 text-rose-300 ring-rose-500/30'
          : 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
      )}
      title={isFavorite ? 'Favored' : 'Underdog'}
    >
      {value}
    </span>
  )
}

export function LeagueBadge({ game }: { game: Game }) {
  return (
    <span className={classNames('rounded-full px-2 py-0.5 text-xs font-semibold', LEAGUE_COLORS[game.leagueId])}>
      {game.leagueId}
    </span>
  )
}

export function StatusPill({ game }: { game: Game }) {
  if (game.status === 'live') return null
  return (
    <span
      className={classNames(
        'rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        getStatusColor(game.status),
      )}
    >
      {getStatusLabel(game.status)}
    </span>
  )
}

interface CardShellProps {
  game: Game
  isFavoriteHome: boolean
  isFavoriteAway: boolean
  onClick: () => void
  accentClass?: string
  children: ReactNode
}

export function CardShell({ game, isFavoriteHome, isFavoriteAway, onClick, accentClass, children }: CardShellProps) {
  const isLive = game.status === 'live'
  const isFavoriteGame = isFavoriteHome || isFavoriteAway

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
      {accentClass && <div className={classNames('h-0.5 w-full', accentClass)} />}

      {isLive && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          <span className="text-xs font-semibold text-green-400">LIVE</span>
        </div>
      )}

      {isFavoriteGame && (
        <div className="absolute left-3 top-3 z-10">
          <StarIcon className="size-3.5 text-yellow-400" />
        </div>
      )}

      {children}
    </div>
  )
}

interface TeamColumnProps {
  team: Team
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  moneyline?: string
}

export function TeamColumn({ team, isFavorite, onToggleFavorite, moneyline }: TeamColumnProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <div className="relative">
        <TeamLogo logoUrl={team.logoUrl} name={team.name} />
        <div className="absolute -bottom-1 -right-1">
          <FavoriteTeamButton
            teamId={team.id}
            teamName={team.name}
            isFavorite={isFavorite}
            onToggle={onToggleFavorite}
          />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold leading-tight text-gray-100">{team.abbreviation}</p>
        {team.ranking && <p className="text-xs text-indigo-400">#{team.ranking}</p>}
        {team.record && <p className="text-[11px] text-gray-500">{team.record}</p>}
      </div>
      <MoneylineChip value={moneyline} />
    </div>
  )
}

export function VenueBroadcast({ game }: { game: Game }) {
  return (
    <div className="border-t border-gray-800 px-4 py-2">
      <p className="truncate text-xs text-gray-500">
        {game.venue.name}, {game.venue.city}
      </p>
      {game.broadcast && game.broadcast.length > 0 && (
        <p className="mt-0.5 text-xs text-gray-600">📺 {game.broadcast.join(' · ')}</p>
      )}
    </div>
  )
}

export function TicketStrip({ game }: { game: Game }) {
  if (!game.tickets || !game.tickets.lowestPrice || game.tickets.availability === 'sold-out') return null
  return (
    <div className="border-t border-gray-800 bg-indigo-900/20 px-4 py-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Tickets from</span>
        <span className="font-semibold text-indigo-300">${game.tickets.lowestPrice}</span>
      </div>
    </div>
  )
}

export function OddsRow({ game, spreadLabel }: { game: Game; spreadLabel: string }) {
  const odds = game.odds?.[0]
  if (!odds) return null
  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px]">
      <div className="rounded-md bg-gray-800/50 px-2 py-1 text-center">
        <p className="text-gray-600 uppercase tracking-wide">{spreadLabel}</p>
        <p className="mt-0.5 font-mono font-semibold text-gray-200 tabular-nums">
          {odds.spread.away} / {odds.spread.home}
        </p>
      </div>
      <div className="rounded-md bg-gray-800/50 px-2 py-1 text-center">
        <p className="text-gray-600 uppercase tracking-wide">Total</p>
        <p className="mt-0.5 font-mono font-semibold text-gray-200 tabular-nums">{odds.total.line}</p>
      </div>
      <div className="rounded-md bg-gray-800/50 px-2 py-1 text-center">
        <p className="text-gray-600 uppercase tracking-wide">Book</p>
        <p className="mt-0.5 truncate font-semibold text-gray-200">{odds.sportsbook.name}</p>
      </div>
    </div>
  )
}

export function ScoreDisplay({ away, home, size = 'lg' }: { away: number; home: number; size?: 'md' | 'lg' }) {
  const numCls = size === 'lg' ? 'text-4xl' : 'text-3xl'
  const dashCls = size === 'lg' ? 'text-xl' : 'text-lg'
  return (
    <div className="flex items-center gap-3">
      <span className={`${numCls} font-black tabular-nums text-gray-100 leading-none`}>{away}</span>
      <span className={`${dashCls} text-gray-700`}>-</span>
      <span className={`${numCls} font-black tabular-nums text-gray-100 leading-none`}>{home}</span>
    </div>
  )
}
