import { useState, useMemo } from 'react'
import { useGames } from '../hooks/useGames'
import { useFavorites } from '../hooks/useFavorites'
import { useFilters } from '../hooks/useFilters'
import Sidebar from '../components/Sidebar'
import GameCard from '../components/GameCard'
import GameDetailsModal from '../components/GameDetailsModal'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import type { Game } from '../types'
import { formatDate } from '../utils/formatters'

export default function Dashboard() {
  const { games, loading, error } = useGames()
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const { filters, filteredGames, toggleLeague, setSearch, toggleFavoritesOnly, toggleLiveOnly, setSortBy, resetFilters } =
    useFilters(games, favorites)

  const [selectedGame, setSelectedGame] = useState<Game | null>(null)

  const liveCount = useMemo(() => games.filter((g) => g.status === 'live').length, [games])
  const favoritesGameCount = useMemo(
    () => games.filter((g) => isFavorite(g.homeTeam.id) || isFavorite(g.awayTeam.id)).length,
    [games, isFavorite],
  )

  const today = useMemo(() => formatDate(new Date().toISOString()), [])

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
        totalGames={games.length}
        liveCount={liveCount}
        favoritesCount={favoritesGameCount}
      />

      {/* Main content */}
      <div className="xl:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-gray-100">Today's Games</h1>
              <p className="text-xs text-gray-500">{today}</p>
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
                {filteredGames.length} of {games.length} games
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

        {/* Content */}
        <main className="px-4 py-6 sm:px-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-gray-500 animate-pulse">Loading today's games...</p>
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

          {!loading && !error && filteredGames.length === 0 && (
            <EmptyState
              title="No games found"
              description={
                filters.favoritesOnly
                  ? "None of your favorite teams are playing today. Star a team on any game card to add it."
                  : filters.liveOnly
                  ? "No games are live right now. Check back soon!"
                  : filters.leagues.length > 0 || filters.search
                  ? "No games match your current filters."
                  : "No games scheduled for today."
              }
              action={
                (filters.leagues.length > 0 || filters.search || filters.favoritesOnly || filters.liveOnly) ? (
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

          {!loading && !error && filteredGames.length > 0 && (() => {
            const favoriteGames = filteredGames.filter(
              (g) => isFavorite(g.homeTeam.id) || isFavorite(g.awayTeam.id),
            )
            const otherGames = filteredGames.filter(
              (g) => !isFavorite(g.homeTeam.id) && !isFavorite(g.awayTeam.id),
            )
            const showFavoritesSection = !filters.favoritesOnly && favoriteGames.length > 0

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
                    {(showFavoritesSection ? otherGames : filteredGames).map((game) => (
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

          {/* Disclaimer */}
          {!loading && !error && filteredGames.length > 0 && (
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
    </div>
  )
}
