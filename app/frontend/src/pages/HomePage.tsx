import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import MovieGrid from '@/components/catalog/MovieGrid'
import ContinueWatchingSection from '@/components/history/ContinueWatchingSection'
import { Input } from '@/components/ui/input'
import { Search, Sparkles, Users, X } from 'lucide-react'
import MoviePoster from '@/components/shared/MoviePoster'
import { getCatalog, searchContent, getRecommendations } from '@/api/catalog'
import { historialAPI, type ProgressItemResponse } from '@/api/historial'
import { getAllProgress } from '@/lib/progress'
import { useAuth } from '@/context/AuthContext'
import type { Movie } from '@/types'
import type { SavedProgress } from '@/lib/progress'

export default function HomePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentProfile } = useAuth()
  const [query, setQuery] = useState('')
  const [allMovies, setAllMovies] = useState<Movie[]>([])
  const [searchResults, setSearchResults] = useState<Movie[] | null>(null)
  const [continueWatching, setContinueWatching] = useState<SavedProgress[]>([])
  const [recommendations, setRecommendations] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [showJoinParty, setShowJoinParty] = useState(false)
  const [partyCode, setPartyCode] = useState('')
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

  // Leer búsqueda desde URL params (ej. navegando desde el Navbar)
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) handleSearch(q)
  }, [searchParams]) // eslint-disable-line

  // Cargar recomendaciones cuando hay un perfil activo
  useEffect(() => {
    if (!currentProfile?.id) return
    getRecommendations(20).then(setRecommendations).catch(() => {})
  }, [currentProfile?.id])

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
             Calificacion se sustituyó calificacion
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

      {/* Barra de búsqueda + botón Watch Party */}
      <div className="mb-10 px-8 flex items-center gap-4 flex-wrap">
        <div className="flex max-w-md flex-1 items-center gap-3 rounded border border-[#3a2e1a] bg-[#1e1810] px-4 py-2 transition-colors focus-within:border-spotlight">
          <Search size={16} className="shrink-0 text-silver/50" />

          <Input
            placeholder="Buscar películas o series..."
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            className="h-auto border-none bg-transparent p-0 font-mono text-sm text-parchment placeholder:text-silver/40 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <button
          onClick={() => { setShowJoinParty(true); setPartyCode('') }}
          className="flex items-center gap-2 border border-spotlight/50 px-4 py-2 font-mono text-xs text-spotlight hover:bg-spotlight/10 transition-colors rounded"
        >
          <Users size={14} />
          Unirte con código
        </button>
      </div>

      {/* Modal: ingresar código de Watch Party */}
      {showJoinParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1e1810] border border-[#3a2e1a] p-8 w-full max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-lg text-spotlight tracking-widest">UNIRSE A SALA</h2>
              <button onClick={() => setShowJoinParty(false)} className="text-silver hover:text-spotlight"><X size={18} /></button>
            </div>
            <p className="text-silver/60 font-mono text-xs mb-4">Ingresa el código que te compartió el anfitrión para unirte a la sesión de Watch Party.</p>
            <input
              autoFocus
              type="text"
              value={partyCode}
              onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter' && partyCode.trim()) { setShowJoinParty(false); navigate(`/watch-party/${partyCode.trim()}`) } }}
              placeholder="Ej: ABC123"
              maxLength={10}
              className="w-full bg-[#0f0b04] border border-[#3a2e1a] text-parchment font-mono text-center text-xl tracking-widest px-4 py-3 mb-6 outline-none focus:border-spotlight"
            />
            <button
              onClick={() => { if (partyCode.trim()) { setShowJoinParty(false); navigate(`/watch-party/${partyCode.trim()}`) } }}
              disabled={!partyCode.trim()}
              className="w-full bg-spotlight text-film font-mono text-sm py-3 tracking-widest disabled:opacity-40 hover:bg-spotlight/80 transition-colors"
            >
              ENTRAR A LA SALA
            </button>
          </div>
        </div>
      )}

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

          {/* Motor de Recomendación */}
          {!query && !typeFilter && recommendations.length > 0 && (
            <div className="px-8 mb-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-6 bg-spotlight" />
                <h2 className="font-display text-xl text-parchment">Recomendado para ti</h2>
                <Sparkles size={16} className="text-spotlight/70" />
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {recommendations.map((movie) => (
                  <button
                    key={movie.id}
                    onClick={() => navigate(`/movie/${movie.id}`)}
                    className="group shrink-0 w-36 text-left"
                  >
                    <div className="relative w-36 h-52 overflow-hidden border border-[#3a2e1a] group-hover:border-spotlight transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(212,168,67,0.2)]">
                      {movie.coverImage ? (
                        <img
                          src={movie.coverImage}
                          alt={movie.title}
                          className="w-full h-full object-cover filter sepia-[0.2] group-hover:sepia-0 transition-all duration-300"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full bg-[#1e1810] flex items-center justify-center">
                          <span className="text-silver/20 font-mono text-xs text-center px-2">{movie.title}</span>
                        </div>
                      )}
                      {movie.ratingClass && (
                        <div className="absolute top-1 right-1 bg-black/70 border border-[#3a2e1a] px-1 font-mono text-xs text-silver/70">
                          {movie.ratingClass}
                        </div>
                      )}
                      {movie.recommendationPct > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
                          <span className="text-green-400 font-mono text-xs">
                            {Math.round(movie.recommendationPct)}% ↑
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="mt-1.5 text-silver/70 group-hover:text-spotlight font-mono text-xs truncate transition-colors">
                      {movie.title}
                    </p>
                    <p className="text-silver/30 font-mono text-xs">
                      {movie.type === 'series' ? 'Serie' : 'Película'}
                      {movie.year ? ` · ${movie.year}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            </div>
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
