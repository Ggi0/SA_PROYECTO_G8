import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number

  

  user: {
    userId: string
    email: string
    role: string
  }

  profiles: any[]
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('quetxal_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authAPI = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', {
      email,
      password,
    })
  
    return res.data as LoginResponse
  },
 register: async (email: string, password: string, name: string) => {
    const res = await api.post('/auth/register', { email, password, display_name: name })
    return res.data
  },
  logout: async () => {
    const res = await api.post('/auth/logout')
    return res.data
  },
}
