import { useState } from 'react'

// ─── Props ──────────────────────────────────────────────
interface MoviePosterProps {
  src?: string
  alt: string
  className?: string
}

// ─── URL del poster por defecto ─────────────────────────
const DEFAULT_POSTER = 'https://i.pinimg.com/originals/8d/e8/d7/8de8d761d3b5ab6321856c3ec71858b1.gif'

// ─── Poster con fallback de cine clásico ────────────────
export default function MoviePoster({ src, alt, className = '' }: MoviePosterProps) {
  const [error, setError] = useState(false)

  const imageSrc = src && !error ? src : DEFAULT_POSTER

  return (
    <img
      src={imageSrc}
      alt={alt}
      onError={() => setError(true)}
      className={`w-full h-full object-cover filter sepia-[0.2] ${className}`}
    />
  )
}