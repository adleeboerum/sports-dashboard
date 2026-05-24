import axios from 'axios'
import type { Game, GameOdds, GameStatus, LeagueId, LeagueStandings, Lineup, Player, StandingEntry, Team, Venue, Weather } from '../types'
import type { OddsFetchStatus } from './oddsApi'
import { fetchOddsForLeague, lookupOdds } from './oddsApi'
import { fetchWeather } from './weatherApi'
import { fetchTicketsForGame } from './ticketsApi'

export type OddsWarning =
  | { kind: 'quota-exceeded' }
  | { kind: 'error'; message: string }

export interface GamesResult {
  games: Game[]
  oddsWarning?: OddsWarning
}

const ESPN     = 'https://site.api.espn.com/apis/site/v2/sports'
const ESPN_WEB = 'https://site.web.api.espn.com/apis/v2/sports'

const ENDPOINTS: { url: string; leagueId: LeagueId }[] = [
  { url: `${ESPN}/basketball/nba/scoreboard`,              leagueId: 'NBA'   },
  { url: `${ESPN}/football/nfl/scoreboard`,                leagueId: 'NFL'   },
  { url: `${ESPN}/baseball/mlb/scoreboard`,                leagueId: 'MLB'   },
  { url: `${ESPN}/hockey/nhl/scoreboard`,                  leagueId: 'NHL'   },
  { url: `${ESPN}/basketball/mens-college-basketball/scoreboard`, leagueId: 'NCAAB' },
  { url: `${ESPN}/football/college-football/scoreboard`,   leagueId: 'NCAAF' },
  { url: `${ESPN}/soccer/usa.1/scoreboard`,                leagueId: 'MLS'   },
  { url: `${ESPN}/soccer/eng.1/scoreboard`,                leagueId: 'EPL'   },
]

const PATHS: Partial<Record<LeagueId, { sport: string; league: string }>> = {
  NBA:   { sport: 'basketball', league: 'nba' },
  NCAAB: { sport: 'basketball', league: 'mens-college-basketball' },
  NFL:   { sport: 'football',   league: 'nfl' },
  NCAAF: { sport: 'football',   league: 'college-football' },
  MLB:   { sport: 'baseball',   league: 'mlb' },
  NHL:   { sport: 'hockey',     league: 'nhl' },
  MLS:   { sport: 'soccer',     league: 'usa.1' },
  EPL:   { sport: 'soccer',     league: 'eng.1' },
}

export interface GameSummaryData {
  homeLineup?: Lineup
  awayLineup?: Lineup
  probablePitchers?: { home?: Player; away?: Player }
}

// ── Date helpers ──────────────────────────────────────────────

function todayYmd(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function ymdPlusDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function isToday(iso: string): boolean {
  const d = new Date(iso), now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function withinDays(iso: string, days: number): boolean {
  const d = new Date(iso).getTime()
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end   = new Date(); end.setDate(end.getDate() + days); end.setHours(23, 59, 59, 999)
  return d >= start.getTime() && d <= end.getTime()
}

// ── Public API ────────────────────────────────────────────────

export async function fetchTodaysGames(dateYmd?: string): Promise<Game[]> {
  return (await fetchTodaysGamesWithStatus(dateYmd)).games
}

export async function fetchTodaysGamesWithStatus(dateYmd?: string): Promise<GamesResult> {
  const ymd = dateYmd ?? todayYmd()

  try {
    const results = await Promise.allSettled(
      ENDPOINTS.map(({ url, leagueId }) =>
        axios.get(url, { params: { dates: ymd } }).then((res) => parseScoreboard(res.data, leagueId)),
      ),
    )
    const games: Game[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') games.push(...r.value)
    }

    const dateGames = ymd === todayYmd() ? games.filter((g) => isToday(g.startTime)) : games
    if (!dateGames.length) return { games: [] }

    let oddsWarning: OddsWarning | undefined
    const [warn] = await Promise.all([enrichOdds(dateGames), enrichWeather(dateGames), enrichTickets(dateGames)])
    oddsWarning = warn
    return { games: dateGames, oddsWarning }
  } catch {
    return { games: [] }
  }
}

export async function fetchGamesInRange(daysAhead: number): Promise<Game[]> {
  return (await fetchGamesInRangeWithStatus(daysAhead)).games
}

export async function fetchGamesInRangeWithStatus(daysAhead: number): Promise<GamesResult> {
  const range = `${todayYmd()}-${ymdPlusDays(daysAhead)}`

  try {
    const results = await Promise.allSettled(
      ENDPOINTS.map(({ url, leagueId }) =>
        axios.get(url, { params: { dates: range, limit: 1000 } }).then((res) => parseScoreboard(res.data, leagueId)),
      ),
    )
    const games: Game[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') games.push(...r.value)
    }

    const inRange = games.filter((g) => withinDays(g.startTime, daysAhead))
    if (!inRange.length) return { games: [] }

    let oddsWarning: OddsWarning | undefined
    const near = inRange.filter((g) => withinDays(g.startTime, 1))
    if (near.length) {
      const [warn] = await Promise.all([enrichOdds(near), enrichWeather(near), enrichTickets(near)])
      oddsWarning = warn
    }
    return { games: inRange, oddsWarning }
  } catch {
    return { games: [] }
  }
}

export async function fetchHistoricalGames(startYmd: string, endYmd: string, leagueIds?: LeagueId[]): Promise<Game[]> {
  const range = `${startYmd}-${endYmd}`
  const endpoints = leagueIds?.length ? ENDPOINTS.filter((e) => leagueIds.includes(e.leagueId)) : ENDPOINTS

  try {
    const results = await Promise.allSettled(
      endpoints.map(({ url, leagueId }) =>
        axios.get(url, { params: { dates: range, limit: 1000 } }).then((res) => parseScoreboard(res.data, leagueId)),
      ),
    )
    const games: Game[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') games.push(...r.value)
    }
    return games.filter((g) => g.status === 'final')
  } catch {
    return []
  }
}

export async function fetchGameSummary(eventId: string, leagueId: LeagueId): Promise<GameSummaryData | null> {
  const path = PATHS[leagueId]
  if (!path) return null
  try {
    const res = await axios.get(`${ESPN}/${path.sport}/${path.league}/summary?event=${eventId}`)
    return parseSummary(res.data, leagueId)
  } catch {
    return null
  }
}

// ── Odds/weather/ticket enrichment ────────────────────────────

async function enrichTickets(games: Game[]): Promise<void> {
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

async function enrichOdds(games: Game[]): Promise<OddsWarning | undefined> {
  const ids = [...new Set(games.map((g) => g.leagueId))]
  const results = await Promise.allSettled(
    ids.map(async (lid) => ({ lid, ...(await fetchOddsForLeague(lid)) })),
  )
  const statuses: OddsFetchStatus[] = []
  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    const { lid, map, status } = r.value
    statuses.push(status)
    if (!Object.keys(map).length) continue
    for (const g of games) {
      if (g.leagueId !== lid) continue
      const found = lookupOdds(map, g.awayTeam.name, g.homeTeam.name)
      if (found?.length) g.odds = found
    }
  }
  if (statuses.some((s) => s.kind === 'quota-exceeded')) return { kind: 'quota-exceeded' }
  const err = statuses.find((s) => s.kind === 'error')
  if (err?.kind === 'error') return { kind: 'error', message: err.message }
  return undefined
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
    case 'STATUS_CANCELED':  return 'canceled'
    default: return 'scheduled'
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTeam(comp: any, leagueId: LeagueId): Team {
  const t = comp.team
  return {
    id: `${leagueId}-${t.id}`,
    name: t.displayName ?? t.name ?? 'Unknown',
    shortName: t.shortDisplayName ?? t.displayName ?? 'Unknown',
    abbreviation: t.abbreviation ?? '???',
    logoUrl: t.logo ?? '',
    primaryColor: `#${t.color ?? '333333'}`,
    secondaryColor: `#${t.alternateColor ?? '666666'}`,
    leagueId,
    record: comp.records?.[0]?.summary,
    ranking: comp.curatedRank?.current && comp.curatedRank.current !== 99
      ? comp.curatedRank.current : undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseVenue(comp: any): Venue {
  const v = comp.venue ?? {}
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
function parseWeatherData(event: any, comp: any): Weather | undefined {
  const w = event.weather ?? comp.weather
  if (!w) return undefined
  const temp = typeof w.temperature === 'number' ? w.temperature
    : typeof w.highTemperature === 'number' ? w.highTemperature : undefined
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

function signed(n: number | undefined): string | undefined {
  if (typeof n !== 'number' || Number.isNaN(n)) return undefined
  return n > 0 ? `+${n}` : `${n}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseOdds(comp: any): GameOdds[] | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = comp.odds ?? []
  if (!raw.length) return undefined

  const out: GameOdds[] = []
  for (const o of raw) {
    const prov  = o.provider ?? {}
    const homeML = o.homeTeamOdds?.moneyLine ?? o.homeMoneyLine
    const awayML = o.awayTeamOdds?.moneyLine ?? o.awayMoneyLine
    const spread: number | undefined = o.spread
    const homeFav = !!o.homeTeamOdds?.favorite
    const homeSpread = typeof spread === 'number' ? (homeFav ? -Math.abs(spread) : Math.abs(spread)) : undefined
    const awaySpread = typeof homeSpread === 'number' ? -homeSpread : undefined
    const ou: number | undefined = o.overUnder

    if (homeML == null && awayML == null && spread == null && ou == null) continue

    out.push({
      sportsbook: {
        id: String(prov.id ?? prov.name ?? out.length),
        name: prov.name ?? 'Sportsbook',
      },
      moneyline: { home: signed(homeML) ?? '—', away: signed(awayML) ?? '—' },
      spread: {
        home: signed(homeSpread) ?? '—',
        homeSpread: signed(o.homeTeamOdds?.spreadOdds) ?? '—',
        away: signed(awaySpread) ?? '—',
        awaySpread: signed(o.awayTeamOdds?.spreadOdds) ?? '—',
      },
      total: {
        over: signed(o.overOdds) ?? '—',
        under: signed(o.underOdds) ?? '—',
        line: typeof ou === 'number' ? ou : 0,
      },
      lastUpdated: new Date().toISOString(),
    })
  }
  return out.length ? out : undefined
}

function parseScoreboard(data: unknown, leagueId: LeagueId): Game[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = (data as any)?.events ?? []
  const games: Game[] = []

  for (const event of events) {
    const comp = event.competitions?.[0]
    if (!comp) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const home = comp.competitors?.find((c: any) => c.homeAway === 'home')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const away = comp.competitors?.find((c: any) => c.homeAway === 'away')
    if (!home || !away) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const broadcasts: string[] = comp.broadcasts?.flatMap((b: any) => b.names ?? []) ?? []

    games.push({
      id: event.id,
      leagueId,
      homeTeam: parseTeam(home, leagueId),
      awayTeam: parseTeam(away, leagueId),
      startTime: event.date ?? comp.date,
      status: mapStatus(comp.status?.type?.name ?? 'STATUS_SCHEDULED'),
      homeScore: home.score !== undefined ? Number(home.score) : undefined,
      awayScore: away.score !== undefined ? Number(away.score) : undefined,
      period: comp.status?.type?.shortDetail ?? (comp.status?.period ? String(comp.status.period) : undefined),
      clock: comp.status?.displayClock,
      venue: parseVenue(comp),
      broadcast: broadcasts.length ? broadcasts : undefined,
      headline: comp.headlines?.[0]?.description,
      weather: parseWeatherData(event, comp),
      odds: parseOdds(comp),
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

function pickStats(raw: Record<string, string>, keys: string[], rename?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of keys) {
    const v = raw[k]
    if (v != null) out[rename?.[k] ?? k] = v
  }
  return out
}

// ── NBA / NCAAB ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseBasketball(team: any, confirmed: boolean): Lineup | null {
  const group = team.statistics?.[0]
  if (!group) return null
  const labels: string[] = group.labels ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const athletes: any[] = group.athletes ?? []
  if (!athletes.length) return null

  const starters: Player[] = [], bench: Player[] = []
  for (const a of athletes) {
    if (a.didNotPlay) continue
    const athl = a.athlete ?? {}
    const stats = pickStats(zipStats(labels, a.stats ?? []), ['PTS', 'REB', 'AST'])
    const p: Player = {
      id: athl.id ?? athl.displayName ?? 'unknown',
      name: athl.displayName ?? 'Unknown',
      position: athl.position?.abbreviation ?? '',
      number: athl.jersey,
      status: 'active',
      stats: Object.keys(stats).length ? stats : undefined,
    }
    if (a.starter) starters.push(p); else bench.push(p)
  }

  if (!starters.length && !bench.length) return null
  return { teamId: team.team?.id ?? '', confirmed, starters, bench: bench.length ? bench : undefined }
}

// ── NHL ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseHockey(team: any, confirmed: boolean): Lineup | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups: any[] = team.statistics ?? []
  const starters: Player[] = []

  for (const sg of groups) {
    const name: string = sg.name?.toLowerCase() ?? ''
    if (name === 'skaters') continue
    const pos = name === 'forwards' ? 'F' : name === 'defenses' ? 'D' : name === 'goalies' ? 'G' : ''
    if (!pos) continue
    const labels: string[] = sg.labels ?? []
    for (const a of sg.athletes ?? []) {
      const athl = a.athlete ?? {}
      const raw  = zipStats(labels, a.stats ?? [])
      const stats = pos === 'G' ? pickStats(raw, ['SV', 'SV%', 'TOI']) : pickStats(raw, ['+/-', 'TOI'])
      starters.push({
        id: athl.id ?? athl.displayName ?? 'unknown',
        name: athl.displayName ?? 'Unknown',
        position: athl.position?.abbreviation ?? pos,
        number: athl.jersey,
        status: 'active',
        stats: Object.keys(stats).length ? stats : undefined,
      })
    }
  }

  if (!starters.length) return null
  return { teamId: team.team?.id ?? '', confirmed, starters }
}

// ── MLB ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMlb(team: any, roster: any, confirmed: boolean): Lineup | null {
  const batterStats  = new Map<string, Record<string, string>>()
  const pitcherStats = new Map<string, Record<string, string>>()

  for (const sg of team.statistics ?? []) {
    const labels: string[] = sg.labels ?? []
    const isPitcher = labels.includes('IP')
    for (const a of sg.athletes ?? []) {
      const id: string | undefined = a.athlete?.id
      if (!id) continue
      const raw = zipStats(labels, a.stats ?? [])
      if (isPitcher) pitcherStats.set(id, pickStats(raw, ['IP', 'K', 'ER'], { K: 'SO' }))
      else           batterStats.set(id,  pickStats(raw, ['H-AB', 'RBI', 'HR'], { 'H-AB': 'H/AB' }))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pitcherGroup = team.statistics?.find((sg: any) => (sg.labels ?? []).includes('IP'))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spEntry = pitcherGroup?.athletes?.find((a: any) => a.starter)
  const starters: Player[] = []

  if (spEntry) {
    const athl = spEntry.athlete ?? {}
    const id: string | undefined = athl.id
    starters.push({ id: id ?? 'sp', name: athl.displayName ?? 'Unknown', position: 'SP', number: athl.jersey, status: 'active', stats: id ? pitcherStats.get(id) : undefined })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rosterEntries: any[] = roster?.roster ?? []
  if (rosterEntries.length) {
    const sorted = [...rosterEntries].sort((a, b) => (a.batOrder ?? 99) - (b.batOrder ?? 99))
    for (const e of sorted) {
      if (!e.starter) continue
      const athl = e.athlete ?? {}
      const id: string | undefined = athl.id
      starters.push({ id: id ?? athl.displayName ?? 'unknown', name: athl.displayName ?? 'Unknown', position: e.position?.abbreviation ?? '', number: e.jersey, status: 'active', stats: id ? batterStats.get(id) : undefined })
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bg = team.statistics?.find((sg: any) => !(sg.labels ?? []).includes('IP'))
    for (const a of bg?.athletes ?? []) {
      if (!a.starter) continue
      const athl = a.athlete ?? {}
      const id: string | undefined = athl.id
      starters.push({ id: id ?? 'batter', name: athl.displayName ?? 'Unknown', position: athl.position?.abbreviation ?? '', number: athl.jersey, status: 'active', stats: id ? batterStats.get(id) : undefined })
    }
  }

  if (!starters.length) return null
  return { teamId: team.team?.id ?? '', confirmed, starters }
}

// ── MLB probable pitchers ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseProbablePitchers(competitors: any[]): GameSummaryData['probablePitchers'] {
  let home: Player | undefined, away: Player | undefined
  for (const comp of competitors) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sp = (comp.probables ?? []).find((p: any) => p.name === 'probableStartingPitcher')
    if (!sp) continue
    const athl = sp.athlete ?? {}
    const categories: { abbreviation: string; displayValue: string }[] = sp.statistics?.splits?.categories ?? []
    const raw: Record<string, string> = {}
    for (const cat of categories) {
      if (cat.abbreviation && cat.displayValue) raw[cat.abbreviation] = cat.displayValue
    }
    const stats: Record<string, string> = {}
    if (raw['W'] && raw['L']) stats['W-L'] = `${raw['W']}-${raw['L']}`
    if (raw['ERA'])  stats['ERA']  = raw['ERA']
    if (raw['K'])    stats['K']    = raw['K']
    if (raw['WHIP']) stats['WHIP'] = raw['WHIP']
    const player: Player = {
      id: athl.id ?? String(sp.playerId ?? 'sp'),
      name: athl.displayName ?? 'Unknown',
      position: 'SP', number: athl.jersey, status: 'active',
      stats: Object.keys(stats).length ? stats : undefined,
    }
    if (comp.homeAway === 'home') home = player
    else if (comp.homeAway === 'away') away = player
  }
  return home || away ? { home, away } : undefined
}

// ── NFL ───────────────────────────────────────────────────────

const NFL_STATS: Record<string, { show: string[]; pos: string }> = {
  passing:       { show: ['C/ATT', 'YDS', 'TD', 'INT'], pos: 'QB'  },
  rushing:       { show: ['CAR', 'YDS', 'TD'],           pos: 'RB'  },
  receiving:     { show: ['REC', 'YDS', 'TD'],           pos: 'WR'  },
  defensive:     { show: ['TOT', 'SACKS', 'INT'],        pos: 'DEF' },
  interceptions: { show: ['INT', 'YDS'],                 pos: 'DB'  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFootball(team: any, confirmed: boolean): Lineup | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups: any[] = team.statistics ?? []
  const seen = new Set<string>()
  const starters: Player[] = []

  for (const sg of groups) {
    const cfg = NFL_STATS[sg.name?.toLowerCase() ?? '']
    if (!cfg) continue
    const labels: string[] = sg.labels ?? []
    for (const a of sg.athletes ?? []) {
      const athl = a.athlete ?? {}
      const id: string = athl.id ?? athl.displayName ?? 'unknown'
      if (seen.has(id)) continue
      seen.add(id)
      const stats = pickStats(zipStats(labels, a.stats ?? []), cfg.show)
      starters.push({
        id, name: athl.displayName ?? 'Unknown',
        position: athl.position?.abbreviation || cfg.pos,
        number: athl.jersey, status: 'active',
        stats: Object.keys(stats).length ? stats : undefined,
      })
    }
  }

  if (!starters.length) return null
  return { teamId: team.team?.id ?? '', confirmed, starters }
}

// ── Soccer ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSoccer(team: any, confirmed: boolean): Lineup | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups: any[] = team.statistics ?? []
  const starters: Player[] = [], bench: Player[] = []

  for (const sg of groups) {
    const labels: string[] = sg.labels ?? []
    for (const a of sg.athletes ?? []) {
      const athl = a.athlete ?? {}
      const stats = pickStats(zipStats(labels, a.stats ?? []), ['G', 'A', 'SH', 'ST'])
      const p: Player = {
        id: athl.id ?? athl.displayName ?? 'unknown',
        name: athl.displayName ?? 'Unknown',
        position: athl.position?.abbreviation ?? '',
        number: athl.jersey, status: 'active',
        stats: Object.keys(stats).length ? stats : undefined,
      }
      if (a.starter) starters.push(p); else bench.push(p)
    }
  }

  if (!starters.length && !bench.length) return null
  return { teamId: team.team?.id ?? '', confirmed, starters, bench: bench.length ? bench : undefined }
}

// ── Summary dispatcher ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSummary(data: any, leagueId: LeagueId): GameSummaryData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const players: any[]     = data?.boxscore?.players ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rosters: any[]     = data?.rosters ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const competitors: any[] = data?.header?.competitions?.[0]?.competitors ?? []

  const homeId = competitors.find((c) => c.homeAway === 'home')?.team?.id
  const awayId = competitors.find((c) => c.homeAway === 'away')?.team?.id
  const result: GameSummaryData = {}

  if (leagueId === 'MLB') {
    const pp = parseProbablePitchers(competitors)
    if (pp) result.probablePitchers = pp
  }

  if (!players.length) return result

  const confirmed = players.some((p) => (p.statistics?.[0]?.athletes ?? []).length > 0)

  for (const team of players) {
    const tid = team.team?.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roster = rosters.find((r: any) => r.team?.id === tid)
    let lineup: Lineup | null = null

    if      (leagueId === 'NBA' || leagueId === 'NCAAB') lineup = parseBasketball(team, confirmed)
    else if (leagueId === 'NHL')                         lineup = parseHockey(team, confirmed)
    else if (leagueId === 'MLB')                         lineup = parseMlb(team, roster, confirmed)
    else if (leagueId === 'NFL' || leagueId === 'NCAAF') lineup = parseFootball(team, confirmed)
    else if (leagueId === 'MLS' || leagueId === 'EPL' || leagueId === 'UCL') lineup = parseSoccer(team, confirmed)

    if (!lineup) continue
    if (tid === homeId) result.homeLineup = lineup
    else if (tid === awayId) result.awayLineup = lineup
  }

  return result
}

// ── Standings ─────────────────────────────────────────────────

const STANDINGS_PATHS: Partial<Record<LeagueId, { sport: string; league: string }>> = {
  NBA: { sport: 'basketball', league: 'nba' },
  NHL: { sport: 'hockey',     league: 'nhl' },
  MLB: { sport: 'baseball',   league: 'mlb' },
  NFL: { sport: 'football',   league: 'nfl' },
}

function standingsSeason(leagueId: LeagueId): number {
  const now = new Date(), year = now.getFullYear(), month = now.getMonth() + 1
  if (leagueId === 'NBA' || leagueId === 'NHL') return month >= 10 ? year + 1 : year
  if (leagueId === 'NFL') return month >= 9 ? year : year - 1
  return year
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseStandingsGroup(group: any, leagueId: LeagueId): import('../types').StandingsGroup | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: any[] = group?.standings?.entries ?? []
  if (!entries.length) return null

  const hockey = leagueId === 'NHL'
  const rows: StandingEntry[] = entries.map((e, i) => {
    const team = e.team ?? {}
    const stats: Record<string, string> = {}
    for (const s of e.stats ?? []) stats[s.name] = s.displayValue ?? ''

    const gbRaw = stats['gamesBehind'] ?? ''
    const gb = gbRaw === '-' || gbRaw === '' ? '—' : gbRaw
    let last10 = stats['Last Ten Games'] ?? ''
    if (last10.includes(',')) last10 = last10.split(',')[0].trim()
    const seed = stats['playoffSeed'] ? Number(stats['playoffSeed']) : i + 1

    return {
      rank: isNaN(seed) ? i + 1 : seed,
      teamId: team.id ?? String(i),
      teamName: team.displayName ?? 'Unknown',
      teamAbbreviation: team.abbreviation ?? '???',
      logoUrl: team.logos?.[0]?.href,
      wins: Number(stats['wins'] ?? 0),
      losses: Number(stats['losses'] ?? 0),
      draws: hockey ? Number(stats['otLosses'] ?? 0) : undefined,
      pct: hockey ? undefined : (stats['winPercent'] || undefined),
      gb: gb || undefined,
      streak: stats['streak'] || undefined,
      last10: last10 || undefined,
    }
  }).sort((a, b) => a.rank - b.rank)

  return { name: group.name ?? group.abbreviation ?? '', entries: rows }
}

export async function fetchStandings(leagueId: LeagueId): Promise<LeagueStandings | null> {
  const path = STANDINGS_PATHS[leagueId]
  if (!path) return null

  try {
    const res = await axios.get(`${ESPN_WEB}/${path.sport}/${path.league}/standings`, {
      params: { season: standingsSeason(leagueId), seasontype: 2 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = res.data?.children ?? []
    if (!children.length) return null

    const groups = children
      .map((c) => parseStandingsGroup(c, leagueId))
      .filter((g): g is import('../types').StandingsGroup => g !== null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const divisionGroups = children.flatMap((c: any) => (c.children ?? []))
      .map((d: any) => parseStandingsGroup(d, leagueId))
      .filter((g): g is import('../types').StandingsGroup => g !== null)

    if (!groups.length) return null
    return { leagueId, lastUpdated: new Date().toISOString(), groups, divisionGroups: divisionGroups.length ? divisionGroups : undefined }
  } catch {
    return null
  }
}
