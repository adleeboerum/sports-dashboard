import axios from 'axios'
import type { Game, GameOdds, GameStatus, LeagueId, Lineup, Player, Team, Venue, Weather } from '../types'
import { MOCK_GAMES } from '../data/mockData'
import { fetchOddsForLeague, lookupOdds } from './oddsApi'
import { fetchWeather } from './weatherApi'
import { fetchTicketsForGame } from './ticketsApi'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports'

// Set VITE_USE_MOCK=true in .env to force mock data (includes rich lineup data).
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const ENDPOINTS: { url: string; leagueId: LeagueId }[] = [
  { url: `${ESPN_BASE}/basketball/nba/scoreboard`, leagueId: 'NBA' },
  { url: `${ESPN_BASE}/football/nfl/scoreboard`, leagueId: 'NFL' },
  { url: `${ESPN_BASE}/baseball/mlb/scoreboard`, leagueId: 'MLB' },
  { url: `${ESPN_BASE}/hockey/nhl/scoreboard`, leagueId: 'NHL' },
  { url: `${ESPN_BASE}/basketball/mens-college-basketball/scoreboard`, leagueId: 'NCAAB' },
  { url: `${ESPN_BASE}/football/college-football/scoreboard`, leagueId: 'NCAAF' },
  { url: `${ESPN_BASE}/soccer/usa.1/scoreboard`, leagueId: 'MLS' },
  { url: `${ESPN_BASE}/soccer/eng.1/scoreboard`, leagueId: 'EPL' },
]

const SPORT_PATHS: Partial<Record<LeagueId, { sport: string; league: string }>> = {
  NBA: { sport: 'basketball', league: 'nba' },
  NCAAB: { sport: 'basketball', league: 'mens-college-basketball' },
  NFL: { sport: 'football', league: 'nfl' },
  NCAAF: { sport: 'football', league: 'college-football' },
  MLB: { sport: 'baseball', league: 'mlb' },
  NHL: { sport: 'hockey', league: 'nhl' },
  MLS: { sport: 'soccer', league: 'usa.1' },
  EPL: { sport: 'soccer', league: 'eng.1' },
}

export interface GameSummaryData {
  homeLineup?: Lineup
  awayLineup?: Lineup
  probablePitchers?: { home?: Player; away?: Player }
}

// ── Today-only filter ─────────────────────────────────────────

function todayYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function ymdNDaysAhead(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function isWithinDaysAhead(iso: string, daysAhead: number): boolean {
  const d = new Date(iso).getTime()
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(); end.setDate(end.getDate() + daysAhead); end.setHours(23, 59, 59, 999)
  return d >= start.getTime() && d <= end.getTime()
}

// ── Scoreboard ────────────────────────────────────────────────

export async function fetchTodaysGames(dateYmd?: string): Promise<Game[]> {
  const ymd = dateYmd ?? todayYmd()
  const requestingToday = ymd === todayYmd()

  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600))
    if (!requestingToday) return []
    return MOCK_GAMES.filter((g) => isToday(g.startTime))
  }

  try {
    const results = await Promise.allSettled(
      ENDPOINTS.map(({ url, leagueId }) =>
        axios.get(url, { params: { dates: ymd } }).then((res) => parseEspnScoreboard(res.data, leagueId)),
      ),
    )

    const games: Game[] = []
    for (const result of results) {
      if (result.status === 'fulfilled') games.push(...result.value)
    }

    const dateGames = requestingToday ? games.filter((g) => isToday(g.startTime)) : games
    if (requestingToday && dateGames.length === 0) {
      // No real games today — fall back to mock data so the dashboard isn't empty.
      return MOCK_GAMES.filter((g) => isToday(g.startTime))
    }

    if (dateGames.length > 0) {
      // Enrich with multi-book odds from The Odds API (only when a key is configured
      // and we don't already have rich multi-book odds from ESPN).
      await Promise.all([
        enrichOdds(dateGames),
        enrichWeather(dateGames),
        enrichTickets(dateGames),
      ])
    }
    return dateGames
  } catch {
    if (requestingToday) return MOCK_GAMES.filter((g) => isToday(g.startTime))
    return []
  }
}

export async function fetchGamesInRange(daysAhead: number): Promise<Game[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600))
    return MOCK_GAMES.filter((g) => isWithinDaysAhead(g.startTime, daysAhead))
  }

  const start = todayYmd()
  const end = ymdNDaysAhead(daysAhead)
  const range = `${start}-${end}`

  try {
    const results = await Promise.allSettled(
      ENDPOINTS.map(({ url, leagueId }) =>
        axios.get(url, { params: { dates: range, limit: 1000 } }).then((res) => parseEspnScoreboard(res.data, leagueId)),
      ),
    )

    const games: Game[] = []
    for (const result of results) {
      if (result.status === 'fulfilled') games.push(...result.value)
    }

    const inRange = games.filter((g) => isWithinDaysAhead(g.startTime, daysAhead))
    if (inRange.length === 0) {
      return MOCK_GAMES.filter((g) => isWithinDaysAhead(g.startTime, daysAhead))
    }

    // Enrich only games happening within ~36 hours to keep network cost bounded.
    const enrichWindow = inRange.filter((g) => isWithinDaysAhead(g.startTime, 1))
    if (enrichWindow.length > 0) {
      await Promise.all([
        enrichOdds(enrichWindow),
        enrichWeather(enrichWindow),
        enrichTickets(enrichWindow),
      ])
    }
    return inRange
  } catch {
    return MOCK_GAMES.filter((g) => isWithinDaysAhead(g.startTime, daysAhead))
  }
}

async function enrichTickets(games: Game[]): Promise<void> {
  // SeatGeek is the only integration available; bail if no key.
  if (!import.meta.env.VITE_SEATGEEK_CLIENT_ID) return
  await Promise.all(
    games.map(async (g) => {
      if (g.tickets) return
      const t = await fetchTicketsForGame(g.homeTeam.name, g.awayTeam.name)
      if (t) g.tickets = t
    }),
  )
}

async function enrichWeather(games: Game[]): Promise<void> {
  const outdoor = games.filter((g) => g.venue.isOutdoor && !g.weather && g.venue.city)
  await Promise.all(
    outdoor.map(async (g) => {
      const w = await fetchWeather(g.venue.city, g.venue.country)
      if (w) g.weather = w
    }),
  )
}

async function enrichOdds(games: Game[]): Promise<void> {
  const leagueIds = [...new Set(games.map((g) => g.leagueId))]
  const results = await Promise.allSettled(
    leagueIds.map(async (lid) => ({ lid, map: await fetchOddsForLeague(lid) })),
  )
  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    const { lid, map } = r.value
    if (!Object.keys(map).length) continue
    for (const g of games) {
      if (g.leagueId !== lid) continue
      const found = lookupOdds(map, g.awayTeam.name, g.homeTeam.name)
      if (found && found.length > (g.odds?.length ?? 0)) {
        g.odds = found
      }
    }
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

function mapStatus(name: string): GameStatus {
  switch (name) {
    case 'STATUS_IN_PROGRESS':
    case 'STATUS_HALFTIME':
    case 'STATUS_END_PERIOD':
    case 'STATUS_DELAYED':
    case 'STATUS_RAIN_DELAY':
      return 'live'
    case 'STATUS_FINAL':
    case 'STATUS_FULL_TIME':
      return 'final'
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
    ranking: competitor.curatedRank?.current && competitor.curatedRank.current !== 99
      ? competitor.curatedRank.current
      : undefined,
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
    country: v.address?.country ?? 'USA',
    capacity: typeof v.capacity === 'number' ? v.capacity : undefined,
    surface: v.grass != null ? (v.grass ? 'Grass' : 'Turf') : undefined,
    isOutdoor: v.indoor === false,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseWeather(event: any, competition: any): Weather | undefined {
  const w = event.weather ?? competition.weather
  if (!w) return undefined
  const temp = typeof w.temperature === 'number'
    ? w.temperature
    : typeof w.highTemperature === 'number'
      ? w.highTemperature
      : undefined
  if (temp == null && !w.displayValue) return undefined
  return {
    condition: w.displayValue ?? 'Unknown',
    tempF: typeof temp === 'number' ? temp : 0,
    windMph: typeof w.windSpeed === 'number' ? w.windSpeed : 0,
    windDir: w.windDirection ?? '',
    humidity: typeof w.humidity === 'number' ? w.humidity : 0,
    precipChance: typeof w.precipitation === 'number' ? w.precipitation : 0,
  }
}

function fmtSigned(n: number | undefined): string | undefined {
  if (typeof n !== 'number' || Number.isNaN(n)) return undefined
  return n > 0 ? `+${n}` : `${n}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEspnOdds(competition: any): GameOdds[] | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = competition.odds ?? []
  if (!raw.length) return undefined

  const out: GameOdds[] = []
  for (const o of raw) {
    const provider = o.provider ?? {}
    const homeML = o.homeTeamOdds?.moneyLine ?? o.homeMoneyLine
    const awayML = o.awayTeamOdds?.moneyLine ?? o.awayMoneyLine

    const spread: number | undefined = o.spread
    const homeFav: boolean = !!o.homeTeamOdds?.favorite
    const homeSpreadVal = typeof spread === 'number'
      ? (homeFav ? -Math.abs(spread) : Math.abs(spread))
      : undefined
    const awaySpreadVal = typeof homeSpreadVal === 'number' ? -homeSpreadVal : undefined

    const overUnder: number | undefined = o.overUnder

    if (homeML == null && awayML == null && spread == null && overUnder == null) continue

    out.push({
      sportsbook: {
        id: String(provider.id ?? provider.name ?? out.length),
        name: provider.name ?? 'Sportsbook',
      },
      moneyline: {
        home: fmtSigned(homeML) ?? '—',
        away: fmtSigned(awayML) ?? '—',
      },
      spread: {
        home: fmtSigned(homeSpreadVal) ?? '—',
        homeSpread: fmtSigned(o.homeTeamOdds?.spreadOdds) ?? '-110',
        away: fmtSigned(awaySpreadVal) ?? '—',
        awaySpread: fmtSigned(o.awayTeamOdds?.spreadOdds) ?? '-110',
      },
      total: {
        over: fmtSigned(o.overOdds) ?? '-110',
        under: fmtSigned(o.underOdds) ?? '-110',
        line: typeof overUnder === 'number' ? overUnder : 0,
      },
      lastUpdated: new Date().toISOString(),
    })
  }
  return out.length ? out : undefined
}

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
      period: competition.status?.type?.shortDetail ?? (competition.status?.period ? String(competition.status.period) : undefined),
      clock: competition.status?.displayClock,
      venue: parseVenue(competition),
      broadcast: broadcasts.length > 0 ? broadcasts : undefined,
      headline,
      weather: parseWeather(event, competition),
      odds: parseEspnOdds(competition),
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

    const posHint =
      groupName === 'forwards' ? 'F'
      : groupName === 'defenses' ? 'D'
      : groupName === 'goalies' ? 'G'
      : ''
    if (!posHint) continue

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ── Soccer ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSoccerBoxscore(teamData: any, confirmed: boolean): Lineup | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statGroups: any[] = teamData.statistics ?? []
  const starters: Player[] = []
  const bench: Player[] = []

  for (const sg of statGroups) {
    const labels: string[] = sg.labels ?? []
    for (const a of sg.athletes ?? []) {
      const athl = a.athlete ?? {}
      const raw = zipStats(labels, a.stats ?? [])
      const stats = pickStats(raw, ['G', 'A', 'SH', 'ST'])

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
  }

  if (!starters.length && !bench.length) return null
  return {
    teamId: teamData.team?.id ?? '',
    confirmed,
    starters,
    bench: bench.length ? bench : undefined,
  }
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
    } else if (leagueId === 'MLS' || leagueId === 'EPL' || leagueId === 'UCL') {
      lineup = parseSoccerBoxscore(teamData, confirmed)
    }

    if (!lineup) continue
    if (tid === homeId) result.homeLineup = lineup
    else if (tid === awayId) result.awayLineup = lineup
  }

  return result
}
