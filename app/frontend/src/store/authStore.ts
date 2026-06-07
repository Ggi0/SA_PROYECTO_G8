import { create } from 'zustand'

interface Profile {
  id: string
  name: string
  avatar: string
}

interface User {
  id: string
  email: string
  profiles: Profile[]
}

interface AuthState {
  user: User | null
  currentProfile: Profile | null
  token: string | null
  isAuthenticated: boolean
  setUser: (user: User, token: string) => void
  setCurrentProfile: (profile: Profile) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  currentProfile: null,
  token: null,
  isAuthenticated: false,
  setUser: (user, token) => set({ user, token, isAuthenticated: true }),
  setCurrentProfile: (profile) => set({ currentProfile: profile }),
  logout: () => set({ user: null, token: null, currentProfile: null, isAuthenticated: false }),
}))