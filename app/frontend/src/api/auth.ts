import axios from 'axios'

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const authAPI = {
  register: async (
    email: string,
    password: string,
    display_name: string,
  ) => {
    const res = await api.post('/auth/register', {
      email,
      password,
      display_name,
    })

    return res.data
  },

  login: async (
    email: string,
    password: string,
  ) => {
    const res = await api.post('/auth/login', {
      email,
      password,
      device_info: navigator.userAgent,
      ip_address: '127.0.0.1',
    })

    return res.data
  },

  logout: async () => {
    const res = await api.post('/auth/logout')
    return res.data
  },
}