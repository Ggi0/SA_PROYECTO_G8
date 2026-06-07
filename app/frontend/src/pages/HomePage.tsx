import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import MovieGrid from '@/components/catalog/MovieGrid'
import { Input } from '@/components/ui/input'
import { mockMovies } from '@/services/mock/mockData'
import { Search } from 'lucide-react'
import MoviePoster from '@/components/shared/MoviePoster'
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
      <div className="relative h-[75vh] flex items-end pb-16 px-8 mb-10">
        <div className="absolute inset-0">
        <MoviePoster src={'https://i.pinimg.com/originals/9f/f6/0b/9ff60bde7d28d52fb8ef20792010b4bb.gif'} alt={mockMovies[1].title} />
        </div>
        {/* Gradientes */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1408] via-[#1a1408]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1408]/80 via-transparent to-transparent" />

        {/* Línea decorativa film strip */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-spotlight/40 to-transparent" />

        {/* Contenido hero */}
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px w-8 bg-spotlight" />
            <span className="text-spotlight text-xs font-mono tracking-widest uppercase">
              Destacado
            </span>
          </div>
          <h1 className="font-display text-6xl font-bold text-parchment mb-3 leading-tight">
            {mockMovies[1].title}
          </h1>
          <p className="text-silver text-sm mb-6 line-clamp-2 font-body leading-relaxed">
            {mockMovies[1].description}
          </p>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-spotlight hover:bg-spotlight/80 text-film px-8 py-3 font-mono font-semibold tracking-widest uppercase text-sm transition-colors">
              ▶ Reproducir
            </button>
            <button className="flex items-center gap-2 bg-transparent border border-silver/40 hover:border-spotlight text-silver hover:text-spotlight px-8 py-3 font-mono font-semibold tracking-widest uppercase text-sm transition-colors">
              Más info
            </button>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="px-8 mb-10">
        <div className="flex items-center gap-3 max-w-md border border-[#3a2e1a] bg-[#1e1810] px-4 py-2 rounded focus-within:border-spotlight transition-colors">
          <Search size={16} className="text-silver/50 shrink-0" />
          <Input
            placeholder="Buscar películas o series..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent border-none text-parchment placeholder:text-silver/40 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto font-mono text-sm"
          />
        </div>
      </div>

      {/* Grids de contenido */}
      {!typeFilter && (
        <MovieGrid title="En Cartelera" movies={mockMovies.slice(0, 6)} />
      )}
      {(!typeFilter || typeFilter === 'movie') && movies.length > 0 && (
        <MovieGrid title="Películas" movies={movies} />
      )}
      {(!typeFilter || typeFilter === 'series') && series.length > 0 && (
        <MovieGrid title="Series" movies={series} />
      )}
    </MainLayout>
  )
}