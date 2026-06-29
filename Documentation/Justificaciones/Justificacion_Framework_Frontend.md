# Justificación de Framework Frontend - Quetxal TV

Para el frontend de Quetxal TV se utilizó **React con TypeScript y Vite**. Esta combinación permite construir una interfaz modular, rápida y mantenible para una plataforma tipo streaming, con rutas protegidas, autenticación, perfiles, catálogo, reproducción, suscripciones y panel administrativo.

## ¿Por qué React?

React permite dividir la interfaz en componentes reutilizables. Esto es útil porque el sistema necesita tarjetas de contenido, secciones de historial, formularios de autenticación, vistas administrativas, componentes de layout y páginas protegidas.

## ¿Por qué Vite?

Vite se eligió por su rapidez en desarrollo y por generar builds optimizados para producción. Además, funciona bien con React, TypeScript y despliegue mediante contenedores Docker/Nginx.

## Evidencia de uso en código

### Dependencias del frontend

Ruta: `app/frontend/package.json`

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@fontsource-variable/geist": "^5.2.9",
    "@tanstack/react-query": "^5.101.0",
    "axios": "^1.17.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "jsonwebtoken": "^9.0.3",
    "jspdf": "^4.2.1",
    "jspdf-autotable": "^5.0.8",
    "lucide-react": "^1.17.0",
    "radix-ui": "^1.5.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-player": "^2.16.1",
    "react-router-dom": "^7.17.0",
    "shadcn": "^4.10.0",
    "tailwind-merge": "^3.6.0",
    "tw-animate-css": "^1.4.0",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@eslint/js": "^9.13.0",
    "@types/node": "^25.9.2",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.5.0",
    "eslint": "^9.13.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.14",
    "globals": "^15.11.0",
    "postcss": "^8.5.15",
    "tailwindcss": "^3.4.19",
    "typescript": "~5.6.2",
    "typescript-eslint": "^8.11.0",
    "vite": "^5.4.10"
  }
}
```

### Inicialización de React, Router, Context y React Query

Ruta: `app/frontend/src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

import App from './App.tsx'
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
        <App />
         </QueryClientProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
```

### Definición de rutas públicas, protegidas y administrativas

Ruta: `app/frontend/src/routes/AppRoutes.tsx`

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/layout/ProtectedRoute'

import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ProfilesPage from '@/pages/ProfilesPage'
import HomePage from '@/pages/HomePage'
import MovieDetailPage from '@/pages/MovieDetailPage'
import PlansPage from '@/pages/PlansPage'
import AccountPage from '@/pages/AccountPage'
import CheckoutPage from '@/pages/CheckoutPage'
import AuditPage from '@/pages/admin/AuditPage'
import LayoutAdmin from '@/pages/admin/layoutAdmin'
import MainPage from '@/pages/admin/mainPage'
import CatalogAdminPage from '@/pages/admin/CatalogAdminPage'
import UserAdminPage from '@/pages/admin/userAdminPage'


export default function AppRoutes() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Requieren autenticación */}
      <Route path="/profiles" element={
        <ProtectedRoute><ProfilesPage /></ProtectedRoute>
      } />
      <Route path="/plans" element={
        <ProtectedRoute><PlansPage /></ProtectedRoute>
      } />
      <Route path="/checkout" element={
        <ProtectedRoute><CheckoutPage /></ProtectedRoute>
      } />
      <Route path="/home" element={
        <ProtectedRoute><HomePage /></ProtectedRoute>
      } />
      <Route path="/movie/:id" element={
        <ProtectedRoute><MovieDetailPage /></ProtectedRoute>
      } />
      <Route path="/account" element={
        <ProtectedRoute><AccountPage /></ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/login" />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <LayoutAdmin />
          </ProtectedRoute>
        }
      >
        <Route path="audit" element={<AuditPage />} />
        <Route index element={<MainPage />} />
        <Route path="catalog" element={<CatalogAdminPage />} />
        <Route path="users" element={<UserAdminPage/>}/>

      </Route>

    </Routes>
  )
}
```

### Contexto de autenticación

Ruta: `app/frontend/src/context/AuthContext.tsx`

```tsx
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
```

### Dockerfile del frontend

Ruta: `app/frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_GATEWAY_URL=/api
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL

COPY package*.json .
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Configuración de Nginx para SPA

Ruta: `app/frontend/nginx.conf`

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Conclusión

React, TypeScript y Vite permiten construir un frontend modular, escalable y fácil de desplegar. React aporta componentes reutilizables, TypeScript reduce errores por tipado, Vite mejora la velocidad de desarrollo y Nginx permite servir la aplicación como SPA dentro de un contenedor.
