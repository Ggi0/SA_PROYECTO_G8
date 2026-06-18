import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import MovieGrid from '@/components/catalog/MovieGrid'
import ContinueWatchingSection from '@/components/history/ContinueWatchingSection'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import MoviePoster from '@/components/shared/MoviePoster'
import { getCatalog, searchContent } from '@/api/catalog'
import { historialAPI, type ProgressItemResponse } from '@/api/historial'
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
  const [loadingHistory, setLoadingHistory] = useState(true)

  const typeFilter = searchParams.get('type')

 const getActiveProfileId = (): string | null => {
  try {
    const profile = JSON.parse(localStorage.getItem('quetxal_active_profile') || 'null')
    if (profile?.id) return profile.id
  } catch { /* continúa */ }
  return null
}
 const mapApiProgressToSavedProgress = (
  item: ProgressItemResponse
): SavedProgress =>
  ({
    contentId: item.contentId,
    minuteReached: item.lastEpMinute || item.minuteReached,
    season: item.lastSeasonNum || undefined,
    episode: item.lastEpisodeNum || undefined,
    updatedAt: item.lastWatchedAt || new Date().toISOString(),
  }) as unknown as SavedProgress

  const loadLocalProgress = () => {
    return getAllProgress().filter((progress) => progress.minuteReached > 0)
  }

  useEffect(() => {
    setLoading(true)

    getCatalog({ pageSize: 48 })
      .then(({ movies }) => setAllMovies(movies))
      .catch(() => setAllMovies([]))
      .finally(() => setLoading(false))
  }, [])

 useEffect(() => {
  const loadContinueWatching = async () => {
    try {
      setLoadingHistory(true)
      const profileId = getActiveProfileId()

      if (!profileId) {
        setContinueWatching(loadLocalProgress())
        return
      }

      const apiProgress = await historialAPI.getContinueWatching(profileId)
      const mappedProgress = apiProgress
        .filter((item) => (item.lastEpMinute || item.minuteReached) > 0)
        .map(mapApiProgressToSavedProgress)

      setContinueWatching(mappedProgress.length > 0 ? mappedProgress : loadLocalProgress())
    } catch (error) {
      console.warn('No se pudo cargar continuar viendo desde API Gateway.', error)
      setContinueWatching(loadLocalProgress())
    } finally {
      setLoadingHistory(false)
    }
  }

  loadContinueWatching()
}, [])

  const localFilter = useCallback(
    (q: string) =>
      allMovies.filter(
        (movie) =>
          movie.title.toLowerCase().includes(q.toLowerCase()) ||
          movie.description?.toLowerCase().includes(q.toLowerCase())
      ),
    [allMovies]
  )

  const handleSearch = useCallback(
    async (q: string) => {
      setQuery(q)

      if (!q.trim()) {
        setSearchResults(null)
        return
      }

      try {
        const results = await searchContent(q, typeFilter || '')
        setSearchResults(results.length > 0 ? results : localFilter(q))
      } catch {
        setSearchResults(localFilter(q))
      }
    },
    [typeFilter, localFilter]
  )

  const source = searchResults ?? allMovies

  const filtered = typeFilter
    ? source.filter((movie) =>
        movie.type === (typeFilter === 'movie' ? 'movie' : 'series')
      )
    : source

  const movies = filtered.filter((movie) => movie.type === 'movie')
  const series = filtered.filter((movie) => movie.type === 'series')
  const featured = allMovies[0]

  return (
    <MainLayout>
      {/* Hero banner */}
      <div className="relative mb-10 flex h-[75vh] items-end px-8 pb-16">
        <div className="absolute inset-0">
          <MoviePoster
            src={
              featured?.coverImage ||
              'https://i.pinimg.com/originals/9f/f6/0b/9ff60bde7d28d52fb8ef20792010b4bb.gif'
            }
            alt={featured?.title || 'QuetxalTV'}
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1408] via-[#1a1408]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1408]/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-spotlight/40 to-transparent" />

        <div className="relative z-10 max-w-xl">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px w-8 bg-spotlight" />
            <span className="font-mono text-xs uppercase tracking-widest text-spotlight">
              Destacado
            </span>
          </div>

          <h1 className="mb-3 font-display text-6xl font-bold leading-tight text-parchment">
            {featured?.title ?? 'QuetxalTV'}
          </h1>

          {featured?.description && (
            <p className="mb-6 line-clamp-2 font-body text-sm leading-relaxed text-silver">
              {featured.description}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() =>
                featured && navigate(`/movie/${featured.id}?autoplay=1`)
              }
              className="flex items-center gap-2 bg-spotlight px-8 py-3 font-mono text-sm font-semibold uppercase tracking-widest text-film transition-colors hover:bg-spotlight/80"
            >
              ▶ Reproducir
            </button>

            <button
              onClick={() => featured && navigate(`/movie/${featured.id}`)}
              className="flex items-center gap-2 border border-silver/40 bg-transparent px-8 py-3 font-mono text-sm font-semibold uppercase tracking-widest text-silver transition-colors hover:border-spotlight hover:text-spotlight"
            >
              Más info
            </button>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-10 px-8">
        <div className="flex max-w-md items-center gap-3 rounded border border-[#3a2e1a] bg-[#1e1810] px-4 py-2 transition-colors focus-within:border-spotlight">
          <Search size={16} className="shrink-0 text-silver/50" />

          <Input
            placeholder="Buscar películas o series..."
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            className="h-auto border-none bg-transparent p-0 font-mono text-sm text-parchment placeholder:text-silver/40 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {loading && (
        <div className="px-8 py-10 font-mono text-sm text-silver/50">
          Cargando catálogo...
        </div>
      )}

      {!loading && (
        <>
          {!query && !typeFilter && !loadingHistory && (
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
            <div className="px-8 py-10 font-mono text-sm text-silver/50">
              No se encontraron resultados para "{query}"
            </div>
          )}
        </>
      )}
    </MainLayout>
  )
}
