export function formatGameTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function formatOddsValue(value: string | number): string {
  if (typeof value === 'number') {
    return value >= 0 ? `+${value}` : `${value}`
  }
  const n = parseFloat(value)
  if (isNaN(n)) return value
  return n >= 0 ? `+${n}` : `${n}`
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(cents)
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'live': return 'LIVE'
    case 'final': return 'FINAL'
    case 'scheduled': return 'Upcoming'
    case 'postponed': return 'POSTPONED'
    case 'canceled': return 'CANCELED'
    default: return status.toUpperCase()
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'live': return 'text-green-400 bg-green-400/10 ring-green-400/30'
    case 'final': return 'text-gray-400 bg-gray-400/10 ring-gray-400/20'
    case 'scheduled': return 'text-blue-400 bg-blue-400/10 ring-blue-400/30'
    case 'postponed': return 'text-yellow-400 bg-yellow-400/10 ring-yellow-400/30'
    case 'canceled': return 'text-red-400 bg-red-400/10 ring-red-400/30'
    default: return 'text-gray-400 bg-gray-400/10 ring-gray-400/20'
  }
}
