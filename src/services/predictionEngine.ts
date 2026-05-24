// Heuristic prediction engine. Produces a model probability + projected total
// for each game using available data (records, form, ranking, home advantage,
// weather, MLB starter quality) and compares it against market odds to surface
// edges. No historical training data — this is a transparent rules-based v1.

import type {
  BetSide,
  GameOdds,
  Game,
  GamePrediction,
  LeagueId,
  MarketEdge,
  PredictionFactor,
  ValueRating,
} from '../types'

// ── League-specific tuning ────────────────────────────────────

interface LeagueProfile {
  // Average combined total (e.g. ~225 for NBA, ~44 for NFL).
  avgTotal: number
  // Home win probability under "equal teams" — captures court/field advantage.
  baseHomeWinProb: number
  // How aggressively a 1.0 (100-pp) gap in win% maps to win-prob points.
  // win-prob delta ≈ winPctDiff * recordWeight
  recordWeight: number
  // Points of spread per 1 percentage point of win-prob delta from 50%.
  // Used to derive a fair spread from the model's win probability.
  spreadCoefPerPct: number
  // Used to convert margin diff (model vs market spread) into cover prob.
  // Higher = more variance = smaller edges from the same delta.
  spreadStdDev: number
  // Used to convert total diff (model vs market total) into over/under prob.
  totalStdDev: number
  // Sport supports a draw as an outcome (soccer); affects ML probability sum.
  hasDraws: boolean
}

const LEAGUE_PROFILES: Record<LeagueId, LeagueProfile> = {
  NFL:   { avgTotal: 44,  baseHomeWinProb: 0.57, recordWeight: 0.40, spreadCoefPerPct: 0.18, spreadStdDev: 13.5, totalStdDev: 13.0, hasDraws: false },
  NCAAF: { avgTotal: 55,  baseHomeWinProb: 0.60, recordWeight: 0.45, spreadCoefPerPct: 0.22, spreadStdDev: 16.0, totalStdDev: 16.0, hasDraws: false },
  NBA:   { avgTotal: 225, baseHomeWinProb: 0.58, recordWeight: 0.35, spreadCoefPerPct: 0.30, spreadStdDev: 12.0, totalStdDev: 22.0, hasDraws: false },
  NCAAB: { avgTotal: 145, baseHomeWinProb: 0.62, recordWeight: 0.40, spreadCoefPerPct: 0.28, spreadStdDev: 11.0, totalStdDev: 18.0, hasDraws: false },
  MLB:   { avgTotal: 8.7, baseHomeWinProb: 0.54, recordWeight: 0.25, spreadCoefPerPct: 0.04, spreadStdDev: 3.0,  totalStdDev: 3.5,  hasDraws: false },
  NHL:   { avgTotal: 6.1, baseHomeWinProb: 0.55, recordWeight: 0.25, spreadCoefPerPct: 0.03, spreadStdDev: 2.4,  totalStdDev: 2.2,  hasDraws: false },
  MLS:   { avgTotal: 2.7, baseHomeWinProb: 0.55, recordWeight: 0.25, spreadCoefPerPct: 0.02, spreadStdDev: 1.6,  totalStdDev: 1.5,  hasDraws: true },
  EPL:   { avgTotal: 2.7, baseHomeWinProb: 0.55, recordWeight: 0.25, spreadCoefPerPct: 0.02, spreadStdDev: 1.6,  totalStdDev: 1.5,  hasDraws: true },
  UCL:   { avgTotal: 2.8, baseHomeWinProb: 0.55, recordWeight: 0.25, spreadCoefPerPct: 0.02, spreadStdDev: 1.6,  totalStdDev: 1.5,  hasDraws: true },
}

// ── Odds helpers ──────────────────────────────────────────────

export function americanToImpliedProb(odds: string | number | undefined): number | null {
  if (odds == null) return null
  const n = typeof odds === 'number' ? odds : parseFloat(odds)
  if (!Number.isFinite(n)) return null
  return n < 0 ? Math.abs(n) / (Math.abs(n) + 100) : 100 / (n + 100)
}

export function probToAmerican(p: number): string {
  const clamped = Math.min(0.999, Math.max(0.001, p))
  if (clamped >= 0.5) {
    const n = Math.round(-(clamped / (1 - clamped)) * 100)
    return `${n}`
  }
  const n = Math.round(((1 - clamped) / clamped) * 100)
  return `+${n}`
}

// Strip vig from a two-sided market via proportional normalization.
function stripVigTwoWay(homeOdds: string, awayOdds: string): { home: number; away: number } | null {
  const ph = americanToImpliedProb(homeOdds)
  const pa = americanToImpliedProb(awayOdds)
  if (ph == null || pa == null) return null
  const sum = ph + pa
  if (sum <= 0) return null
  return { home: ph / sum, away: pa / sum }
}

// Standard normal CDF (Abramowitz & Stegun 26.2.17 approximation). Used to
// translate "model margin vs market spread / total" deltas into probabilities.
function normalCdf(x: number): number {
  const a1 =  0.254829592
  const a2 = -0.284496736
  const a3 =  1.421413741
  const a4 = -1.453152027
  const a5 =  1.061405429
  const p  =  0.3275911
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x) / Math.SQRT2
  const t = 1.0 / (1.0 + p * ax)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax)
  return 0.5 * (1.0 + sign * y)
}

// ── Record parsing ────────────────────────────────────────────

interface RecordParts {
  wins: number
  losses: number
  draws: number
  games: number
  winPct: number
}

function parseRecord(record?: string): RecordParts | null {
  if (!record) return null
  const m = record.match(/(\d+)\s*-\s*(\d+)(?:\s*-\s*(\d+))?/)
  if (!m) return null
  const wins = Number(m[1])
  const losses = Number(m[2])
  const draws = m[3] != null ? Number(m[3]) : 0
  const games = wins + losses + draws
  if (games === 0) return null
  // Treat draws as half-wins so soccer/NHL OT-loss style records still rank.
  return { wins, losses, draws, games, winPct: (wins + draws * 0.5) / games }
}

// ── Win-probability model ─────────────────────────────────────

interface WinProbResult {
  homeWinProb: number
  factors: PredictionFactor[]
  hasGaps: boolean
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function computeWinProb(game: Game, profile: LeagueProfile): WinProbResult {
  const factors: PredictionFactor[] = []
  let hasGaps = false

  // Start at the league's baseline home edge.
  let homeProb = profile.baseHomeWinProb
  factors.push({
    label: 'Home advantage',
    delta: (profile.baseHomeWinProb - 0.5) * 100,
    detail: `${game.leagueId} baseline`,
  })

  // (1) Record differential. The biggest single signal we have.
  const hRec = parseRecord(game.homeTeam.record)
  const aRec = parseRecord(game.awayTeam.record)
  if (hRec && aRec) {
    const diff = hRec.winPct - aRec.winPct
    const delta = diff * profile.recordWeight
    homeProb += delta
    factors.push({
      label: 'Record edge',
      delta: delta * 100,
      detail: `${game.homeTeam.abbreviation} ${(hRec.winPct * 100).toFixed(0)}% vs ${game.awayTeam.abbreviation} ${(aRec.winPct * 100).toFixed(0)}%`,
    })
  } else {
    hasGaps = true
  }

  // (2) Home / away split records. Smaller weight than overall record.
  const hHomeRec = parseRecord(game.homeTeam.seasonStats?.homeRecord)
  const aAwayRec = parseRecord(game.awayTeam.seasonStats?.awayRecord)
  if (hHomeRec && aAwayRec) {
    const splitDiff = hHomeRec.winPct - aAwayRec.winPct
    const delta = splitDiff * 0.15
    homeProb += delta
    if (Math.abs(delta) > 0.005) {
      factors.push({
        label: 'Home/away splits',
        delta: delta * 100,
        detail: `${game.homeTeam.abbreviation} home ${(hHomeRec.winPct * 100).toFixed(0)}% vs ${game.awayTeam.abbreviation} away ${(aAwayRec.winPct * 100).toFixed(0)}%`,
      })
    }
  }

  // (3) Recent form (W/L/D arrays, typically last 5).
  const hForm = game.homeTeam.seasonStats?.recentForm
  const aForm = game.awayTeam.seasonStats?.recentForm
  if (hForm?.length && aForm?.length) {
    const hScore = formScore(hForm)
    const aScore = formScore(aForm)
    const delta = (hScore - aScore) * 0.10
    homeProb += delta
    if (Math.abs(delta) > 0.005) {
      factors.push({
        label: 'Recent form',
        delta: delta * 100,
        detail: `${game.homeTeam.abbreviation} ${formatForm(hForm)} vs ${game.awayTeam.abbreviation} ${formatForm(aForm)}`,
      })
    }
  }

  // (4) Ranking (mainly NCAA). Lower number = better. Unranked = ignored.
  if (game.homeTeam.ranking || game.awayTeam.ranking) {
    const hRank = game.homeTeam.ranking ?? 26
    const aRank = game.awayTeam.ranking ?? 26
    // Ranking #1 vs #25 ≈ 24/25 → ~0.10 win-prob bump
    const rankDiff = (aRank - hRank) / 25
    const delta = clamp(rankDiff, -1, 1) * 0.10
    homeProb += delta
    if (Math.abs(delta) > 0.005) {
      factors.push({
        label: 'Ranking',
        delta: delta * 100,
        detail: `#${game.homeTeam.ranking ?? 'NR'} vs #${game.awayTeam.ranking ?? 'NR'}`,
      })
    }
  }

  // (5) MLB probable starting pitcher ERA diff. Lower ERA = better.
  if (game.leagueId === 'MLB' && game.probablePitchers) {
    const hEra = parseFloat(game.probablePitchers.home?.stats?.ERA ?? '')
    const aEra = parseFloat(game.probablePitchers.away?.stats?.ERA ?? '')
    if (Number.isFinite(hEra) && Number.isFinite(aEra)) {
      // Each 1.0 ERA gap ≈ 6 win-prob points.
      const delta = clamp((aEra - hEra) * 0.06, -0.15, 0.15)
      homeProb += delta
      if (Math.abs(delta) > 0.005) {
        factors.push({
          label: 'Starting pitcher',
          delta: delta * 100,
          detail: `${game.homeTeam.abbreviation} ERA ${hEra.toFixed(2)} vs ${game.awayTeam.abbreviation} ERA ${aEra.toFixed(2)}`,
        })
      }
    } else if (!game.probablePitchers.home || !game.probablePitchers.away) {
      hasGaps = true
    }
  } else if (game.leagueId === 'MLB' && !game.probablePitchers) {
    hasGaps = true
  }

  // (6) Streak — small nudge. Capped at +/-5 game streak influence.
  const hStreak = parseStreak(game.homeTeam.seasonStats?.streak)
  const aStreak = parseStreak(game.awayTeam.seasonStats?.streak)
  if (hStreak != null || aStreak != null) {
    const delta = (clamp((hStreak ?? 0), -5, 5) - clamp((aStreak ?? 0), -5, 5)) * 0.005
    homeProb += delta
    if (Math.abs(delta) > 0.005) {
      factors.push({
        label: 'Streak',
        delta: delta * 100,
        detail: `${game.homeTeam.seasonStats?.streak ?? '—'} vs ${game.awayTeam.seasonStats?.streak ?? '—'}`,
      })
    }
  }

  // Clamp to plausible range. We never let the model claim certainty.
  homeProb = clamp(homeProb, 0.05, 0.95)

  return { homeWinProb: homeProb, factors, hasGaps }
}

function formScore(form: ('W' | 'L' | 'D')[]): number {
  // Most recent first; weight recent games heavier.
  let total = 0
  let weight = 0
  for (let i = 0; i < form.length; i++) {
    const w = 1 / (i + 1)
    const v = form[i] === 'W' ? 1 : form[i] === 'D' ? 0.5 : 0
    total += v * w
    weight += w
  }
  return weight === 0 ? 0.5 : total / weight
}

function formatForm(form: ('W' | 'L' | 'D')[]): string {
  return form.slice(0, 5).join('')
}

function parseStreak(streak?: string): number | null {
  // e.g. "W4", "L2", "4W", "L 2"
  if (!streak) return null
  const m = streak.match(/(W|L|D)\s*(\d+)|(\d+)\s*(W|L|D)/i)
  if (!m) return null
  const letter = (m[1] ?? m[4] ?? '').toUpperCase()
  const num = Number(m[2] ?? m[3])
  if (!Number.isFinite(num)) return null
  return letter === 'W' ? num : letter === 'L' ? -num : 0
}

// ── Total-points model ────────────────────────────────────────

interface TotalResult {
  total: number
  factors: PredictionFactor[]
  hasGaps: boolean
}

function computeTotal(game: Game, profile: LeagueProfile): TotalResult {
  const factors: PredictionFactor[] = []
  let hasGaps = false
  let total = profile.avgTotal

  // Indoor venues are blissfully weather-free.
  if (game.venue.isOutdoor && game.weather) {
    const w = game.weather
    // High wind suppresses passing/kicking and fly balls.
    if (w.windMph >= 15) {
      const reduction =
        game.leagueId === 'NFL' || game.leagueId === 'NCAAF'
          ? clamp((w.windMph - 15) * 0.3, 0, 4)
          : game.leagueId === 'MLB'
          ? clamp((w.windMph - 15) * 0.08, 0, 1.2)
          : 0
      if (reduction > 0) {
        total -= reduction
        factors.push({
          label: 'Wind suppresses scoring',
          delta: -reduction,
          detail: `${w.windMph} mph ${w.windDir || ''}`.trim(),
        })
      }
    }

    if (w.precipChance >= 50) {
      const reduction =
        game.leagueId === 'NFL' || game.leagueId === 'NCAAF'
          ? 2.5
          : game.leagueId === 'MLB'
          ? 0.6
          : 0
      if (reduction > 0) {
        total -= reduction
        factors.push({
          label: 'Precipitation',
          delta: -reduction,
          detail: `${w.precipChance}% rain chance`,
        })
      }
    }

    // Cold suppresses MLB scoring; hot wet air boosts it slightly.
    if (game.leagueId === 'MLB' && Number.isFinite(w.tempF)) {
      if (w.tempF < 50) {
        total -= 0.4
        factors.push({ label: 'Cold weather', delta: -0.4, detail: `${w.tempF}°F` })
      } else if (w.tempF > 85) {
        total += 0.3
        factors.push({ label: 'Hot weather', delta: 0.3, detail: `${w.tempF}°F` })
      }
    }
  } else if (game.venue.isOutdoor && !game.weather) {
    // Outdoor with unknown weather — flag a data gap, but don't adjust.
    hasGaps = true
  }

  // MLB starter quality: combined ERA pushes total down.
  if (game.leagueId === 'MLB' && game.probablePitchers) {
    const hEra = parseFloat(game.probablePitchers.home?.stats?.ERA ?? '')
    const aEra = parseFloat(game.probablePitchers.away?.stats?.ERA ?? '')
    if (Number.isFinite(hEra) && Number.isFinite(aEra)) {
      const avg = (hEra + aEra) / 2
      // Each run of ERA off the 4.20 league mean ≈ 0.5 total runs.
      const delta = clamp((avg - 4.2) * 0.5, -1.8, 1.8)
      total += delta
      if (Math.abs(delta) > 0.05) {
        factors.push({
          label: 'Pitcher quality',
          delta,
          detail: `Avg ERA ${avg.toFixed(2)}`,
        })
      }
    }
  }

  // Form proxy: if both teams are hot, slight nudge up; both cold, nudge down.
  const hForm = game.homeTeam.seasonStats?.recentForm
  const aForm = game.awayTeam.seasonStats?.recentForm
  if (hForm?.length && aForm?.length) {
    const combined = (formScore(hForm) + formScore(aForm)) / 2 - 0.5
    if (Math.abs(combined) > 0.15) {
      const delta = combined * (profile.avgTotal * 0.02)
      total += delta
      factors.push({
        label: 'Combined form',
        delta,
        detail: combined > 0 ? 'Both clubs trending up' : 'Both clubs trending down',
      })
    }
  }

  return { total, factors, hasGaps }
}

// ── Market edges ──────────────────────────────────────────────

function valueRating(edge: number): ValueRating {
  const abs = Math.abs(edge)
  if (abs < 0.02) return 1
  if (abs < 0.04) return 2
  if (abs < 0.06) return 3
  if (abs < 0.09) return 4
  return 5
}

interface MoneylineMarket { homeOdds: string; awayOdds: string }
interface SpreadMarket { spread: number; homeOdds: string; awayOdds: string }
interface TotalMarket { line: number; overOdds: string; underOdds: string }

// Pick the best multi-book market by tightest vig (lowest sum of implied probs).
function bestMoneyline(odds: GameOdds[]): MoneylineMarket | null {
  let best: { sum: number; m: MoneylineMarket } | null = null
  for (const o of odds) {
    const ph = americanToImpliedProb(o.moneyline.home)
    const pa = americanToImpliedProb(o.moneyline.away)
    if (ph == null || pa == null) continue
    const sum = ph + pa
    if (!best || sum < best.sum) best = { sum, m: { homeOdds: o.moneyline.home, awayOdds: o.moneyline.away } }
  }
  return best?.m ?? null
}

function bestSpread(odds: GameOdds[]): SpreadMarket | null {
  let best: { sum: number; m: SpreadMarket } | null = null
  for (const o of odds) {
    const spread = parseFloat(o.spread.home)
    if (!Number.isFinite(spread)) continue
    const ph = americanToImpliedProb(o.spread.homeSpread)
    const pa = americanToImpliedProb(o.spread.awaySpread)
    if (ph == null || pa == null) continue
    const sum = ph + pa
    if (!best || sum < best.sum) {
      best = { sum, m: { spread, homeOdds: o.spread.homeSpread, awayOdds: o.spread.awaySpread } }
    }
  }
  return best?.m ?? null
}

function bestTotal(odds: GameOdds[]): TotalMarket | null {
  let best: { sum: number; m: TotalMarket } | null = null
  for (const o of odds) {
    if (!Number.isFinite(o.total.line) || o.total.line <= 0) continue
    const po = americanToImpliedProb(o.total.over)
    const pu = americanToImpliedProb(o.total.under)
    if (po == null || pu == null) continue
    const sum = po + pu
    if (!best || sum < best.sum) {
      best = { sum, m: { line: o.total.line, overOdds: o.total.over, underOdds: o.total.under } }
    }
  }
  return best?.m ?? null
}

function computeMlEdge(
  modelHomeProb: number,
  market: MoneylineMarket,
): MarketEdge[] {
  const stripped = stripVigTwoWay(market.homeOdds, market.awayOdds)
  if (!stripped) return []
  const out: MarketEdge[] = []

  const sides: { side: BetSide; modelProb: number; marketProb: number; odds: string }[] = [
    { side: { market: 'moneyline', team: 'home' }, modelProb: modelHomeProb,        marketProb: stripped.home, odds: market.homeOdds },
    { side: { market: 'moneyline', team: 'away' }, modelProb: 1 - modelHomeProb,    marketProb: stripped.away, odds: market.awayOdds },
  ]

  for (const s of sides) {
    const edge = s.modelProb - s.marketProb
    out.push({
      side: s.side,
      modelProb: s.modelProb,
      marketProb: s.marketProb,
      edge,
      americanOdds: s.odds,
      fairAmericanOdds: probToAmerican(s.modelProb),
      value: valueRating(edge),
    })
  }
  return out
}

function computeSpreadEdge(
  modelMargin: number,
  profile: LeagueProfile,
  market: SpreadMarket,
  homeAbbr: string,
  awayAbbr: string,
): MarketEdge[] {
  // market.spread is home spread (negative = home favored).
  // Home covers when (homeScore - awayScore) > -market.spread, i.e. modelMargin > -market.spread.
  // P(home covers) = 1 - Φ((-market.spread - modelMargin) / σ)
  const sigma = profile.spreadStdDev
  const homeCoverProb = clamp(1 - normalCdf((-market.spread - modelMargin) / sigma), 0.02, 0.98)
  const awayCoverProb = 1 - homeCoverProb

  const stripped = stripVigTwoWay(market.homeOdds, market.awayOdds)
  if (!stripped) return []

  // Carry abbreviations through "detail" via the side label later in the UI.
  void homeAbbr; void awayAbbr

  const out: MarketEdge[] = []
  const sides: { side: BetSide; modelProb: number; marketProb: number; odds: string }[] = [
    { side: { market: 'spread', team: 'home' }, modelProb: homeCoverProb, marketProb: stripped.home, odds: market.homeOdds },
    { side: { market: 'spread', team: 'away' }, modelProb: awayCoverProb, marketProb: stripped.away, odds: market.awayOdds },
  ]
  for (const s of sides) {
    const edge = s.modelProb - s.marketProb
    out.push({
      side: s.side,
      modelProb: s.modelProb,
      marketProb: s.marketProb,
      edge,
      americanOdds: s.odds,
      fairAmericanOdds: probToAmerican(s.modelProb),
      value: valueRating(edge),
    })
  }
  return out
}

function computeTotalEdge(
  modelTotal: number,
  profile: LeagueProfile,
  market: TotalMarket,
): MarketEdge[] {
  const sigma = profile.totalStdDev
  const overProb = clamp(1 - normalCdf((market.line - modelTotal) / sigma), 0.02, 0.98)
  const underProb = 1 - overProb

  const stripped = stripVigTwoWay(market.overOdds, market.underOdds)
  if (!stripped) return []

  const out: MarketEdge[] = []
  const sides: { side: BetSide; modelProb: number; marketProb: number; odds: string }[] = [
    { side: { market: 'total', pick: 'over' },  modelProb: overProb,  marketProb: stripped.home /* over slot */, odds: market.overOdds },
    { side: { market: 'total', pick: 'under' }, modelProb: underProb, marketProb: stripped.away /* under slot */, odds: market.underOdds },
  ]
  for (const s of sides) {
    const edge = s.modelProb - s.marketProb
    out.push({
      side: s.side,
      modelProb: s.modelProb,
      marketProb: s.marketProb,
      edge,
      americanOdds: s.odds,
      fairAmericanOdds: probToAmerican(s.modelProb),
      value: valueRating(edge),
    })
  }
  return out
}

// ── Confidence ────────────────────────────────────────────────

function computeConfidence(game: Game, hasGaps: boolean): number {
  let score = 40 // floor
  if (game.homeTeam.record && game.awayTeam.record) score += 20
  if (game.homeTeam.seasonStats?.recentForm?.length) score += 8
  if (game.awayTeam.seasonStats?.recentForm?.length) score += 8
  if (game.homeTeam.seasonStats?.homeRecord && game.awayTeam.seasonStats?.awayRecord) score += 6
  if (game.odds && game.odds.length >= 2) score += 8
  if (game.leagueId === 'MLB') {
    if (game.probablePitchers?.home && game.probablePitchers?.away) score += 10
  }
  if (game.venue.isOutdoor && game.weather) score += 4
  if (hasGaps) score -= 12
  return clamp(score, 0, 100)
}

// ── Top-level ─────────────────────────────────────────────────

export function predictGame(game: Game): GamePrediction | null {
  const profile = LEAGUE_PROFILES[game.leagueId]
  if (!profile) return null

  const wp = computeWinProb(game, profile)
  const tot = computeTotal(game, profile)

  // Derive margin from win probability via the league spread coefficient.
  // (modelHomeWinProb - 0.5) is the lean in probability points (signed).
  const winProbPctDelta = (wp.homeWinProb - 0.5) * 100
  const modelMargin = winProbPctDelta * profile.spreadCoefPerPct

  const factors = [...wp.factors, ...tot.factors].sort(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta),
  )

  // Edges (only when odds are present).
  const edges: MarketEdge[] = []
  if (game.odds && game.odds.length) {
    const ml = bestMoneyline(game.odds)
    if (ml) edges.push(...computeMlEdge(wp.homeWinProb, ml))

    const sp = bestSpread(game.odds)
    if (sp) edges.push(...computeSpreadEdge(modelMargin, profile, sp, game.homeTeam.abbreviation, game.awayTeam.abbreviation))

    const tt = bestTotal(game.odds)
    if (tt) edges.push(...computeTotalEdge(tot.total, profile, tt))
  }

  // Best edge = the side with the largest positive edge (we don't recommend fades by default).
  let bestEdge: MarketEdge | undefined
  for (const e of edges) {
    if (e.edge <= 0) continue
    if (!bestEdge || e.edge > bestEdge.edge) bestEdge = e
  }

  const hasGaps = wp.hasGaps || tot.hasGaps
  const confidence = computeConfidence(game, hasGaps)

  return {
    gameId: game.id,
    modelHomeWinProb: wp.homeWinProb,
    modelTotal: tot.total,
    modelMargin,
    confidence,
    factors: factors.slice(0, 6),
    edges,
    bestEdge,
    hasGaps,
  }
}
