import { Routes, Route, Navigate } from 'react-router-dom'

// ─── Pages ──────────────────────────────────────────────
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ProfilesPage from '@/pages/ProfilesPage'
import HomePage from '@/pages/HomePage'
import MovieDetailPage from '@/pages/MovieDetailPage'
import PlansPage from '@/pages/PlansPage'
import AccountPage from '@/pages/AccountPage'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Selección de perfil */}
      <Route path="/profiles" element={<ProfilesPage />} />

      {/* Rutas privadas */}
      <Route path="/home" element={<HomePage />} />
      <Route path="/movie/:id" element={<MovieDetailPage />} />
      <Route path="/plans" element={<PlansPage />} />
      <Route path="/account" element={<AccountPage />} />

      {/* Redirect por defecto */}
      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  )
}