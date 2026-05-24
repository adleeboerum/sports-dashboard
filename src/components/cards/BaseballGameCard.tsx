import { formatGameTime } from '../../utils/formatters'
import {
  CardShell,
  LeagueBadge,
  OddsRow,
  ScoreDisplay,
  StatusPill,
  TeamColumn,
  TicketStrip,
  VenueBroadcast,
  type CardProps,
} from './cardShared'

function Diamond({ half }: { half?: 'top' | 'bottom' }) {
  // Diamond rotated so home plate sits at the bottom.
  // Highlight which half of the inning it is by tinting one half.
  const topActive = half === 'top'
  const bottomActive = half === 'bottom'
  return (
    <svg viewBox="0 0 64 64" className="size-14" aria-hidden="true">
      {/* outer infield diamond */}
      <polygon
        points="32,8 56,32 32,56 8,32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-gray-700"
      />
      {/* dividing line through 1B-3B to show top/bottom */}
      <line x1="8" y1="32" x2="56" y2="32" stroke="currentColor" strokeWidth="0.75" className="text-gray-800" />
      {/* top half tint (top of inning = away batting) */}
      {topActive && <polygon points="32,8 56,32 8,32" className="fill-emerald-500/15" />}
      {/* bottom half tint (bottom of inning = home batting) */}
      {bottomActive && <polygon points="8,32 56,32 32,56" className="fill-amber-500/15" />}
      {/* bases */}
      <rect x="29" y="5" width="6" height="6" transform="rotate(45 32 8)" className="fill-gray-600" />
      <rect x="53" y="29" width="6" height="6" transform="rotate(45 56 32)" className="fill-gray-600" />
      <rect x="5" y="29" width="6" height="6" transform="rotate(45 8 32)" className="fill-gray-600" />
      {/* home plate */}
      <polygon points="28,52 36,52 36,56 32,60 28,56" className="fill-gray-500" />
    </svg>
  )
}

function parseInning(period?: string): { half?: 'top' | 'bottom'; label: string } {
  if (!period) return { label: '—' }
  const lower = period.toLowerCase()
  const num = period.match(/\d+/)?.[0]
  if (lower.includes('top')) return { half: 'top', label: `▲ ${num ?? ''}`.trim() }
  if (lower.includes('bot') || lower.includes('bottom')) return { half: 'bottom', label: `▼ ${num ?? ''}`.trim() }
  if (lower.includes('mid')) return { label: `MID ${num ?? ''}`.trim() }
  return { label: period }
}

export default function BaseballGameCard({
  game,
  isFavoriteHome,
  isFavoriteAway,
  onToggleFavorite,
  onClick,
}: CardProps) {
  const isLive = game.status === 'live'
  const isFinal = game.status === 'final'
  const odds = game.odds?.[0]
  const { half, label } = parseInning(game.period)

  return (
    <CardShell
      game={game}
      isFavoriteHome={isFavoriteHome}
      isFavoriteAway={isFavoriteAway}
      onClick={onClick}
      accentClass="bg-gradient-to-r from-blue-800 via-blue-500 to-blue-800"
    >
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <LeagueBadge game={game} />
          <StatusPill game={game} />
        </div>

        <div className="flex items-start justify-between gap-2">
          <TeamColumn
            team={game.awayTeam}
            isFavorite={isFavoriteAway}
            onToggleFavorite={onToggleFavorite}
            moneyline={odds?.moneyline.away}
          />

          <div className="flex min-w-[130px] flex-col items-center justify-start gap-1">
            {isLive ? (
              <>
                <ScoreDisplay away={game.awayScore ?? 0} home={game.homeScore ?? 0} size="md" />
                <Diamond half={half} />
                <div className="rounded-md bg-green-500/10 px-2.5 py-1 ring-1 ring-green-500/30">
                  <p className="text-xl font-black tabular-nums leading-none text-green-300">{label}</p>
                </div>
              </>
            ) : isFinal ? (
              <>
                <ScoreDisplay away={game.awayScore ?? 0} home={game.homeScore ?? 0} />
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-500">Final</p>
              </>
            ) : (
              <>
                <Diamond />
                <p className="text-3xl font-black tabular-nums leading-none text-gray-100">
                  {formatGameTime(game.startTime)}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-gray-500">First Pitch</p>
              </>
            )}
          </div>

          <TeamColumn
            team={game.homeTeam}
            isFavorite={isFavoriteHome}
            onToggleFavorite={onToggleFavorite}
            moneyline={odds?.moneyline.home}
          />
        </div>

        {/* Probable pitchers (scheduled games) */}
        {!isFinal && !isLive && game.probablePitchers && (game.probablePitchers.home || game.probablePitchers.away) && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-md bg-gray-800/50 px-2 py-1">
              <p className="text-gray-600">SP · {game.awayTeam.abbreviation}</p>
              <p className="truncate font-semibold text-gray-200">{game.probablePitchers.away?.name ?? 'TBD'}</p>
            </div>
            <div className="rounded-md bg-gray-800/50 px-2 py-1">
              <p className="text-gray-600">SP · {game.homeTeam.abbreviation}</p>
              <p className="truncate font-semibold text-gray-200">{game.probablePitchers.home?.name ?? 'TBD'}</p>
            </div>
          </div>
        )}

        <OddsRow game={game} spreadLabel="Run Line" />
      </div>

      <VenueBroadcast game={game} />
      <TicketStrip game={game} />
    </CardShell>
  )
}
