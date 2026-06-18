// src/pages/admin/components/MediaUploader.tsx
import { useRef, useState } from 'react'
import { Upload, Loader2, CheckCircle2, X, FileVideo, Image as ImageIcon } from 'lucide-react'
import { uploadMediaFile } from '@/api/catalogAdmin'

interface Props {
  kind: 'video' | 'poster'
  value: string                  // object_name actual (videoRef o referencia subida)
  onUploaded: (objectName: string) => void
  onClear?: () => void
}

const ACCEPT: Record<Props['kind'], string> = {
  video: 'video/mp4,video/x-matroska,video/quicktime,.mp4,.mkv,.mov',
  poster: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
}

export default function MediaUploader({ kind, value, onUploaded, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [fileName, setFileName]   = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    setProgress(0)
    setFileName(file.name)

    try {
      const objectName = await uploadMediaFile(file, (pct) => setProgress(pct))
      onUploaded(objectName)
    } catch (err) {
      setError('No se pudo subir el archivo. Intenta de nuevo.')
      setFileName(null)
    } finally {
      setUploading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleClear() {
    setFileName(null)
    setProgress(0)
    setError(null)
    onClear?.()
  }

  const Icon = kind === 'video' ? FileVideo : ImageIcon
  const label = kind === 'video' ? 'Video' : 'Imagen'

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        onChange={handleChange}
        className="hidden"
      />

      {!value && !uploading && !fileName && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-lg border border-dashed border-[#3a2e1a] bg-[#2C2416] text-silver/40 hover:text-silver/70 hover:border-spotlight/40 transition-colors"
        >
          <Upload size={18} />
          <span className="text-xs">Arrastra o haz clic para subir {label.toLowerCase()}</span>
        </button>
      )}

      {uploading && (
        <div className="p-3 rounded-lg bg-[#2C2416] border border-[#3a2e1a]">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={14} className="text-spotlight animate-spin" />
            <span className="text-silver/70 text-xs truncate">{fileName}</span>
          </div>
          <div className="h-1.5 bg-[#1e1810] rounded-full overflow-hidden">
            <div
              className="h-full bg-spotlight transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-silver/40 text-xs mt-1 text-right">{progress}%</p>
        </div>
      )}

      {!uploading && (value || fileName) && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-950/20 border border-green-800/30">
          <CheckCircle2 size={15} className="text-green-400 shrink-0" />
          <Icon size={13} className="text-green-400/70 shrink-0" />
          <span className="text-green-300 text-xs truncate flex-1" title={value}>
            {fileName || value}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-silver/30 hover:text-red-400 transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}
    </div>
  )
}
