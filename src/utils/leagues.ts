import type { League, LeagueId } from '../types'

export const LEAGUES: League[] = [
  { id: 'NFL',   name: 'National Football League',        shortName: 'NFL',   sport: 'Football',   color: '#013369' },
  { id: 'NBA',   name: 'National Basketball Association', shortName: 'NBA',   sport: 'Basketball', color: '#C9082A' },
  { id: 'MLB',   name: 'Major League Baseball',           shortName: 'MLB',   sport: 'Baseball',   color: '#002D72' },
  { id: 'NHL',   name: 'National Hockey League',          shortName: 'NHL',   sport: 'Hockey',     color: '#000000' },
  { id: 'NCAAF', name: 'College Football',                shortName: 'NCAAF', sport: 'Football',   color: '#FF8200' },
  { id: 'NCAAB', name: 'College Basketball',              shortName: 'NCAAB', sport: 'Basketball', color: '#003087' },
  { id: 'MLS',   name: 'Major League Soccer',             shortName: 'MLS',   sport: 'Soccer',     color: '#003087' },
  { id: 'EPL',   name: 'Premier League',                  shortName: 'EPL',   sport: 'Soccer',     color: '#3D195B' },
]

export const LEAGUE_COLORS: Record<LeagueId, string> = {
  NFL:   'bg-blue-900 text-blue-100',
  NBA:   'bg-red-900 text-red-100',
  MLB:   'bg-blue-800 text-blue-100',
  NHL:   'bg-gray-800 text-gray-100',
  NCAAF: 'bg-orange-800 text-orange-100',
  NCAAB: 'bg-indigo-800 text-indigo-100',
  MLS:   'bg-teal-800 text-teal-100',
  EPL:   'bg-purple-900 text-purple-100',
  UCL:   'bg-blue-900 text-blue-100',
}
