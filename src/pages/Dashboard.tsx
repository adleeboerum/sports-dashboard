import { useState, useMemo } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline'
import { useGames } from '../hooks/useGames'
import { useFavorites } from '../hooks/useFavorites'
import { useFilters } from '../hooks/useFilters'
import Sidebar from '../components/Sidebar'
import GameCard from '../components/GameCard'
import GameListItem from '../components/GameListItem'
import GameDetailsModal from '../components/GameDetailsModal'
import ScoreTicker from '../components/ScoreTicker'
import StandingsPanel from '../components/StandingsPanel'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import type { Game, ScheduleView, UpcomingWindow, ViewMode } from '../types'
import { formatDate, formatDateShort, dateToYmd } from '../utils/formatters'

const DAY_OPTIONS: UpcomingWindow[] = [3, 7, 14, 30]

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function groupByDate(games: Game[]): { key: string; date: Date; games: Game[] }[] {
  const map = new Map<string, { date: Date; games: Game[] }>()
  for (const g of games) {
    const k = dateKey(g.startTime)
    if (!map.has(k)) map.set(k, { date: new Date(g.startTime), games: [] })
    map.get(k)!.games.push(g)
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, date: v.date, games: v.games }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

function nextPerTeam(games: Game[]): Game[] {
  const eligible = games
    .filter((g) => g.status === 'scheduled' || g.status === 'live')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const seen = new Set<string>()
  const out: Game[] = []
  for (const g of eligible) {
    const homeNew = !seen.has(g.homeTeam.id)
    const awayNew = !seen.has(g.awayTeam.id)
    if (homeNew || awayNew) {
      out.push(g)
      seen.add(g.homeTeam.id)
      seen.add(g.awayTeam.id)
    }
  }
  return out
}

interface Props { onOpenPredictions: () => void }

export default function Dashboard({ onOpenPredictions }: Props) {
  const [view, setView]               = useState<ScheduleView>('day')
  const [date, setDate]               = useState(() => new Date())
  const [days, setDays]               = useState<UpcomingWindow>(7)
  const [layout, setLayout]           = useState<ViewMode>('grid')
  const [showStandings, setShowStandings] = useState(false)
  const [selected, setSelected]       = useState<Game | null>(null)

  const ymd    = useMemo(() => dateToYmd(date), [date])
  const today  = useMemo(() => sameDay(date, new Date()), [date])

  const mode = useMemo(
    () => view === 'day' ? ({ kind: 'day', dateYmd: ymd } as const) : ({ kind: 'range', daysAhead: days } as const),
    [view, ymd, days],
  )

  const { games, loading, error, oddsWarning } = useGames(mode)
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const { filters, filteredGames, toggleLeague, setSearch, toggleFavoritesOnly, toggleLiveOnly, setSortBy, resetFilters } =
    useFilters(games, favorites)

  const shown    = useMemo(() => view === 'nextPerTeam' ? nextPerTeam(filteredGames) : filteredGames, [view, filteredGames])
  const multiDay = view !== 'day'
  const live     = useMemo(() => games.filter((g) => g.status === 'live').length, [games])
  const favCount = useMemo(() => games.filter((g) => isFavorite(g.homeTeam.id) || isFavorite(g.awayTeam.id)).length, [games, isFavorite])

  const title = useMemo(() => {
    if (view === 'upcoming')    return `Next ${days} days`
    if (view === 'nextPerTeam') return 'Next game per team'
    if (today) return "Today's Games"
    return `Games · ${formatDateShort(date)}`
  }, [view, days, today, date])

  const sub = useMemo(() => {
    if (view === 'day')         return formatDate(date.toISOString())
    if (view === 'upcoming')    return 'All scheduled games in the window'
    return `One upcoming game per team · looking ahead ${days} days`
  }, [view, date, days])

  function prevDate() { setDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n }) }
  function nextDate() { setDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n }) }

  const canNext = useMemo(() => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    return date < tomorrow
  }, [date])

  return (
    <div className="min-h-full">
      <Sidebar
        filters={filters}
        onToggleLeague={toggleLeague}
        onSetSearch={setSearch}
        onToggleFavoritesOnly={toggleFavoritesOnly}
        onToggleLiveOnly={toggleLiveOnly}
        onSetSortBy={setSortBy}
        onReset={resetFilters}
        onOpenStandings={() => setShowStandings(true)}
        onOpenPredictions={onOpenPredictions}
        totalGames={games.length}
        liveCount={live}
        favoritesCount={favCount}
      />

      <div className="xl:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* View toggle */}
              <div className="flex items-center rounded-lg border border-gray-700 overflow-hidden text-xs">
                {([
                  { id: 'day',         label: 'Day' },
                  { id: 'upcoming',    label: 'Upcoming' },
                  { id: 'nextPerTeam', label: 'Next per team' },
                ] as { id: ScheduleView; label: string }[]).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setView(opt.id)}
                    className={`px-2.5 py-1.5 font-medium transition-colors ${view === opt.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Day nav */}
              {view === 'day' && (
                <div className="flex items-center gap-1">
                  <button onClick={prevDate} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors" title="Previous day">
                    <ChevronLeftIcon className="size-4" />
                  </button>
                  <div>
                    <h1 className="text-xl font-black text-gray-100">{title}</h1>
                    <p className="text-xs text-gray-500">{sub}</p>
                  </div>
                  <button onClick={nextDate} disabled={!canNext} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Next day">
                    <ChevronRightIcon className="size-4" />
                  </button>
                </div>
              )}

              {/* Multi-day label + window selector */}
              {multiDay && (
                <div className="flex items-center gap-2">
                  <div>
                    <h1 className="text-xl font-black text-gray-100">{title}</h1>
                    <p className="text-xs text-gray-500">{sub}</p>
                  </div>
                  <label className="sr-only" htmlFor="day-window">Window</label>
                  <select
                    id="day-window"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value) as UpcomingWindow)}
                    className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 hover:border-gray-600 focus:border-indigo-500 focus:outline-none"
                  >
                    {DAY_OPTIONS.map((n) => <option key={n} value={n}>{n} days</option>)}
                  </select>
                </div>
              )}

              {view === 'day' && !today && (
                <button onClick={() => setDate(new Date())} className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                  Back to today
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {live > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 ring-1 ring-green-500/30">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                  </span>
                  <span className="text-xs font-semibold text-green-400">{live} Live</span>
                </div>
              )}
              <div className="text-xs text-gray-600">{shown.length} of {games.length} games</div>
              <div className="flex items-center rounded-lg border border-gray-700 overflow-hidden">
                <button onClick={() => setLayout('grid')} className={`p-1.5 transition-colors ${layout === 'grid' ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`} title="Grid view">
                  <Squares2X2Icon className="size-4" />
                </button>
                <button onClick={() => setLayout('list')} className={`p-1.5 transition-colors ${layout === 'list' ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`} title="List view">
                  <ListBulletIcon className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {(filters.leagues.length > 0 || filters.search || filters.favoritesOnly || filters.liveOnly) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-600">Filtering:</span>
              {filters.favoritesOnly && <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">⭐ Favorites</span>}
              {filters.liveOnly      && <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">🔴 Live</span>}
              {filters.search        && <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">"{filters.search}"</span>}
              {filters.leagues.map((l) => <span key={l} className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">{l}</span>)}
              <button onClick={resetFilters} className="text-xs text-indigo-400 hover:text-indigo-300 underline">Clear all</button>
            </div>
          )}
        </header>

        {/* Odds warning */}
        {oddsWarning && !loading && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300 sm:px-6">
            <span className="font-semibold">Limited odds data:</span>{' '}
            {oddsWarning.kind === 'quota-exceeded'
              ? 'The Odds API quota is exhausted. Spread/total prices may be missing — refill or rotate VITE_ODDS_API_KEY to restore full odds.'
              : `Odds enrichment failed (${oddsWarning.message}). Showing ESPN data only.`}
          </div>
        )}

        {/* Score ticker */}
        {view === 'day' && games.length > 0 && !loading && (
          <ScoreTicker games={games} onGameClick={(g) => setSelected(g)} />
        )}

        <main className="px-4 py-6 sm:px-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-gray-500 animate-pulse">
                {view === 'day'
                  ? today ? "Loading today's games..." : `Loading games for ${formatDateShort(date)}...`
                  : `Loading the next ${days} days of games...`}
              </p>
            </div>
          )}

          {error && !loading && (
            <EmptyState
              title="Failed to load games"
              description={error}
              action={<button onClick={() => window.location.reload()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Try Again</button>}
            />
          )}

          {!loading && !error && shown.length === 0 && (
            <EmptyState
              title={
                view === 'nextPerTeam' ? 'No upcoming games found'
                : view === 'upcoming'  ? `No games scheduled in the next ${days} days`
                : games.length === 0 && !today ? `No games on ${formatDateShort(date)}`
                : 'No games found'
              }
              description={
                view === 'nextPerTeam' ? `No teams have a game in the next ${days} days. Try a longer window.`
                : view === 'upcoming'  ? 'Try a longer window or different league filter.'
                : games.length === 0 && !today ? 'No games were scheduled for this date. Try another day.'
                : filters.favoritesOnly ? "None of your favorite teams are playing today. Star a team on any game card to add it."
                : filters.liveOnly      ? "No games are live right now. Check back soon!"
                : filters.leagues.length > 0 || filters.search ? "No games match your current filters."
                : "No games scheduled for today."
              }
              action={
                view === 'day' && games.length === 0 && !today ? (
                  <button onClick={() => setDate(new Date())} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Back to Today</button>
                ) : (filters.leagues.length > 0 || filters.search || filters.favoritesOnly || filters.liveOnly) ? (
                  <button onClick={resetFilters} className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">Reset Filters</button>
                ) : undefined
              }
            />
          )}

          {/* Single-day grid/list */}
          {!loading && !error && shown.length > 0 && !multiDay && (() => {
            const favGames = shown.filter((g) => isFavorite(g.homeTeam.id) || isFavorite(g.awayTeam.id))
            const rest     = shown.filter((g) => !isFavorite(g.homeTeam.id) && !isFavorite(g.awayTeam.id))
            const hasFavs  = !filters.favoritesOnly && favGames.length > 0

            if (layout === 'list') {
              return (
                <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                  {hasFavs && (
                    <>
                      <div className="px-4 py-2 border-b border-gray-800 bg-yellow-500/5">
                        <span className="text-xs font-semibold text-yellow-400">⭐ Favorite Teams</span>
                      </div>
                      {favGames.map((g) => (
                        <GameListItem key={g.id} game={g} isFavoriteHome={isFavorite(g.homeTeam.id)} isFavoriteAway={isFavorite(g.awayTeam.id)} onToggleFavorite={toggleFavorite} onClick={() => setSelected(g)} />
                      ))}
                      {rest.length > 0 && (
                        <div className="px-4 py-2 border-b border-gray-800 bg-gray-800/30">
                          <span className="text-xs font-semibold text-gray-500">All Games</span>
                        </div>
                      )}
                    </>
                  )}
                  {(hasFavs ? rest : shown).map((g) => (
                    <GameListItem key={g.id} game={g} isFavoriteHome={isFavorite(g.homeTeam.id)} isFavoriteAway={isFavorite(g.awayTeam.id)} onToggleFavorite={toggleFavorite} onClick={() => setSelected(g)} />
                  ))}
                </div>
              )
            }

            return (
              <>
                {hasFavs && (
                  <section className="mb-8">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-400"><span>⭐</span> Favorite Teams Playing Today</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                      {favGames.map((g) => (
                        <GameCard key={g.id} game={g} isFavoriteHome={isFavorite(g.homeTeam.id)} isFavoriteAway={isFavorite(g.awayTeam.id)} onToggleFavorite={toggleFavorite} onClick={() => setSelected(g)} />
                      ))}
                    </div>
                  </section>
                )}
                <section>
                  {hasFavs && rest.length > 0 && <h2 className="mb-3 text-sm font-semibold text-gray-400">All Games</h2>}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {(hasFavs ? rest : shown).map((g) => (
                      <GameCard key={g.id} game={g} isFavoriteHome={isFavorite(g.homeTeam.id)} isFavoriteAway={isFavorite(g.awayTeam.id)} onToggleFavorite={toggleFavorite} onClick={() => setSelected(g)} />
                    ))}
                  </div>
                </section>
              </>
            )
          })()}

          {/* Multi-day grouped view */}
          {!loading && !error && shown.length > 0 && multiDay && (
            <div className="space-y-8">
              {groupByDate(shown).map(({ key, date: d, games: dayGames }) => (
                <section key={key}>
                  <div className="mb-3 flex items-baseline gap-2 border-b border-gray-800 pb-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">{formatDateShort(d)}</h2>
                    <span className="text-xs text-gray-600">{formatDate(d.toISOString())} · {dayGames.length} {dayGames.length === 1 ? 'game' : 'games'}</span>
                  </div>
                  {layout === 'list' ? (
                    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                      {dayGames.map((g) => (
                        <GameListItem key={g.id} game={g} isFavoriteHome={isFavorite(g.homeTeam.id)} isFavoriteAway={isFavorite(g.awayTeam.id)} onToggleFavorite={toggleFavorite} onClick={() => setSelected(g)} />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                      {dayGames.map((g) => (
                        <GameCard key={g.id} game={g} isFavoriteHome={isFavorite(g.homeTeam.id)} isFavoriteAway={isFavorite(g.awayTeam.id)} onToggleFavorite={toggleFavorite} onClick={() => setSelected(g)} />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}

          {!loading && !error && shown.length > 0 && (
            <p className="mt-8 text-center text-xs text-gray-700">
              Odds are for informational purposes only. Prices and data may be delayed.
            </p>
          )}
        </main>
      </div>

      <GameDetailsModal
        game={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        isFavoriteHome={selected ? isFavorite(selected.homeTeam.id) : false}
        isFavoriteAway={selected ? isFavorite(selected.awayTeam.id) : false}
        onToggleFavorite={toggleFavorite}
      />
      <StandingsPanel open={showStandings} onClose={() => setShowStandings(false)} />
    </div>
  )
}
