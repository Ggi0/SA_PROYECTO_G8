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