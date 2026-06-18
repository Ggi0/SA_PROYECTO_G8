// src/pages/admin/components/ContentForm.tsx
import { useEffect, useState } from 'react'
import { Upload, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Movie } from '@/types'
import type { CreateContentPayload } from '@/api/catalogAdmin'
import MediaUploader from './MediaUploader'

interface Props {
  genres: Array<{ id: number; name: string }>
  initial: Movie | null
  isLoading: boolean
  onSubmit: (payload: CreateContentPayload) => void
  onCancel: () => void
}

const RATING_CLASSES = ['G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-MA', 'NR']

const empty: CreateContentPayload = {
  contentType: 'MOVIE',
  title: '', originalTitle: '', synopsis: '',
  releaseYear: new Date().getFullYear(),
  durationMin: 0, ratingClass: 'PG',
  posterUrl: '', trailerUrl: '', videoRef: '',
  videoSource: 'gcs', genreIds: [],
}

export default function ContentForm({ genres, initial, isLoading, onSubmit, onCancel }: Props) {
  const isEditing = !!initial
  const [form, setForm] = useState<CreateContentPayload>(empty)
  const [errors, setErrors] = useState<Partial<Record<keyof CreateContentPayload, string>>>({})

  // Modo de carga del video: subir archivo (gcs) o pegar link (youtube/vimeo)
  const [videoMode, setVideoMode] = useState<'upload' | 'link'>('upload')
  const [posterMode, setPosterMode] = useState<'upload' | 'link'>('link')

  useEffect(() => {
    if (initial) {
      setForm({
        ...empty,
        contentType:   initial.type === 'series' ? 'SERIES' : 'MOVIE',
        title:         initial.title,
        synopsis:      initial.description || '',
        posterUrl:     initial.coverImage || '',
        trailerUrl:    initial.trailerUrl || '',
        videoRef:      initial.videoRef || '',
        videoSource:   initial.videoSource || 'gcs',
        releaseYear:   initial.year || new Date().getFullYear(),
        durationMin:   initial.durationMin || 0,
        ratingClass:   initial.ratingClass || 'PG',
      })
      setVideoMode(initial.videoSource === 'gcs' ? 'upload' : 'link')
      setPosterMode(initial.coverImage?.startsWith('http') ? 'link' : 'upload')
    } else {
      setForm(empty)
      setVideoMode('upload')
      setPosterMode('link')
    }
    setErrors({})
  }, [initial])

  function set<K extends keyof CreateContentPayload>(key: K, value: CreateContentPayload[K]) {
    setForm((p: CreateContentPayload) => ({ ...p, [key]: value }))
    setErrors((p: Partial<Record<keyof CreateContentPayload, string>>) => ({ ...p, [key]: undefined }))
  }

  function toggleGenre(id: number) {
    setForm((p: CreateContentPayload) => ({
      ...p,
      genreIds: p.genreIds.includes(id) ? p.genreIds.filter((g: number) => g !== id) : [...p.genreIds, id],
    }))
  }

  function validate() {
    const e: typeof errors = {}
    if (!form.title.trim())   e.title    = 'Requerido'
    if (!form.synopsis.trim()) e.synopsis = 'Requerido'
    if (form.releaseYear < 1900 || form.releaseYear > 2100) e.releaseYear = 'Año inválido'
    if (!isEditing && form.contentType === 'MOVIE' && form.durationMin < 1) e.durationMin = 'Requerido para películas'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() { if (validate()) onSubmit(form) }

  function handleVideoUploaded(objectName: string) {
    set('videoRef', objectName)
    set('videoSource', 'gcs')
  }

  function handlePosterUploaded(objectName: string) {
    // El backend de upload sirve también para posters; se guarda el object_name
    // como referencia. Si tu visor de pósters espera una URL servida por el
    // backend, ajusta aquí para construir esa URL en vez del object_name crudo.
    set('posterUrl', objectName)
  }

  const inp = 'bg-[#2C2416] border-[#3a2e1a] text-silver placeholder:text-silver/25 focus-visible:ring-spotlight/40 h-9 text-sm'
  const lbl = 'block text-xs text-silver/40 uppercase tracking-wider mb-1.5 font-semibold'
  const err = 'text-red-400 text-xs mt-1'

  return (
    <div className="space-y-4 pt-1">

      {/* Tipo — solo en creación */}
      {!isEditing && (
        <div>
          <p className={lbl}>Tipo de contenido</p>
          <div className="grid grid-cols-2 gap-2">
            {(['MOVIE', 'SERIES'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => set('contentType', t)}
                className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                  form.contentType === t
                    ? 'bg-spotlight text-film border-spotlight'
                    : 'bg-[#2C2416] border-[#3a2e1a] text-silver/50 hover:text-silver'
                }`}
              >
                {t === 'MOVIE' ? '🎬 Película' : '📺 Serie'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Título */}
      <div>
        <label className={lbl}>Título *</label>
        <Input value={form.title} onChange={e => set('title', e.target.value)} className={inp} placeholder="Título en español" />
        {errors.title && <p className={err}>{errors.title}</p>}
      </div>

      {/* Título original — solo creación */}
      {!isEditing && (
        <div>
          <label className={lbl}>Título original</label>
          <Input value={form.originalTitle} onChange={e => set('originalTitle', e.target.value)} className={inp} placeholder="Original title" />
        </div>
      )}

      {/* Sinopsis */}
      <div>
        <label className={lbl}>Sinopsis *</label>
        <textarea
          value={form.synopsis}
          onChange={e => set('synopsis', e.target.value)}
          rows={3}
          className={`w-full rounded-md px-3 py-2 text-sm resize-none bg-[#2C2416] border border-[#3a2e1a] text-silver placeholder:text-silver/25 focus:outline-none focus:ring-1 focus:ring-spotlight/40`}
          placeholder="Descripción del contenido..."
        />
        {errors.synopsis && <p className={err}>{errors.synopsis}</p>}
      </div>

      {/* Año + Duración + Clasificación */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={lbl}>Año *</label>
          <Input type="number" value={form.releaseYear} onChange={e => set('releaseYear', Number(e.target.value))} className={inp} />
          {errors.releaseYear && <p className={err}>{errors.releaseYear}</p>}
        </div>
        {(!isEditing && form.contentType === 'MOVIE') && (
          <div>
            <label className={lbl}>Duración (min)</label>
            <Input type="number" value={form.durationMin || ''} onChange={e => set('durationMin', Number(e.target.value))} className={inp} placeholder="120" />
            {errors.durationMin && <p className={err}>{errors.durationMin}</p>}
          </div>
        )}
        <div>
          <label className={lbl}>Clasificación</label>
          <select
            value={form.ratingClass}
            onChange={e => set('ratingClass', e.target.value)}
            className="w-full h-9 rounded-md px-3 text-sm bg-[#2C2416] border border-[#3a2e1a] text-silver focus:outline-none focus:ring-1 focus:ring-spotlight/40"
          >
            {RATING_CLASSES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Póster */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={lbl + ' mb-0'}>Póster</label>
          <ModeToggle mode={posterMode} onChange={setPosterMode} />
        </div>

        {posterMode === 'link' ? (
          <Input value={form.posterUrl} onChange={e => set('posterUrl', e.target.value)} className={inp} placeholder="https://..." />
        ) : (
          <MediaUploader
            kind="poster"
            value={form.posterUrl}
            onUploaded={handlePosterUploaded}
            onClear={() => set('posterUrl', '')}
          />
        )}

        {posterMode === 'link' && form.posterUrl && (
          <div className="flex justify-center mt-2">
            <img
              src={form.posterUrl}
              alt="Preview"
              className="h-28 rounded-lg object-cover border border-[#3a2e1a] opacity-80"
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          </div>
        )}
      </div>


      {/* Video principal */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={lbl + ' mb-0'}>Video {!isEditing && '*'}</label>
          <ModeToggle mode={videoMode} onChange={setVideoMode} />
        </div>

        {videoMode === 'upload' ? (
          <MediaUploader
            kind="video"
            value={form.videoRef}
            onUploaded={handleVideoUploaded}
            onClear={() => set('videoRef', '')}
          />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                value={form.videoRef}
                onChange={e => { set('videoRef', e.target.value); set('videoSource', 'youtube') }}
                className={inp}
                placeholder="ID o URL del video"
              />
            </div>
            <select
              value={form.videoSource}
              onChange={e => set('videoSource', e.target.value)}
              className="w-full h-9 rounded-md px-3 text-sm bg-[#2C2416] border border-[#3a2e1a] text-silver focus:outline-none focus:ring-1 focus:ring-spotlight/40"
            >
              <option value="youtube">youtube</option>
              <option value="vimeo">vimeo</option>
            </select>
          </div>
        )}
      </div>

      {/* Géneros */}
      <div>
        <label className={lbl}>Géneros</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {genres.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => toggleGenre(g.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                form.genreIds.includes(g.id)
                  ? 'bg-spotlight text-film border-spotlight'
                  : 'bg-[#2C2416] border-[#3a2e1a] text-silver/50 hover:text-silver hover:border-silver/20'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-3 border-t border-[#3a2e1a]">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-[#3a2e1a] text-silver/60 hover:bg-[#2C2416] hover:text-silver h-9 text-sm"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-spotlight text-film hover:bg-spotlight/90 h-9 text-sm min-w-[120px]"
        >
          {isLoading
            ? 'Guardando...'
            : isEditing ? 'Guardar cambios' : 'Crear título'}
        </Button>
      </div>
    </div>
  )
}

// ─── Toggle subir archivo / pegar link ────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: 'upload' | 'link'; onChange: (m: 'upload' | 'link') => void }) {
  return (
    <div className="flex items-center gap-1 bg-[#1e1810] rounded-md p-0.5 border border-[#3a2e1a]">
      <button
        type="button"
        onClick={() => onChange('upload')}
        title="Subir archivo"
        className={`p-1 rounded text-xs transition-colors ${
          mode === 'upload' ? 'bg-spotlight text-film' : 'text-silver/40 hover:text-silver'
        }`}
      >
        <Upload size={12} />
      </button>
      <button
        type="button"
        onClick={() => onChange('link')}
        title="Pegar enlace"
        className={`p-1 rounded text-xs transition-colors ${
          mode === 'link' ? 'bg-spotlight text-film' : 'text-silver/40 hover:text-silver'
        }`}
      >
        <LinkIcon size={12} />
      </button>
    </div>
  )
}
