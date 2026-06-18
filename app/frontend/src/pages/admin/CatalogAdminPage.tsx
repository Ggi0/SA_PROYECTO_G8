// src/pages/admin/CatalogAdminPage.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Calendar, Trash2, Eye, Film, Tv, Search, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getCatalog, getGenres } from '@/api/catalog'
import {
  adminCreateContent,
  adminUpdateContent,
  adminPublishContent,
  adminDeleteContent,
  adminGetAllContent,
  type CreateContentPayload,
} from '@/api/catalogAdmin'
import type { Movie } from '@/types'
import ContentForm from './components/ContentForm'
import ScheduleModal from './components/ScheduleModal'

type Tab = 'all' | 'MOVIE' | 'SERIES'

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'all',    label: 'Todo',      icon: Eye  },
  { key: 'MOVIE',  label: 'Películas', icon: Film },
  { key: 'SERIES', label: 'Series',    icon: Tv   },
]

export default function CatalogAdminPage() {
  const qc = useQueryClient()

  const [tab, setTab]               = useState<Tab>('all')
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const [formOpen, setFormOpen]     = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editing, setEditing]       = useState<Movie | null>(null)
  const [scheduling, setScheduling] = useState<Movie | null>(null)
  const [deleting, setDeleting]     = useState<Movie | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-catalog', tab, page],
    queryFn: () => adminGetAllContent({ type: tab === 'all' ? '' : tab, page, pageSize: 20 }),
  })

  // El endpoint admin/content/all no manda isPublished todavía, así que lo
  // derivamos cruzando contra el catálogo público: si el id aparece ahí,
  // está publicado. Trae hasta 200 ids publicados, suficiente para cruzar.
  const { data: publishedData } = useQuery({
    queryKey: ['admin-catalog-published-ids'],
    queryFn: () => getCatalog({ pageSize: 200 }),
    staleTime: 30_000,
  })
  const publishedIds = new Set((publishedData?.movies || []).map(m => m.id))

  const dataWithPublishState = data
    ? {
        ...data,
        movies: data.movies.map(m => ({ ...m, isPublished: publishedIds.has(m.id) } as Movie)),
      }
    : data

  const { data: genresData } = useQuery({ queryKey: ['genres'], queryFn: getGenres })
  const genres = genresData || []

  const createMut = useMutation({
    mutationFn: adminCreateContent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-catalog'] }); closeForm() },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateContentPayload }) =>
      adminUpdateContent(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-catalog'] }); closeForm() },
  })
  const publishMut = useMutation({
    mutationFn: adminPublishContent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-catalog'] }),
  })
  const deleteMut = useMutation({
    mutationFn: adminDeleteContent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-catalog'] })
      setDeleteOpen(false)
      setDeleting(null)
    },
  })

  function closeForm() { setFormOpen(false); setEditing(null) }
  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(m: Movie) { setEditing(m); setFormOpen(true) }
  function openSchedule(m: Movie) {
  if (m.isPublished) return
  setScheduling(m)
  setScheduleOpen(true)
}
  function openDelete(m: Movie) { setDeleting(m); setDeleteOpen(true) }

  function handleFormSubmit(payload: CreateContentPayload) {
    if (editing) {
      updateMut.mutate({ id: editing.id, payload })
    } else {
      createMut.mutate(payload)
    }
  }

  const filtered = (dataWithPublishState?.movies || []).filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil((dataWithPublishState?.total ?? 0) / 20)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-spotlight tracking-wide">Catálogo</h1>
          <p className="text-silver/50 text-sm mt-0.5">
            {isLoading ? '—' : `${dataWithPublishState?.total ?? 0} títulos`}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-spotlight text-film hover:bg-spotlight/90 gap-2 text-sm"
        >
          <Plus size={15} />
          Nuevo título
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-[#2C2416] rounded-lg p-1 gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setPage(1) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                tab === key ? 'bg-spotlight text-film' : 'text-silver/60 hover:text-silver'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver/40" />
          <Input
            placeholder="Buscar título..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-[#2C2416] border-[#3a2e1a] text-silver placeholder:text-silver/30 w-56"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-[#3a2e1a] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#241d0f] border-b border-[#3a2e1a]">
              {['Título','Tipo','Año','Géneros','Clasif.','Acciones'].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-silver/40 font-medium text-xs uppercase tracking-wider ${i === 5 ? 'text-right' : 'text-left'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3a2e1a]">
            {isLoading
              ? Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} className="bg-[#1e1810]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3.5 bg-[#2C2416] rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map(movie => (
                  <tr key={movie.id} className="bg-[#1e1810] hover:bg-[#231c10] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {movie.coverImage ? (
                          <img
                            src={movie.coverImage}
                            alt={movie.title}
                            className="w-7 h-10 object-cover rounded shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                          />
                        ) : (
                          <div className="w-7 h-10 bg-[#2C2416] rounded shrink-0 flex items-center justify-center">
                            <Film size={11} className="text-silver/20" />
                          </div>
                        )}
                        <span className="text-silver font-medium truncate max-w-[200px]">
                          {movie.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs px-2 py-0.5 border ${
                        movie.type === 'series'
                          ? 'bg-blue-950/50 text-blue-300 border-blue-800/40'
                          : 'bg-amber-950/50 text-amber-300 border-amber-800/40'
                      }`}>
                        {movie.type === 'series' ? 'Serie' : 'Película'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-silver/60 tabular-nums">{movie.year || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {movie.genre.slice(0, 2).map(g => (
                          <span key={g} className="text-xs text-silver/50 bg-[#2C2416] px-2 py-0.5 rounded-full border border-[#3a2e1a]">
                            {g}
                          </span>
                        ))}
                        {movie.genre.length > 2 && (
                          <span className="text-xs text-silver/30 self-center">+{movie.genre.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-silver/50 border border-[#3a2e1a] px-1.5 py-0.5 rounded">
                        {movie.ratingClass || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <ActionBtn title="Editar" icon={<Pencil size={13} />} onClick={() => openEdit(movie)} hoverClass="hover:text-spotlight hover:bg-spotlight/10" />
                        <ActionBtn
                            title={movie.isPublished ? 'Ya publicada' : 'Programar estreno'}
                            icon={<Calendar size={13} />}
                            onClick={() => openSchedule(movie)}
                            hoverClass="hover:text-blue-400 hover:bg-blue-950/30"
                            disabled={movie.isPublished}
                          />
                        {movie.isPublished ? (
                          <span title="Ya publicada" className="p-1.5 rounded-md text-green-400 cursor-default">
                            <CheckCircle2 size={13} />
                          </span>
                        ) : (
                          <ActionBtn
                            title="Publicar ahora"
                            icon={<Eye size={13} />}
                            onClick={() => { publishMut.mutate(movie.id) }}
                            hoverClass="hover:text-green-400 hover:bg-green-950/30"
                            loading={publishMut.isPending}
                          />
                        )}
                        <ActionBtn title="Eliminar" icon={<Trash2 size={13} />} onClick={() => openDelete(movie)} hoverClass="hover:text-red-400 hover:bg-red-950/30" />
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <Film size={26} className="mx-auto mb-3 text-silver/15" />
            <p className="text-silver/40 text-sm">No se encontraron títulos</p>
            <button onClick={openCreate} className="mt-2 text-spotlight/80 text-xs hover:text-spotlight transition-colors">
              + Agregar el primero
            </button>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="p-1.5 rounded-md border border-[#3a2e1a] text-silver/50 hover:text-silver hover:bg-[#2C2416] disabled:opacity-25 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-silver/40 text-xs tabular-nums px-1">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="p-1.5 rounded-md border border-[#3a2e1a] text-silver/50 hover:text-silver hover:bg-[#2C2416] disabled:opacity-25 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Modal: Formulario */}
      <Dialog open={formOpen} onOpenChange={o => { if (!o) closeForm() }}>
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
            onCancel={closeForm}
          />
        </DialogContent>
      </Dialog>

      {/* Modal: Programar estreno */}
      <ScheduleModal
        open={scheduleOpen}
        content={scheduling}
        onClose={() => { setScheduleOpen(false); setScheduling(null) }}
        onPublishNow={id => { publishMut.mutate(id); setScheduleOpen(false); setScheduling(null) }}
        onSchedule={(_id, _date) => { setScheduleOpen(false); setScheduling(null) }}
      />

      {/* Alert: Eliminar */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#1e1810] border-[#3a2e1a] text-silver">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-silver">¿Eliminar este título?</AlertDialogTitle>
            <AlertDialogDescription className="text-silver/50">
              <span className="text-silver font-medium">"{deleting?.title}"</span> será eliminado permanentemente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#3a2e1a] text-silver/60 hover:bg-[#2C2416] hover:text-silver">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
              disabled={deleteMut.isPending}
              className="bg-red-900/80 text-red-100 hover:bg-red-800 border-0"
            >
              {deleteMut.isPending ? 'Eliminando...' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ActionBtn({ title, icon, onClick, hoverClass, loading = false, disabled = false }: {
  title: string
  icon: React.ReactNode
  onClick: () => void
  hoverClass: string
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={loading || disabled}
      className={`p-1.5 rounded-md text-silver/35 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${hoverClass}`}
    >
      {icon}
    </button>
  )
}