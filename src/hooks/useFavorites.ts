import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'sports_dashboard_favorites'

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveFavorites(favs: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...favs]))
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      setFavorites(loadFavorites())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggleFavorite = useCallback((teamId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) {
        next.delete(teamId)
      } else {
        next.add(teamId)
      }
      saveFavorites(next)
      return next
    })
  }, [])

  const isFavorite = useCallback((teamId: string) => favorites.has(teamId), [favorites])

  return { favorites, toggleFavorite, isFavorite }
}
