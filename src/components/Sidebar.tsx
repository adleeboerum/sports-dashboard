import { useState } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import {
  XMarkIcon,
  Bars3Icon,
  StarIcon,
  SignalIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline'
import { TrophyIcon as TrophyIconSolid } from '@heroicons/react/24/solid'
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
  totalGames: number
  liveCount: number
  favoritesCount: number
}

const sortOptions: { value: FilterState['sortBy']; label: string }[] = [
  { value: 'time', label: 'Start Time' },
  { value: 'league', label: 'League' },
  { value: 'odds', label: 'Odds Availability' },
  { value: 'tickets', label: 'Ticket Price' },
]

function SidebarContent({ filters, onToggleLeague, onSetSearch, onToggleFavoritesOnly, onToggleLiveOnly, onSetSortBy, onReset, totalGames, liveCount, favoritesCount }: Props) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto px-5 pb-4">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-800">
        <TrophyIconSolid className="size-7 text-indigo-500" />
        <span className="text-lg font-black tracking-tight text-white">GameDay</span>
        <span className="text-lg font-black tracking-tight text-indigo-400">Hub</span>
      </div>

      {/* Stats */}
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

      {/* Search */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Search</label>
        <SearchBar value={filters.search} onChange={onSetSearch} />
      </div>

      {/* Quick filters */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Quick Filters</label>
        <div className="space-y-1.5">
          <button
            onClick={onToggleFavoritesOnly}
            className={classNames(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              filters.favoritesOnly
                ? 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/30'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
            )}
          >
            <StarIcon className="size-4" />
            Favorites Only
          </button>
          <button
            onClick={onToggleLiveOnly}
            className={classNames(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              filters.liveOnly
                ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/30'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
            )}
          >
            <SignalIcon className="size-4" />
            Live Games Only
          </button>
        </div>
      </div>

      {/* League filter */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Leagues</label>
        <LeagueFilter selectedLeagues={filters.leagues} onToggle={onToggleLeague} />
      </div>

      {/* Sort */}
      <div>
        <label className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <ArrowsUpDownIcon className="size-3.5" />
          Sort By
        </label>
        <div className="space-y-1">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSetSortBy(opt.value)}
              className={classNames(
                'flex w-full items-center rounded-lg px-3 py-1.5 text-sm transition-colors',
                filters.sortBy === opt.value
                  ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div className="mt-auto">
        <button
          onClick={onReset}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-700 py-2 text-sm text-gray-500 hover:border-gray-600 hover:text-gray-300 transition-colors"
        >
          <FunnelIcon className="size-4" />
          Reset Filters
        </button>
      </div>
    </div>
  )
}

export default function Sidebar(props: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = () => setMobileOpen(false)
  const mobileProps: Props = {
    ...props,
    onToggleLeague: (l) => { props.onToggleLeague(l); closeMobile() },
    onSetSearch: props.onSetSearch,
    onToggleFavoritesOnly: () => { props.onToggleFavoritesOnly(); closeMobile() },
    onToggleLiveOnly: () => { props.onToggleLiveOnly(); closeMobile() },
    onSetSortBy: (s) => { props.onSetSortBy(s); closeMobile() },
    onReset: () => { props.onReset(); closeMobile() },
  }

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex size-12 items-center justify-center rounded-full bg-indigo-600 shadow-lg text-white xl:hidden"
      >
        <Bars3Icon className="size-6" />
      </button>

      {/* Mobile sidebar */}
      <Dialog open={mobileOpen} onClose={closeMobile} className="relative z-50 xl:hidden">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="fixed inset-0 flex">
          <DialogPanel className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-200">
            <div className="absolute top-0 left-full flex w-16 justify-center pt-5">
              <button onClick={closeMobile} className="-m-2.5 p-2.5">
                <XMarkIcon className="size-6 text-white" />
              </button>
            </div>
            <div className="flex grow flex-col overflow-y-auto bg-gray-950 ring-1 ring-gray-800">
              <SidebarContent {...mobileProps} />
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Desktop sidebar */}
      <div className="hidden xl:fixed xl:inset-y-0 xl:z-50 xl:flex xl:w-64 xl:flex-col">
        <div className="flex grow flex-col overflow-y-auto bg-gray-950 ring-1 ring-gray-800/80">
          <SidebarContent {...props} />
        </div>
      </div>
    </>
  )
}
