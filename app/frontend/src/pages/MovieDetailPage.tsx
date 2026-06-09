import { useParams, useNavigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import { mockMovies } from '@/services/mock/mockData'
import { ThumbsUp, ThumbsDown, Play, ArrowLeft } from 'lucide-react'
import MoviePoster from '@/components/shared/MoviePoster'
export default function MovieDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const movie = mockMovies.find((m) => m.id === id)

  if (!movie) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-silver font-mono">Contenido no encontrado</p>
          <button
            onClick={() => navigate('/home')}
            className="text-spotlight hover:underline font-mono text-sm"
          >
            Volver al inicio
          </button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      {/* Hero */}
      <div className="relative h-[65vh] flex items-end pb-12 px-8">
        <div className="absolute inset-0">
        <MoviePoster src={movie.coverImage} alt={movie.title} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1408] via-[#1a1408]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1408]/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-spotlight/40 to-transparent" />

        {/* Botón volver */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-20 left-8 flex items-center gap-2 text-silver hover:text-spotlight transition-colors font-mono text-sm"
        >
          <ArrowLeft size={16} />
          Volver
        </button>

        {/* Info */}
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px w-8 bg-spotlight" />
            <span className="text-spotlight text-xs font-mono tracking-widest uppercase">
              {movie.type === 'series' ? 'Serie' : 'Película'}
            </span>
          </div>
          <h1 className="font-display text-5xl font-bold text-parchment mb-3 leading-tight">
            {movie.title}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-silver/60 font-mono text-sm">{movie.year}</span>
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

        {/* Acciones */}
        <div className="flex items-center gap-4 mb-10">
          <button className="flex items-center gap-2 bg-spotlight hover:bg-spotlight/80 text-film px-8 py-3 font-mono font-semibold tracking-widest uppercase text-sm transition-colors">
            <Play size={16} fill="currentColor" />
            Reproducir
          </button>

          <div className="flex items-center gap-2 ml-2">
            <button className="flex items-center gap-2 border border-[#3a2e1a] hover:border-green-500 text-silver hover:text-green-400 p-3 transition-colors">
              <ThumbsUp size={16} />
            </button>
            <button className="flex items-center gap-2 border border-[#3a2e1a] hover:border-curtain text-silver hover:text-red-400 p-3 transition-colors">
              <ThumbsDown size={16} />
            </button>
            <span className="text-green-400 font-mono text-sm ml-2">
              {movie.recommendationPct}% recomendado
            </span>
          </div>
        </div>

        {/* Descripción */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-spotlight" />
            <h2 className="font-display text-lg text-parchment">Sinopsis</h2>
          </div>
          <p className="text-silver font-body leading-relaxed text-sm">
            {movie.description}
          </p>
        </div>

        {/* Reparto */}
        <div>
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
      </div>
    </MainLayout>
  )
}