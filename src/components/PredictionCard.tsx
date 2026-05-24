import { useState } from 'react'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ExclamationTriangleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import type { Game, GamePrediction, MarketEdge, ValueRating } from '../types'
import { LEAGUE_COLORS } from '../utils/leagues'
import { classNames, formatGameTime, formatDateShort } from '../utils/formatters'

interface Props {
  game: Game
  prediction: GamePrediction
  onClick?: () => void
}

function valueLabel(v: ValueRating): string {
  switch (v) {
    case 5: return 'Strong Play'
    case 4: return 'Lean'
    case 3: return 'Slight Edge'
    case 2: return 'Marginal'
    case 1: return 'No Edge'
  }
}

function valueColor(v: ValueRating, edge: number): string {
  if (edge <= 0) return 'bg-gray-800 text-gray-500 ring-gray-700/50'
  switch (v) {
    case 5: return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40'
    case 4: return 'bg-green-500/15 text-green-300 ring-green-500/40'
    case 3: return 'bg-lime-500/15 text-lime-300 ring-lime-500/40'
    case 2: return 'bg-yellow-500/10 text-yellow-300 ring-yellow-500/30'
    case 1: return 'bg-gray-800 text-gray-400 ring-gray-700/50'
  }
}

function confColor(c: number): string {
  if (c >= 75) return 'text-emerald-400'
  if (c >= 50) return 'text-yellow-400'
  return 'text-orange-400'
}

function confLabel(c: number): string {
  if (c >= 75) return 'High confidence'
  if (c >= 50) return 'Medium confidence'
  return 'Low confidence'
}

function sideLabel(edge: MarketEdge, game: Game): string {
  const home = game.homeTeam.abbreviation
  const away = game.awayTeam.abbreviation
  if (edge.side.market === 'moneyline') return edge.side.team === 'home' ? `${home} ML` : `${away} ML`
  if (edge.side.market === 'spread')    return edge.side.team === 'home' ? `${home} spread` : `${away} spread`
  return edge.side.pick === 'over' ? 'Over' : 'Under'
}

function Factor({ label, delta, detail }: { label: string; delta: number; detail?: string }) {
  const up    = delta > 0
  const Arrow = up ? ArrowTrendingUpIcon : ArrowTrendingDownIcon
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-300">{label}</p>
        {detail && <p className="text-[10px] text-gray-500 truncate">{detail}</p>}
      </div>
      <div className={classNames('flex shrink-0 items-center gap-1 text-xs tabular-nums', up ? 'text-emerald-400' : 'text-rose-400')}>
        <Arrow className="size-3" />
        {up ? '+' : ''}{delta.toFixed(1)}
      </div>
    </div>
  )
}

function EdgePill({ edge, game }: { edge: MarketEdge; game: Game }) {
  const pctStr  = (edge.edge * 100).toFixed(1)
  const positive = edge.edge > 0
  return (
    <div className={classNames('flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 ring-1 ring-inset', valueColor(edge.value, edge.edge))}>
      <div className="min-w-0">
        <p className="text-xs font-bold leading-tight">{sideLabel(edge, game)}</p>
        <p className="text-[10px] opacity-80 leading-tight">{edge.americanOdds} · fair {edge.fairAmericanOdds}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-black tabular-nums leading-tight">{positive ? '+' : ''}{pctStr}%</p>
        <p className="text-[9px] uppercase tracking-wider opacity-80 leading-tight">{positive ? valueLabel(edge.value) : 'Fade'}</p>
      </div>
    </div>
  )
}

export default function PredictionCard({ game, prediction, onClick }: Props) {
  const [expanded, setExpanded] = useState(false)

  const edges  = [...prediction.edges].filter((e) => e.edge > 0).sort((a, b) => b.edge - a.edge)
  const shown  = expanded ? edges : edges.slice(0, 4)
  const hidden = edges.length - shown.length

  const homePct = Math.round(prediction.modelHomeWinProb * 100)
  const awayPct = 100 - homePct
  const sign    = prediction.modelMargin > 0 ? '-' : '+'
  const margin  = Math.abs(prediction.modelMargin).toFixed(1)
  const date    = new Date(game.startTime)

  return (
    <article onClick={onClick} className="group relative cursor-pointer rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-indigo-700/60 hover:bg-gray-900/80 transition-colors">
      <header className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-bold', LEAGUE_COLORS[game.leagueId])}>{game.leagueId}</span>
          <span className="text-[10px] text-gray-500">{formatDateShort(date)} · {formatGameTime(game.startTime)}</span>
        </div>
        <div className="flex items-center gap-1 text-right shrink-0">
          <span className={classNames('text-[10px] font-semibold', confColor(prediction.confidence))}>{prediction.confidence}% conf</span>
          {prediction.hasGaps && <ExclamationTriangleIcon className="size-3.5 text-amber-500" title="Some inputs missing" />}
        </div>
      </header>

      <div className="mb-3">
        <p className="text-sm font-bold text-gray-100 leading-tight">
          {game.awayTeam.shortName} <span className="text-gray-600">@</span> {game.homeTeam.shortName}
        </p>
        <p className="text-[10px] text-gray-500 mt-0.5">{game.venue.name}, {game.venue.city}</p>
      </div>

      <div className="mb-3 rounded-lg bg-gray-800/50 p-2.5">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Model Projection</p>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-gray-700">
          <div className="h-full transition-all" style={{ width: `${awayPct}%`, backgroundColor: game.awayTeam.primaryColor }} />
          <div className="h-full transition-all" style={{ width: `${homePct}%`, backgroundColor: game.homeTeam.primaryColor }} />
        </div>
        <div className="mt-1.5 grid grid-cols-3 text-center text-[10px]">
          <div>
            <p className="font-bold text-gray-200 tabular-nums">{awayPct}%</p>
            <p className="text-gray-500">{game.awayTeam.abbreviation}</p>
          </div>
          <div className="border-x border-gray-700/50">
            <p className="font-bold text-gray-200 tabular-nums">{game.homeTeam.abbreviation} {sign}{margin}</p>
            <p className="text-gray-500">Spread</p>
          </div>
          <div>
            <p className="font-bold text-gray-200 tabular-nums">{prediction.modelTotal.toFixed(1)}</p>
            <p className="text-gray-500">Total</p>
          </div>
        </div>
      </div>

      {edges.length > 0 ? (
        <div className="space-y-1.5">
          {shown.map((edge, i) => <EdgePill key={`${edge.side.market}-${i}`} edge={edge} game={game} />)}
          {hidden > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setExpanded(true) }} className="flex w-full items-center justify-center gap-1 rounded-md py-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
              <ChevronDownIcon className="size-3" /> Show {hidden} more
            </button>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-gray-600 italic">
          {game.odds?.length ? 'No positive edges — market is close to fair.' : 'No odds available for this game.'}
        </p>
      )}

      {prediction.factors.length > 0 && (
        <details className="mt-3 group/details">
          <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1">
            <ChevronDownIcon className="size-3 transition-transform group-open/details:rotate-180" />
            Why this projection
          </summary>
          <div className="mt-1.5 divide-y divide-gray-800/60">
            {prediction.factors.map((f, i) => <Factor key={i} label={f.label} delta={f.delta} detail={f.detail} />)}
          </div>
        </details>
      )}

      <p className="mt-3 text-[9px] text-gray-600">{confLabel(prediction.confidence)} · v1 heuristic model</p>
    </article>
  )
}
