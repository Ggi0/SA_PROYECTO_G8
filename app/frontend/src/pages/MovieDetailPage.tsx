import { useParams, useNavigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import { Badge } from '@/components/ui/badge'
import { mockMovies } from '@/services/mock/mockData'
import { ThumbsUp, ThumbsDown, Play, ArrowLeft } from 'lucide-react'

export default function MovieDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  // ─── Buscar película en mock ─────────────────────────
  const movie = mockMovies.find((m) => m.id === id)

  if (!movie) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-zinc-400 text-xl">Contenido no encontrado</p>
          <button
            onClick={() => navigate('/home')}
            className="text-red-500 hover:underline"
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
      <div className="relative h-[60vh] flex items-end pb-10 px-8">
        <img
          src={movie.coverImage}
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

        {/* Botón volver */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-20 left-8 text-white flex items-center gap-2 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={20} />
          Volver
        </button>

        {/* Info básica */}
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-white text-5xl font-bold mb-2">{movie.title}</h1>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-zinc-400">{movie.year}</span>
            <Badge variant="outline" className="border-zinc-500 text-zinc-300">
              {movie.type === 'series' ? 'Serie' : 'Película'}
            </Badge>
            {movie.genre.map((g) => (
              <span key={g} className="text-zinc-400 text-sm">{g}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="px-8 py-8 max-w-4xl">
        {/* Acciones */}
        <div className="flex items-center gap-4 mb-8">
          <button className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded font-semibold hover:bg-zinc-200 transition-colors">
            <Play size={18} fill="black" />
            Reproducir
          </button>

          {/* Calificaciones */}
          <div className="flex items-center gap-3 ml-4">
            <button className="flex items-center gap-2 text-green-400 border border-zinc-700 px-4 py-3 rounded hover:bg-zinc-800 transition-colors">
              <ThumbsUp size={18} />
            </button>
            <button className="flex items-center gap-2 text-red-400 border border-zinc-700 px-4 py-3 rounded hover:bg-zinc-800 transition-colors">
              <ThumbsDown size={18} />
            </button>
            <span className="text-green-400 font-semibold">
              {movie.recommendationPct}% recomendado
            </span>
          </div>
        </div>

        {/* Descripción */}
        <p className="text-zinc-300 text-base leading-relaxed mb-8">
          {movie.description}
        </p>

        {/* Reparto */}
        <div>
          <h2 className="text-white text-xl font-semibold mb-4">Reparto</h2>
          <div className="flex gap-4 flex-wrap">
            {movie.cast.map((actor) => (
              <div key={actor.id} className="bg-zinc-800 rounded-md px-4 py-3 text-sm">
                <p className="text-white font-medium">{actor.name}</p>
                <p className="text-zinc-400">{actor.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}