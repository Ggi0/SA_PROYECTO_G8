import { gateway } from './client'
import type { Movie, SeriesStructure } from '@/types'

// ─── Helpers ─────────────────────────────────────────────

// int64 fields come as Long.js objects from gRPC when value > 2^31
function toLong(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'low' in v) return (v as { low: number }).low
  return 0
}

// ─── Mappers ─────────────────────────────────────────────

function mapCard(card: Record<string, unknown>): Movie {
  return {
    id: card.contentId as string,
    title: card.title as string,
    description: '',
    coverImage: (card.posterUrl as string) || '',
    genre: ((card.genres as Array<{ name: string }>) || []).map((g) => g.name),
    year: (card.releaseYear as number) || 0,
    rating: Number(card.avgStars) || 0,
    recommendationPct: Number(card.recommendationPct) || 0,
    type: card.contentType === 'SERIES' ? 'series' : 'movie',
    cast: [],
    durationMin: (card.durationMin as number) || 0,
    ratingClass: (card.ratingClass as string) || '',
    totalVotes: toLong(card.totalVotes),
  }
}

function mapDetail(detail: Record<string, unknown>): Movie {
  const crew = (detail.castAndCrew as Array<Record<string, unknown>>) || []
  return {
    id: detail.contentId as string,
    title: detail.title as string,
    description: (detail.synopsis as string) || '',
    coverImage: (detail.posterUrl as string) || '',
    genre: ((detail.genres as Array<{ name: string }>) || []).map((g) => g.name),
    year: (detail.releaseYear as number) || 0,
    rating: (detail.avgStars as number) || 0,
    recommendationPct: (detail.recommendationPct as number) || 0,
    type: detail.contentType === 'SERIES' ? 'series' : 'movie',
    cast: crew.map((p) => ({
      id: p.personId as string,
      name: p.fullName as string,
      role: (p.characterName as string) || (p.roleType as string),
      photo: (p.photoUrl as string) || '',
    })),
    originalTitle: detail.originalTitle as string,
    trailerUrl: detail.trailerUrl as string,
    videoRef: detail.videoRef as string,
    videoSource: detail.videoSource as string,
    durationMin: (detail.durationMin as number) || 0,
    ratingClass: (detail.ratingClass as string) || '',
  }
}

function mapSeriesStructure(data: Record<string, unknown>): SeriesStructure {
  const seasons = (data.seasons as Array<Record<string, unknown>>) || []
  return {
    contentId: data.contentId as string,
    seriesTitle: data.seriesTitle as string,
    seasons: seasons.map((s) => {
      const episodes = (s.episodes as Array<Record<string, unknown>>) || []
      return {
        id: s.seasonId as string,
        number: s.seasonNum as number,
        title: s.title as string,
        releaseYear: s.releaseYear as number,
        episodes: episodes.map((e) => ({
          id: e.episodeId as string,
          episodeNum: e.episodeNum as number,
          title: e.title as string,
          synopsis: e.synopsis as string,
          duration: (e.durationMin as number) || 0,
          videoRef: (e.videoRef as string) || '',
          videoSource: (e.videoSource as string) || '',
        })),
      }
    }),
  }
}

// ─── API functions ───────────────────────────────────────

export async function getCatalog(params?: {
  type?: string
  genreId?: number
  page?: number
  pageSize?: number
}): Promise<{ movies: Movie[]; total: number }> {
  const res = await gateway.get('/catalog', { params: {
    type: params?.type,
    genre_id: params?.genreId,
    page: params?.page || 1,
    page_size: params?.pageSize || 24,
  }})
  const data = res.data as { items: Array<Record<string, unknown>>; total: number }
  return {
    movies: (data.items || []).map(mapCard),
    total: data.total || 0,
  }
}

export async function getContentDetail(id: string): Promise<Movie> {
  const res = await gateway.get(`/catalog/content/${id}`)
  return mapDetail(res.data as Record<string, unknown>)
}

export async function getSeriesStructure(id: string): Promise<SeriesStructure> {
  const res = await gateway.get(`/catalog/series/${id}/structure`)
  return mapSeriesStructure(res.data as Record<string, unknown>)
}

export async function searchContent(query: string, type?: string): Promise<Movie[]> {
  const res = await gateway.get('/catalog/search', { params: { q: query, type } })
  const data = res.data as { results: Array<Record<string, unknown>> }
  return (data.results || []).map(mapCard)
}

export async function getGenres(): Promise<Array<{ id: number; name: string; slug: string }>> {
  const res = await gateway.get('/catalog/genres')
  const data = res.data as { genres: Array<{ genreId: number; name: string; slug: string }> }
  return (data.genres || []).map((g) => ({ id: g.genreId, name: g.name, slug: g.slug }))
}

export async function rateContent(
  contentId: string,
  profileId: string,
  thumb?: 'UP' | 'DOWN' | '',
  stars?: number,
): Promise<{ success: boolean; recommendationPct: number; avgStars: number }> {
  const res = await gateway.post(`/catalog/content/${contentId}/rate`, { profileId, thumb, stars })
  return res.data as { success: boolean; recommendationPct: number; avgStars: number }
}

export async function getUserRating(
  contentId: string,
  profileId: string,
): Promise<{ thumb: string; stars: number } | null> {
  try {
    const res = await gateway.get(`/catalog/content/${contentId}/rating`, {
      params: { profile_id: profileId },
    })
    return res.data as { thumb: string; stars: number }
  } catch {
    return null
  }
}
////////////////////// Admin functions
// ─────────────────────────────────────────────────────────────────────────────
// AGREGAR estas funciones al final de src/api/catalog.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateContentPayload {
  contentType: 'MOVIE' | 'SERIES'
  title: string
  originalTitle: string
  synopsis: string
  releaseYear: number
  durationMin: number
  ratingClass: string
  posterUrl: string
  trailerUrl: string
  videoRef: string
  videoSource: string
  genreIds: number[]
}

export interface UpdateContentPayload {
  title: string
  synopsis: string
  posterUrl: string
  trailerUrl: string
  videoRef: string
  genreIds: number[]
}

export interface CreatePersonPayload {
  fullName: string
  birthDate: string
  nationality: string
  bio: string
  photoUrl: string
}

export interface AddPersonToContentPayload {
  personId: string
  roleType: 'ACTOR' | 'DIRECTOR' | 'WRITER'
  characterName: string
  billingOrder: number
}

export async function createContent(payload: CreateContentPayload): Promise<{ contentId: string; title: string }> {
  const res = await gateway.post('/catalog/content', payload)
  return res.data as { contentId: string; title: string }
}

export async function updateContent(id: string, payload: UpdateContentPayload): Promise<{ contentId: string; title: string }> {
  const res = await gateway.patch(`/catalog/content/${id}`, payload)
  return res.data as { contentId: string; title: string }
}

export async function publishContent(id: string): Promise<{ success: boolean; publishedAt: string }> {
  const res = await gateway.post(`/catalog/content/${id}/publish`)
  return res.data as { success: boolean; publishedAt: string }
}

export async function createPerson(payload: CreatePersonPayload): Promise<{ personId: string; fullName: string }> {
  const res = await gateway.post('/catalog/person', payload)
  return res.data as { personId: string; fullName: string }
}

export async function addPersonToContent(contentId: string, payload: AddPersonToContentPayload): Promise<{ success: boolean }> {
  const res = await gateway.post(`/catalog/content/${contentId}/cast`, payload)
  return res.data as { success: boolean }
}