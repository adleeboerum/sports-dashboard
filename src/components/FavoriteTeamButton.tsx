import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline'

interface Props {
  teamId: string
  teamName: string
  isFavorite: boolean
  onToggle: (teamId: string) => void
}

export default function FavoriteTeamButton({ teamId, teamName, isFavorite, onToggle }: Props) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle(teamId)
      }}
      title={isFavorite ? `Remove ${teamName} from favorites` : `Add ${teamName} to favorites`}
      className="rounded p-1 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {isFavorite ? (
        <StarIcon className="size-4 text-yellow-400" />
      ) : (
        <StarOutlineIcon className="size-4 text-gray-500 hover:text-yellow-400 transition-colors" />
      )}
    </button>
  )
}
