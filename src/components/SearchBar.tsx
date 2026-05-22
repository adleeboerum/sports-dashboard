import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid'

interface Props {
  value: string
  onChange: (v: string) => void
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative flex items-center">
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 size-4 text-gray-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search teams or leagues..."
        className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-8 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 rounded p-0.5 text-gray-500 hover:text-gray-300"
        >
          <XMarkIcon className="size-4" />
        </button>
      )}
    </div>
  )
}
