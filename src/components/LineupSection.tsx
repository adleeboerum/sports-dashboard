import { useState } from 'react'
import { UserGroupIcon } from '@heroicons/react/24/outline'
import type { Game, Lineup, Player } from '../types'
import { classNames } from '../utils/formatters'

type SportCategory = 'basketball' | 'football' | 'baseball' | 'hockey' | 'soccer'
type TeamSide = 'away' | 'home'

function getSport(leagueId: Game['leagueId']): SportCategory {
  switch (leagueId) {
    case 'NBA': case 'NCAAB': return 'basketball'
    case 'NFL': case 'NCAAF': return 'football'
    case 'MLB': return 'baseball'
    case 'NHL': return 'hockey'
    default: return 'soccer'
  }
}

function getSoccerGroup(pos: string): 'GK' | 'DEF' | 'MID' | 'FWD' {
  const p = pos.toUpperCase()
  if (p === 'GK' || p === 'GKP') return 'GK'
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'SW', 'DC', 'DL', 'DR'].includes(p)) return 'DEF'
  if (['ST', 'CF', 'SS', 'RW', 'LW', 'FW'].includes(p)) return 'FWD'
  return 'MID'
}

function getHockeyGroup(pos: string): 'F' | 'D' | 'G' {
  const p = pos.toUpperCase()
  if (p === 'G') return 'G'
  if (p === 'D') return 'D'
  return 'F'
}

function isFootballOffense(pos: string): boolean {
  return ['QB', 'WR', 'RB', 'TE', 'OL', 'OT', 'OG', 'C', 'FB', 'HB', 'DH'].includes(pos.toUpperCase())
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const statusColor: Record<Player['status'], string> = {
  active: 'text-green-400',
  questionable: 'text-yellow-400',
  out: 'text-red-400',
  'injured-reserve': 'text-red-500',
}

const statusLabel: Record<Player['status'], string> = {
  active: '',
  questionable: 'Q',
  out: 'OUT',
  'injured-reserve': 'IR',
}

function PlayerStats({ stats, limit }: { stats: Record<string, string>; limit?: number }) {
  const entries = Object.entries(stats).slice(0, limit ?? 999)
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {entries.map(([k, v]) => (
        <span key={k} className="text-xs tabular-nums">
          <span className="text-gray-600">{k} </span>
          <span className="text-gray-400 font-medium">{v}</span>
        </span>
      ))}
    </div>
  )
}

function StatusBadge({ player }: { player: Player }) {
  if (player.status === 'active') return null
  return (
    <span className={classNames('text-xs font-semibold shrink-0', statusColor[player.status])}>
      {statusLabel[player.status]}
      {player.injuryNote && <span className="text-gray-600 font-normal"> ({player.injuryNote})</span>}
    </span>
  )
}

// Shared row component for basketball, football, baseball
function PlayerRow({
  player,
  orderNum,
  isBench,
}: {
  player: Player
  orderNum?: number
  isBench?: boolean
}) {
  return (
    <div
      className={classNames(
        'flex items-center justify-between gap-2 py-1.5 border-b border-gray-800/60 last:border-0',
        isBench ? 'opacity-60' : '',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {orderNum != null && (
          <span className="w-4 shrink-0 text-xs font-mono tabular-nums text-gray-700">{orderNum}</span>
        )}
        {player.number && (
          <span className="w-6 shrink-0 text-right text-xs font-mono text-gray-600">#{player.number}</span>
        )}
        <span className={classNames('text-sm truncate', isBench ? 'text-gray-400' : 'text-gray-200')}>
          {player.name}
        </span>
        <span className="shrink-0 rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-500">
          {player.position}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-1">
        {player.stats && (
          <div className="hidden sm:block">
            <PlayerStats stats={player.stats} limit={3} />
          </div>
        )}
        <StatusBadge player={player} />
      </div>
    </div>
  )
}

// ── Basketball ────────────────────────────────────────────────
function BasketballLineup({ lineup }: { lineup: Lineup }) {
  return (
    <div>
      {lineup.starters.length > 0 && (
        <div className="space-y-0">
          {lineup.starters.map((p) => (
            <PlayerRow key={p.id} player={p} />
          ))}
        </div>
      )}
      {lineup.bench && lineup.bench.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-700">Bench</p>
          <div className="space-y-0">
            {lineup.bench.map((p) => (
              <PlayerRow key={p.id} player={p} isBench />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Football ──────────────────────────────────────────────────
function FootballLineup({ lineup }: { lineup: Lineup }) {
  const offense = lineup.starters.filter((p) => isFootballOffense(p.position))
  const defense = lineup.starters.filter((p) => !isFootballOffense(p.position))

  return (
    <div className="space-y-4">
      {offense.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-700">Offense</p>
          <div className="space-y-0">
            {offense.map((p) => (
              <PlayerRow key={p.id} player={p} />
            ))}
          </div>
        </div>
      )}
      {defense.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-700">Defense</p>
          <div className="space-y-0">
            {defense.map((p) => (
              <PlayerRow key={p.id} player={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Baseball ──────────────────────────────────────────────────
function BaseballLineup({ lineup }: { lineup: Lineup }) {
  const pitchers = lineup.starters.filter((p) => ['SP', 'RP', 'CL'].includes(p.position))
  const hitters = lineup.starters.filter((p) => !['SP', 'RP', 'CL'].includes(p.position))

  return (
    <div className="space-y-4">
      {pitchers.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-700">
            Starting Pitcher
          </p>
          <div className="space-y-0">
            {pitchers.map((p) => (
              <PlayerRow key={p.id} player={p} />
            ))}
          </div>
        </div>
      )}
      {hitters.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-700">
            Batting Order
          </p>
          <div className="space-y-0">
            {hitters.map((p, i) => (
              <PlayerRow key={p.id} player={p} orderNum={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hockey ────────────────────────────────────────────────────
function HockeyPlayerChip({ player }: { player: Player }) {
  const borderColor =
    player.status === 'active'
      ? 'border-gray-800'
      : player.status === 'questionable'
        ? 'border-yellow-800/50'
        : 'border-red-900/50'

  return (
    <div
      className={classNames(
        'flex items-center gap-1.5 rounded-lg bg-gray-900/80 px-2 py-1.5 border min-w-0',
        borderColor,
      )}
    >
      {player.number && (
        <span className="shrink-0 w-5 text-right text-xs font-mono text-gray-600">
          {player.number}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-200 truncate">
          {player.name.split(' ').slice(-1)[0]}
        </p>
        <p className="text-[10px] text-gray-600">{player.position}</p>
      </div>
      {player.stats && (
        <div className="hidden md:flex flex-col items-end ml-1 shrink-0">
          {Object.entries(player.stats)
            .slice(0, 2)
            .map(([k, v]) => (
              <span key={k} className="text-[10px] tabular-nums text-gray-600 leading-tight">
                {v}
              </span>
            ))}
        </div>
      )}
      {player.status !== 'active' && (
        <span className={classNames('text-[10px] font-bold shrink-0', statusColor[player.status])}>
          {statusLabel[player.status]}
        </span>
      )}
    </div>
  )
}

function HockeyLineup({ lineup }: { lineup: Lineup }) {
  const forwards = lineup.starters.filter((p) => getHockeyGroup(p.position) === 'F')
  const defense = lineup.starters.filter((p) => getHockeyGroup(p.position) === 'D')
  const goalies = lineup.starters.filter((p) => getHockeyGroup(p.position) === 'G')

  const lines = chunk(forwards, 3)
  const pairs = chunk(defense, 2)

  const benchF = lineup.bench?.filter((p) => getHockeyGroup(p.position) === 'F') ?? []
  const benchD = lineup.bench?.filter((p) => getHockeyGroup(p.position) === 'D') ?? []
  const benchG = lineup.bench?.filter((p) => getHockeyGroup(p.position) === 'G') ?? []

  return (
    <div className="space-y-4">
      {lines.length > 0 && (
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-700">
                Line {i + 1}
              </p>
              <div className="grid grid-cols-3 gap-1">
                {line.map((p) => (
                  <HockeyPlayerChip key={p.id} player={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {pairs.length > 0 && (
        <div className="space-y-1">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-700">Defense</p>
          {pairs.map((pair, i) => (
            <div key={i} className="grid grid-cols-2 gap-1">
              {pair.map((p) => (
                <HockeyPlayerChip key={p.id} player={p} />
              ))}
            </div>
          ))}
        </div>
      )}

      {goalies.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-700">Goalie</p>
          <div className="grid grid-cols-2 gap-1">
            {goalies.map((p) => (
              <HockeyPlayerChip key={p.id} player={p} />
            ))}
          </div>
        </div>
      )}

      {(benchF.length > 0 || benchD.length > 0 || benchG.length > 0) && (
        <div className="pt-1 border-t border-gray-800">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-700">Bench</p>
          <div className="space-y-0 opacity-60">
            {[...benchF, ...benchD, ...benchG].map((p) => (
              <PlayerRow key={p.id} player={p} isBench />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Soccer ────────────────────────────────────────────────────
function SoccerPlayerChip({ player }: { player: Player }) {
  const ringColor =
    player.status === 'active'
      ? 'ring-emerald-800'
      : player.status === 'questionable'
        ? 'ring-yellow-700'
        : 'ring-red-800'

  const lastName = player.name.split(' ').slice(-1)[0]

  return (
    <div className="flex flex-col items-center gap-0.5 w-[58px]">
      <div
        className={classNames(
          'h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 ring-2',
          ringColor,
        )}
      >
        {player.number ?? '?'}
      </div>
      <span className="text-[11px] text-gray-200 font-medium text-center leading-tight truncate w-full">
        {lastName}
      </span>
      {player.stats && (
        <span className="text-[10px] text-gray-600 text-center truncate w-full">
          {Object.entries(player.stats)
            .slice(0, 2)
            .map(([k, v]) => `${k}:${v}`)
            .join(' ')}
        </span>
      )}
      {player.status !== 'active' && (
        <span className={classNames('text-[10px] font-bold', statusColor[player.status])}>
          {statusLabel[player.status]}
        </span>
      )}
    </div>
  )
}

function SoccerLineup({ lineup }: { lineup: Lineup }) {
  const gks = lineup.starters.filter((p) => getSoccerGroup(p.position) === 'GK')
  const defs = lineup.starters.filter((p) => getSoccerGroup(p.position) === 'DEF')
  const mids = lineup.starters.filter((p) => getSoccerGroup(p.position) === 'MID')
  const fwds = lineup.starters.filter((p) => getSoccerGroup(p.position) === 'FWD')

  const rows = [
    { key: 'fwd', players: fwds, label: 'ATT' },
    { key: 'mid', players: mids, label: 'MID' },
    { key: 'def', players: defs, label: 'DEF' },
    { key: 'gk', players: gks, label: 'GK' },
  ].filter((r) => r.players.length > 0)

  return (
    <div className="space-y-4">
      {/* Formation pitch grid */}
      <div className="relative rounded-xl overflow-hidden border border-emerald-900/20 bg-gradient-to-b from-emerald-950/30 to-emerald-950/10">
        {/* Pitch center line */}
        <div className="absolute inset-x-4 top-1/2 h-px bg-emerald-900/25" />
        {/* Center circle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full border border-emerald-900/20" />

        <div className="relative px-3 py-4 space-y-3">
          {rows.map(({ key, players, label }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-[9px] font-bold uppercase tracking-widest text-emerald-900/60 text-center">
                {label}
              </span>
              <div className="flex-1 flex justify-around">
                {players.map((p) => (
                  <SoccerPlayerChip key={p.id} player={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bench */}
      {lineup.bench && lineup.bench.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-700">Subs</p>
          <div className="space-y-0 opacity-70">
            {lineup.bench.map((p) => (
              <PlayerRow key={p.id} player={p} isBench />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Dispatcher ────────────────────────────────────────────────
function SportLineup({
  sport,
  lineup,
}: {
  sport: SportCategory
  lineup: Lineup
}) {
  if (!lineup.starters.length && !lineup.notes) {
    return <p className="py-2 text-sm text-gray-600">Lineup not yet available</p>
  }
  if (lineup.notes && !lineup.starters.length) {
    return <p className="py-2 text-sm text-gray-600 italic">{lineup.notes}</p>
  }

  switch (sport) {
    case 'basketball': return <BasketballLineup lineup={lineup} />
    case 'football': return <FootballLineup lineup={lineup} />
    case 'baseball': return <BaseballLineup lineup={lineup} />
    case 'hockey': return <HockeyLineup lineup={lineup} />
    case 'soccer': return <SoccerLineup lineup={lineup} />
  }
}

// ── Main export ───────────────────────────────────────────────
export default function LineupSection({ game, loading }: { game: Game; loading?: boolean }) {
  const [activeTeam, setActiveTeam] = useState<TeamSide>('away')

  if (!game.homeLineup && !game.awayLineup && !loading) return null

  const sport = getSport(game.leagueId)

  const homeConfirmed = !!game.homeLineup?.confirmed
  const awayConfirmed = !!game.awayLineup?.confirmed
  const allConfirmed = homeConfirmed && awayConfirmed
  const anyConfirmed = homeConfirmed || awayConfirmed

  const heading = allConfirmed ? 'Confirmed Lineup' : anyConfirmed ? 'Lineup' : 'Projected Lineup'

  const activeLineup = activeTeam === 'away' ? game.awayLineup : game.homeLineup
  const activeTeamData = activeTeam === 'away' ? game.awayTeam : game.homeTeam
  const activeConfirmed = activeTeam === 'away' ? awayConfirmed : homeConfirmed

  return (
    <div className="px-6 py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <UserGroupIcon className="size-4 text-gray-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{heading}</h3>
        {!allConfirmed && (
          <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400 ring-1 ring-yellow-500/20">
            {anyConfirmed ? 'Partial' : 'Projected'}
          </span>
        )}
        {(sport === 'soccer') && activeLineup?.formation && (
          <span className="ml-auto rounded bg-gray-800 px-2 py-0.5 text-xs font-mono text-gray-400">
            {activeLineup.formation}
          </span>
        )}
      </div>

      {/* Team tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-900 p-1">
        {(['away', 'home'] as TeamSide[]).map((side) => {
          const t = side === 'away' ? game.awayTeam : game.homeTeam
          const hasLineup = !!(side === 'away' ? game.awayLineup : game.homeLineup)
          const confirmed = side === 'away' ? awayConfirmed : homeConfirmed

          return (
            <button
              key={side}
              onClick={() => setActiveTeam(side)}
              disabled={!hasLineup}
              className={classNames(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all',
                activeTeam === side
                  ? 'bg-gray-700 text-gray-100 shadow-sm'
                  : hasLineup
                    ? 'text-gray-500 hover:text-gray-300'
                    : 'cursor-default text-gray-700',
              )}
            >
              <span>{t.abbreviation}</span>
              <span className="text-[10px] font-normal opacity-60">{side === 'away' ? 'Away' : 'Home'}</span>
              {confirmed && (
                <span className="h-1 w-1 rounded-full bg-green-500 shrink-0" title="Confirmed" />
              )}
            </button>
          )
        })}
      </div>

      {/* Lineup content */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-gray-600">
            <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-sm">Loading lineup…</span>
          </div>
        ) : activeLineup ? (
          <>
            {!activeConfirmed && (
              <p className="mb-2 text-xs text-gray-600 italic">
                Lineup not yet confirmed for {activeTeamData.name}
              </p>
            )}
            <SportLineup sport={sport} lineup={activeLineup} />
          </>
        ) : (
          <p className="py-2 text-sm text-gray-600">
            Lineup not yet available for {activeTeamData.name}
          </p>
        )}
      </div>
    </div>
  )
}
