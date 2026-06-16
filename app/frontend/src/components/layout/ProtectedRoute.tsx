import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// ─── Props ───────────────────────────────────────────────
interface ProtectedRouteProps {
  children: React.ReactNode
  requireSubscription?: boolean
  allowedRoles?: string[]
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()

// No autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Validación de roles
  if (
    allowedRoles &&
    (!user?.role || !allowedRoles.includes(user.role))
  ) {
    return <Navigate to="/profiles" replace />
  }

  return <>{children}</>
}