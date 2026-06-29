import { useState, useEffect } from 'react'
import { Download, Check, Lock, Trash2 } from 'lucide-react'
import { downloadAPI } from '@/api/download'

interface DownloadButtonProps {
  contentId: string
  contentTitle: string
  isPremium: boolean  // true si el usuario tiene Plan Premium
}

type DownloadState = 'idle' | 'loading' | 'done' | 'error'

export default function DownloadButton({ contentId, contentTitle, isPremium }: DownloadButtonProps) {
  const [state, setState] = useState<DownloadState>('idle')
  const [downloadId, setDownloadId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  // Al montar, verificar si ya está descargado
  useEffect(() => {
  if (!isPremium) return
  downloadAPI.listDownloads()
    .then(({ downloads }) => {
      const existing = (downloads as any[]).find(
        (d) => d.content_id === contentId && d.status === 3  // 3 = COMPLETED
      )
      if (existing) {
        setDownloadId(existing.download_id ?? existing.downloadId)
        setState('done')
      }
    })
    .catch(() => {})
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

  // ── Descarga completada → opción de eliminar ────────────
  if (state === 'done' && downloadId) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 border border-green-500/40 bg-green-500/10 px-5 py-3 font-mono text-sm text-green-400">
          <Check size={14} />
          <span className="tracking-widest uppercase text-xs">Descargado</span>
        </div>

        {showConfirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-silver/50 font-mono text-xs">¿Eliminar?</span>
            <button
              onClick={async () => {
                await downloadAPI.deleteDownload(downloadId)
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

  // ── Descargando ─────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="flex items-center gap-2 border border-spotlight/30 bg-spotlight/5 px-5 py-3 font-mono text-sm text-spotlight/70">
        <Download size={14} className="animate-bounce" />
        <span className="tracking-widest uppercase text-xs">Descargando...</span>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────
  if (state === 'error') {
    return (
      <button
        onClick={() => setState('idle')}
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
  try {
    const res = await downloadAPI.initiateDownload(contentId, 3, contentTitle, '')
    console.log('respuesta descarga:', res)  // ← agregar
    if (!res.allowed) {
      setMessage(res.message)
      setState('error')
      return
    }
    setDownloadId(res.download_id ?? res.downloadId ?? null)
    setState('done')
  } catch (err) {
    console.log('error:', err)  // ← agregar
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
