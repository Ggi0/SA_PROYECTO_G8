import { gateway } from '@/api/client'

export interface UpdateMovieProgressPayload {
  profileId: string
  contentId: string
  minuteReached: number
  totalDurationMin: number
}

export interface UpdateEpisodeProgressPayload {
  profileId: string
  contentId: string
  seasonId: string
  episodeId: string
  seasonNum: number
  episodeNum: number
  minuteReached: number
  totalDurationMin: number
}

export interface ProgressItemResponse {
  progressId: string
  profileId: string
  contentId: string
  contentType: 'MOVIE' | 'SERIES'
  minuteReached: number
  totalDurationMin?: number
  completionPct: number
  isCompleted?: boolean
  lastWatchedAt: string
  lastEpisodeId?: string
  lastSeasonNum?: number
  lastEpisodeNum?: number
  lastEpMinute?: number
}

interface ApiProgressItem {
  progress_id?: string
  progressId?: string
  profile_id?: string
  profileId?: string
  content_id?: string
  contentId?: string
  content_type?: 'MOVIE' | 'SERIES'
  contentType?: 'MOVIE' | 'SERIES'
  minute_reached?: number
  minuteReached?: number
  total_duration_min?: number
  totalDurationMin?: number
  completion_pct?: number
  completionPct?: number
  is_completed?: boolean
  isCompleted?: boolean
  last_watched_at?: string
  lastWatchedAt?: string
  last_episode_id?: string
  lastEpisodeId?: string
  last_season_num?: number
  lastSeasonNum?: number
  last_episode_num?: number
  lastEpisodeNum?: number
  last_ep_minute?: number
  lastEpMinute?: number
}

interface ContinueWatchingApiResponse {
  items?: ApiProgressItem[]
}

interface ContentProgressApiResponse {
  progress?: ApiProgressItem
}

const normalizarProgressItem = (item: ApiProgressItem): ProgressItemResponse => ({
  progressId: item.progressId ?? item.progress_id ?? '',
  profileId: item.profileId ?? item.profile_id ?? '',
  contentId: item.contentId ?? item.content_id ?? '',
  contentType: item.contentType ?? item.content_type ?? 'MOVIE',
  minuteReached: item.minuteReached ?? item.minute_reached ?? 0,
  totalDurationMin: item.totalDurationMin ?? item.total_duration_min,
  completionPct: item.completionPct ?? item.completion_pct ?? 0,
  isCompleted: item.isCompleted ?? item.is_completed ?? false,
  lastWatchedAt: item.lastWatchedAt ?? item.last_watched_at ?? '',
  lastEpisodeId: item.lastEpisodeId ?? item.last_episode_id,
  lastSeasonNum: item.lastSeasonNum ?? item.last_season_num,
  lastEpisodeNum: item.lastEpisodeNum ?? item.last_episode_num,
  lastEpMinute: item.lastEpMinute ?? item.last_ep_minute,
})

export const historialAPI = {
  updateMovieProgress: async (payload: UpdateMovieProgressPayload) => {
    const res = await gateway.post('/historial/movie-progress', payload)
    return res.data
  },

  updateEpisodeProgress: async (payload: UpdateEpisodeProgressPayload) => {
    const res = await gateway.post('/historial/episode-progress', payload)
    return res.data
  },

  getContinueWatching: async (
    profileId: string
  ): Promise<ProgressItemResponse[]> => {
    const res = await gateway.get<ApiProgressItem[] | ContinueWatchingApiResponse>(
      `/historial/continue-watching/${profileId}`
    )

    const data = Array.isArray(res.data) ? res.data : res.data.items ?? []

    return data.map(normalizarProgressItem)
  },

  getContentProgress: async (
    profileId: string,
    contentId: string
  ): Promise<ProgressItemResponse | null> => {
    const res = await gateway.get<ApiProgressItem | ContentProgressApiResponse>(
      `/historial/progress/${profileId}/${contentId}`
    )

    if (!res.data) return null

    const progress = (
  'progress' in res.data ? res.data.progress : res.data
) as ApiProgressItem | undefined

if (!progress) return null

return normalizarProgressItem(progress)
  },
}
