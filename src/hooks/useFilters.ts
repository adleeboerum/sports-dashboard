import { useState, useMemo } from 'react'
import type { Game, FilterState, LeagueId } from '../types'

const DEFAULTS: FilterState = {
  leagues: [],
  search: '',
  favoritesOnly: false,
  liveOnly: false,
  sortBy: 'time',
}

export function useFilters(games: Game[], favorites: Set<string>) {
  const [filters, setFilters] = useState<FilterState>(DEFAULTS)

  const filteredGames = useMemo(() => {
    let out = [...games]

    if (filters.leagues.length > 0) {
      out = out.filter((g) => filters.leagues.includes(g.leagueId))
    }

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      out = out.filter((g) =>
        g.homeTeam.name.toLowerCase().includes(q) ||
        g.awayTeam.name.toLowerCase().includes(q) ||
        g.homeTeam.abbreviation.toLowerCase().includes(q) ||
        g.awayTeam.abbreviation.toLowerCase().includes(q) ||
        g.leagueId.toLowerCase().includes(q),
      )
    }

    if (filters.favoritesOnly) out = out.filter((g) => favorites.has(g.homeTeam.id) || favorites.has(g.awayTeam.id))
    if (filters.liveOnly)      out = out.filter((g) => g.status === 'live')

    out.sort((a, b) => {
      const aFav = favorites.has(a.homeTeam.id) || favorites.has(a.awayTeam.id) ? 0 : 1
      const bFav = favorites.has(b.homeTeam.id) || favorites.has(b.awayTeam.id) ? 0 : 1
      if (aFav !== bFav) return aFav - bFav
      switch (filters.sortBy) {
        case 'time':    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        case 'league':  return a.leagueId.localeCompare(b.leagueId)
        case 'odds':    return ((a.odds?.length ?? 0) > 0 ? 0 : 1) - ((b.odds?.length ?? 0) > 0 ? 0 : 1)
        case 'tickets': return (a.tickets?.lowestPrice ?? 99999) - (b.tickets?.lowestPrice ?? 99999)
        default:        return 0
      }
    })

    return out
  }, [games, filters, favorites])

  const toggleLeague        = (league: LeagueId) => setFilters((f) => ({ ...f, leagues: f.leagues.includes(league) ? f.leagues.filter((l) => l !== league) : [...f.leagues, league] }))
  const setSearch           = (search: string)   => setFilters((f) => ({ ...f, search }))
  const toggleFavoritesOnly = ()                  => setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))
  const toggleLiveOnly      = ()                  => setFilters((f) => ({ ...f, liveOnly: !f.liveOnly }))
  const setSortBy           = (sortBy: FilterState['sortBy']) => setFilters((f) => ({ ...f, sortBy }))
  const resetFilters        = ()                  => setFilters(DEFAULTS)

  return { filters, filteredGames, toggleLeague, setSearch, toggleFavoritesOnly, toggleLiveOnly, setSortBy, resetFilters }
}
