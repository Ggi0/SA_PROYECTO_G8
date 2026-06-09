import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import MovieGrid from '@/components/catalog/MovieGrid'
import ContinueWatchingSection from '@/components/history/ContinueWatchingSection'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import MoviePoster from '@/components/shared/MoviePoster'
import { getCatalog, searchContent } from '@/api/catalog'
import { getAllProgress } from '@/lib/progress'
import type { Movie } from '@/types'
import type { SavedProgress } from '@/lib/progress'

export default function HomePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [allMovies, setAllMovies] = useState<Movie[]>([])
  const [searchResults, setSearchResults] = useState<Movie[] | null>(null)
  const [continueWatching, setContinueWatching] = useState<SavedProgress[]>([])
  const [loading, setLoading] = useState(true)
  const typeFilter = searchParams.get('type')

  useEffect(() => {
    setLoading(true)
    getCatalog({ pageSize: 48 })
      .then(({ movies }) => setAllMovies(movies))
      .catch(() => setAllMovies([]))
      .finally(() => setLoading(false))
    setContinueWatching(getAllProgress().filter((p) => p.minuteReached > 0))
  }, [])

  const localFilter = useCallback((q: string) =>
    allMovies.filter((m) =>
      m.title.toLowerCase().includes(q.toLowerCase()) ||
      m.description?.toLowerCase().includes(q.toLowerCase()),
    ), [allMovies])

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (!q.trim()) { setSearchResults(null); return }
    try {
      const results = await searchContent(q, typeFilter || '')
      setSearchResults(results.length > 0 ? results : localFilter(q))
    } catch {
      setSearchResults(localFilter(q))
    }
  }, [allMovies, typeFilter, localFilter])

  const source = searchResults ?? allMovies
  const filtered = typeFilter ? source.filter((m) => m.type === (typeFilter === 'movie' ? 'movie' : 'series')) : source
  const movies = filtered.filter((m) => m.type === 'movie')
  const series = filtered.filter((m) => m.type === 'series')
  const featured = allMovies[0]

  return (
    <MainLayout>
      {/* Hero banner */}
      <div className="relative h-[75vh] flex items-end pb-16 px-8 mb-10">
        <div className="absolute inset-0">
          <MoviePoster
            src={featured?.coverImage || 'https://i.pinimg.com/originals/9f/f6/0b/9ff60bde7d28d52fb8ef20792010b4bb.gif'}
            alt={featured?.title || 'QuetxalTV'}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1408] via-[#1a1408]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1408]/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-spotlight/40 to-transparent" />

        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px w-8 bg-spotlight" />
            <span className="text-spotlight text-xs font-mono tracking-widest uppercase">
              Destacado
            </span>
          </div>
          <h1 className="font-display text-6xl font-bold text-parchment mb-3 leading-tight">
            {featured?.title ?? 'QuetxalTV'}
          </h1>
          {featured?.description && (
            <p className="text-silver text-sm mb-6 line-clamp-2 font-body leading-relaxed">
              {featured.description}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => featured && navigate(`/movie/${featured.id}?autoplay=1`)}
              className="flex items-center gap-2 bg-spotlight hover:bg-spotlight/80 text-film px-8 py-3 font-mono font-semibold tracking-widest uppercase text-sm transition-colors"
            >
              ▶ Reproducir
            </button>
            <button
              onClick={() => featured && navigate(`/movie/${featured.id}`)}
              className="flex items-center gap-2 bg-transparent border border-silver/40 hover:border-spotlight text-silver hover:text-spotlight px-8 py-3 font-mono font-semibold tracking-widest uppercase text-sm transition-colors"
            >
              Más info
            </button>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="px-8 mb-10">
        <div className="flex items-center gap-3 max-w-md border border-[#3a2e1a] bg-[#1e1810] px-4 py-2 rounded focus-within:border-spotlight transition-colors">
          <Search size={16} className="text-silver/50 shrink-0" />
          <Input
            placeholder="Buscar películas o series..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="bg-transparent border-none text-parchment placeholder:text-silver/40 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto font-mono text-sm"
          />
        </div>
      </div>

      {loading && (
        <div className="px-8 py-10 text-silver/50 font-mono text-sm">
          Cargando catálogo...
        </div>
      )}

      {!loading && (
        <>
          {!query && (
            <ContinueWatchingSection items={continueWatching} />
          )}
          {!typeFilter && !query && (
            <MovieGrid title="En Cartelera" movies={filtered.slice(0, 6)} />
          )}
          {(!typeFilter || typeFilter === 'movie') && movies.length > 0 && (
            <MovieGrid title="Películas" movies={movies} />
          )}
          {(!typeFilter || typeFilter === 'series') && series.length > 0 && (
            <MovieGrid title="Series" movies={series} />
          )}
          {filtered.length === 0 && query && (
            <div className="px-8 py-10 text-silver/50 font-mono text-sm">
              No se encontraron resultados para "{query}"
            </div>
          )}
        </>
      )}
    </MainLayout>
  )
}
