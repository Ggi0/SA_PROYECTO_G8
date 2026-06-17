// ─────────────────────────────────────────────────────────────────────────────
// src/api/catalogAdmin.ts
// Funciones admin para el catálogo — usar junto a src/api/catalog.ts
// ─────────────────────────────────────────────────────────────────────────────
import { gateway } from './client'

// ─── Types ───────────────────────────────────────────────────────────────────

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
  title?: string
  synopsis?: string
  posterUrl?: string
  trailerUrl?: string
  videoRef?: string
  genreIds?: number[]
}

export interface ContentCard {
  contentId: string
  title: string
  contentType: string
  releaseYear: number
  posterUrl: string
  ratingClass: string
  isPublished: boolean
  genres: Array<{ name: string }>
}

// ─── Contenido ───────────────────────────────────────────────────────────────

export async function adminCreateContent(payload: CreateContentPayload): Promise<ContentCard> {
  const res = await gateway.post('/catalog/admin/content', payload)
  return res.data as ContentCard
}

export async function adminUpdateContent(id: string, payload: UpdateContentPayload): Promise<ContentCard> {
  const res = await gateway.put(`/catalog/admin/content/${id}`, payload)
  return res.data as ContentCard
}

export async function adminPublishContent(id: string): Promise<{ success: boolean; publishedAt: string }> {
  const res = await gateway.post(`/catalog/admin/content/${id}/publish`)
  return res.data as { success: boolean; publishedAt: string }
}

export async function adminScheduleContent(
  id: string,
  premiereDate: string,
): Promise<{ success: boolean }> {
  const res = await gateway.post(`/catalog/admin/content/${id}/schedule`, {
    premiereDate,
    changedBy: 'admin',
  })
  return res.data as { success: boolean }
}

export async function adminDeleteContent(id: string): Promise<{ success: boolean }> {
  const res = await gateway.delete(`/catalog/admin/content/${id}`, {
    data: { changedBy: 'admin' },
  })
  return res.data as { success: boolean }
}

// ─── Personas ─────────────────────────────────────────────────────────────────

export interface CreatePersonPayload {
  fullName: string
  birthDate: string
  nationality: string
  bio: string
  photoUrl: string
}

export async function adminCreatePerson(payload: CreatePersonPayload) {
  const res = await gateway.post('/catalog/admin/people', payload)
  return res.data
}

export async function adminAddPersonToContent(
  contentId: string,
  payload: {
    personId: string
    roleType: 'ACTOR' | 'DIRECTOR' | 'WRITER'
    characterName: string
    billingOrder: number
  },
) {
  const res = await gateway.post(`/catalog/admin/content/${contentId}/cast`, payload)
  return res.data
}

export async function adminRemovePersonFromContent(
  contentId: string,
  personId: string,
  roleType: string,
) {
  const res = await gateway.delete(
    `/catalog/admin/content/${contentId}/cast/${personId}`,
    { params: { role_type: roleType } },
  )
  return res.data
}

// ─── Temporadas y episodios ───────────────────────────────────────────────────

export async function adminCreateSeason(
  contentId: string,
  payload: { seasonNum: number; title: string; releaseYear: number },
) {
  const res = await gateway.post(`/catalog/admin/content/${contentId}/seasons`, payload)
  return res.data
}

export async function adminCreateEpisode(
  seasonId: string,
  payload: {
    episodeNum: number
    title: string
    synopsis: string
    durationMin: number
    videoRef: string
    videoSource: string
  },
) {
  const res = await gateway.post(`/catalog/admin/seasons/${seasonId}/episodes`, payload)
  return res.data
}

export async function adminDeleteEpisode(episodeId: string) {
  const res = await gateway.delete(`/catalog/admin/episodes/${episodeId}`, {
    data: { changedBy: 'admin' },
  })
  return res.data
}
