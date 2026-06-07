import { Movie } from '@/types'
import MovieCard from './MovieCard'

// ─── Props ──────────────────────────────────────────────
interface MovieGridProps {
  title: string
  movies: Movie[]
}

export default function MovieGrid({ title, movies }: MovieGridProps) {
  if (movies.length === 0) return null

  return (
    <section className="mb-12">
      {/* Título de sección */}
      <div className="flex items-center gap-4 px-8 mb-5">
        <div className="w-1 h-6 bg-spotlight" />
        <h2 className="font-display text-xl font-semibold text-parchment tracking-wide">
          {title}
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-[#3a2e1a] to-transparent" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 px-8">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  )
}