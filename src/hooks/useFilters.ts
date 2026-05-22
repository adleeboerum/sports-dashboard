import { useState, useMemo } from 'react'
import type { Game, FilterState, LeagueId } from '../types'

const DEFAULT_FILTERS: FilterState = {
  leagues: [],
  search: '',
  favoritesOnly: false,
  liveOnly: false,
  sortBy: 'time',
}

export function useFilters(games: Game[], favorites: Set<string>) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)

  const filteredGames = useMemo(() => {
    let result = [...games]

    if (filters.leagues.length > 0) {
      result = result.filter((g) => filters.leagues.includes(g.leagueId))
    }

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (g) =>
          g.homeTeam.name.toLowerCase().includes(q) ||
          g.awayTeam.name.toLowerCase().includes(q) ||
          g.homeTeam.abbreviation.toLowerCase().includes(q) ||
          g.awayTeam.abbreviation.toLowerCase().includes(q) ||
          g.leagueId.toLowerCase().includes(q),
      )
    }

    if (filters.favoritesOnly) {
      result = result.filter((g) => favorites.has(g.homeTeam.id) || favorites.has(g.awayTeam.id))
    }

    if (filters.liveOnly) {
      result = result.filter((g) => g.status === 'live')
    }

    result.sort((a, b) => {
      const aFav = favorites.has(a.homeTeam.id) || favorites.has(a.awayTeam.id) ? 0 : 1
      const bFav = favorites.has(b.homeTeam.id) || favorites.has(b.awayTeam.id) ? 0 : 1
      if (aFav !== bFav) return aFav - bFav

      switch (filters.sortBy) {
        case 'time':
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        case 'league':
          return a.leagueId.localeCompare(b.leagueId)
        case 'odds': {
          const aHas = (a.odds?.length ?? 0) > 0 ? 0 : 1
          const bHas = (b.odds?.length ?? 0) > 0 ? 0 : 1
          return aHas - bHas
        }
        case 'tickets':
          return (a.tickets?.lowestPrice ?? 99999) - (b.tickets?.lowestPrice ?? 99999)
        default:
          return 0
      }
    })

    return result
  }, [games, filters, favorites])

  function toggleLeague(league: LeagueId) {
    setFilters((f) => ({
      ...f,
      leagues: f.leagues.includes(league) ? f.leagues.filter((l) => l !== league) : [...f.leagues, league],
    }))
  }

  function setSearch(search: string) {
    setFilters((f) => ({ ...f, search }))
  }

  function toggleFavoritesOnly() {
    setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))
  }

  function toggleLiveOnly() {
    setFilters((f) => ({ ...f, liveOnly: !f.liveOnly }))
  }

  function setSortBy(sortBy: FilterState['sortBy']) {
    setFilters((f) => ({ ...f, sortBy }))
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  return { filters, filteredGames, toggleLeague, setSearch, toggleFavoritesOnly, toggleLiveOnly, setSortBy, resetFilters }
}
