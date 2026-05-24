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

function parseQuarter(period?: string): { num: number; isOT: boolean; label: string } {
  if (!period) return { num: 0, isOT: false, label: '—' }
  const lower = period.toLowerCase()
  if (lower.includes('half')) return { num: 0, isOT: false, label: 'HALF' }
  if (lower.includes('ot') || lower.includes('overtime')) return { num: 5, isOT: true, label: 'OT' }
  const num = parseInt(period.match(/\d+/)?.[0] ?? '0')
  return { num, isOT: false, label: `Q${num || '?'}` }
}

function FieldBar({ activeQuarter, isOT }: { activeQuarter: number; isOT: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4].map((q) => (
        <div
          key={q}
          className={classNames(
            'h-1.5 w-6 rounded-sm transition-colors',
            q <= activeQuarter ? 'bg-emerald-400' : 'bg-gray-700',
            q === activeQuarter && 'ring-1 ring-emerald-200',
          )}
        />
      ))}
      {isOT && <div className="ml-1 rounded-sm bg-red-500 px-1.5 text-[10px] font-bold text-white">OT</div>}
    </div>
  )
}

export default function FootballGameCard({
  game,
  isFavoriteHome,
  isFavoriteAway,
  onToggleFavorite,
  onClick,
}: CardProps) {
  const isLive = game.status === 'live'
  const isFinal = game.status === 'final'
  const odds = game.odds?.[0]
  const { num, isOT, label } = parseQuarter(game.period)

  return (
    <CardShell
      game={game}
      isFavoriteHome={isFavoriteHome}
      isFavoriteAway={isFavoriteAway}
      onClick={onClick}
      accentClass="bg-gradient-to-r from-emerald-900 via-emerald-500 to-emerald-900"
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
                <div className="flex flex-col items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 ring-1 ring-emerald-500/30">
                  <p className="font-mono text-3xl font-black leading-none text-emerald-300 tabular-nums">
                    {game.clock ?? '--:--'}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">{label}</p>
                </div>
                <FieldBar activeQuarter={num} isOT={isOT} />
              </>
            ) : isFinal ? (
              <>
                <ScoreDisplay away={game.awayScore ?? 0} home={game.homeScore ?? 0} />
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Final{isOT ? ' · OT' : ''}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-black tabular-nums leading-none text-gray-100">
                  {formatGameTime(game.startTime)}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Kickoff</p>
                <FieldBar activeQuarter={0} isOT={false} />
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

        <OddsRow game={game} spreadLabel="Spread" />
      </div>

      <VenueBroadcast game={game} />
      <TicketStrip game={game} />
    </CardShell>
  )
}
