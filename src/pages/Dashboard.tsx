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

const WINDOW_OPTIONS: UpcomingWindow[] = [3, 7, 14, 30]

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function groupGamesByDate(games: Game[]): { key: string; date: Date; games: Game[] }[] {
  const map = new Map<string, { date: Date; games: Game[] }>()
  for (const g of games) {
    const k = dayKey(g.startTime)
    if (!map.has(k)) map.set(k, { date: new Date(g.startTime), games: [] })
    map.get(k)!.games.push(g)
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, date: v.date, games: v.games }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

// One game per team: each team's earliest upcoming/live game.
function pickNextPerTeam(games: Game[]): Game[] {
  const eligible = games
    .filter((g) => g.status === 'scheduled' || g.status === 'live')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const seen = new Set<string>()
  const result: Game[] = []
  for (const g of eligible) {
    const homeNew = !seen.has(g.homeTeam.id)
    const awayNew = !seen.has(g.awayTeam.id)
    if (homeNew || awayNew) {
      result.push(g)
      seen.add(g.homeTeam.id)
      seen.add(g.awayTeam.id)
    }
  }
  return result
}

export default function Dashboard() {
  const [scheduleView, setScheduleView] = useState<ScheduleView>('day')
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [upcomingWindow, setUpcomingWindow] = useState<UpcomingWindow>(7)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [standingsOpen, setStandingsOpen] = useState(false)

  const dateYmd = useMemo(() => dateToYmd(selectedDate), [selectedDate])
  const isToday = useMemo(() => isSameDay(selectedDate, new Date()), [selectedDate])

  const gamesMode = useMemo(
    () =>
      scheduleView === 'day'
        ? ({ kind: 'day', dateYmd } as const)
        : ({ kind: 'range', daysAhead: upcomingWindow } as const),
    [scheduleView, dateYmd, upcomingWindow],
  )

  const { games, loading, error } = useGames(gamesMode)
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const { filters, filteredGames, toggleLeague, setSearch, toggleFavoritesOnly, toggleLiveOnly, setSortBy, resetFilters } =
    useFilters(games, favorites)

  // Apply next-per-team dedupe *after* filters so league/search/favorites narrow the team pool first.
  const displayGames = useMemo(
    () => (scheduleView === 'nextPerTeam' ? pickNextPerTeam(filteredGames) : filteredGames),
    [scheduleView, filteredGames],
  )

  const isMultiDay = scheduleView !== 'day'

  const [selectedGame, setSelectedGame] = useState<Game | null>(null)

  const liveCount = useMemo(() => games.filter((g) => g.status === 'live').length, [games])
  const favoritesGameCount = useMemo(
    () => games.filter((g) => isFavorite(g.homeTeam.id) || isFavorite(g.awayTeam.id)).length,
    [games, isFavorite],
  )

  const dateLabel = useMemo(() => {
    if (scheduleView === 'upcoming') return `Next ${upcomingWindow} days`
    if (scheduleView === 'nextPerTeam') return 'Next game per team'
    if (isToday) return "Today's Games"
    return `Games · ${formatDateShort(selectedDate)}`
  }, [scheduleView, upcomingWindow, isToday, selectedDate])

  const dateSubLabel = useMemo(() => {
    if (scheduleView === 'day') return formatDate(selectedDate.toISOString())
    if (scheduleView === 'upcoming') return 'All scheduled games in the window'
    return `One upcoming game per team · looking ahead ${upcomingWindow} days`
  }, [scheduleView, selectedDate, upcomingWindow])

  function prevDay() {
    setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n })
  }
  function nextDay() {
    setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n })
  }

  const canGoNext = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return selectedDate < tomorrow
  }, [selectedDate])

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
        onOpenStandings={() => setStandingsOpen(true)}
        totalGames={games.length}
        liveCount={liveCount}
        favoritesCount={favoritesGameCount}
      />

      {/* Main content */}
      <div className="xl:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Schedule view mode toggle */}
              <div className="flex items-center rounded-lg border border-gray-700 overflow-hidden text-xs">
                {([
                  { id: 'day', label: 'Day' },
                  { id: 'upcoming', label: 'Upcoming' },
                  { id: 'nextPerTeam', label: 'Next per team' },
                ] as { id: ScheduleView; label: string }[]).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setScheduleView(opt.id)}
                    className={`px-2.5 py-1.5 font-medium transition-colors ${
                      scheduleView === opt.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Day mode: date navigation */}
              {scheduleView === 'day' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevDay}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
                    title="Previous day"
                  >
                    <ChevronLeftIcon className="size-4" />
                  </button>
                  <div>
                    <h1 className="text-xl font-black text-gray-100">{dateLabel}</h1>
                    <p className="text-xs text-gray-500">{dateSubLabel}</p>
                  </div>
                  <button
                    onClick={nextDay}
                    disabled={!canGoNext}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next day"
                  >
                    <ChevronRightIcon className="size-4" />
                  </button>
                </div>
              )}

              {/* Multi-day modes: label + window selector */}
              {isMultiDay && (
                <div className="flex items-center gap-2">
                  <div>
                    <h1 className="text-xl font-black text-gray-100">{dateLabel}</h1>
                    <p className="text-xs text-gray-500">{dateSubLabel}</p>
                  </div>
                  <label className="sr-only" htmlFor="upcoming-window">Window</label>
                  <select
                    id="upcoming-window"
                    value={upcomingWindow}
                    onChange={(e) => setUpcomingWindow(Number(e.target.value) as UpcomingWindow)}
                    className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 hover:border-gray-600 focus:border-indigo-500 focus:outline-none"
                  >
                    {WINDOW_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n} days</option>
                    ))}
                  </select>
                </div>
              )}

              {scheduleView === 'day' && !isToday && (
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                >
                  Back to today
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {liveCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 ring-1 ring-green-500/30">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                  </span>
                  <span className="text-xs font-semibold text-green-400">{liveCount} Live</span>
                </div>
              )}
              <div className="text-xs text-gray-600">
                {displayGames.length} of {games.length} games
              </div>

              {/* View toggle */}
              <div className="flex items-center rounded-lg border border-gray-700 overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}
                  title="Grid view"
                >
                  <Squares2X2Icon className="size-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}
                  title="List view"
                >
                  <ListBulletIcon className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active filter indicators */}
          {(filters.leagues.length > 0 || filters.search || filters.favoritesOnly || filters.liveOnly) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-600">Filtering:</span>
              {filters.favoritesOnly && (
                <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">⭐ Favorites</span>
              )}
              {filters.liveOnly && (
                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">🔴 Live</span>
              )}
              {filters.search && (
                <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">"{filters.search}"</span>
              )}
              {filters.leagues.map((l) => (
                <span key={l} className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">{l}</span>
              ))}
              <button onClick={resetFilters} className="text-xs text-indigo-400 hover:text-indigo-300 underline">
                Clear all
              </button>
            </div>
          )}
        </header>

        {/* Score Ticker — only meaningful in day mode */}
        {scheduleView === 'day' && games.length > 0 && !loading && (
          <ScoreTicker games={games} onGameClick={(g) => setSelectedGame(g)} />
        )}

        {/* Content */}
        <main className="px-4 py-6 sm:px-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-gray-500 animate-pulse">
                {scheduleView === 'day'
                  ? isToday ? "Loading today's games..." : `Loading games for ${formatDateShort(selectedDate)}...`
                  : `Loading the next ${upcomingWindow} days of games...`}
              </p>
            </div>
          )}

          {error && !loading && (
            <EmptyState
              title="Failed to load games"
              description={error}
              action={
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Try Again
                </button>
              }
            />
          )}

          {!loading && !error && displayGames.length === 0 && (
            <EmptyState
              title={
                scheduleView === 'nextPerTeam'
                  ? 'No upcoming games found'
                  : scheduleView === 'upcoming'
                  ? `No games scheduled in the next ${upcomingWindow} days`
                  : games.length === 0 && !isToday
                  ? `No games on ${formatDateShort(selectedDate)}`
                  : 'No games found'
              }
              description={
                scheduleView === 'nextPerTeam'
                  ? `No teams have a game in the next ${upcomingWindow} days. Try a longer window.`
                  : scheduleView === 'upcoming'
                  ? 'Try a longer window or different league filter.'
                  : games.length === 0 && !isToday
                  ? 'No games were scheduled for this date. Try another day.'
                  : filters.favoritesOnly
                  ? "None of your favorite teams are playing today. Star a team on any game card to add it."
                  : filters.liveOnly
                  ? "No games are live right now. Check back soon!"
                  : filters.leagues.length > 0 || filters.search
                  ? "No games match your current filters."
                  : "No games scheduled for today."
              }
              action={
                scheduleView === 'day' && games.length === 0 && !isToday ? (
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                  >
                    Back to Today
                  </button>
                ) : (filters.leagues.length > 0 || filters.search || filters.favoritesOnly || filters.liveOnly) ? (
                  <button
                    onClick={resetFilters}
                    className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
                  >
                    Reset Filters
                  </button>
                ) : undefined
              }
            />
          )}

          {!loading && !error && displayGames.length > 0 && !isMultiDay && (() => {
            const favoriteGames = displayGames.filter(
              (g) => isFavorite(g.homeTeam.id) || isFavorite(g.awayTeam.id),
            )
            const otherGames = displayGames.filter(
              (g) => !isFavorite(g.homeTeam.id) && !isFavorite(g.awayTeam.id),
            )
            const showFavoritesSection = !filters.favoritesOnly && favoriteGames.length > 0

            if (viewMode === 'list') {
              return (
                <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                  {showFavoritesSection && (
                    <>
                      <div className="px-4 py-2 border-b border-gray-800 bg-yellow-500/5">
                        <span className="text-xs font-semibold text-yellow-400">⭐ Favorite Teams</span>
                      </div>
                      {favoriteGames.map((game) => (
                        <GameListItem
                          key={game.id}
                          game={game}
                          isFavoriteHome={isFavorite(game.homeTeam.id)}
                          isFavoriteAway={isFavorite(game.awayTeam.id)}
                          onToggleFavorite={toggleFavorite}
                          onClick={() => setSelectedGame(game)}
                        />
                      ))}
                      {otherGames.length > 0 && (
                        <div className="px-4 py-2 border-b border-gray-800 bg-gray-800/30">
                          <span className="text-xs font-semibold text-gray-500">All Games</span>
                        </div>
                      )}
                    </>
                  )}
                  {(showFavoritesSection ? otherGames : displayGames).map((game) => (
                    <GameListItem
                      key={game.id}
                      game={game}
                      isFavoriteHome={isFavorite(game.homeTeam.id)}
                      isFavoriteAway={isFavorite(game.awayTeam.id)}
                      onToggleFavorite={toggleFavorite}
                      onClick={() => setSelectedGame(game)}
                    />
                  ))}
                </div>
              )
            }

            return (
              <>
                {showFavoritesSection && (
                  <section className="mb-8">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-400">
                      <span>⭐</span> Favorite Teams Playing Today
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                      {favoriteGames.map((game) => (
                        <GameCard
                          key={game.id}
                          game={game}
                          isFavoriteHome={isFavorite(game.homeTeam.id)}
                          isFavoriteAway={isFavorite(game.awayTeam.id)}
                          onToggleFavorite={toggleFavorite}
                          onClick={() => setSelectedGame(game)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  {showFavoritesSection && otherGames.length > 0 && (
                    <h2 className="mb-3 text-sm font-semibold text-gray-400">All Games</h2>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {(showFavoritesSection ? otherGames : displayGames).map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        isFavoriteHome={isFavorite(game.homeTeam.id)}
                        isFavoriteAway={isFavorite(game.awayTeam.id)}
                        onToggleFavorite={toggleFavorite}
                        onClick={() => setSelectedGame(game)}
                      />
                    ))}
                  </div>
                </section>
              </>
            )
          })()}

          {/* Multi-day grouping (Upcoming + Next per team) */}
          {!loading && !error && displayGames.length > 0 && isMultiDay && (
            <div className="space-y-8">
              {groupGamesByDate(displayGames).map(({ key, date, games: dayGames }) => (
                <section key={key}>
                  <div className="mb-3 flex items-baseline gap-2 border-b border-gray-800 pb-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">
                      {formatDateShort(date)}
                    </h2>
                    <span className="text-xs text-gray-600">
                      {formatDate(date.toISOString())} · {dayGames.length} {dayGames.length === 1 ? 'game' : 'games'}
                    </span>
                  </div>

                  {viewMode === 'list' ? (
                    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                      {dayGames.map((game) => (
                        <GameListItem
                          key={game.id}
                          game={game}
                          isFavoriteHome={isFavorite(game.homeTeam.id)}
                          isFavoriteAway={isFavorite(game.awayTeam.id)}
                          onToggleFavorite={toggleFavorite}
                          onClick={() => setSelectedGame(game)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                      {dayGames.map((game) => (
                        <GameCard
                          key={game.id}
                          game={game}
                          isFavoriteHome={isFavorite(game.homeTeam.id)}
                          isFavoriteAway={isFavorite(game.awayTeam.id)}
                          onToggleFavorite={toggleFavorite}
                          onClick={() => setSelectedGame(game)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          {!loading && !error && displayGames.length > 0 && (
            <p className="mt-8 text-center text-xs text-gray-700">
              Odds are for informational purposes only and are not betting advice. Prices and data may be delayed.
            </p>
          )}
        </main>
      </div>

      {/* Game Details Modal */}
      <GameDetailsModal
        game={selectedGame}
        open={selectedGame !== null}
        onClose={() => setSelectedGame(null)}
        isFavoriteHome={selectedGame ? isFavorite(selectedGame.homeTeam.id) : false}
        isFavoriteAway={selectedGame ? isFavorite(selectedGame.awayTeam.id) : false}
        onToggleFavorite={toggleFavorite}
      />

      {/* Standings Panel */}
      <StandingsPanel open={standingsOpen} onClose={() => setStandingsOpen(false)} />
    </div>
  )
}
