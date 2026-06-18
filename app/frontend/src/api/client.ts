import axios from 'axios'

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000'

export const gateway = axios.create({
  baseURL: GATEWAY_URL,
  headers: { 'Content-Type': 'application/json' },
})

gateway.interceptors.request.use((config) => {
  const token = localStorage.getItem('quetxal_token') || localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Auto-logout cuando el token expira o es inválido ─────────────────────────
gateway.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('quetxal_user')
      localStorage.removeItem('quetxal_token')
      localStorage.removeItem('quetxal_active_profile')
      localStorage.removeItem('auth_token')

      // Evita un loop si ya estamos en login
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/login'
        window.location.reload()
      }
    }
    return Promise.reject(error)
  }
)
