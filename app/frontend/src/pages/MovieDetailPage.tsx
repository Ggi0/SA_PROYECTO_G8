import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import MoviePoster from '@/components/shared/MoviePoster'
import VideoPlayer from '@/components/shared/VideoPlayer'
import { ThumbsUp, ThumbsDown, Play, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { getContentDetail, getSeriesStructure, rateContent } from '@/api/catalog'
import { getProgress, clearProgress } from '@/lib/progress'
import { useAuth } from '@/context/AuthContext'
import type { Movie, SeriesStructure, Episode } from '@/types'
import { subscriptionAPI } from '@/services/api/subscriptionService'
import DownloadButton from '@/components/shared/DownloadButton'

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentProfile } = useAuth()

  const [movie, setMovie] = useState<Movie | null>(null)
  const [structure, setStructure] = useState<SeriesStructure | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [openSeason, setOpenSeason] = useState<number>(0)

  // Reproductor
  const [playerEpisode, setPlayerEpisode] = useState<Episode | null>(null)
  const [playerSeasonNum, setPlayerSeasonNum] = useState<number>(0)
  const [showPlayer, setShowPlayer] = useState(false)
  const [offlineUrl, setOfflineUrl] = useState<string | null>(null)

  // Calificación
  const [thumb, setThumb] = useState<'UP' | 'DOWN' | ''>('')
  const [ratingPct, setRatingPct] = useState<number>(0)
  const [hasSubscription, setHasSubscription] = useState<boolean>(false)
  const [isPremium, setIsPremium] = useState<boolean>(false)

useEffect(() => {
  subscriptionAPI.getMySubscription()
    .then((sub: any) => {
      console.log('subscription data:', sub) // 👈 aquí
      setHasSubscription(sub?.status === 'ACTIVE')
      setIsPremium(sub?.status === 'ACTIVE' && sub?.planName === 'Premium')
    })
    .catch(() => {
      setHasSubscription(false)
      setIsPremium(false)
    })
}, [])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(false)

    const autoplay = searchParams.get('autoplay') === '1'
    getContentDetail(id)
      .then((detail) => {
        setMovie(detail)
        setRatingPct(detail.recommendationPct)

        // Si el video cambió desde la última vez, borrar el progreso viejo
        const saved = getProgress(id)
        if (saved?.videoRef && saved.videoRef !== detail.videoRef) {
          clearProgress(id)
        }

        if (autoplay) setShowPlayer(true)

        if (detail.type === 'series') {
          return getSeriesStructure(id).then(setStructure)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line

  const handlePlay = () => {
     if (!hasSubscription) {
    navigate('/plans')
    return
  }
    if (movie?.type === 'series' && structure?.seasons[0]?.episodes[0]) {
      const saved = getProgress(id!)
      if (saved?.episodeNum && saved?.seasonNum) {
        const season = structure.seasons.find((s) => s.number === saved.seasonNum)
        const ep = season?.episodes.find((e) => e.episodeNum === saved.episodeNum)
        if (ep) {
          setPlayerEpisode(ep)
          setPlayerSeasonNum(saved.seasonNum)
          setShowPlayer(true)
          return
        }
      }
      setPlayerEpisode(structure.seasons[0].episodes[0])
      setPlayerSeasonNum(structure.seasons[0].number)
      setShowPlayer(true)
    } else {
      setShowPlayer(true)
    }
  }

  const handleEpisodePlay = (ep: Episode, seasonNum: number) => {
    if (!hasSubscription) {
      navigate('/plans')
      return
    }
    setPlayerEpisode(ep)
    setPlayerSeasonNum(seasonNum)
    setShowPlayer(true)
  }

  const handleRate = async (newThumb: 'UP' | 'DOWN') => {
    if (!movie || !id) return
    const profileId = currentProfile?.id || 'anonymous'
    const next = thumb === newThumb ? '' : newThumb
    setThumb(next)
    try {
      const res = await rateContent(id, profileId, next, 0)
      setRatingPct(res.recommendationPct)
    } catch {
      setThumb(thumb)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-silver/50 font-mono text-sm">Cargando...</p>
        </div>
      </MainLayout>
    )
  }

  if (error || !movie) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-silver font-mono">Contenido no encontrado</p>
          <button onClick={() => navigate('/home')} className="text-spotlight hover:underline font-mono text-sm">
            Volver al inicio
          </button>
        </div>
      </MainLayout>
    )
  }

  const savedProgress = id ? getProgress(id) : null
  const progressPct = savedProgress
    ? Math.min((savedProgress.minuteReached / (savedProgress.totalDuration || movie.durationMin || 90)) * 100, 100)
    : 0

  return (
    <MainLayout>
      {showPlayer && (
        <VideoPlayer
          contentId={id!}
          title={movie.title}
          posterUrl={movie.coverImage}
          contentType={movie.type === 'series' ? 'SERIES' : 'MOVIE'}
          videoRef={offlineUrl || (playerEpisode ? playerEpisode.videoRef || '' : movie.videoRef || '')}
          videoSource={offlineUrl ? 'blob' : (playerEpisode ? playerEpisode.videoSource || '' : movie.videoSource || '')} 
          totalDuration={playerEpisode ? playerEpisode.duration : (movie.durationMin || 90)}
          seasonNum={playerSeasonNum || undefined}
          episodeNum={playerEpisode?.episodeNum}
          episodeId={playerEpisode?.id}
          episodeTitle={playerEpisode?.title}
          onClose={() => setShowPlayer(false)}
        />
      )}

      {/* Hero */}
      <div className="relative h-[65vh] flex items-end pb-12 px-8">
        <div className="absolute inset-0">
          <MoviePoster src={movie.coverImage} alt={movie.title} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1408] via-[#1a1408]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1408]/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-spotlight/40 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-20 left-8 flex items-center gap-2 text-silver hover:text-spotlight transition-colors font-mono text-sm"
        >
          <ArrowLeft size={16} />
          Volver
        </button>

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px w-8 bg-spotlight" />
            <span className="text-spotlight text-xs font-mono tracking-widest uppercase">
              {movie.type === 'series' ? 'Serie' : 'Película'}
            </span>
            {movie.ratingClass && (
              <span className="text-silver/50 font-mono text-xs border border-[#3a2e1a] px-2 py-0.5">
                {movie.ratingClass}
              </span>
            )}
          </div>
          <h1 className="font-display text-5xl font-bold text-parchment mb-3 leading-tight">
            {movie.title}
          </h1>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-silver/60 font-mono text-sm">{movie.year}</span>
            {movie.durationMin ? (
              <span className="text-silver/60 font-mono text-sm">{movie.durationMin} min</span>
            ) : null}
            {movie.genre.map((g) => (
              <span key={g} className="text-silver/60 font-mono text-xs border border-[#3a2e1a] px-2 py-0.5">
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="px-8 py-10 max-w-4xl">

        {/* Progreso guardado */}
        {savedProgress && savedProgress.minuteReached > 0 && (
          <div className="mb-6 p-3 border border-spotlight/30 bg-spotlight/5 rounded">
            <div className="flex items-center justify-between mb-1">
              <span className="text-spotlight font-mono text-xs">
                {savedProgress.seasonNum
                  ? `Temp. ${savedProgress.seasonNum} · Ep. ${savedProgress.episodeNum} · ${savedProgress.minuteReached} min`
                  : `Continuar desde ${savedProgress.minuteReached} min`}
              </span>
              <span className="text-silver/50 font-mono text-xs">
                {Math.round(progressPct)}% visto
              </span>
            </div>
            <div className="h-1 bg-[#3a2e1a] rounded-full overflow-hidden">
              <div className="h-full bg-spotlight rounded-full" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-4 mb-10 flex-wrap">
          <button
            onClick={handlePlay}
            className="flex items-center gap-2 bg-spotlight hover:bg-spotlight/80 text-film px-8 py-3 font-mono font-semibold tracking-widest uppercase text-sm transition-colors"
          >
            <Play size={16} fill="currentColor" />
            {savedProgress && savedProgress.minuteReached > 0 ? 'Continuar' : 'Reproducir'}
          </button>

          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={() => handleRate('UP')}
              className={`flex items-center gap-2 border p-3 transition-colors ${
                thumb === 'UP'
                  ? 'border-green-500 text-green-400 bg-green-500/10'
                  : 'border-[#3a2e1a] hover:border-green-500 text-silver hover:text-green-400'
              }`}
            >
              <ThumbsUp size={16} />
            </button>
            <button
              onClick={() => handleRate('DOWN')}
              className={`flex items-center gap-2 border p-3 transition-colors ${
                thumb === 'DOWN'
                  ? 'border-red-500 text-red-400 bg-red-500/10'
                  : 'border-[#3a2e1a] hover:border-curtain text-silver hover:text-red-400'
              }`}
            >
              <ThumbsDown size={16} />
            </button>
            {ratingPct > 0 && (
              <span className="text-green-400 font-mono text-sm ml-2">
                {Math.round(ratingPct)}% recomendado
              </span>
            )}
          </div>

          {/* Descarga — solo Plan Premium */}
          <DownloadButton
            contentId={id!}
            contentTitle={movie.title}
            thumbnail={movie.coverImage || ''}
            isPremium={isPremium}
            onOfflineReady={(url) => {
              setOfflineUrl(url)
              setShowPlayer(true)
            }}
          />
        </div>

        {/* Sinopsis */}
        {movie.description && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-5 bg-spotlight" />
              <h2 className="font-display text-lg text-parchment">Sinopsis</h2>
            </div>
            <p className="text-silver font-body leading-relaxed text-sm">{movie.description}</p>
          </div>
        )}

        {/* Reparto */}
        {movie.cast.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-5 bg-spotlight" />
              <h2 className="font-display text-lg text-parchment">Reparto</h2>
            </div>
            <div className="flex gap-3 flex-wrap">
              {movie.cast.map((actor) => (
                <div
                  key={actor.id}
                  className="border border-[#3a2e1a] hover:border-spotlight bg-[#1e1810] px-4 py-3 text-sm transition-colors"
                >
                  <p className="text-parchment font-mono font-medium">{actor.name}</p>
                  <p className="text-silver/50 font-mono text-xs">{actor.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estructura de series */}
        {movie.type === 'series' && structure && structure.seasons.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-5 bg-spotlight" />
              <h2 className="font-display text-lg text-parchment">Temporadas y episodios</h2>
            </div>

            <div className="space-y-3">
              {structure.seasons.map((season) => (
                <div key={season.id} className="border border-[#3a2e1a] rounded overflow-hidden">
                  {/* Encabezado temporada */}
                  <button
                    onClick={() => setOpenSeason(openSeason === season.number ? -1 : season.number)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-[#1e1810] hover:bg-[#252015] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-spotlight font-mono text-xs tracking-widest uppercase">
                        Temp. {season.number}
                      </span>
                      {season.title && (
                        <span className="text-parchment font-display text-sm">{season.title}</span>
                      )}
                      <span className="text-silver/40 font-mono text-xs">
                        {season.episodes.length} ep.
                      </span>
                    </div>
                    {openSeason === season.number ? (
                      <ChevronUp size={16} className="text-silver/50" />
                    ) : (
                      <ChevronDown size={16} className="text-silver/50" />
                    )}
                  </button>

                  {/* Episodios */}
                  {openSeason === season.number && (
                    <div className="divide-y divide-[#3a2e1a]">
                      {season.episodes.map((ep) => {
                        const epProgress = savedProgress?.seasonNum === season.number && savedProgress.episodeNum === ep.episodeNum
                          ? savedProgress
                          : null
                        const epPct = epProgress
                          ? Math.min((epProgress.minuteReached / (ep.duration || 1)) * 100, 100)
                          : 0

                        return (
                          <div
                            key={ep.id}
                            onClick={() => handleEpisodePlay(ep, season.number)}
                            className="flex items-center gap-4 px-5 py-4 bg-[#0f0b04] hover:bg-[#1a1408] cursor-pointer group transition-colors"
                          >
                            <div className="w-8 h-8 flex items-center justify-center border border-[#3a2e1a] group-hover:border-spotlight shrink-0 transition-colors">
                              <Play size={14} className="text-silver/50 group-hover:text-spotlight transition-colors" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-parchment font-mono text-sm font-medium truncate">
                                {ep.episodeNum}. {ep.title}
                              </p>
                              <div className="flex items-center gap-3 mt-0.5">
                                {ep.duration > 0 && (
                                  <span className="text-silver/40 font-mono text-xs">{ep.duration} min</span>
                                )}
                                {epProgress && (
                                  <span className="text-spotlight/70 font-mono text-xs">
                                    {epProgress.minuteReached} min vistos
                                  </span>
                                )}
                              </div>
                              {epPct > 0 && (
                                <div className="mt-1 h-0.5 bg-[#3a2e1a] rounded-full overflow-hidden w-32">
                                  <div className="h-full bg-spotlight" style={{ width: `${epPct}%` }} />
                                </div>
                              )}
                            </div>

                            {ep.synopsis && (
                              <p className="text-silver/40 font-mono text-xs hidden md:block max-w-xs line-clamp-2">
                                {ep.synopsis}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
