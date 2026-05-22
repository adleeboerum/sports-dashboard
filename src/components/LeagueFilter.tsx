import type { LeagueId } from '../types'
import { LEAGUES, LEAGUE_COLORS } from '../data/mockData'

interface Props {
  selectedLeagues: LeagueId[]
  onToggle: (league: LeagueId) => void
}

export default function LeagueFilter({ selectedLeagues, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {LEAGUES.map((league) => {
        const active = selectedLeagues.includes(league.id)
        return (
          <button
            key={league.id}
            onClick={() => onToggle(league.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-all ${
              active
                ? `${LEAGUE_COLORS[league.id]} ring-current`
                : 'bg-gray-800 text-gray-400 ring-gray-700 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {league.shortName}
          </button>
        )
      })}
    </div>
  )
}
