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

function parseMinute(period?: string, clock?: string): { minute: number; half: 1 | 2 | null; isHT: boolean; label: string } {
  const lower = (period ?? '').toLowerCase()
  if (lower.includes('half') && lower.includes('time')) return { minute: 45, half: null, isHT: true, label: 'HT' }
  if (lower.includes('full')) return { minute: 90, half: null, isHT: false, label: 'FT' }
  // Prefer minute from clock (e.g. "67:23" or "67'")
  const src = clock ?? period ?? ''
  const num = parseInt(src.match(/\d+/)?.[0] ?? '0')
  if (num === 0) return { minute: 0, half: null, isHT: false, label: '—' }
  const half: 1 | 2 = num <= 45 ? 1 : 2
  return { minute: num, half, isHT: false, label: `${num}'` }
}

function PitchProgress({ minute }: { minute: number }) {
  const pct = Math.min(100, (minute / 90) * 100)
  return (
    <div className="w-full max-w-[150px]">
      <div className="relative h-1 w-full rounded-full bg-gray-700 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-full w-px bg-gray-800" />
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-gray-600">
        <span>0'</span>
        <span>45'</span>
        <span>90'</span>
      </div>
    </div>
  )
}

export default function SoccerGameCard({
  game,
  isFavoriteHome,
  isFavoriteAway,
  onToggleFavorite,
  onClick,
}: CardProps) {
  const isLive = game.status === 'live'
  const isFinal = game.status === 'final'
  const odds = game.odds?.[0]
  const { minute, half, isHT, label } = parseMinute(game.period, game.clock)

  return (
    <CardShell
      game={game}
      isFavoriteHome={isFavoriteHome}
      isFavoriteAway={isFavoriteAway}
      onClick={onClick}
      accentClass="bg-gradient-to-r from-green-800 via-lime-400 to-green-800"
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

          <div className="flex min-w-[140px] flex-col items-center justify-start gap-2">
            {isLive ? (
              <>
                <ScoreDisplay away={game.awayScore ?? 0} home={game.homeScore ?? 0} />
                <div className="flex flex-col items-center gap-1 rounded-lg bg-lime-500/10 px-3 py-1.5 ring-1 ring-lime-500/30">
                  <p className="font-mono text-3xl font-black leading-none text-lime-300 tabular-nums">
                    {isHT ? 'HT' : label}
                  </p>
                  {half && <p className="text-xs font-bold uppercase tracking-wider text-lime-400">{half === 1 ? '1st Half' : '2nd Half'}</p>}
                </div>
                <PitchProgress minute={minute} />
              </>
            ) : isFinal ? (
              <>
                <ScoreDisplay away={game.awayScore ?? 0} home={game.homeScore ?? 0} />
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-500">Full Time</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-black tabular-nums leading-none text-gray-100">
                  {formatGameTime(game.startTime)}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Kickoff</p>
                <PitchProgress minute={0} />
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

        <OddsRow game={game} spreadLabel="Goal Line" />
      </div>

      <VenueBroadcast game={game} />
      <TicketStrip game={game} />
    </CardShell>
  )
}

