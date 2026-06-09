import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'

import MainLayout from '@/components/layout/MainLayout'
import MovieGrid from '@/components/catalog/MovieGrid'
import { Input } from '@/components/ui/input'
import MoviePoster from '@/components/shared/MoviePoster'
import ContinueWatchingSection from '@/components/history/ContinueWatchingSection'
import { mockHistory, mockMovies } from '@/services/mock/mockData'

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const typeFilter = searchParams.get('type')

  const filtered = mockMovies.filter((movie) => {
    const matchesType = typeFilter ? movie.type === typeFilter : true
    const matchesQuery = movie.title.toLowerCase().includes(query.toLowerCase())
    return matchesType && matchesQuery
  })

  const movies = filtered.filter((movie) => movie.type === 'movie')
  const series = filtered.filter((movie) => movie.type === 'series')

  return (
    <MainLayout>
      {/* Hero banner */}
      <div className="relative mb-10 flex h-[75vh] items-end px-8 pb-16">
        <div className="absolute inset-0">
          <MoviePoster
            src="https://i.pinimg.com/originals/9f/f6/0b/9ff60bde7d28d52fb8ef20792010b4bb.gif"
            alt={mockMovies[1].title}
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1408] via-[#1a1408]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1408]/80 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-spotlight/40 to-transparent" />

        <div className="relative z-10 max-w-xl">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px w-8 bg-spotlight" />
            <span className="font-mono text-xs uppercase tracking-widest text-spotlight">
              Destacado
            </span>
          </div>

          <h1 className="mb-3 font-display text-6xl font-bold leading-tight text-parchment">
            {mockMovies[1].title}
          </h1>

          <p className="mb-6 line-clamp-2 font-body text-sm leading-relaxed text-silver">
            {mockMovies[1].description}
          </p>

          <div className="flex gap-3">
            <button className="bg-spotlight px-8 py-3 font-mono text-sm font-semibold uppercase tracking-widest text-film transition-colors hover:bg-spotlight/80">
              ▶ Reproducir
            </button>

            <button className="border border-silver/40 bg-transparent px-8 py-3 font-mono text-sm font-semibold uppercase tracking-widest text-silver transition-colors hover:border-spotlight hover:text-spotlight">
              Más info
            </button>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-10 px-8">
        <div className="flex max-w-md items-center gap-3 rounded border border-[#3a2e1a] bg-[#1e1810] px-4 py-2 transition-colors focus-within:border-spotlight">
          <Search size={16} className="shrink-0 text-silver/50" />
          <Input
            placeholder="Buscar películas o series..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-auto border-none bg-transparent p-0 font-mono text-sm text-parchment placeholder:text-silver/40 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Continuar viendo */}
      {!typeFilter && (
        <ContinueWatchingSection
          items={mockHistory.filter((item) => item.profileId === '1')}
        />
      )}

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