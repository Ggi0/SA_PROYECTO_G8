// ─── Auth ───────────────────────────────────────────────
export interface User {
  id: string
  email: string
  name: string
  subscriptionPlan: 'basic' | 'standard' | 'premium' | null
  role?: string
  profiles?: Profile[]
}

// ─── Profiles ───────────────────────────────────────────
export interface Profile {
  id: string
  name: string
  avatar: string
  userId: string
}

// ─── Catalog ────────────────────────────────────────────
export interface Movie {
  id: string
  title: string
  description: string
  coverImage: string
  genre: string[]
  year: number
  rating: number
  recommendationPct: number
  type: 'movie' | 'series'
  cast: Actor[]
  // Campos adicionales del catalog service
  originalTitle?: string
  videoRef?: string
  videoSource?: string
  trailerUrl?: string
  durationMin?: number
  ratingClass?: string
  totalVotes?: number
}

export interface Actor {
  id: string
  name: string
  role: string
  photo: string
}

export interface Episode {
  id: string
  episodeNum: number
  title: string
  synopsis?: string
  duration: number
  videoRef?: string
  videoSource?: string
}

export interface Season {
  id: string
  number: number
  title?: string
  releaseYear?: number
  episodes: Episode[]
}

export interface SeriesStructure {
  contentId: string
  seriesTitle: string
  seasons: Season[]
}

// ─── Subscriptions ──────────────────────────────────────
export interface Plan {
  id: string
  name: string
  priceUSD: number
  features: string[]
  description?: string
  maxProfiles?: number
  maxStreams?: number
  videoQuality?: string
}

export interface PlanWithRate extends Plan {
  localPrice: number
  currency: string
  exchangeRate: number
}

// ─── Watch History ──────────────────────────────────────
export interface WatchHistory {
  id: string
  profileId: string
  movieId: string
  movie: Movie
  progressMinutes: number
  season?: number
  episode?: number
  updatedAt: string
}

// ─── FX ─────────────────────────────────────────────────
export interface ExchangeRate {
  currency: string
  rate: number
  symbol: string
}
