import { SavedProgress } from '@/lib/progress'
import ContinueWatchingCard from './ContinueWatchingCard'

interface Props {
  items: SavedProgress[]
}

export default function ContinueWatchingSection({ items }: Props) {
  if (items.length === 0) return null

  return (
    <section className="mb-12">
      <div className="mb-5 flex items-center gap-4 px-8">
        <div className="h-6 w-1 bg-spotlight" />
        <div>
          <h2 className="font-display text-xl font-semibold tracking-wide text-parchment">
            Continuar viendo
          </h2>
          <p className="font-mono text-xs text-silver/50">
            Retoma tus películas y series desde donde te quedaste
          </p>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-[#3a2e1a] to-transparent" />
      </div>

      <div className="grid grid-cols-1 gap-4 px-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <ContinueWatchingCard key={item.contentId} item={item} />
        ))}
      </div>
    </section>
  )
}
