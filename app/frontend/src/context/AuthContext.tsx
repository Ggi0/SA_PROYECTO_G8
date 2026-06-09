import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Profile } from '@/types'

const LS_USER = 'quetxal_user'
const LS_TOKEN = 'quetxal_token'
const LS_PROFILE = 'quetxal_active_profile'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function loadUser(): User | null {
  try {
    const u = JSON.parse(localStorage.getItem(LS_USER) || 'null') as User | null
    if (!u) return null
    // Si los profile IDs no son UUIDs válidos, limpiar sesión vieja
    if (u.profiles?.some(p => !UUID_RE.test(p.id))) {
      localStorage.removeItem(LS_USER)
      localStorage.removeItem(LS_TOKEN)
      localStorage.removeItem(LS_PROFILE)
      return null
    }
    return u
  } catch { return null }
}

function loadProfile(): Profile | null {
  try {
    const p = JSON.parse(localStorage.getItem(LS_PROFILE) || 'null') as Profile | null
    if (p && !UUID_RE.test(p.id)) {
      localStorage.removeItem(LS_PROFILE)
      return null
    }
    return p
  } catch { return null }
}

interface AuthContextType {
  user: User | null
  currentProfile: Profile | null
  token: string | null
  isAuthenticated: boolean
  setUser: (user: User, token: string) => void
  setCurrentProfile: (profile: Profile) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(loadUser)
  const [currentProfile, setCurrentProfileState] = useState<Profile | null>(loadProfile)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(LS_TOKEN))

  // keep localStorage in sync with state
  useEffect(() => {
    if (user) localStorage.setItem(LS_USER, JSON.stringify(user))
    else localStorage.removeItem(LS_USER)
  }, [user])

  useEffect(() => {
    if (token) localStorage.setItem(LS_TOKEN, token)
    else localStorage.removeItem(LS_TOKEN)
  }, [token])

  useEffect(() => {
    if (currentProfile) localStorage.setItem(LS_PROFILE, JSON.stringify(currentProfile))
    else localStorage.removeItem(LS_PROFILE)
  }, [currentProfile])

  const setUser = (user: User, token: string) => {
    setUserState(user)
    setToken(token)
    setCurrentProfileState(null)
    localStorage.removeItem(LS_PROFILE)
  }

  const setCurrentProfile = (profile: Profile) => {
    setCurrentProfileState(profile)
  }

  const logout = () => {
    setUserState(null)
    setToken(null)
    setCurrentProfileState(null)
    localStorage.removeItem(LS_USER)
    localStorage.removeItem(LS_TOKEN)
    localStorage.removeItem(LS_PROFILE)
  }

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

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
