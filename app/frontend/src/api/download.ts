import { api } from './auth'

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export interface InitiateDownloadResponse {
  allowed: boolean
  download_id?: string      // ← agregar
  downloadId?: string       // mantener por compatibilidad
  message: string
  gcs_url?: string
  gcsUrl?: string
  expiresAt?: number
}
export interface DownloadItem {
  downloadId: string
  contentId: string
  title: string
  thumbnail: string
  status: 'QUEUED' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'DELETED'
  createdAt: number
  expiresAt: number
  sizeBytes: number
}

export interface ListDownloadsResponse {
  allowed: boolean
  message: string
  downloads: DownloadItem[]
}

export interface DeleteDownloadResponse {
  success: boolean
  message: string
}

// ─────────────────────────────────────────────
// API
// ─────────────────────────────────────────────

export const downloadAPI = {
  // Inicia una descarga — solo Plan Premium
initiateDownload: async (contentId: string, plan: number = 3, title: string = '', thumbnail: string = ''): Promise<InitiateDownloadResponse> => {
  const res = await api.post('/downloads/initiate', { contentId, plan, title, thumbnail })
  return res.data
},

listDownloads: async (plan: number = 3): Promise<ListDownloadsResponse> => {
  const res = await api.get('/downloads', { params: { plan } })
  return res.data
},
  // Elimina una descarga
  deleteDownload: async (downloadId: string): Promise<DeleteDownloadResponse> => {
    const res = await api.delete(`/downloads/${downloadId}`)
    return res.data
  },
}