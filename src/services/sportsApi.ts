import axios from 'axios'
import type { Game, GameStatus, LeagueId, Lineup, Player, Team, Venue } from '../types'
import { MOCK_GAMES } from '../data/mockData'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports'

// Set VITE_USE_MOCK=true in .env to force mock data (includes rich lineup data).
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const ENDPOINTS: { url: string; leagueId: LeagueId }[] = [
  { url: `${ESPN_BASE}/basketball/nba/scoreboard`, leagueId: 'NBA' },
  { url: `${ESPN_BASE}/football/nfl/scoreboard`, leagueId: 'NFL' },
  { url: `${ESPN_BASE}/baseball/mlb/scoreboard`, leagueId: 'MLB' },
  { url: `${ESPN_BASE}/hockey/nhl/scoreboard`, leagueId: 'NHL' },
  { url: `${ESPN_BASE}/basketball/mens-college-basketball/scoreboard`, leagueId: 'NCAAB' },
]

const SPORT_PATHS: Partial<Record<LeagueId, { sport: string; league: string }>> = {
  NBA: { sport: 'basketball', league: 'nba' },
  NCAAB: { sport: 'basketball', league: 'mens-college-basketball' },
  NFL: { sport: 'football', league: 'nfl' },
  NCAAF: { sport: 'football', league: 'college-football' },
  MLB: { sport: 'baseball', league: 'mlb' },
  NHL: { sport: 'hockey', league: 'nhl' },
}

export interface GameSummaryData {
  homeLineup?: Lineup
  awayLineup?: Lineup
  probablePitchers?: { home?: Player; away?: Player }
}

// ── Scoreboard ────────────────────────────────────────────────

export async function fetchTodaysGames(): Promise<Game[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600))
    return MOCK_GAMES
  }

  try {
    const results = await Promise.allSettled(
      ENDPOINTS.map(({ url, leagueId }) =>
        axios.get(url).then((res) => parseEspnScoreboard(res.data, leagueId)),
      ),
    )

    const games: Game[] = []
    for (const result of results) {
      if (result.status === 'fulfilled') games.push(...result.value)
    }

    return games.length > 0 ? games : MOCK_GAMES
  } catch {
    return MOCK_GAMES
  }
}

export async function fetchGameById(id: string): Promise<Game | null> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    return MOCK_GAMES.find((g) => g.id === id) ?? null
  }
  return MOCK_GAMES.find((g) => g.id === id) ?? null
}

// ── Game Summary (lineup data) ────────────────────────────────

export async function fetchGameSummary(
  eventId: string,
  leagueId: LeagueId,
): Promise<GameSummaryData | null> {
  if (USE_MOCK) return null
  const path = SPORT_PATHS[leagueId]
  if (!path) return null
  try {
    const url = `${ESPN_BASE}/${path.sport}/${path.league}/summary?event=${eventId}`
    const res = await axios.get(url)
    return parseEspnSummary(res.data, leagueId)
  } catch {
    return null
  }
}

// ── Scoreboard parser ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStatus(name: string): GameStatus {
  switch (name) {
    case 'STATUS_IN_PROGRESS': return 'live'
    case 'STATUS_FINAL': return 'final'
    case 'STATUS_POSTPONED': return 'postponed'
    case 'STATUS_CANCELED': return 'canceled'
    default: return 'scheduled'
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTeam(competitor: any, leagueId: LeagueId): Team {
  const t = competitor.team
  return {
    id: `${leagueId}-${t.id}`,
    name: t.displayName ?? t.name ?? 'Unknown',
    shortName: t.shortDisplayName ?? t.displayName ?? 'Unknown',
    abbreviation: t.abbreviation ?? '???',
    logoUrl: t.logo ?? '',
    primaryColor: `#${t.color ?? '333333'}`,
    secondaryColor: `#${t.alternateColor ?? '666666'}`,
    leagueId,
    record: competitor.records?.[0]?.summary,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseVenue(competition: any): Venue {
  const v = competition.venue ?? {}
  return {
    id: v.id ?? 'unknown',
    name: v.fullName ?? 'TBD',
    city: v.address?.city ?? '',
    state: v.address?.state,
    country: 'USA',
    isOutdoor: !v.indoor,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEspnScoreboard(data: unknown, leagueId: LeagueId): Game[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = (data as any)?.events ?? []
  const games: Game[] = []

  for (const event of events) {
    const competition = event.competitions?.[0]
    if (!competition) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const homeComp = competition.competitors?.find((c: any) => c.homeAway === 'home')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const awayComp = competition.competitors?.find((c: any) => c.homeAway === 'away')
    if (!homeComp || !awayComp) continue

    const statusName: string = competition.status?.type?.name ?? 'STATUS_SCHEDULED'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const broadcasts: string[] = competition.broadcasts?.flatMap((b: any) => b.names ?? []) ?? []
    const headline: string | undefined = competition.headlines?.[0]?.description

    games.push({
      id: event.id,
      leagueId,
      homeTeam: parseTeam(homeComp, leagueId),
      awayTeam: parseTeam(awayComp, leagueId),
      startTime: event.date ?? competition.date,
      status: mapStatus(statusName),
      homeScore: homeComp.score !== undefined ? Number(homeComp.score) : undefined,
      awayScore: awayComp.score !== undefined ? Number(awayComp.score) : undefined,
      period: competition.status?.period ? String(competition.status.period) : undefined,
      clock: competition.status?.displayClock,
      venue: parseVenue(competition),
      broadcast: broadcasts.length > 0 ? broadcasts : undefined,
      headline,
    })
  }

  return games
}

// ── Summary parser helpers ────────────────────────────────────

function cleanStat(v: string | undefined | null): string | undefined {
  if (!v || v === '--' || v === '' || v === '0') return undefined
  return v
}

function zipStats(labels: string[], values: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < labels.length && i < values.length; i++) {
    const v = cleanStat(values[i])
    if (v != null) out[labels[i]] = v
  }
  return out
}

function pickStats(
  raw: Record<string, string>,
  keys: string[],
  rename?: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of keys) {
    const v = raw[k]
    if (v != null) out[rename?.[k] ?? k] = v
  }
  return out
}

// ── NBA / NCAAB ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseBasketballBoxscore(teamData: any, confirmed: boolean): Lineup | null {
  const statGroup = teamData.statistics?.[0]
  if (!statGroup) return null
  const labels: string[] = statGroup.labels ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const athletes: any[] = statGroup.athletes ?? []
  if (!athletes.length) return null

  const starters: Player[] = []
  const bench: Player[] = []

  for (const a of athletes) {
    if (a.didNotPlay) continue
    const athl = a.athlete ?? {}
    const raw = zipStats(labels, a.stats ?? [])
    const stats = pickStats(raw, ['PTS', 'REB', 'AST'])

    const player: Player = {
      id: athl.id ?? athl.displayName ?? 'unknown',
      name: athl.displayName ?? 'Unknown',
      position: athl.position?.abbreviation ?? '',
      number: athl.jersey,
      status: 'active',
      stats: Object.keys(stats).length ? stats : undefined,
    }
    if (a.starter) starters.push(player)
    else bench.push(player)
  }

  if (!starters.length && !bench.length) return null
  return {
    teamId: teamData.team?.id ?? '',
    confirmed,
    starters,
    bench: bench.length ? bench : undefined,
  }
}

// ── NHL ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseHockeyBoxscore(teamData: any, confirmed: boolean): Lineup | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statGroups: any[] = teamData.statistics ?? []
  const starters: Player[] = []

  for (const sg of statGroups) {
    const groupName: string = sg.name?.toLowerCase() ?? ''
    if (groupName === 'skaters') continue // aggregate group, skip

    let posHint = ''
    if (groupName === 'forwards') posHint = 'F'
    else if (groupName === 'defenses') posHint = 'D'
    else if (groupName === 'goalies') posHint = 'G'
    else continue

    const labels: string[] = sg.labels ?? []

    for (const a of sg.athletes ?? []) {
      const athl = a.athlete ?? {}
      const raw = zipStats(labels, a.stats ?? [])

      const stats =
        posHint === 'G'
          ? pickStats(raw, ['SV', 'SV%', 'TOI'])
          : pickStats(raw, ['+/-', 'TOI'])

      starters.push({
        id: athl.id ?? athl.displayName ?? 'unknown',
        name: athl.displayName ?? 'Unknown',
        position: athl.position?.abbreviation ?? posHint,
        number: athl.jersey,
        status: 'active',
        stats: Object.keys(stats).length ? stats : undefined,
      })
    }
  }

  if (!starters.length) return null
  return { teamId: teamData.team?.id ?? '', confirmed, starters }
}

// ── MLB ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMlbSummary(teamData: any, rosterData: any, confirmed: boolean): Lineup | null {
  // Build per-player stat maps from boxscore
  const batterStats = new Map<string, Record<string, string>>()
  const pitcherStats = new Map<string, Record<string, string>>()

  for (const sg of teamData.statistics ?? []) {
    const labels: string[] = sg.labels ?? []
    const isPitcher = labels.includes('IP')
    for (const a of sg.athletes ?? []) {
      const id: string | undefined = a.athlete?.id
      if (!id) continue
      const raw = zipStats(labels, a.stats ?? [])
      if (isPitcher) {
        pitcherStats.set(id, pickStats(raw, ['IP', 'K', 'ER'], { 'K': 'SO' }))
      } else {
        batterStats.set(id, pickStats(raw, ['H-AB', 'RBI', 'HR'], { 'H-AB': 'H/AB' }))
      }
    }
  }

  // Find starting pitcher from boxscore (starter=true in pitcher group)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pitcherGroup = teamData.statistics?.find((sg: any) =>
    (sg.labels ?? []).includes('IP'),
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spEntry = pitcherGroup?.athletes?.find((a: any) => a.starter)

  const starters: Player[] = []

  if (spEntry) {
    const athl = spEntry.athlete ?? {}
    const id: string | undefined = athl.id
    starters.push({
      id: id ?? 'sp',
      name: athl.displayName ?? 'Unknown',
      position: 'SP',
      number: athl.jersey,
      status: 'active',
      stats: id ? pitcherStats.get(id) : undefined,
    })
  }

  // Batting order from rosters section (when available, e.g. live/final games)
  const rosterEntries: any[] = rosterData?.roster ?? []
  if (rosterEntries.length) {
    const sorted = [...rosterEntries].sort(
      (a, b) => (a.batOrder ?? 99) - (b.batOrder ?? 99),
    )
    for (const e of sorted) {
      if (!e.starter) continue
      const athl = e.athlete ?? {}
      const id: string | undefined = athl.id
      starters.push({
        id: id ?? athl.displayName ?? 'unknown',
        name: athl.displayName ?? 'Unknown',
        position: e.position?.abbreviation ?? '',
        number: e.jersey,
        status: 'active',
        stats: id ? batterStats.get(id) : undefined,
      })
    }
  } else {
    // Fallback: batters from boxscore when rosters unavailable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batterGroup = teamData.statistics?.find((sg: any) =>
      !(sg.labels ?? []).includes('IP'),
    )
    for (const a of batterGroup?.athletes ?? []) {
      if (!a.starter) continue
      const athl = a.athlete ?? {}
      const id: string | undefined = athl.id
      starters.push({
        id: id ?? 'batter',
        name: athl.displayName ?? 'Unknown',
        position: athl.position?.abbreviation ?? '',
        number: athl.jersey,
        status: 'active',
        stats: id ? batterStats.get(id) : undefined,
      })
    }
  }

  if (!starters.length) return null
  return { teamId: teamData.team?.id ?? '', confirmed, starters }
}

// ── MLB Probable Pitchers ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseProbablePitchers(competitors: any[]): GameSummaryData['probablePitchers'] {
  let home: Player | undefined
  let away: Player | undefined

  for (const comp of competitors) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sp = (comp.probables ?? []).find((p: any) => p.name === 'probableStartingPitcher')
    if (!sp) continue

    const athl = sp.athlete ?? {}
    const categories: { abbreviation: string; displayValue: string }[] =
      sp.statistics?.splits?.categories ?? []

    const raw: Record<string, string> = {}
    for (const cat of categories) {
      if (cat.abbreviation && cat.displayValue) raw[cat.abbreviation] = cat.displayValue
    }

    const stats: Record<string, string> = {}
    if (raw['W'] && raw['L']) stats['W-L'] = `${raw['W']}-${raw['L']}`
    if (raw['ERA']) stats['ERA'] = raw['ERA']
    if (raw['K']) stats['K'] = raw['K']
    if (raw['WHIP']) stats['WHIP'] = raw['WHIP']

    const player: Player = {
      id: athl.id ?? String(sp.playerId ?? 'sp'),
      name: athl.displayName ?? 'Unknown',
      position: 'SP',
      number: athl.jersey,
      status: 'active',
      stats: Object.keys(stats).length ? stats : undefined,
    }

    if (comp.homeAway === 'home') home = player
    else if (comp.homeAway === 'away') away = player
  }

  return home || away ? { home, away } : undefined
}

// ── NFL ───────────────────────────────────────────────────────

// stat group name → (labels to show, position hint when ESPN pos is missing)
const NFL_STAT_CONFIG: Record<string, { show: string[]; pos: string }> = {
  passing:      { show: ['C/ATT', 'YDS', 'TD', 'INT'], pos: 'QB' },
  rushing:      { show: ['CAR', 'YDS', 'TD'],           pos: 'RB' },
  receiving:    { show: ['REC', 'YDS', 'TD'],           pos: 'WR' },
  defensive:    { show: ['TOT', 'SACKS', 'INT'],        pos: 'DEF' },
  interceptions:{ show: ['INT', 'YDS'],                 pos: 'DB' },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFootballBoxscore(teamData: any, confirmed: boolean): Lineup | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statGroups: any[] = teamData.statistics ?? []
  const seen = new Set<string>()
  const starters: Player[] = []

  for (const sg of statGroups) {
    const groupName: string = sg.name?.toLowerCase() ?? ''
    const config = NFL_STAT_CONFIG[groupName]
    if (!config) continue

    const labels: string[] = sg.labels ?? []

    for (const a of sg.athletes ?? []) {
      const athl = a.athlete ?? {}
      const id: string = athl.id ?? athl.displayName ?? 'unknown'
      if (seen.has(id)) continue
      seen.add(id)

      const raw = zipStats(labels, a.stats ?? [])
      const stats = pickStats(raw, config.show)

      const pos = athl.position?.abbreviation || config.pos
      starters.push({
        id,
        name: athl.displayName ?? 'Unknown',
        position: pos,
        number: athl.jersey,
        status: 'active',
        stats: Object.keys(stats).length ? stats : undefined,
      })
    }
  }

  if (!starters.length) return null
  return { teamId: teamData.team?.id ?? '', confirmed, starters }
}

// ── Top-level summary dispatcher ──────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEspnSummary(data: any, leagueId: LeagueId): GameSummaryData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const players: any[] = data?.boxscore?.players ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rosters: any[] = data?.rosters ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const competitors: any[] = data?.header?.competitions?.[0]?.competitors ?? []

  const homeId: string | undefined = competitors.find((c) => c.homeAway === 'home')?.team?.id
  const awayId: string | undefined = competitors.find((c) => c.homeAway === 'away')?.team?.id

  const result: GameSummaryData = {}

  // Probable pitchers (MLB only — available for scheduled & live games)
  if (leagueId === 'MLB') {
    const pp = parseProbablePitchers(competitors)
    if (pp) result.probablePitchers = pp
  }

  if (!players.length) return result

  // confirmed = game has actual player data (live or final)
  const confirmed = players.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p) => (p.statistics?.[0]?.athletes ?? []).length > 0,
  )

  for (const teamData of players) {
    const tid: string | undefined = teamData.team?.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rosterData = rosters.find((r: any) => r.team?.id === tid)

    let lineup: Lineup | null = null

    if (leagueId === 'NBA' || leagueId === 'NCAAB') {
      lineup = parseBasketballBoxscore(teamData, confirmed)
    } else if (leagueId === 'NHL') {
      lineup = parseHockeyBoxscore(teamData, confirmed)
    } else if (leagueId === 'MLB') {
      lineup = parseMlbSummary(teamData, rosterData, confirmed)
    } else if (leagueId === 'NFL' || leagueId === 'NCAAF') {
      lineup = parseFootballBoxscore(teamData, confirmed)
    }

    if (!lineup) continue
    if (tid === homeId) result.homeLineup = lineup
    else if (tid === awayId) result.awayLineup = lineup
  }

  return result
}
