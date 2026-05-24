// Backtest: replay the prediction engine on finished games and score it.
//
// Caveats — read before drawing conclusions:
// 1. ESPN returns CURRENT team records, not records as of game day. So the
//    "Record edge" factor leaks future games into past predictions. Real
//    backtests need snapshotted records; this is "directional" only.
// 2. ESPN closing odds aren't always present. We skip games without odds for
//    market-comparison metrics, which biases toward bigger/marquee matchups.
// 3. No vig is paid on simulated bets (we bet at the displayed American line).
// 4. Sample sizes for a 7–30 day window are small. Treat results as a sanity
//    check, not a verdict.

import type { BetMarket, Game, LeagueId, ValueRating } from '../types'
import { predictGame, americanToImpliedProb } from './predictionEngine'

export interface BetGroupStats {
  picks: number
  wins: number
  pushes: number
  losses: number
  hitRate: number // wins / decided
  roi: number // profit per $1 wagered
  profit: number // dollars assuming $100/bet
  staked: number // dollars staked
}

export interface BacktestResult {
  scope: {
    startYmd: string
    endYmd: string
    leagues: LeagueId[] | 'all'
  }
  // Coverage
  finishedGames: number
  gamesWithOdds: number
  predicted: number

  // Projection accuracy
  marginMae: number | null
  totalMae: number | null
  mlAccuracy: number | null // model favorite winning, conditional on prediction
  mlSampleSize: number

  // Betting performance
  overall: BetGroupStats
  byValue: Record<ValueRating, BetGroupStats>
  byMarket: Record<BetMarket, BetGroupStats>
  byLeague: Partial<Record<LeagueId, BetGroupStats>>

  caveats: string[]
}

interface Settled {
  league: LeagueId
  market: BetMarket
  value: ValueRating
  edge: number
  result: 'win' | 'loss' | 'push'
  payout: number // dollars on $100 stake (signed: -100 on loss)
}

function emptyStats(): BetGroupStats {
  return { picks: 0, wins: 0, pushes: 0, losses: 0, hitRate: 0, roi: 0, profit: 0, staked: 0 }
}

function addBet(stats: BetGroupStats, s: Settled) {
  stats.picks += 1
  stats.staked += 100
  stats.profit += s.payout
  if (s.result === 'win') stats.wins += 1
  else if (s.result === 'push') stats.pushes += 1
  else stats.losses += 1
}

function finalize(stats: BetGroupStats) {
  const decided = stats.wins + stats.losses
  stats.hitRate = decided ? stats.wins / decided : 0
  stats.roi = stats.staked ? stats.profit / stats.staked : 0
}

// $100 bet payout (signed). Win on +120 → +$120; win on -150 → +$66.67.
function payoutOnHundred(americanOdds: string, result: 'win' | 'loss' | 'push'): number {
  if (result === 'push') return 0
  if (result === 'loss') return -100
  const n = parseFloat(americanOdds)
  if (!Number.isFinite(n)) return 0
  return n > 0 ? n : (100 / Math.abs(n)) * 100
}

// Settle a single market edge against the final score.
function settleEdge(
  edge: {
    side:
      | { market: 'moneyline'; team: 'home' | 'away' }
      | { market: 'spread'; team: 'home' | 'away' }
      | { market: 'total'; pick: 'over' | 'under' }
    americanOdds: string
    edge: number
    value: ValueRating
  },
  game: Game,
): Settled | null {
  if (game.homeScore == null || game.awayScore == null) return null
  const margin = game.homeScore - game.awayScore
  const total = game.homeScore + game.awayScore

  let result: 'win' | 'loss' | 'push' = 'loss'
  let market: BetMarket = edge.side.market

  if (edge.side.market === 'moneyline') {
    const homeWon = margin > 0
    const awayWon = margin < 0
    if (margin === 0) result = 'push'
    else result = (edge.side.team === 'home' ? homeWon : awayWon) ? 'win' : 'loss'
  } else if (edge.side.market === 'spread') {
    // We need the market spread to settle. We approximate it from the implied prob:
    // since the side carries fairAmericanOdds + americanOdds, we can't recover the
    // exact spread number cleanly. Use the best ESPN odds line directly instead.
    const sp = bestSpreadFromGame(game)
    if (!sp) return null
    const homeSpread = sp.spread
    const homeCoverMargin = margin + homeSpread // home covers if > 0
    if (homeCoverMargin === 0) result = 'push'
    else {
      const homeCovers = homeCoverMargin > 0
      result = (edge.side.team === 'home' ? homeCovers : !homeCovers) ? 'win' : 'loss'
    }
  } else if (edge.side.market === 'total') {
    const tt = bestTotalFromGame(game)
    if (!tt) return null
    if (total === tt.line) result = 'push'
    else result = (edge.side.pick === 'over' ? total > tt.line : total < tt.line) ? 'win' : 'loss'
  }

  return {
    league: game.leagueId,
    market,
    value: edge.value,
    edge: edge.edge,
    result,
    payout: payoutOnHundred(edge.americanOdds, result),
  }
}

// Mirror of best* helpers from predictionEngine but kept private here so we
// can derive the actual spread/total numbers needed for settlement.
function bestSpreadFromGame(game: Game): { spread: number; homeOdds: string; awayOdds: string } | null {
  if (!game.odds?.length) return null
  let best: { sum: number; spread: number; homeOdds: string; awayOdds: string } | null = null
  for (const o of game.odds) {
    const spread = parseFloat(o.spread.home)
    if (!Number.isFinite(spread)) continue
    const ph = americanToImpliedProb(o.spread.homeSpread)
    const pa = americanToImpliedProb(o.spread.awaySpread)
    if (ph == null || pa == null) continue
    const sum = ph + pa
    if (!best || sum < best.sum) best = { sum, spread, homeOdds: o.spread.homeSpread, awayOdds: o.spread.awaySpread }
  }
  return best
}

function bestTotalFromGame(game: Game): { line: number; overOdds: string; underOdds: string } | null {
  if (!game.odds?.length) return null
  let best: { sum: number; line: number; overOdds: string; underOdds: string } | null = null
  for (const o of game.odds) {
    if (!Number.isFinite(o.total.line) || o.total.line <= 0) continue
    const po = americanToImpliedProb(o.total.over)
    const pu = americanToImpliedProb(o.total.under)
    if (po == null || pu == null) continue
    const sum = po + pu
    if (!best || sum < best.sum) best = { sum, line: o.total.line, overOdds: o.total.over, underOdds: o.total.under }
  }
  return best
}

// Bet selection rule: take positive-edge picks with edge >= MIN_EDGE.
const MIN_EDGE = 0.03

export interface BacktestOptions {
  startYmd: string
  endYmd: string
  leagues: LeagueId[] | 'all'
}

export function runBacktest(games: Game[], opts: BacktestOptions): BacktestResult {
  const finished = games.filter((g) => g.status === 'final' && g.homeScore != null && g.awayScore != null)
  const withOdds = finished.filter((g) => g.odds?.length)

  // Projection accuracy (independent of betting markets)
  let marginErr = 0, marginN = 0
  let totalErr = 0, totalN = 0
  let mlHits = 0, mlSample = 0

  // Betting buckets
  const overall = emptyStats()
  const byValue: Record<ValueRating, BetGroupStats> = {
    1: emptyStats(), 2: emptyStats(), 3: emptyStats(), 4: emptyStats(), 5: emptyStats(),
  }
  const byMarket: Record<BetMarket, BetGroupStats> = {
    moneyline: emptyStats(), spread: emptyStats(), total: emptyStats(),
  }
  const byLeague: Partial<Record<LeagueId, BetGroupStats>> = {}

  let predicted = 0
  for (const game of finished) {
    const p = predictGame(game)
    if (!p) continue
    predicted += 1

    const actualMargin = (game.homeScore ?? 0) - (game.awayScore ?? 0)
    const actualTotal = (game.homeScore ?? 0) + (game.awayScore ?? 0)
    marginErr += Math.abs(p.modelMargin - actualMargin); marginN += 1
    totalErr += Math.abs(p.modelTotal - actualTotal); totalN += 1

    // ML accuracy: pick whichever side the model leans on, even slightly.
    const modelPicksHome = p.modelHomeWinProb > 0.5
    const homeWon = actualMargin > 0
    if (actualMargin !== 0) {
      mlSample += 1
      if (modelPicksHome === homeWon) mlHits += 1
    }

    // Betting performance (requires odds)
    for (const edge of p.edges) {
      if (edge.edge < MIN_EDGE) continue
      const settled = settleEdge(edge, game)
      if (!settled) continue
      addBet(overall, settled)
      addBet(byValue[settled.value], settled)
      addBet(byMarket[settled.market], settled)
      const leagueBucket = byLeague[settled.league] ?? emptyStats()
      addBet(leagueBucket, settled)
      byLeague[settled.league] = leagueBucket
    }
  }

  finalize(overall)
  for (const v of [1, 2, 3, 4, 5] as ValueRating[]) finalize(byValue[v])
  for (const m of ['moneyline', 'spread', 'total'] as BetMarket[]) finalize(byMarket[m])
  for (const lid of Object.keys(byLeague) as LeagueId[]) finalize(byLeague[lid]!)

  return {
    scope: opts,
    finishedGames: finished.length,
    gamesWithOdds: withOdds.length,
    predicted,
    marginMae: marginN ? marginErr / marginN : null,
    totalMae: totalN ? totalErr / totalN : null,
    mlAccuracy: mlSample ? mlHits / mlSample : null,
    mlSampleSize: mlSample,
    overall,
    byValue,
    byMarket,
    byLeague,
    caveats: [
      'ESPN team records reflect TODAY, not as-of-game date — the "record" factor leaks future results into past predictions.',
      'Games without ESPN odds are excluded from betting metrics.',
      'Simulated $100 flat-stake bets at the displayed line. No vig modeling beyond the listed odds.',
      `Bet selection rule: positive edge ≥ ${(MIN_EDGE * 100).toFixed(0)}%.`,
      'Sample sizes for short windows are small. Treat as directional, not predictive.',
    ],
  }
}
