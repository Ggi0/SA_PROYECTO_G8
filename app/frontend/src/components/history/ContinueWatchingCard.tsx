import { useNavigate } from 'react-router-dom'
import { Clock, Film, Play, Tv } from 'lucide-react'
import { SavedProgress } from '@/lib/progress'
import MoviePoster from '@/components/shared/MoviePoster'

interface Props {
  item: SavedProgress
}

export default function ContinueWatchingCard({ item }: Props) {
  const navigate = useNavigate()

  const isSeries = item.contentType === 'SERIES'
  const progressPct = Math.min(
    Math.round((item.minuteReached / (item.totalDuration || 90)) * 100),
    100,
  )

  const subtitle = isSeries
    ? `Temp. ${item.seasonNum} · Ep. ${item.episodeNum} · Min. ${item.minuteReached}`
    : `Min. ${item.minuteReached}`

  return (
    <article
      onClick={() => navigate(`/movie/${item.contentId}`)}
      className="group cursor-pointer overflow-hidden rounded border border-[#3a2e1a] bg-[#1e1810] transition-all duration-300 hover:scale-[1.02] hover:border-spotlight hover:shadow-[0_0_20px_rgba(212,168,67,0.18)]"
    >
      <div className="relative h-40">
        <MoviePoster src={item.posterUrl} alt={item.title} />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0b04] via-[#0f0b04]/30 to-transparent" />

        <div className="absolute left-3 top-3 flex items-center gap-1 rounded bg-[#0f0b04]/80 px-2 py-1 text-xs font-mono text-spotlight">
          {isSeries ? <Tv size={12} /> : <Film size={12} />}
          {isSeries ? 'SERIE' : 'PELÍCULA'}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-spotlight text-film">
            <Play size={20} fill="currentColor" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="line-clamp-1 font-display text-base font-semibold text-parchment">
            {item.title}
          </h3>
        </div>
      </div>

      <div className="p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-mono text-silver/70">
          <Clock size={13} />
          <span>{subtitle}</span>
        </div>

        <div className="mb-2 h-1.5 overflow-hidden rounded bg-[#3a2e1a]">
          <div
            className="h-full rounded bg-spotlight transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-silver/50">Continuar viendo</span>
          <span className="text-spotlight">{progressPct}%</span>
        </div>
      </div>
    </article>
  )
}
