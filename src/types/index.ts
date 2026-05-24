export type GameStatus = 'scheduled' | 'live' | 'final' | 'postponed' | 'canceled'

export type LeagueId = 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAAF' | 'NCAAB' | 'MLS' | 'EPL' | 'UCL'

export interface League {
  id: LeagueId
  name: string
  shortName: string
  sport: string
  color: string
}

export interface Venue {
  id: string
  name: string
  city: string
  state?: string
  country: string
  capacity?: number
  surface?: string
  isOutdoor: boolean
}

export interface Team {
  id: string
  name: string
  shortName: string
  abbreviation: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  leagueId: LeagueId
  record?: string
  ranking?: number
  seasonStats?: TeamSeasonStats
}

export interface Player {
  id: string
  name: string
  position: string
  number?: string
  status: 'active' | 'questionable' | 'out' | 'injured-reserve'
  injuryNote?: string
  height?: string
  weight?: string
  age?: number
  experience?: number
  nationality?: string
  stats?: Record<string, string>
}

export interface Lineup {
  teamId: string
  confirmed: boolean
  starters: Player[]
  bench?: Player[]
  formation?: string
  notes?: string
}

export interface TeamSeasonStats {
  stats: { label: string; value: string }[]
  recentForm?: ('W' | 'L' | 'D')[]
  homeRecord?: string
  awayRecord?: string
  streak?: string
}

export interface Weather {
  condition: string
  tempF: number
  windMph: number
  windDir: string
  humidity: number
  precipChance: number
}

export interface OddsLine {
  type: 'moneyline' | 'spread' | 'total'
  homeValue?: string | number
  awayValue?: string | number
  overValue?: string | number
  underValue?: string | number
  label?: string
}

export interface Sportsbook {
  id: string
  name: string
  logoUrl?: string
}

export interface GameOdds {
  sportsbook: Sportsbook
  moneyline: { home: string; away: string }
  spread: { home: string; homeSpread: string; away: string; awaySpread: string }
  total: { over: string; under: string; line: number }
  lastUpdated: string
}

export interface TicketInfo {
  provider: string
  providerLogoUrl?: string
  lowestPrice?: number
  averagePrice?: number
  ticketUrl: string
  availability: 'available' | 'limited' | 'sold-out' | 'unknown'
  isEstimate?: boolean
}

export interface Game {
  id: string
  leagueId: LeagueId
  homeTeam: Team
  awayTeam: Team
  startTime: string
  status: GameStatus
  homeScore?: number
  awayScore?: number
  period?: string
  clock?: string
  venue: Venue
  broadcast?: string[]
  weather?: Weather
  homeLineup?: Lineup
  awayLineup?: Lineup
  odds?: GameOdds[]
  tickets?: TicketInfo
  headline?: string
  probablePitchers?: { home?: Player; away?: Player }
}

export interface FilterState {
  leagues: LeagueId[]
  search: string
  favoritesOnly: boolean
  liveOnly: boolean
  sortBy: 'time' | 'league' | 'odds' | 'tickets'
}

export type ViewMode = 'grid' | 'list'

export type ScheduleView = 'day' | 'upcoming' | 'nextPerTeam'

export type UpcomingWindow = 3 | 7 | 14 | 30

export interface StandingEntry {
  rank: number
  teamId: string
  teamName: string
  teamAbbreviation: string
  logoUrl?: string
  wins: number
  losses: number
  draws?: number
  pct?: string
  gb?: string
  streak?: string
  last10?: string
}

export interface StandingsGroup {
  name: string
  entries: StandingEntry[]
}

export interface LeagueStandings {
  leagueId: LeagueId
  lastUpdated: string
  groups: StandingsGroup[]
}
