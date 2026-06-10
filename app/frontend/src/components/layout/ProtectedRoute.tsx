import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// ─── Props ───────────────────────────────────────────────
interface ProtectedRouteProps {
  children: React.ReactNode
  requireSubscription?: boolean
}

export default function ProtectedRoute({ children, requireSubscription = false }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth()

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}