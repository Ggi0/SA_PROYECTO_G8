import { useNavigate } from 'react-router-dom'
import { Movie } from '@/types'
import { ThumbsUp } from 'lucide-react'
import MoviePoster from '@/components/shared/MoviePoster'
// ─── Props ──────────────────────────────────────────────
interface MovieCardProps {
  movie: Movie
}

export default function MovieCard({ movie }: MovieCardProps) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/movie/${movie.id}`)}
      className="relative group cursor-pointer rounded overflow-hidden border border-[#3a2e1a] hover:border-spotlight transition-all duration-300 hover:scale-105 hover:z-10 hover:shadow-[0_0_20px_rgba(212,168,67,0.2)]"
    >
      {/* Poster */}
    <div className="w-full h-48">
    <MoviePoster src={movie.coverImage} alt={movie.title} />
    </div>

      {/* Overlay siempre visible abajo */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0f0b04] to-transparent p-3">
        <h3 className="text-parchment font-display text-sm font-semibold leading-tight">
          {movie.title}
        </h3>
      </div>

      {/* Overlay hover */}
      <div className="absolute inset-0 bg-[#0f0b04]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-end">
        <h3 className="text-spotlight font-display text-sm font-semibold mb-2">
          {movie.title}
        </h3>

        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center gap-1 text-green-400 text-xs font-mono">
            <ThumbsUp size={10} />
            {movie.recommendationPct}%
          </span>
          <span className="text-silver/60 text-xs font-mono">{movie.year}</span>
          <span className="text-xs border border-[#3a2e1a] text-silver px-1 font-mono">
            {movie.type === 'series' ? 'SERIE' : 'FILM'}
          </span>
        </div>

        <div className="flex gap-1 flex-wrap">
          {movie.genre.slice(0, 2).map((g) => (
            <span key={g} className="text-silver/50 text-xs font-mono">
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
