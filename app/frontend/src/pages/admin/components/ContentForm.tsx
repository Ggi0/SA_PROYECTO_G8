import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Movie } from '@/types'
import type { CreateContentPayload } from '@/api/catalog'

interface Props {
  genres: Array<{ id: number; name: string }>
  initial: Movie | null
  isLoading: boolean
  onSubmit: (payload: CreateContentPayload) => void
  onCancel: () => void
}

const RATING_CLASSES = ['G', 'PG', 'PG-13', 'R', 'NC-17']
const VIDEO_SOURCES = ['S3', 'YOUTUBE', 'VIMEO', 'CLOUDFLARE']

export default function ContentForm({ genres, initial, isLoading, onSubmit, onCancel }: Props) {
  const isEditing = !!initial

  const [form, setForm] = useState<CreateContentPayload>({
    contentType: 'MOVIE',
    title: '',
    originalTitle: '',
    synopsis: '',
    releaseYear: new Date().getFullYear(),
    durationMin: 0,
    ratingClass: 'PG',
    posterUrl: '',
    trailerUrl: '',
    videoRef: '',
    videoSource: 'S3',
    genreIds: [],
  })

  const [errors, setErrors] = useState<Partial<Record<keyof CreateContentPayload, string>>>({})

  useEffect(() => {
    if (initial) {
      setForm((prev) => ({
        ...prev,
        title: initial.title,
        synopsis: initial.description,
        posterUrl: initial.coverImage,
        trailerUrl: initial.trailerUrl || '',
        videoRef: initial.videoRef || '',
        releaseYear: initial.year,
        durationMin: initial.durationMin || 0,
        ratingClass: initial.ratingClass || 'PG',
        contentType: initial.type === 'series' ? 'SERIES' : 'MOVIE',
      }))
    }
  }, [initial])

  function set<K extends keyof CreateContentPayload>(key: K, value: CreateContentPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function toggleGenre(id: number) {
    setForm((prev) => ({
      ...prev,
      genreIds: prev.genreIds.includes(id)
        ? prev.genreIds.filter((g) => g !== id)
        : [...prev.genreIds, id],
    }))
  }

  function validate(): boolean {
    const e: typeof errors = {}
    if (!form.title.trim()) e.title = 'El título es requerido'
    if (!form.synopsis.trim()) e.synopsis = 'La sinopsis es requerida'
    if (form.releaseYear < 1900 || form.releaseYear > 2100) e.releaseYear = 'Año inválido'
    if (!isEditing && form.durationMin < 1) e.durationMin = 'Duración inválida'
    if (!isEditing && form.genreIds.length === 0) e.genreIds = 'Selecciona al menos un género'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (validate()) onSubmit(form)
  }

  const inputClass = 'bg-[#2C2416] border-[#3a2e1a] text-silver placeholder:text-silver/30 focus-visible:ring-spotlight/50'
  const labelClass = 'block text-xs text-silver/50 mb-1.5 font-medium uppercase tracking-wider'
  const errorClass = 'text-red-400 text-xs mt-1'

  return (
    <div className="space-y-5 py-2">
      {/* Tipo — solo en creación */}
      {!isEditing && (
        <div>
          <label className={labelClass}>Tipo de contenido</label>
          <div className="flex gap-2">
            {(['MOVIE', 'SERIES'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('contentType', t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.contentType === t
                    ? 'bg-spotlight text-film border-spotlight'
                    : 'bg-[#2C2416] border-[#3a2e1a] text-silver/60 hover:text-silver'
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
        <label className={labelClass}>Título</label>
        <Input value={form.title} onChange={(e) => set('title', e.target.value)} className={inputClass} placeholder="Título en español" />
        {errors.title && <p className={errorClass}>{errors.title}</p>}
      </div>

      {/* Título original — solo en creación */}
      {!isEditing && (
        <div>
          <label className={labelClass}>Título original</label>
          <Input value={form.originalTitle} onChange={(e) => set('originalTitle', e.target.value)} className={inputClass} placeholder="Original title" />
        </div>
      )}

      {/* Sinopsis */}
      <div>
        <label className={labelClass}>Sinopsis</label>
        <textarea
          value={form.synopsis}
          onChange={(e) => set('synopsis', e.target.value)}
          rows={3}
          className={`w-full rounded-md px-3 py-2 text-sm resize-none ${inputClass} border`}
          placeholder="Descripción del contenido..."
        />
        {errors.synopsis && <p className={errorClass}>{errors.synopsis}</p>}
      </div>

      {/* Año + Duración + Rating */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Año</label>
          <Input
            type="number"
            value={form.releaseYear}
            onChange={(e) => set('releaseYear', Number(e.target.value))}
            className={inputClass}
          />
          {errors.releaseYear && <p className={errorClass}>{errors.releaseYear}</p>}
        </div>
        {!isEditing && (
          <div>
            <label className={labelClass}>Duración (min)</label>
            <Input
              type="number"
              value={form.durationMin || ''}
              onChange={(e) => set('durationMin', Number(e.target.value))}
              className={inputClass}
              placeholder="120"
            />
            {errors.durationMin && <p className={errorClass}>{errors.durationMin}</p>}
          </div>
        )}
        <div>
          <label className={labelClass}>Clasificación</label>
          <select
            value={form.ratingClass}
            onChange={(e) => set('ratingClass', e.target.value)}
            className={`w-full rounded-md px-3 py-2 text-sm bg-[#2C2416] border border-[#3a2e1a] text-silver`}
          >
            {RATING_CLASSES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* URLs */}
      <div className="space-y-3">
        <div>
          <label className={labelClass}>URL del póster</label>
          <Input value={form.posterUrl} onChange={(e) => set('posterUrl', e.target.value)} className={inputClass} placeholder="https://..." />
        </div>
        <div>
          <label className={labelClass}>URL del trailer</label>
          <Input value={form.trailerUrl} onChange={(e) => set('trailerUrl', e.target.value)} className={inputClass} placeholder="https://youtube.com/..." />
        </div>
      </div>

      {/* Video */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Referencia de video</label>
          <Input value={form.videoRef} onChange={(e) => set('videoRef', e.target.value)} className={inputClass} placeholder="bucket/archivo.mp4" />
        </div>
        <div>
          <label className={labelClass}>Fuente de video</label>
          <select
            value={form.videoSource}
            onChange={(e) => set('videoSource', e.target.value)}
            className={`w-full rounded-md px-3 py-2 text-sm bg-[#2C2416] border border-[#3a2e1a] text-silver`}
          >
            {VIDEO_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Géneros */}
      <div>
        <label className={labelClass}>Géneros</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {genres.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => toggleGenre(g.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                form.genreIds.includes(g.id)
                  ? 'bg-spotlight text-film border-spotlight'
                  : 'bg-[#2C2416] border-[#3a2e1a] text-silver/60 hover:text-silver'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
        {errors.genreIds && <p className={errorClass}>{errors.genreIds}</p>}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-[#3a2e1a]">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-[#3a2e1a] text-silver/70 hover:bg-[#2C2416]"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-spotlight text-film hover:bg-spotlight/90 min-w-[100px]"
        >
          {isLoading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear título'}
        </Button>
      </div>
    </div>
  )
}
