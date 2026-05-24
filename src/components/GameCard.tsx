import type { LeagueId } from '../types'
import type { CardProps } from './cards/cardShared'
import BaseballGameCard from './cards/BaseballGameCard'
import BasketballGameCard from './cards/BasketballGameCard'
import HockeyGameCard from './cards/HockeyGameCard'
import FootballGameCard from './cards/FootballGameCard'
import SoccerGameCard from './cards/SoccerGameCard'

const LEAGUE_TO_VARIANT: Record<LeagueId, (props: CardProps) => React.JSX.Element> = {
  MLB: BaseballGameCard,
  NBA: BasketballGameCard,
  NCAAB: BasketballGameCard,
  NHL: HockeyGameCard,
  NFL: FootballGameCard,
  NCAAF: FootballGameCard,
  MLS: SoccerGameCard,
  EPL: SoccerGameCard,
  UCL: SoccerGameCard,
}

export default function GameCard(props: CardProps) {
  const Variant = LEAGUE_TO_VARIANT[props.game.leagueId] ?? BasketballGameCard
  return <Variant {...props} />
}
