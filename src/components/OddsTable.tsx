import type { GameOdds, Team } from '../types'
import { formatOddsValue } from '../utils/formatters'

interface Props {
  odds: GameOdds[]
  homeTeam: Team
  awayTeam: Team
}

export default function OddsTable({ odds, homeTeam, awayTeam }: Props) {
  if (!odds || odds.length === 0) {
    return <p className="text-sm text-gray-500 py-2">Odds not available</p>
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800/60">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Book</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-400" colSpan={2}>Moneyline</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-400" colSpan={2}>Spread</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-400" colSpan={2}>Total</th>
            </tr>
            <tr className="border-b border-gray-700 bg-gray-800/30">
              <th className="px-3 py-1 text-left text-xs text-gray-500" />
              <th className="px-3 py-1 text-center text-xs text-gray-500">{awayTeam.abbreviation}</th>
              <th className="px-3 py-1 text-center text-xs text-gray-500">{homeTeam.abbreviation}</th>
              <th className="px-3 py-1 text-center text-xs text-gray-500">{awayTeam.abbreviation}</th>
              <th className="px-3 py-1 text-center text-xs text-gray-500">{homeTeam.abbreviation}</th>
              <th className="px-3 py-1 text-center text-xs text-gray-500">O</th>
              <th className="px-3 py-1 text-center text-xs text-gray-500">U</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {odds.map((o) => (
              <tr key={o.sportsbook.id} className="hover:bg-gray-800/40">
                <td className="px-3 py-2 font-semibold text-gray-200 whitespace-nowrap">{o.sportsbook.name}</td>
                <td className="px-3 py-2 text-center text-gray-300">{formatOddsValue(o.moneyline.away)}</td>
                <td className="px-3 py-2 text-center text-gray-300">{formatOddsValue(o.moneyline.home)}</td>
                <td className="px-3 py-2 text-center text-gray-300 whitespace-nowrap">
                  {formatOddsValue(o.spread.away)} ({o.spread.awaySpread})
                </td>
                <td className="px-3 py-2 text-center text-gray-300 whitespace-nowrap">
                  {formatOddsValue(o.spread.home)} ({o.spread.homeSpread})
                </td>
                <td className="px-3 py-2 text-center text-gray-300">{formatOddsValue(o.total.over)}</td>
                <td className="px-3 py-2 text-center text-gray-300">{formatOddsValue(o.total.under)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-600">
        Totals line: {odds[0]?.total.line} &bull; Odds for informational purposes only. Not betting advice.
      </p>
    </div>
  )
}
