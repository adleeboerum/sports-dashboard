import { useState } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { XMarkIcon, Bars3Icon, StarIcon, SignalIcon, FunnelIcon, ArrowsUpDownIcon, TableCellsIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { TrophyIcon as TrophySolid } from '@heroicons/react/24/solid'
import type { FilterState, LeagueId } from '../types'
import LeagueFilter from './LeagueFilter'
import SearchBar from './SearchBar'
import { classNames } from '../utils/formatters'

interface Props {
  filters: FilterState
  onToggleLeague: (l: LeagueId) => void
  onSetSearch: (s: string) => void
  onToggleFavoritesOnly: () => void
  onToggleLiveOnly: () => void
  onSetSortBy: (s: FilterState['sortBy']) => void
  onReset: () => void
  onOpenStandings: () => void
  onOpenPredictions: () => void
  totalGames: number
  liveCount: number
  favoritesCount: number
}

const SORT_OPTS: { value: FilterState['sortBy']; label: string }[] = [
  { value: 'time',    label: 'Start Time'       },
  { value: 'league',  label: 'League'            },
  { value: 'odds',    label: 'Odds Availability' },
  { value: 'tickets', label: 'Ticket Price'      },
]

function Content({ filters, onToggleLeague, onSetSearch, onToggleFavoritesOnly, onToggleLiveOnly, onSetSortBy, onReset, onOpenStandings, onOpenPredictions, totalGames, liveCount, favoritesCount }: Props) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto px-5 pb-4">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-800">
        <TrophySolid className="size-7 text-indigo-500" />
        <span className="text-lg font-black tracking-tight text-white">GameDay</span>
        <span className="text-lg font-black tracking-tight text-indigo-400">Hub</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-gray-800/60 p-2 text-center">
          <p className="text-lg font-bold text-gray-100">{totalGames}</p>
          <p className="text-xs text-gray-500">Games</p>
        </div>
        <div className="rounded-lg bg-green-900/30 p-2 text-center">
          <p className="text-lg font-bold text-green-400">{liveCount}</p>
          <p className="text-xs text-gray-500">Live</p>
        </div>
        <div className="rounded-lg bg-yellow-900/20 p-2 text-center">
          <p className="text-lg font-bold text-yellow-400">{favoritesCount}</p>
          <p className="text-xs text-gray-500">Fav</p>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Search</label>
        <SearchBar value={filters.search} onChange={onSetSearch} />
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Quick Filters</label>
        <div className="space-y-1.5">
          <button onClick={onToggleFavoritesOnly} className={classNames('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors', filters.favoritesOnly ? 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200')}>
            <StarIcon className="size-4" /> Favorites Only
          </button>
          <button onClick={onToggleLiveOnly} className={classNames('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors', filters.liveOnly ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200')}>
            <SignalIcon className="size-4" /> Live Games Only
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Leagues</label>
        <LeagueFilter selectedLeagues={filters.leagues} onToggle={onToggleLeague} />
      </div>

      <div>
        <label className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <ArrowsUpDownIcon className="size-3.5" /> Sort By
        </label>
        <div className="space-y-1">
          {SORT_OPTS.map((opt) => (
            <button key={opt.value} onClick={() => onSetSortBy(opt.value)} className={classNames('flex w-full items-center rounded-lg px-3 py-1.5 text-sm transition-colors', filters.sortBy === opt.value ? 'bg-indigo-600/20 text-indigo-300 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200')}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <button onClick={onOpenPredictions} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/40 py-2 text-sm text-indigo-300 hover:from-indigo-600/30 hover:to-purple-600/30 hover:border-indigo-400/60 transition-colors">
          <SparklesIcon className="size-4" /> Model Picks
        </button>
        <button onClick={onOpenStandings} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600/15 border border-indigo-500/30 py-2 text-sm text-indigo-400 hover:bg-indigo-600/25 hover:border-indigo-400/50 transition-colors">
          <TableCellsIcon className="size-4" /> Standings
        </button>
        <button onClick={onReset} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-700 py-2 text-sm text-gray-500 hover:border-gray-600 hover:text-gray-300 transition-colors">
          <FunnelIcon className="size-4" /> Reset Filters
        </button>
      </div>
    </div>
  )
}

export default function Sidebar(props: Props) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const mobileProps: Props = {
    ...props,
    onToggleLeague:      (l) => { props.onToggleLeague(l); close() },
    onToggleFavoritesOnly: () => { props.onToggleFavoritesOnly(); close() },
    onToggleLiveOnly:    () => { props.onToggleLiveOnly(); close() },
    onSetSortBy:         (s) => { props.onSetSortBy(s); close() },
    onReset:             () => { props.onReset(); close() },
    onOpenStandings:     () => { props.onOpenStandings(); close() },
    onOpenPredictions:   () => { props.onOpenPredictions(); close() },
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-40 flex size-12 items-center justify-center rounded-full bg-indigo-600 shadow-lg text-white xl:hidden">
        <Bars3Icon className="size-6" />
      </button>

      <Dialog open={open} onClose={close} className="relative z-50 xl:hidden">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="fixed inset-0 flex">
          <DialogPanel className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-200">
            <div className="absolute top-0 left-full flex w-16 justify-center pt-5">
              <button onClick={close} className="-m-2.5 p-2.5"><XMarkIcon className="size-6 text-white" /></button>
            </div>
            <div className="flex grow flex-col overflow-y-auto bg-gray-950 ring-1 ring-gray-800">
              <Content {...mobileProps} />
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <div className="hidden xl:fixed xl:inset-y-0 xl:z-50 xl:flex xl:w-64 xl:flex-col">
        <div className="flex grow flex-col overflow-y-auto bg-gray-950 ring-1 ring-gray-800/80">
          <Content {...props} />
        </div>
      </div>
    </>
  )
}
