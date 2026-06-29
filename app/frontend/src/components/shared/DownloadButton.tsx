import { useState, useEffect } from 'react'
import { Download, Check, Lock, Trash2 } from 'lucide-react'
import { downloadAPI } from '@/api/download'
import {
  storeEncryptedVideo,
  getDecryptedVideoUrl,
  isStoredLocally,
  deleteLocalDownload,
} from '@/lib/encryptedStorage'

interface DownloadButtonProps {
  contentId: string
  contentTitle: string
  isPremium: boolean
  thumbnail?: string
  onOfflineReady?: (objectUrl: string) => void
}

type DownloadState = 'idle' | 'loading' | 'done' | 'error'

export default function DownloadButton({
  contentId,
  contentTitle,
  isPremium,
  thumbnail = '',
  onOfflineReady,
}: DownloadButtonProps) {
  const [state, setState] = useState<DownloadState>('idle')
  const [downloadId, setDownloadId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  // Al montar, verificar si ya está almacenado localmente
  useEffect(() => {
    if (!isPremium) return
    isStoredLocally(contentId).then(({ stored, downloadId: dlId }) => {
      if (stored && dlId) {
        setDownloadId(dlId)
        setState('done')
      }
    })
  }, [contentId, isPremium])

  // ── Plan no Premium → botón bloqueado ──────────────────
  if (!isPremium) {
    return (
      <div
        title="Disponible solo en Plan Premium"
        className="flex items-center gap-2 border border-[#3a2e1a] px-5 py-3 text-silver/30 font-mono text-sm cursor-not-allowed select-none"
      >
        <Lock size={14} />
        <span className="tracking-widest uppercase text-xs">Descargar</span>
      </div>
    )
  }

  // ── Descarga completada ─────────────────────────────────
  if (state === 'done' && downloadId) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 border border-green-500/40 bg-green-500/10 px-5 py-3 font-mono text-sm text-green-400 cursor-pointer hover:bg-green-500/20 transition-colors"
          onClick={async () => {
            try {
              const url = await getDecryptedVideoUrl(downloadId)
              onOfflineReady?.(url)
            } catch {
              // Si no está en local, el VideoPlayer usa la URL normal
            }
          }}
          title="Ver contenido descargado offline"
        >
          <Check size={14} />
          <span className="tracking-widest uppercase text-xs">Descargado</span>
        </div>

        {showConfirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-silver/50 font-mono text-xs">¿Eliminar?</span>
            <button
              onClick={async () => {
                await downloadAPI.deleteDownload(downloadId).catch(() => {})
                await deleteLocalDownload(downloadId).catch(() => {})
                setDownloadId(null)
                setState('idle')
                setShowConfirmDelete(false)
              }}
              className="text-red-400 font-mono text-xs hover:text-red-300 border border-red-500/30 px-3 py-1 transition-colors"
            >
              Sí
            </button>
            <button
              onClick={() => setShowConfirmDelete(false)}
              className="text-silver/50 font-mono text-xs hover:text-silver border border-[#3a2e1a] px-3 py-1 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="border border-[#3a2e1a] hover:border-red-500/40 p-3 text-silver/40 hover:text-red-400 transition-colors"
            title="Eliminar descarga"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    )
  }

  // ── Descargando con progreso ────────────────────────────
  if (state === 'loading') {
    return (
      <div className="flex flex-col gap-1 border border-spotlight/30 bg-spotlight/5 px-5 py-3 font-mono text-sm text-spotlight/70 min-w-[160px]">
        <div className="flex items-center gap-2">
          <Download size={14} className="animate-bounce shrink-0" />
          <span className="tracking-widest uppercase text-xs">
            {progress > 0 ? `Cifrando ${progress}%` : 'Iniciando...'}
          </span>
        </div>
        {progress > 0 && (
          <div className="h-0.5 bg-spotlight/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-spotlight rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────
  if (state === 'error') {
    return (
      <button
        onClick={() => { setState('idle'); setProgress(0) }}
        className="flex items-center gap-2 border border-red-500/40 bg-red-500/10 px-5 py-3 font-mono text-sm text-red-400 hover:bg-red-500/20 transition-colors"
        title={message}
      >
        <Download size={14} />
        <span className="tracking-widest uppercase text-xs">Reintentar</span>
      </button>
    )
  }

  // ── Idle → botón principal ──────────────────────────────
  const handleDownload = async () => {
    setState('loading')
    setProgress(0)

    try {
      // 1. Registrar descarga en el backend
      const res = await downloadAPI.initiateDownload(contentId, 3, contentTitle, thumbnail)

      if (!res.allowed) {
        setMessage(res.message)
        setState('error')
        return
      }

      const dlId = res.download_id ?? res.downloadId ?? crypto.randomUUID()
      const gcsUrl = res.gcs_url ?? res.gcsUrl ?? ''
      const expiresAt = typeof res.expires_at === 'object'
        ? (res.expires_at as any).low
        : (res.expires_at ?? 0)

      if (!gcsUrl) {
        setMessage('URL de descarga no disponible.')
        setState('error')
        return
      }

      // 2. Descargar, cifrar con AES-256-GCM y almacenar en IndexedDB
      await storeEncryptedVideo(
        dlId,
        gcsUrl,
        { contentId, title: contentTitle, thumbnail, expiresAt },
        (pct) => setProgress(pct)
      )

      setDownloadId(dlId)
      setState('done')

    } catch (err: any) {
      console.error('[Download] Error:', err)
      setMessage(`No se pudo descargar "${contentTitle}". Intenta de nuevo.`)
      setState('error')
    }
  }

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 border border-[#3a2e1a] hover:border-spotlight px-5 py-3 font-mono text-sm text-silver hover:text-spotlight transition-colors tracking-widest uppercase"
    >
      <Download size={14} />
      <span className="text-xs">Descargar</span>
    </button>
  )
}
