import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Profile } from '@/types'

// ─── Tipos del contexto ─────────────────────────────────
interface AuthContextType {
  user: User | null
  currentProfile: Profile | null
  token: string | null
  isAuthenticated: boolean
  setUser: (user: User, token: string) => void
  setCurrentProfile: (profile: Profile) => void
  logout: () => void
}

// ─── Contexto ───────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null)

// ─── Provider ───────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [currentProfile, setCurrentProfileState] = useState<Profile | null>(null)
  const [token, setToken] = useState<string | null>(null)

 const setUser = (user: User, token: string) => {
  setUserState(user)
  setToken(token)
  localStorage.setItem('token', token)
}
  const setCurrentProfile = (profile: Profile) => {
    setCurrentProfileState(profile)
  }

 const logout = () => {
  setUserState(null)
  setToken(null)
  setCurrentProfileState(null)
  localStorage.removeItem('token')
}
// ─── Restaurar sesión al recargar ───────────────────────
useEffect(() => {
  const savedToken = localStorage.getItem('token')
  if (savedToken) {
    setToken(savedToken)
    // El user se restaurará cuando el auth service esté listo
    // Por ahora marcamos como autenticado si hay token
  }
}, [])
  return (
    <AuthContext.Provider
      value={{
        user,
        currentProfile,
        token,
        isAuthenticated: !!user,
        setUser,
        setCurrentProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ───────────────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}