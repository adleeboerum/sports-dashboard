import { classNames, formatGameTime } from '../../utils/formatters'
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

function parsePeriod(period?: string): { num: number; isOT: boolean; isSO: boolean; label: string } {
  if (!period) return { num: 0, isOT: false, isSO: false, label: '—' }
  const lower = period.toLowerCase()
  if (lower.includes('shootout') || lower === 'so') return { num: 5, isOT: false, isSO: true, label: 'SO' }
  if (lower.includes('ot') || lower.includes('overtime')) return { num: 4, isOT: true, isSO: false, label: 'OT' }
  const num = parseInt(period.match(/\d+/)?.[0] ?? '0')
  return { num, isOT: false, isSO: false, label: `P${num || '?'}` }
}

function PeriodDots({ active, isOT, isSO }: { active: number; isOT: boolean; isSO: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((p) => (
        <span
          key={p}
          className={classNames(
            'block size-2.5 rounded-full transition-colors',
            p < active ? 'bg-cyan-500' : p === active ? 'bg-cyan-300 ring-2 ring-cyan-500/30' : 'bg-gray-700',
          )}
        />
      ))}
      {(isOT || isSO) && (
        <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {isSO ? 'SO' : 'OT'}
        </span>
      )}
    </div>
  )
}

export default function HockeyGameCard({
  game,
  isFavoriteHome,
  isFavoriteAway,
  onToggleFavorite,
  onClick,
}: CardProps) {
  const isLive = game.status === 'live'
  const isFinal = game.status === 'final'
  const odds = game.odds?.[0]
  const { num, isOT, isSO, label } = parsePeriod(game.period)

  return (
    <CardShell
      game={game}
      isFavoriteHome={isFavoriteHome}
      isFavoriteAway={isFavoriteAway}
      onClick={onClick}
      accentClass="bg-gradient-to-r from-slate-700 via-cyan-400 to-slate-700"
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

          <div className="flex min-w-[130px] flex-col items-center justify-start gap-2">
            {isLive ? (
              <>
                <ScoreDisplay away={game.awayScore ?? 0} home={game.homeScore ?? 0} />
                <div className="flex flex-col items-center gap-1 rounded-lg bg-cyan-500/10 px-3 py-1.5 ring-1 ring-cyan-500/30">
                  <p className="font-mono text-3xl font-black leading-none text-cyan-200 tabular-nums">
                    {game.clock ?? '--:--'}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">{label}</p>
                </div>
                <PeriodDots active={num} isOT={isOT} isSO={isSO} />
              </>
            ) : isFinal ? (
              <>
                <ScoreDisplay away={game.awayScore ?? 0} home={game.homeScore ?? 0} />
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Final{isOT ? ' · OT' : isSO ? ' · SO' : ''}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-black tabular-nums leading-none text-gray-100">
                  {formatGameTime(game.startTime)}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Puck Drop</p>
                <PeriodDots active={0} isOT={false} isSO={false} />
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

        <OddsRow game={game} spreadLabel="Puck Line" />
      </div>

      <VenueBroadcast game={game} />
      <TicketStrip game={game} />
    </CardShell>
  )
}
