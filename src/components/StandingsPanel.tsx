import { Fragment, useState } from 'react'
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { XMarkIcon, TableCellsIcon } from '@heroicons/react/24/outline'
import type { LeagueId, LeagueStandings, StandingEntry } from '../types'
import { MOCK_STANDINGS, LEAGUE_COLORS } from '../data/mockData'
import { classNames } from '../utils/formatters'

const AVAILABLE_LEAGUES: LeagueId[] = ['NBA', 'NFL', 'MLB', 'NHL']

function SmallLogo({ logoUrl, name }: { logoUrl?: string; name: string }) {
  const [err, setErr] = useState(false)
  if (err || !logoUrl) {
    return (
      <span className="size-5 rounded-full bg-gray-700 flex items-center justify-center text-[8px] font-bold text-gray-400 shrink-0">
        {name.slice(0, 2)}
      </span>
    )
  }
  return <img src={logoUrl} alt={name} className="size-5 object-contain shrink-0" onError={() => setErr(true)} />
}

function StreakBadge({ streak }: { streak: string }) {
  const isWin = streak.startsWith('W')
  const isLoss = streak.startsWith('L')
  return (
    <span className={classNames(
      'text-[10px] font-bold tabular-nums',
      isWin ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-gray-400',
    )}>
      {streak}
    </span>
  )
}

function StandingsTable({ standings, leagueId }: { standings: LeagueStandings; leagueId: LeagueId }) {
  const isHockey = leagueId === 'NHL'
  const isFootball = leagueId === 'NFL'

  return (
    <div className="space-y-6">
      {standings.groups.map((group) => (
        <div key={group.name}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">{group.name}</h3>
          <div className="rounded-lg border border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem_3rem_3rem_3rem] gap-x-1 bg-gray-800/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
              <span className="text-center">#</span>
              <span>Team</span>
              <span className="text-center">W</span>
              <span className="text-center">L</span>
              <span className="text-center">{isHockey ? 'OTL' : 'PCT'}</span>
              <span className="text-center">L10</span>
              <span className="text-center">Strk</span>
            </div>

            {/* Rows */}
            {group.entries.map((entry, i) => (
              <StandingRow key={entry.teamId} entry={entry} index={i} total={group.entries.length} isHockey={isHockey} isFootball={isFootball} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function StandingRow({ entry, index, total, isHockey, isFootball }: {
  entry: StandingEntry
  index: number
  total: number
  isHockey: boolean
  isFootball: boolean
}) {
  const isPlayoffLine = (index === 3 && isFootball) || (index === 4 && !isFootball && !isHockey) || (index === 3 && isHockey)
  const _ = total // suppress unused

  return (
    <>
      {isPlayoffLine && (
        <div className="h-px bg-indigo-500/30 relative">
          <span className="absolute right-2 -top-2.5 text-[8px] text-indigo-500/60 font-medium">PLAYOFF LINE</span>
        </div>
      )}
      <div className={classNames(
        'grid grid-cols-[2rem_1fr_2.5rem_2.5rem_3rem_3rem_3rem] gap-x-1 px-3 py-2 text-xs items-center border-t border-gray-800/60 first:border-t-0',
        index === 0 ? 'bg-gray-800/20' : '',
      )}>
        <span className="text-center text-gray-600 font-medium tabular-nums">{entry.rank}</span>
        <div className="flex items-center gap-2 min-w-0">
          <SmallLogo logoUrl={entry.logoUrl} name={entry.teamName} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-200 text-xs truncate">{entry.teamAbbreviation}</p>
            {entry.gb && entry.gb !== '—' && (
              <p className="text-[9px] text-gray-600">GB: {entry.gb}</p>
            )}
          </div>
        </div>
        <span className="text-center font-bold text-gray-100 tabular-nums">{entry.wins}</span>
        <span className="text-center text-gray-400 tabular-nums">{entry.losses}</span>
        <span className="text-center text-gray-500 tabular-nums text-[11px]">
          {isHockey ? (entry.draws ?? 0) : (entry.pct ?? '—')}
        </span>
        <span className="text-center text-gray-500 text-[11px] tabular-nums">{entry.last10 ?? '—'}</span>
        <span className="text-center">
          {entry.streak ? <StreakBadge streak={entry.streak} /> : <span className="text-gray-600">—</span>}
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
  const [activeLeague, setActiveLeague] = useState<LeagueId>('NBA')
  const standings = MOCK_STANDINGS[activeLeague]

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <TransitionChild
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <DialogPanel className="pointer-events-auto w-screen max-w-sm">
                  <div className="flex h-full flex-col bg-gray-950 border-l border-gray-800 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                      <div className="flex items-center gap-2">
                        <TableCellsIcon className="size-5 text-indigo-400" />
                        <h2 className="text-base font-bold text-gray-100">Standings</h2>
                      </div>
                      <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
                      >
                        <XMarkIcon className="size-5" />
                      </button>
                    </div>

                    {/* League tabs */}
                    <div className="flex gap-1 p-3 border-b border-gray-800">
                      {AVAILABLE_LEAGUES.map((lid) => (
                        <button
                          key={lid}
                          onClick={() => setActiveLeague(lid)}
                          className={classNames(
                            'flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors',
                            activeLeague === lid
                              ? classNames(LEAGUE_COLORS[lid], 'ring-1 ring-inset ring-current/30')
                              : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300',
                          )}
                        >
                          {lid}
                        </button>
                      ))}
                    </div>

                    {/* Standings content */}
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                      {standings ? (
                        <StandingsTable standings={standings} leagueId={activeLeague} />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <TableCellsIcon className="size-10 text-gray-700 mb-3" />
                          <p className="text-sm text-gray-500">Standings not available for {activeLeague}</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-800 px-4 py-3">
                      <p className="text-[10px] text-gray-700 text-center">
                        Standings data is for informational purposes only
                      </p>
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
