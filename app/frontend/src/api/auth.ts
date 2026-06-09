import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const authAPI = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    return res.data
  },
  register: async (email: string, password: string, name: string) => {
    const res = await api.post('/auth/register', { email, password, name })
    return res.data
  },
  logout: async () => {
    const res = await api.post('/auth/logout')
    return res.data
  },
}