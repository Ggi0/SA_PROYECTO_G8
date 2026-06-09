// ─── Auth ───────────────────────────────────────────────
export interface User {
  id: string
  email: string
  name: string
  subscriptionPlan: 'basic' | 'standard' | 'premium' | null
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
}

export interface Actor {
  id: string
  name: string
  role: string
  photo: string
}

export interface Series extends Movie {
  seasons: Season[]
}

export interface Season {
  number: number
  episodes: Episode[]
}

export interface Episode {
  id: string
  title: string
  duration: number
  thumbnail: string
}

// ─── Subscriptions ──────────────────────────────────────
export interface Plan {
  id: string
  name: 'Básico' | 'Estándar' | 'Premium'
  priceUSD: number
  features: string[]
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