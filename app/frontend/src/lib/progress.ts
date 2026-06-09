const LS_PROFILE = 'quetxal_active_profile'

export interface SavedProgress {
  contentId: string
  title: string
  posterUrl: string
  contentType: 'MOVIE' | 'SERIES'
  minuteReached: number
  totalDuration: number
  videoRef?: string
  seasonNum?: number
  episodeNum?: number
  updatedAt: string
}

type Store = Record<string, SavedProgress>

function getProfileKey(): string {
  try {
    const profile = JSON.parse(localStorage.getItem(LS_PROFILE) || 'null')
    return profile?.id ? `quetxal_progress_${profile.id}` : 'quetxal_progress_guest'
  } catch {
    return 'quetxal_progress_guest'
  }
}

export function saveProgress(data: Omit<SavedProgress, 'updatedAt'>) {
  const key = getProfileKey()
  const store: Store = JSON.parse(localStorage.getItem(key) || '{}')
  store[data.contentId] = { ...data, updatedAt: new Date().toISOString() }
  localStorage.setItem(key, JSON.stringify(store))
}

export function getProgress(contentId: string): SavedProgress | null {
  const key = getProfileKey()
  const store: Store = JSON.parse(localStorage.getItem(key) || '{}')
  return store[contentId] ?? null
}

export function clearProgress(contentId: string) {
  const key = getProfileKey()
  const store: Store = JSON.parse(localStorage.getItem(key) || '{}')
  delete store[contentId]
  localStorage.setItem(key, JSON.stringify(store))
}

export function getAllProgress(): SavedProgress[] {
  const key = getProfileKey()
  const store: Store = JSON.parse(localStorage.getItem(key) || '{}')
  return Object.values(store).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}
