import { Fragment, useEffect, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { XMarkIcon, MapPinIcon, TvIcon, CloudIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import type { Game } from '../types'
import OddsTable from './OddsTable'
import TicketPriceCard from './TicketPriceCard'
import FavoriteTeamButton from './FavoriteTeamButton'
import LineupSection from './LineupSection'
import { formatGameTime, getStatusColor, getStatusLabel, classNames } from '../utils/formatters'
import { LEAGUE_COLORS } from '../data/mockData'
import { useGameSummary } from '../hooks/useGameSummary'

interface Props {
  game: Game | null
  open: boolean
  onClose: () => void
  isFavoriteHome: boolean
  isFavoriteAway: boolean
  onToggleFavorite: (teamId: string) => void
}

function TeamLogo({ logoUrl, name }: { logoUrl: string; name: string }) {
  const [errored, setErrored] = useState(false)
  if (errored || !logoUrl) {
    return (
      <div className="size-16 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm font-bold">
        {name.slice(0, 2).toUpperCase()}
      </div>
    )
  }
  return (
    <img
      src={logoUrl}
      alt={name}
      className="size-16 object-contain drop-shadow-lg"
      onError={() => setErrored(true)}
    />
  )
}

// Recent form dots: W=green, L=red, D=yellow
function RecentForm({ form }: { form: ('W' | 'L' | 'D')[] }) {
  const colors: Record<string, string> = {
    W: 'bg-green-500',
    L: 'bg-red-500',
    D: 'bg-yellow-500',
  }
  return (
    <div className="flex items-center gap-1">
      {form.map((r, i) => (
        <span
          key={i}
          className={classNames('h-2 w-2 rounded-full', colors[r] ?? 'bg-gray-600')}
          title={r === 'W' ? 'Win' : r === 'L' ? 'Loss' : 'Draw'}
        />
      ))}
    </div>
  )
}

function TeamStatsComparison({ game }: { game: Game }) {
  const away = game.awayTeam.seasonStats
  const home = game.homeTeam.seasonStats
  if (!away && !home) return null

  // Collect all labels present in either team's stats
  const awayMap = new Map((away?.stats ?? []).map((s) => [s.label, s.value]))
  const homeMap = new Map((home?.stats ?? []).map((s) => [s.label, s.value]))
  const labels = [...new Set([...awayMap.keys(), ...homeMap.keys()])]

  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-2 mb-3">
        <ChartBarIcon className="size-4 text-gray-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Season Stats</h3>
      </div>

      <div className="space-y-1.5">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 items-center pb-1 mb-1 border-b border-gray-800">
          <span className="text-xs font-semibold text-gray-400 text-right">{game.awayTeam.abbreviation}</span>
          <span className="w-20 text-center" />
          <span className="text-xs font-semibold text-gray-400">{game.homeTeam.abbreviation}</span>
        </div>

        {labels.map((label) => {
          const av = awayMap.get(label) ?? '—'
          const hv = homeMap.get(label) ?? '—'
          return (
            <div key={label} className="grid grid-cols-[1fr_auto_1fr] gap-x-4 items-center">
              <span className="text-sm font-semibold tabular-nums text-gray-200 text-right">{av}</span>
              <span className="w-20 text-center text-xs text-gray-600">{label}</span>
              <span className="text-sm font-semibold tabular-nums text-gray-200">{hv}</span>
            </div>
          )
        })}

        {/* Records */}
        {(away?.homeRecord || home?.homeRecord) && (
          <>
            {(away?.homeRecord || home?.homeRecord) && (
              <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 items-center pt-1 border-t border-gray-800 mt-1">
                <span className="text-sm font-semibold text-gray-200 text-right">{away?.homeRecord ?? '—'}</span>
                <span className="w-20 text-center text-xs text-gray-600">Home Rec.</span>
                <span className="text-sm font-semibold text-gray-200">{home?.homeRecord ?? '—'}</span>
              </div>
            )}
            {(away?.awayRecord || home?.awayRecord) && (
              <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 items-center">
                <span className="text-sm font-semibold text-gray-200 text-right">{away?.awayRecord ?? '—'}</span>
                <span className="w-20 text-center text-xs text-gray-600">Away Rec.</span>
                <span className="text-sm font-semibold text-gray-200">{home?.awayRecord ?? '—'}</span>
              </div>
            )}
          </>
        )}

        {/* Streak & recent form */}
        {(away?.streak || home?.streak || away?.recentForm || home?.recentForm) && (
          <div className="pt-2 mt-1 border-t border-gray-800 grid grid-cols-2 gap-4">
            <div className="flex flex-col items-end gap-1">
              {away?.streak && (
                <span className="text-xs text-gray-500">
                  Streak: <span className="text-gray-300 font-semibold">{away.streak}</span>
                </span>
              )}
              {away?.recentForm && <RecentForm form={away.recentForm} />}
            </div>
            <div className="flex flex-col items-start gap-1">
              {home?.streak && (
                <span className="text-xs text-gray-500">
                  Streak: <span className="text-gray-300 font-semibold">{home.streak}</span>
                </span>
              )}
              {home?.recentForm && <RecentForm form={home.recentForm} />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function GameDetailsModalInner({ game, open, onClose, isFavoriteHome, isFavoriteAway, onToggleFavorite }: Props & { game: Game }) {
  const { summaryData, summaryLoading } = useGameSummary(open ? game : null)

  // Merge live ESPN summary data over whatever the base game object has
  const displayGame: Game = summaryData
    ? {
        ...game,
        homeLineup: summaryData.homeLineup ?? game.homeLineup,
        awayLineup: summaryData.awayLineup ?? game.awayLineup,
        probablePitchers: summaryData.probablePitchers ?? game.probablePitchers,
      }
    : game

  const isLive = displayGame.status === 'live'
  const isFinal = displayGame.status === 'final'

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 sm:p-6 lg:p-8">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:scale-95"
            >
              <DialogPanel className="relative w-full max-w-3xl rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl">
                {/* Header */}
                <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-gray-900 to-gray-950 px-6 pt-6 pb-4">
                  <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
                  >
                    <XMarkIcon className="size-5" />
                  </button>

                  <div className="flex items-center gap-2 mb-4">
                    <span className={classNames('rounded-full px-2.5 py-1 text-xs font-semibold', LEAGUE_COLORS[game.leagueId])}>
                      {game.leagueId}
                    </span>
                    <span className={classNames('rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', getStatusColor(game.status))}>
                      {isLive && game.period ? `${game.period}${game.clock ? ` · ${game.clock}` : ''}` : getStatusLabel(game.status)}
                    </span>
                  </div>

                  {/* Matchup */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Away */}
                    <div className="flex flex-1 flex-col items-center gap-2 text-center">
                      <TeamLogo logoUrl={game.awayTeam.logoUrl} name={game.awayTeam.name} />
                      <div>
                        <DialogTitle className="text-base font-bold text-gray-100">{game.awayTeam.name}</DialogTitle>
                        {game.awayTeam.ranking && <p className="text-xs text-indigo-400">Ranked #{game.awayTeam.ranking}</p>}
                        {game.awayTeam.record && <p className="text-sm text-gray-400">{game.awayTeam.record}</p>}
                      </div>
                      <FavoriteTeamButton teamId={game.awayTeam.id} teamName={game.awayTeam.name} isFavorite={isFavoriteAway} onToggle={onToggleFavorite} />
                    </div>

                    {/* Score / Time */}
                    <div className="flex flex-col items-center gap-1">
                      {(isLive || isFinal) ? (
                        <>
                          <div className="flex items-center gap-4">
                            <span className="text-4xl font-black tabular-nums text-gray-100">{game.awayScore ?? 0}</span>
                            <span className="text-lg text-gray-700">-</span>
                            <span className="text-4xl font-black tabular-nums text-gray-100">{game.homeScore ?? 0}</span>
                          </div>
                          {isLive && <span className="text-xs text-green-400 font-semibold animate-pulse">{game.period}</span>}
                          {isFinal && <span className="text-xs text-gray-500">Final</span>}
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-bold text-gray-100">{formatGameTime(game.startTime)}</p>
                          <p className="text-xs text-gray-500">AT</p>
                        </>
                      )}
                    </div>

                    {/* Home */}
                    <div className="flex flex-1 flex-col items-center gap-2 text-center">
                      <TeamLogo logoUrl={game.homeTeam.logoUrl} name={game.homeTeam.name} />
                      <div>
                        <p className="text-base font-bold text-gray-100">{game.homeTeam.name}</p>
                        {game.homeTeam.ranking && <p className="text-xs text-indigo-400">Ranked #{game.homeTeam.ranking}</p>}
                        {game.homeTeam.record && <p className="text-sm text-gray-400">{game.homeTeam.record}</p>}
                      </div>
                      <FavoriteTeamButton teamId={game.homeTeam.id} teamName={game.homeTeam.name} isFavorite={isFavoriteHome} onToggle={onToggleFavorite} />
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="divide-y divide-gray-800">
                  {/* Venue & Info */}
                  <div className="grid grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <MapPinIcon className="mt-0.5 size-4 shrink-0 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-200">{game.venue.name}</p>
                        <p className="text-xs text-gray-500">
                          {game.venue.city}{game.venue.state ? `, ${game.venue.state}` : ''} · {game.venue.country}
                        </p>
                        {game.venue.capacity && (
                          <p className="text-xs text-gray-600">Capacity {game.venue.capacity.toLocaleString()}</p>
                        )}
                      </div>
                    </div>

                    {game.broadcast && game.broadcast.length > 0 && (
                      <div className="flex items-start gap-2">
                        <TvIcon className="mt-0.5 size-4 shrink-0 text-gray-500" />
                        <div>
                          <p className="text-xs font-medium text-gray-400 mb-1">Broadcast</p>
                          <div className="flex flex-wrap gap-1">
                            {game.broadcast.map((b) => (
                              <span key={b} className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300">{b}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Weather */}
                  {game.weather && game.venue.isOutdoor && (
                    <div className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CloudIcon className="size-4 text-gray-500" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Weather</h3>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="text-center">
                          <p className="text-xl font-bold text-gray-100">{game.weather.tempF}°F</p>
                          <p className="text-xs text-gray-500">{game.weather.condition}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-100">{game.weather.windMph} mph</p>
                          <p className="text-xs text-gray-500">Wind {game.weather.windDir}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-100">{game.weather.humidity}%</p>
                          <p className="text-xs text-gray-500">Humidity</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-100">{game.weather.precipChance}%</p>
                          <p className="text-xs text-gray-500">Rain chance</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Team Stats Comparison */}
                  <TeamStatsComparison game={displayGame} />

                  {/* MLB Probable Pitchers */}
                  {displayGame.probablePitchers && (displayGame.probablePitchers.home || displayGame.probablePitchers.away) && (
                    <div className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Probable Pitchers</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {displayGame.probablePitchers.away && (
                          <div className="rounded-lg bg-gray-800/50 p-3">
                            <p className="text-xs text-gray-500 mb-1">{displayGame.awayTeam.abbreviation} (Away)</p>
                            <p className="text-sm font-semibold text-gray-100">{displayGame.probablePitchers.away.name}</p>
                            <p className="text-xs text-gray-500">{displayGame.probablePitchers.away.position}</p>
                            {displayGame.probablePitchers.away.stats && (
                              <div className="mt-1 flex flex-wrap gap-2">
                                {Object.entries(displayGame.probablePitchers.away.stats).map(([k, v]) => (
                                  <span key={k} className="text-xs tabular-nums">
                                    <span className="text-gray-600">{k} </span>
                                    <span className="text-gray-300 font-medium">{v}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {displayGame.probablePitchers.home && (
                          <div className="rounded-lg bg-gray-800/50 p-3">
                            <p className="text-xs text-gray-500 mb-1">{displayGame.homeTeam.abbreviation} (Home)</p>
                            <p className="text-sm font-semibold text-gray-100">{displayGame.probablePitchers.home.name}</p>
                            <p className="text-xs text-gray-500">{displayGame.probablePitchers.home.position}</p>
                            {displayGame.probablePitchers.home.stats && (
                              <div className="mt-1 flex flex-wrap gap-2">
                                {Object.entries(displayGame.probablePitchers.home.stats).map(([k, v]) => (
                                  <span key={k} className="text-xs tabular-nums">
                                    <span className="text-gray-600">{k} </span>
                                    <span className="text-gray-300 font-medium">{v}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Lineups */}
                  <LineupSection game={displayGame} loading={summaryLoading} />

                  {/* Odds */}
                  {displayGame.odds && displayGame.odds.length > 0 && (
                    <div className="px-6 py-4">
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Betting Odds</h3>
                      <OddsTable odds={displayGame.odds} homeTeam={displayGame.homeTeam} awayTeam={displayGame.awayTeam} />
                    </div>
                  )}

                  {/* Tickets */}
                  {displayGame.tickets && (
                    <div className="px-6 py-4">
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Tickets</h3>
                      <TicketPriceCard tickets={displayGame.tickets} />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="rounded-b-2xl border-t border-gray-800 px-6 py-3">
                  <button
                    onClick={onClose}
                    className="w-full rounded-lg bg-gray-800 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default function GameDetailsModal(props: Props) {
  // Hold onto the last opened game so the close transition can finish
  // rendering after `props.game` is cleared.
  const [lastGame, setLastGame] = useState<Game | null>(props.game)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (props.game) setLastGame(props.game)
  }, [props.game])

  const displayGame = props.game ?? lastGame
  if (!displayGame) return null

  return <GameDetailsModalInner {...props} game={displayGame} />
}
