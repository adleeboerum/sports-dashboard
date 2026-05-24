import { Fragment, useState } from 'react'
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { XMarkIcon, TableCellsIcon } from '@heroicons/react/24/outline'
import type { LeagueId, LeagueStandings, StandingEntry } from '../types'
import { LEAGUE_COLORS } from '../utils/leagues'
import { classNames } from '../utils/formatters'
import { useStandings } from '../hooks/useStandings'

const LEAGUES: LeagueId[] = ['NBA', 'NFL', 'MLB', 'NHL']

type GroupBy = 'conference' | 'division'

function Logo({ url, name }: { url?: string; name: string }) {
  const [err, setErr] = useState(false)
  if (err || !url) {
    return (
      <span className="size-6 rounded-full bg-gray-700 flex items-center justify-center text-[8px] font-bold text-gray-400 shrink-0">
        {name.slice(0, 2)}
      </span>
    )
  }
  return <img src={url} alt={name} className="size-6 object-contain shrink-0" onError={() => setErr(true)} />
}

function Streak({ streak }: { streak: string }) {
  const win  = streak.startsWith('W')
  const loss = streak.startsWith('L')
  return (
    <span className={classNames('text-xs font-bold tabular-nums', win ? 'text-green-400' : loss ? 'text-red-400' : 'text-gray-400')}>
      {streak}
    </span>
  )
}

const COL = 'grid-cols-[2rem_minmax(0,1fr)_3rem_3rem_3.5rem_3.5rem_3.5rem]'

function Table({ standings, leagueId, groupBy }: { standings: LeagueStandings; leagueId: LeagueId; groupBy: GroupBy }) {
  const hockey   = leagueId === 'NHL'
  const football = leagueId === 'NFL'
  const groups = groupBy === 'division' && standings.divisionGroups?.length
    ? standings.divisionGroups
    : standings.groups

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.name}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">{group.name}</h3>
          <div className="rounded-lg border border-gray-800 overflow-hidden">
            <div className={classNames('grid gap-x-2 bg-gray-800/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600', COL)}>
              <span className="text-center">#</span>
              <span>Team</span>
              <span className="text-center">W</span>
              <span className="text-center">L</span>
              <span className="text-center">{hockey ? 'OTL' : 'PCT'}</span>
              <span className="text-center">L10</span>
              <span className="text-center">Strk</span>
            </div>
            {group.entries.map((entry, i) => (
              <Row key={entry.teamId} entry={entry} index={i} hockey={hockey} football={football} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Row({ entry, index, hockey, football }: {
  entry: StandingEntry
  index: number
  hockey: boolean
  football: boolean
}) {
  const playoffLine = (index === 3 && football) || (index === 4 && !football && !hockey) || (index === 3 && hockey)

  return (
    <>
      {playoffLine && (
        <div className="h-px bg-indigo-500/30 relative">
          <span className="absolute right-2 -top-2.5 text-[8px] text-indigo-500/60 font-medium">PLAYOFF LINE</span>
        </div>
      )}
      <div className={classNames(
        'grid gap-x-2 px-3 py-2 text-xs items-center border-t border-gray-800/60 first:border-t-0',
        COL,
        index === 0 ? 'bg-gray-800/20' : '',
      )}>
        <span className="text-center text-gray-600 font-medium tabular-nums">{entry.rank}</span>
        <div className="flex items-center gap-2 min-w-0">
          <Logo url={entry.logoUrl} name={entry.teamName} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-200 text-xs">{entry.teamName}</p>
            {entry.gb && entry.gb !== '—' && <p className="text-[9px] text-gray-500">GB {entry.gb}</p>}
          </div>
        </div>
        <span className="text-center font-bold text-gray-100 tabular-nums">{entry.wins}</span>
        <span className="text-center text-gray-400 tabular-nums">{entry.losses}</span>
        <span className="text-center text-gray-500 tabular-nums text-[11px]">
          {hockey ? (entry.draws ?? 0) : (entry.pct ?? '-')}
        </span>
        <span className="text-center text-gray-500 text-[11px] tabular-nums">{entry.last10 ?? '-'}</span>
        <span className="text-center">
          {entry.streak ? <Streak streak={entry.streak} /> : <span className="text-gray-600">-</span>}
        </span>
      </div>
    </>
  )
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function StandingsPanel({ open, onClose }: Props) {
  const [league, setLeague]   = useState<LeagueId>('NBA')
  const [groupBy, setGroupBy] = useState<GroupBy>('conference')
  const { standings, loading, error } = useStandings(league)

  const hasDivisions = !!standings?.divisionGroups?.length

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150"  leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <TransitionChild
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full" enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"   leaveTo="translate-x-full"
              >
                <DialogPanel className="pointer-events-auto w-screen max-w-2xl">
                  <div className="flex h-full flex-col bg-gray-950 border-l border-gray-800 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                      <div className="flex items-center gap-2">
                        <TableCellsIcon className="size-5 text-indigo-400" />
                        <h2 className="text-base font-bold text-gray-100">Standings</h2>
                      </div>
                      <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors">
                        <XMarkIcon className="size-5" />
                      </button>
                    </div>

                    {/* League tabs */}
                    <div className="flex gap-1 p-3 border-b border-gray-800">
                      {LEAGUES.map((lid) => (
                        <button
                          key={lid}
                          onClick={() => setLeague(lid)}
                          className={classNames(
                            'flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors',
                            league === lid
                              ? classNames(LEAGUE_COLORS[lid], 'ring-1 ring-inset ring-current/30')
                              : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300',
                          )}
                        >
                          {lid}
                        </button>
                      ))}
                    </div>

                    {/* Group-by toggle */}
                    <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-800">
                      <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mr-2">View by</span>
                      {(['conference', 'division'] as GroupBy[]).map((g) => (
                        <button
                          key={g}
                          onClick={() => setGroupBy(g)}
                          disabled={g === 'division' && !hasDivisions}
                          className={classNames(
                            'rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors',
                            groupBy === g
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed',
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                      {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          <div className="size-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm text-gray-500">Loading standings…</p>
                        </div>
                      ) : error || !standings ? (
                        <div className="flex flex-col items-center justify-center py-16">
                          <TableCellsIcon className="size-10 text-gray-700 mb-3" />
                          <p className="text-sm text-gray-500">Standings not available for {league}</p>
                        </div>
                      ) : (
                        <Table standings={standings} leagueId={league} groupBy={groupBy} />
                      )}
                    </div>

                    <div className="border-t border-gray-800 px-4 py-3">
                      <p className="text-[10px] text-gray-700 text-center">Standings data is for informational purposes only</p>
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
