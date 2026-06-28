import { Movie, Plan, Profile, WatchHistory } from '@/types'

// ─── Perfiles mock ──────────────────────────────────────
export const mockProfiles: Profile[] = [
  { id: '1', name: 'Naomi', avatar: '🎬', userId: '1', isKidsMode: false },
  { id: '2', name: 'Invitado', avatar: '🎭', userId: '1', isKidsMode: false },
]

// ─── Películas mock ─────────────────────────────────────
export const mockMovies: Movie[] = [
  {
    id: '1',
    title: 'El Origen',
    description: 'Un ladrón que roba secretos corporativos a través del uso de la tecnología de compartir sueños.',
    coverImage: '',
    genre: ['Acción', 'Ciencia ficción'],
    year: 2010,
    rating: 4.8,
    recommendationPct: 95,
    type: 'movie',
    cast: [{ id: '1', name: 'Leonardo DiCaprio', role: 'Dom Cobb', photo: '' }],
  },
  {
    id: '2',
    title: 'Interestelar',
    description: 'Un equipo de exploradores viaja a través de un agujero de gusano en el espacio.',
    coverImage: '',
    genre: ['Drama', 'Ciencia ficción'],
    year: 2014,
    rating: 4.9,
    recommendationPct: 98,
    type: 'movie',
    cast: [{ id: '2', name: 'Matthew McConaughey', role: 'Cooper', photo: '' }],
  },
  {
    id: '3',
    title: 'Breaking Bad',
    description: 'Un profesor de química se convierte en fabricante de metanfetamina.',
    coverImage: '',
    genre: ['Drama', 'Crimen'],
    year: 2008,
    rating: 5.0,
    recommendationPct: 99,
    type: 'series',
    cast: [{ id: '3', name: 'Bryan Cranston', role: 'Walter White', photo: '' }],
  },
  {
    id: '4',
    title: 'Dune',
    description: 'La historia de Paul Atreides en el planeta más peligroso del universo.',
    coverImage: '',
    genre: ['Ciencia ficción', 'Aventura'],
    year: 2021,
    rating: 4.7,
    recommendationPct: 92,
    type: 'movie',
    cast: [{ id: '4', name: 'Timothée Chalamet', role: 'Paul Atreides', photo: '' }],
  },
  {
    id: '5',
    title: 'The Last of Us',
    description: 'Un sobreviviente endurrecido guía a una joven a través de un Estados Unidos post-apocalíptico.',
    coverImage: '',
    genre: ['Drama', 'Terror'],
    year: 2023,
    rating: 4.9,
    recommendationPct: 97,
    type: 'series',
    cast: [{ id: '5', name: 'Pedro Pascal', role: 'Joel', photo: '' }],
  },
  {
    id: '6',
    title: 'Oppenheimer',
    description: 'La historia del físico J. Robert Oppenheimer y el desarrollo de la bomba atómica.',
    coverImage: '',
    genre: ['Drama', 'Historia'],
    year: 2023,
    rating: 4.8,
    recommendationPct: 94,
    type: 'movie',
    cast: [{ id: '6', name: 'Cillian Murphy', role: 'J. Robert Oppenheimer', photo: '' }],
  },
]

// ─── Planes mock ────────────────────────────────────────
export const mockPlans: Plan[] = [
  {
    id: '1',
    name: 'Básico',
    priceUSD: 4.99,
    features: ['1 pantalla', 'Calidad HD', 'Sin descargas'],
  },
  {
    id: '2',
    name: 'Estándar',
    priceUSD: 9.99,
    features: ['2 pantallas', 'Calidad Full HD', '10 descargas'],
  },
  {
    id: '3',
    name: 'Premium',
    priceUSD: 14.99,
    features: ['4 pantallas', 'Calidad 4K', 'Descargas ilimitadas'],
  },
]

// ─── Historial mock ─────────────────────────────────────
export const mockHistory: WatchHistory[] = [
  {
    id: '1',
    profileId: '1',
    movieId: '3',
    movie: mockMovies[2],
    progressMinutes: 45,
    season: 2,
    episode: 3,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    profileId: '1',
    movieId: '1',
    movie: mockMovies[0],
    progressMinutes: 90,
    updatedAt: new Date().toISOString(),
  },
]
