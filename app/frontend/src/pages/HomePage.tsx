import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import MovieGrid from '@/components/catalog/MovieGrid'
import { Input } from '@/components/ui/input'
import { mockMovies } from '@/services/mock/mockData'
import { Search } from 'lucide-react'

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const typeFilter = searchParams.get('type')

  // ─── Filtrado ────────────────────────────────────────
  const filtered = mockMovies.filter((movie) => {
    const matchesType = typeFilter ? movie.type === typeFilter : true
    const matchesQuery = movie.title.toLowerCase().includes(query.toLowerCase())
    return matchesType && matchesQuery
  })

  const movies = filtered.filter((m) => m.type === 'movie')
  const series = filtered.filter((m) => m.type === 'series')

  return (
    <MainLayout>
      {/* Hero banner */}
      <div className="relative h-[70vh] flex items-end pb-16 px-8 mb-8">
        <img
          src={mockMovies[1].coverImage}
          alt={mockMovies[1].title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        <div className="relative z-10 max-w-lg">
          <h1 className="text-white text-5xl font-bold mb-3">{mockMovies[1].title}</h1>
          <p className="text-zinc-300 text-sm mb-4 line-clamp-2">{mockMovies[1].description}</p>
          <div className="flex gap-3">
            <button className="bg-white text-black px-6 py-2 rounded font-semibold hover:bg-zinc-200 transition-colors">
              ▶ Reproducir
            </button>
            <button className="bg-zinc-700/80 text-white px-6 py-2 rounded font-semibold hover:bg-zinc-600 transition-colors">
              Más info
            </button>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="px-8 mb-8 flex items-center gap-3 max-w-md">
        <Search size={18} className="text-zinc-400" />
        <Input
          placeholder="Buscar películas o series..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
        />
      </div>

      {/* Grids de contenido */}
      {!typeFilter && (
        <MovieGrid title="Tendencias" movies={mockMovies.slice(0, 6)} />
      )}
      {(!typeFilter || typeFilter === 'movie') && (
        <MovieGrid title="Películas" movies={movies} />
      )}
      {(!typeFilter || typeFilter === 'series') && (
        <MovieGrid title="Series" movies={series} />
      )}
    </MainLayout>
  )
}