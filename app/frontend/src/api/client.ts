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
