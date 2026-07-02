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

// ─── Subida de archivos a GCS (videos y posters) ──────────────────────────────

export interface UploadUrlResponse {
  upload_url: string
  object_name: string
}

export interface DownloadUrlResponse {
  download_url: string
}

/**
 * Pide al backend una signed URL para subir un archivo directo a GCS.
 */
export async function getUploadUrl(filename: string, contentType: string): Promise<UploadUrlResponse> {
  const res = await gateway.post('/catalog/admin/upload-url', {
    filename,
    content_type: contentType,
  })
  return res.data as UploadUrlResponse
}

/**
 * Pide al backend una signed URL para reproducir/descargar un objeto de GCS.
 */
export async function getDownloadUrl(objectName: string): Promise<DownloadUrlResponse> {
  const res = await gateway.get('/catalog/admin/download-url', {
    params: { object: objectName },
  })
  return res.data as DownloadUrlResponse
}

/**
 * Sube un archivo directo a GCS usando una signed URL, con callback de progreso.
 * No pasa por el api-gateway — va directo al bucket.
 */
export function uploadFileToGCS(
  file: File,
  uploadUrl: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed with status ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(file)
  })
}

/**
 * Flujo completo: pide signed URL, sube el archivo, devuelve el object_name
 * para guardarlo como videoRef/posterUrl en el formulario.
 */
export async function uploadMediaFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const { upload_url, object_name } = await getUploadUrl(file.name, file.type)
  await uploadFileToGCS(file, upload_url, onProgress)
  return object_name
}

// ─── Listado admin (incluye no publicados y programados) ──────────────────────
// Mismo shape de respuesta que GET /catalog ({ items, total }), por eso
// reutilizamos el mismo mapeo que catalog.ts usa para mapCard.

export interface AdminContentListParams {
  type?: string
  genreId?: number
  page?: number
  pageSize?: number
}

function mapAdminCard(card: Record<string, unknown>) {
  function toLong(v: unknown): number {
    if (typeof v === "number") return v
    if (v && typeof v === "object" && "low" in v) return (v as { low: number }).low
    return 0
  }
  return {
    id: card.contentId as string,
    title: card.title as string,
    description: "",
    coverImage: (card.posterUrl as string) || "",
    genre: ((card.genres as Array<{ name: string }>) || []).map((g) => g.name),
    year: (card.releaseYear as number) || 0,
    rating: Number(card.avgStars) || 0,
    recommendationPct: Number(card.recommendationPct) || 0,
    type: card.contentType === "SERIES" ? "series" : "movie",
    cast: [],
    durationMin: (card.durationMin as number) || 0,
    ratingClass: (card.ratingClass as string) || "",
    totalVotes: toLong(card.totalVotes),
    isPublished: (card.isPublished as boolean) ?? true,
  }
}

export async function adminGetAllContent(
  params?: AdminContentListParams,
) {
  const res = await gateway.get("/catalog/admin/content/all", {
    params: {
      type: params?.type,
      genre_id: params?.genreId,
      page: params?.page || 1,
      page_size: params?.pageSize || 24,
    },
  })
  const data = res.data as { items: Array<Record<string, unknown>>; total: number }
  return {
    movies: (data.items || []).map(mapAdminCard),
    total: data.total || 0,
  }
}
