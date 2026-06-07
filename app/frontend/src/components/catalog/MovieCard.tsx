import { useNavigate } from 'react-router-dom'
import { Movie } from '@/types'
import { Badge } from '@/components/ui/badge'
import { ThumbsUp } from 'lucide-react'

// ─── Props ──────────────────────────────────────────────
interface MovieCardProps {
  movie: Movie
}

export default function MovieCard({ movie }: MovieCardProps) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/movie/${movie.id}`)}
      className="relative group cursor-pointer rounded-md overflow-hidden transition-transform duration-300 hover:scale-105 hover:z-10"
    >
      {/* Poster */}
      <img
        src={movie.coverImage}
        alt={movie.title}
        className="w-full h-48 object-cover"
      />

      {/* Overlay al hacer hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-end">
        <h3 className="text-white font-semibold text-sm">{movie.title}</h3>

        <div className="flex items-center gap-2 mt-1">
          {/* Porcentaje de recomendación */}
          <span className="flex items-center gap-1 text-green-400 text-xs">
            <ThumbsUp size={12} />
            {movie.recommendationPct}%
          </span>

          {/* Año */}
          <span className="text-zinc-400 text-xs">{movie.year}</span>

          {/* Tipo */}
          <Badge
            variant="outline"
            className="text-xs border-zinc-500 text-zinc-300 py-0 px-1"
          >
            {movie.type === 'series' ? 'Serie' : 'Película'}
          </Badge>
        </div>

        {/* Géneros */}
        <div className="flex gap-1 mt-1 flex-wrap">
          {movie.genre.slice(0, 2).map((g) => (
            <span key={g} className="text-zinc-400 text-xs">
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}