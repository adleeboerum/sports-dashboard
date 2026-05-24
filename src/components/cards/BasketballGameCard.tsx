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
  if (lower.includes('ot')) return { num: 5, isOT: true, label: 'OT' }
  const num = parseInt(period.match(/\d+/)?.[0] ?? '0')
  return { num, isOT: false, label: `Q${num || '?'}` }
}

function QuarterIndicator({ activeQuarter, isOT }: { activeQuarter: number; isOT: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4].map((q) => (
        <div
          key={q}
          className={classNames(
            'h-1 w-5 rounded-full transition-colors',
            q < activeQuarter ? 'bg-orange-400' : q === activeQuarter ? 'bg-orange-500 ring-1 ring-orange-300' : 'bg-gray-700',
          )}
        />
      ))}
      {isOT && <div className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">OT</div>}
    </div>
  )
}

export default function BasketballGameCard({
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
      accentClass="bg-gradient-to-r from-orange-700 via-orange-400 to-orange-700"
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
                <div className="flex flex-col items-center gap-1 rounded-lg bg-green-500/10 px-3 py-1.5 ring-1 ring-green-500/30">
                  <p className="font-mono text-3xl font-black leading-none text-green-300 tabular-nums">
                    {game.clock ?? '--:--'}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wider text-green-400">{label}</p>
                </div>
                <QuarterIndicator activeQuarter={num} isOT={isOT} />
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
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Tipoff</p>
                <QuarterIndicator activeQuarter={0} isOT={false} />
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
