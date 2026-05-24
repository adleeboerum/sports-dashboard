import { useMemo, useState } from 'react'
import { AdjustmentsHorizontalIcon, ArrowLeftIcon, BeakerIcon } from '@heroicons/react/24/outline'
import { useGames } from '../hooks/useGames'
import { useFavorites } from '../hooks/useFavorites'
import { usePredictions } from '../hooks/usePredictions'
import PredictionCard from '../components/PredictionCard'
import GameDetailsModal from '../components/GameDetailsModal'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import type { BetMarket, Game, LeagueId, UpcomingWindow } from '../types'
import { classNames } from '../utils/formatters'
import { LEAGUE_COLORS } from '../utils/leagues'

interface Props {
  onBack: () => void
  onOpenBacktest: () => void
}

const DAY_OPTIONS: UpcomingWindow[] = [3, 7, 14]
const LEAGUE_OPTIONS: LeagueId[] = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'MLS', 'EPL']
const MARKET_OPTIONS: { id: BetMarket | 'all'; label: string }[] = [
  { id: 'all',        label: 'All markets' },
  { id: 'moneyline',  label: 'Moneyline'   },
  { id: 'spread',     label: 'Spread'      },
  { id: 'total',      label: 'Total'       },
]

export default function Predictions({ onBack, onOpenBacktest }: Props) {
  const [days, setDays]         = useState<UpcomingWindow>(7)
  const [league, setLeague]     = useState<LeagueId | 'all'>('all')
  const [market, setMarket]     = useState<BetMarket | 'all'>('all')
  const [minConf, setMinConf]   = useState(0)
  const [selected, setSelected] = useState<Game | null>(null)

  const { games, loading, error } = useGames({ kind: 'range', daysAhead: days })
  const { toggleFavorite, isFavorite } = useFavorites()
  const predicted = usePredictions(games)

  const filtered = useMemo(() => {
    return predicted
      .filter((p) => league === 'all' || p.game.leagueId === league)
      .filter((p) => p.prediction.confidence >= minConf)
      .map((p) => {
        if (market === 'all') return p
        const scoped = p.prediction.edges.filter((e) => e.side.market === market && e.edge > 0)
        const best   = scoped.reduce<typeof scoped[number] | undefined>(
          (acc, e) => (!acc || e.edge > acc.edge ? e : acc), undefined,
        )
        return { ...p, prediction: { ...p.prediction, bestEdge: best } }
      })
      .sort((a, b) => (b.prediction.bestEdge?.edge ?? -1) - (a.prediction.bestEdge?.edge ?? -1))
  }, [predicted, league, market, minConf])

  const topPlays = filtered.filter((p) => p.prediction.bestEdge && p.prediction.bestEdge.value >= 4)
  const rest     = filtered.filter((p) => !p.prediction.bestEdge || p.prediction.bestEdge.value < 4)

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors">
            <ArrowLeftIcon className="size-4" />
            Back to dashboard
          </button>
          <button onClick={onOpenBacktest} className="flex items-center gap-1.5 rounded-lg border border-indigo-700/40 bg-indigo-600/10 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-600/20 transition-colors">
            <BeakerIcon className="size-4" />
            Backtest model
          </button>
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-black text-gray-100">Model Picks</h1>
          <p className="mt-1 text-sm text-gray-500">
            Heuristic v1: projects fair lines from records, form, ranking, weather, pitcher quality, and home edge. Not betting advice.
          </p>
        </header>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <AdjustmentsHorizontalIcon className="size-4" />
            Filters
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Window</label>
              <div className="flex gap-1">
                {DAY_OPTIONS.map((n) => (
                  <button key={n} onClick={() => setDays(n)} className={classNames('flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors', days === n ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>
                    {n}d
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Market</label>
              <select value={market} onChange={(e) => setMarket(e.target.value as BetMarket | 'all')} className="w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-200 focus:border-indigo-500 focus:outline-none">
                {MARKET_OPTIONS.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">League</label>
              <select value={league} onChange={(e) => setLeague(e.target.value as LeagueId | 'all')} className="w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-200 focus:border-indigo-500 focus:outline-none">
                <option value="all">All leagues</option>
                {LEAGUE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Min confidence: <span className="text-gray-300">{minConf}%</span>
              </label>
              <input type="range" min={0} max={100} step={5} value={minConf} onChange={(e) => setMinConf(Number(e.target.value))} className="w-full accent-indigo-500" />
            </div>
          </div>
          {league !== 'all' && (
            <div className="mt-3 flex items-center gap-2">
              <span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-bold', LEAGUE_COLORS[league])}>{league}</span>
              <button onClick={() => setLeague('all')} className="text-[10px] text-indigo-400 hover:text-indigo-300 underline">Clear</button>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-500 animate-pulse">Running model on {days}-day slate…</p>
          </div>
        )}

        {error && !loading && (
          <EmptyState title="Failed to load games" description={error}
            action={<button onClick={() => globalThis.location.reload()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Try Again</button>}
          />
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState title="No predictions to show" description="Try widening the window, lowering the confidence floor, or clearing the league filter." />
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            {topPlays.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-400">
                  <span>★</span> Top Plays <span className="text-[10px] font-normal text-gray-500">({topPlays.length})</span>
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {topPlays.map(({ game, prediction }) => (
                    <PredictionCard key={game.id} game={game} prediction={prediction} onClick={() => setSelected(game)} />
                  ))}
                </div>
              </section>
            )}
            {rest.length > 0 && (
              <section>
                {topPlays.length > 0 && <h2 className="mb-3 text-sm font-semibold text-gray-400">Other Games</h2>}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {rest.map(({ game, prediction }) => (
                    <PredictionCard key={game.id} game={game} prediction={prediction} onClick={() => setSelected(game)} />
                  ))}
                </div>
              </section>
            )}
            <p className="mt-8 text-center text-xs text-gray-700">
              Predictions are a transparent rules-based v1 model, not betting advice.
            </p>
          </>
        )}
      </div>

      <GameDetailsModal
        game={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        isFavoriteHome={selected ? isFavorite(selected.homeTeam.id) : false}
        isFavoriteAway={selected ? isFavorite(selected.awayTeam.id) : false}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  )
}
