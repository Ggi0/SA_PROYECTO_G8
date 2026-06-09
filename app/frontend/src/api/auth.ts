import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function base64Url(input: ArrayBuffer | string) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function createLocalDevJwt() {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    sub: '11111111-1111-1111-1111-111111111111',
    email: 'angel@test.com',
    iat: now,
    exp: now + 60 * 60,
  }
  const data = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('local_dev_secret'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return `${data}.${base64Url(signature)}`
}

async function getAuthToken() {
  const existing = localStorage.getItem('authToken')
  if (existing) return existing

  if (!import.meta.env.DEV) return null

  const token = await createLocalDevJwt()
  localStorage.setItem('authToken', token)
  localStorage.setItem('authUser', JSON.stringify({
    id: '11111111-1111-1111-1111-111111111111',
    email: 'angel@test.com',
    name: 'Angel',
    subscriptionPlan: null,
  }))
  return token
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(async (config) => {
  const token = await getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
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
