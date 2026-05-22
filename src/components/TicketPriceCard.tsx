import { TicketIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import type { TicketInfo } from '../types'
import { formatCurrency } from '../utils/formatters'

interface Props {
  tickets: TicketInfo
}

const availabilityColors = {
  available: 'text-green-400',
  limited: 'text-yellow-400',
  'sold-out': 'text-red-400',
  unknown: 'text-gray-400',
}

const availabilityLabels = {
  available: 'Available',
  limited: 'Limited',
  'sold-out': 'Sold Out',
  unknown: 'Check site',
}

export default function TicketPriceCard({ tickets }: Props) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <TicketIcon className="size-5 text-indigo-400 shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-400">{tickets.provider}</p>
            {tickets.availability !== 'sold-out' && tickets.lowestPrice ? (
              <p className="text-lg font-bold text-gray-100">
                From {formatCurrency(tickets.lowestPrice)}
                {tickets.isEstimate && <span className="ml-1 text-xs font-normal text-gray-500">(est.)</span>}
              </p>
            ) : (
              <p className={`text-sm font-semibold ${availabilityColors[tickets.availability]}`}>
                {availabilityLabels[tickets.availability]}
              </p>
            )}
            {tickets.averagePrice && tickets.availability !== 'sold-out' && (
              <p className="text-xs text-gray-500">Avg {formatCurrency(tickets.averagePrice)}</p>
            )}
          </div>
        </div>
        {tickets.availability !== 'sold-out' && (
          <a
            href={tickets.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shrink-0"
          >
            Tickets
            <ArrowTopRightOnSquareIcon className="size-3" />
          </a>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-600">Prices may vary. Check provider for current availability.</p>
    </div>
  )
}
