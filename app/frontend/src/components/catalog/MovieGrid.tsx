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
    <section className="mb-10">
      {/* Título de la sección */}
      <h2 className="text-white text-xl font-semibold mb-4 px-8">{title}</h2>

      {/* Grid de películas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 px-8">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  )
}