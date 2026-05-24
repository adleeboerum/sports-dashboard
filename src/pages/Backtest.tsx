import { useState } from 'react'
import { ArrowLeftIcon, PlayIcon, BeakerIcon, ExclamationTriangleIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import type { BetMarket, LeagueId, ValueRating } from '../types'
import type { BacktestResult, BetGroupStats } from '../services/backtest'
import { runBacktest } from '../services/backtest'
import { fetchHistoricalGames } from '../services/sportsApi'
import { dateToYmd, classNames } from '../utils/formatters'
import { LEAGUE_COLORS } from '../utils/leagues'
import LoadingSpinner from '../components/LoadingSpinner'

interface Props { onBack: () => void }

const DAY_OPTIONS = [3, 7, 14, 30] as const
const LEAGUE_OPTIONS: LeagueId[] = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'MLS', 'EPL']

function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n); return dateToYmd(d)
}

function pct(n: number | null, digits = 1): string {
  return n == null ? '-' : `${(n * 100).toFixed(digits)}%`
}

function signedPct(n: number, digits = 1): string {
  const v = (n * 100).toFixed(digits)
  return n >= 0 ? `+${v}%` : `${v}%`
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-gray-800/50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-gray-100">{value}</p>
      {sub && <p className="text-[10px] text-gray-500">{sub}</p>}
    </div>
  )
}

function Row({ label, stats }: { label: string; stats: BetGroupStats }) {
  const decided  = stats.wins + stats.losses
  const roiColor = stats.picks === 0 ? 'text-gray-500' : stats.roi > 0 ? 'text-emerald-400' : 'text-rose-400'
  return (
    <div className="grid grid-cols-[1fr_repeat(4,minmax(0,1fr))] gap-2 px-3 py-2 text-xs border-b border-gray-800 last:border-0">
      <div className="font-medium text-gray-300 truncate">{label}</div>
      <div className="text-right tabular-nums text-gray-400">{stats.picks}</div>
      <div className="text-right tabular-nums text-gray-400">
        {decided ? `${stats.wins}-${stats.losses}${stats.pushes ? `-${stats.pushes}` : ''}` : '-'}
      </div>
      <div className="text-right tabular-nums text-gray-200">{decided ? pct(stats.hitRate, 0) : '-'}</div>
      <div className={classNames('text-right font-bold tabular-nums', roiColor)}>
        {stats.picks ? signedPct(stats.roi) : '-'}
      </div>
    </div>
  )
}

function Header() {
  return (
    <div className="grid grid-cols-[1fr_repeat(4,minmax(0,1fr))] gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-800 bg-gray-900/50">
      <div />
      <div className="text-right">Picks</div>
      <div className="text-right">W-L</div>
      <div className="text-right">Hit %</div>
      <div className="text-right">ROI</div>
    </div>
  )
}

export default function Backtest({ onBack }: Props) {
  const [days, setDays]     = useState(7)
  const [league, setLeague] = useState<LeagueId | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [status, setStatus]   = useState('')
  const [result, setResult]   = useState<BacktestResult | null>(null)
  const [error, setError]     = useState<string | null>(null)

  async function run() {
    setLoading(true); setError(null); setResult(null); setStatus('Fetching historical games…')
    try {
      const end    = daysAgo(1)
      const start  = daysAgo(days)
      const games  = await fetchHistoricalGames(start, end, league === 'all' ? undefined : [league])

      if (!games.length) {
        setError('No finished games found in this range. Try widening the window or another league.')
        return
      }

      setStatus(`Scoring ${games.length} games…`)
      await new Promise((r) => setTimeout(r, 0))

      setResult(runBacktest(games, { startYmd: start, endYmd: end, leagues: league === 'all' ? 'all' : [league] }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Backtest failed.')
    } finally {
      setLoading(false); setStatus('')
    }
  }

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors">
            <ArrowLeftIcon className="size-4" /> Back to predictions
          </button>
        </div>

        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-black text-gray-100">
            <BeakerIcon className="size-6 text-indigo-400" /> Model Backtest
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Replay the prediction engine on finished games. Measures projection error and simulated $100-flat-bet ROI.
          </p>
        </header>

        {/* Controls */}
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Lookback</label>
              <div className="flex gap-1">
                {DAY_OPTIONS.map((n) => (
                  <button key={n} onClick={() => setDays(n)} className={classNames('flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors', days === n ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>
                    {n}d
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">League</label>
              <select value={league} onChange={(e) => setLeague(e.target.value as LeagueId | 'all')} className="w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-200 focus:border-indigo-500 focus:outline-none">
                <option value="all">All leagues</option>
                {LEAGUE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <button onClick={run} disabled={loading} className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {loading ? <LoadingSpinner size="sm" /> : <PlayIcon className="size-4" />}
              {loading ? 'Running…' : 'Run'}
            </button>
          </div>
          {status && <p className="mt-3 text-xs text-gray-500 animate-pulse">{status}</p>}
          {error  && <p className="mt-3 text-xs text-rose-400">{error}</p>}
        </div>

        {!result && !loading && !error && (
          <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900/30 p-8 text-center">
            <ChartBarIcon className="mx-auto size-10 text-gray-700" />
            <p className="mt-3 text-sm text-gray-400">Pick a window and run a backtest to see how the model would've fared.</p>
            <p className="mt-1 text-[11px] text-gray-600">Shorter windows complete faster but yield noisier metrics.</p>
          </div>
        )}

        {result && (
          <>
            <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Games"      value={result.finishedGames.toString()}                             sub={`${result.gamesWithOdds} with odds`} />
              <Stat label="ML Accuracy" value={pct(result.mlAccuracy, 1)}                                  sub={`${result.mlSampleSize} decided`} />
              <Stat label="Margin MAE" value={result.marginMae != null ? result.marginMae.toFixed(2) : '-'} sub="avg |error| in points" />
              <Stat label="Total MAE"  value={result.totalMae  != null ? result.totalMae.toFixed(2)  : '-'} sub="avg |error| in points" />
            </section>

            <section className="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-200">Simulated Betting</h2>
                <span className="text-[10px] text-gray-500">$100 flat · edge ≥ 3%</span>
              </div>
              <Header />
              <Row label="All edges (≥3%)" stats={result.overall} />
            </section>

            <section className="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800"><h2 className="text-sm font-bold text-gray-200">By Value Rating</h2></div>
              <Header />
              {([5, 4, 3, 2, 1] as ValueRating[]).map((v) => <Row key={v} label={`${'★'.repeat(v)} (${v})`} stats={result.byValue[v]} />)}
            </section>

            <section className="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800"><h2 className="text-sm font-bold text-gray-200">By Market</h2></div>
              <Header />
              {(['moneyline', 'spread', 'total'] as BetMarket[]).map((m) => (
                <Row key={m} label={m[0].toUpperCase() + m.slice(1)} stats={result.byMarket[m]} />
              ))}
            </section>

            {Object.keys(result.byLeague).length > 0 && (
              <section className="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800"><h2 className="text-sm font-bold text-gray-200">By League</h2></div>
                <Header />
                {(Object.entries(result.byLeague) as [LeagueId, BetGroupStats][])
                  .sort(([, a], [, b]) => b.picks - a.picks)
                  .map(([lid, stats]) => (
                    <div key={lid} className="border-b border-gray-800 last:border-0">
                      <div className="grid grid-cols-[1fr_repeat(4,minmax(0,1fr))] gap-2 px-3 py-2 text-xs items-center">
                        <div><span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-bold', LEAGUE_COLORS[lid])}>{lid}</span></div>
                        <div className="text-right tabular-nums text-gray-400">{stats.picks}</div>
                        <div className="text-right tabular-nums text-gray-400">
                          {stats.wins + stats.losses ? `${stats.wins}-${stats.losses}${stats.pushes ? `-${stats.pushes}` : ''}` : '-'}
                        </div>
                        <div className="text-right tabular-nums text-gray-200">
                          {stats.wins + stats.losses ? pct(stats.hitRate, 0) : '-'}
                        </div>
                        <div className={classNames('text-right font-bold tabular-nums', stats.picks === 0 ? 'text-gray-500' : stats.roi > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                          {stats.picks ? signedPct(stats.roi) : '-'}
                        </div>
                      </div>
                    </div>
                  ))}
              </section>
            )}

            <section className="rounded-xl border border-amber-700/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon className="size-4 text-amber-400" />
                <h3 className="text-sm font-bold text-amber-300">Read before drawing conclusions</h3>
              </div>
              <ul className="space-y-1 text-xs text-amber-100/80">
                {result.caveats.map((c, i) => <li key={i} className="leading-relaxed">• {c}</li>)}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
