import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Calendar, Trash2, Search, Film, Tv, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getCatalog, getGenres, createContent, updateContent, publishContent } from '@/api/catalog'
import type { Movie } from '@/types'
import type { CreateContentPayload, UpdateContentPayload } from '@/api/catalog'
import ContentForm from './components/ContentForm'
import ScheduleModal from './components/ScheduleModal'

type Tab = 'all' | 'MOVIE' | 'SERIES'

export default function CatalogAdminPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [editing, setEditing] = useState<Movie | null>(null)
  const [scheduling, setScheduling] = useState<Movie | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-catalog', tab, page],
    queryFn: () => getCatalog({ type: tab === 'all' ? '' : tab, page, pageSize: 20 }),
  })

  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: getGenres,
  })

  const createMut = useMutation({
    mutationFn: (payload: CreateContentPayload) => createContent(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-catalog'] }); setFormOpen(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateContentPayload }) =>
      updateContent(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-catalog'] }); setFormOpen(false); setEditing(null) },
  })

  const publishMut = useMutation({
    mutationFn: (id: string) => publishContent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-catalog'] }),
  })

  const filtered = (data?.movies || []).filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  )

  const genres = genresData || []

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(m: Movie) { setEditing(m); setFormOpen(true) }
  function openSchedule(m: Movie) { setScheduling(m); setScheduleOpen(true) }

  function handleFormSubmit(payload: CreateContentPayload) {
    if (editing) {
      updateMut.mutate({ id: editing.id, payload: {
        title: payload.title, synopsis: payload.synopsis,
        posterUrl: payload.posterUrl, trailerUrl: payload.trailerUrl,
        videoRef: payload.videoRef, genreIds: payload.genreIds,
      }})
    } else {
      createMut.mutate(payload)
    }
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Todo', icon: <Eye size={14} /> },
    { key: 'MOVIE', label: 'Películas', icon: <Film size={14} /> },
    { key: 'SERIES', label: 'Series', icon: <Tv size={14} /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-spotlight tracking-wide">Catálogo</h1>
          <p className="text-silver/60 text-sm mt-0.5">
            {data?.total ?? 0} títulos en total
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-spotlight text-film hover:bg-spotlight/90 gap-2"
        >
          <Plus size={16} />
          Nuevo título
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex bg-[#2C2416] rounded-lg p-1 gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-spotlight text-film'
                  : 'text-silver/70 hover:text-silver'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver/40" />
          <Input
            placeholder="Buscar título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#2C2416] border-[#3a2e1a] text-silver placeholder:text-silver/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#3a2e1a] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#2C2416]">
            <tr>
              <th className="text-left px-4 py-3 text-silver/50 font-medium">Título</th>
              <th className="text-left px-4 py-3 text-silver/50 font-medium">Tipo</th>
              <th className="text-left px-4 py-3 text-silver/50 font-medium">Año</th>
              <th className="text-left px-4 py-3 text-silver/50 font-medium">Géneros</th>
              <th className="text-left px-4 py-3 text-silver/50 font-medium">Calificación</th>
              <th className="text-right px-4 py-3 text-silver/50 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3a2e1a]">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="bg-[#1e1810]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-[#2C2416] rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((movie) => (
                  <tr
                    key={movie.id}
                    className="bg-[#1e1810] hover:bg-[#241d0f] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {movie.coverImage && (
                          <img
                            src={movie.coverImage}
                            alt={movie.title}
                            className="w-8 h-11 object-cover rounded"
                          />
                        )}
                        <span className="text-silver font-medium truncate max-w-[200px]">
                          {movie.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          movie.type === 'series'
                            ? 'bg-blue-900/40 text-blue-300 border-blue-800'
                            : 'bg-amber-900/40 text-amber-300 border-amber-800'
                        }
                      >
                        {movie.type === 'series' ? 'Serie' : 'Película'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-silver/70">{movie.year}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {movie.genre.slice(0, 2).map((g) => (
                          <Badge
                            key={g}
                            variant="outline"
                            className="text-xs border-[#3a2e1a] text-silver/60"
                          >
                            {g}
                          </Badge>
                        ))}
                        {movie.genre.length > 2 && (
                          <span className="text-silver/40 text-xs">+{movie.genre.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-silver/70">
                      {movie.ratingClass || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(movie)}
                          className="p-1.5 rounded-md text-silver/50 hover:text-spotlight hover:bg-[#2C2416] transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => openSchedule(movie)}
                          className="p-1.5 rounded-md text-silver/50 hover:text-blue-400 hover:bg-[#2C2416] transition-colors"
                          title="Programar estreno"
                        >
                          <Calendar size={14} />
                        </button>
                        <button
                          onClick={() => publishMut.mutate(movie.id)}
                          disabled={publishMut.isPending}
                          className="p-1.5 rounded-md text-silver/50 hover:text-green-400 hover:bg-[#2C2416] transition-colors"
                          title="Publicar ahora"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center text-silver/40">
            <Film size={32} className="mx-auto mb-3 opacity-30" />
            <p>No se encontraron títulos</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {(data?.total ?? 0) > 20 && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="border-[#3a2e1a] text-silver/70 hover:bg-[#2C2416]"
          >
            Anterior
          </Button>
          <span className="text-silver/50 text-sm self-center px-2">
            Página {page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * 20 >= (data?.total ?? 0)}
            onClick={() => setPage((p) => p + 1)}
            className="border-[#3a2e1a] text-silver/70 hover:bg-[#2C2416]"
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Form Modal */}
      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="bg-[#1e1810] border-[#3a2e1a] text-silver max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-spotlight">
              {editing ? 'Editar título' : 'Nuevo título'}
            </DialogTitle>
          </DialogHeader>
          <ContentForm
            genres={genres}
            initial={editing}
            isLoading={createMut.isPending || updateMut.isPending}
            onSubmit={handleFormSubmit}
            onCancel={() => { setFormOpen(false); setEditing(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <ScheduleModal
        open={scheduleOpen}
        content={scheduling}
        onClose={() => { setScheduleOpen(false); setScheduling(null) }}
        onPublish={(id) => { publishMut.mutate(id); setScheduleOpen(false); setScheduling(null) }}
      />
    </div>
  )
}
