import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ─── Token de autenticación ──────────────────────────────
const getAuthHeader = () => {
 const token = localStorage.getItem('quetxal_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ─── Tipos ───────────────────────────────────────────────
export interface Plan {
  id: string
  name: string
  slug?: string
  priceUsd: number
  maxProfiles: number
  maxStreams: number
  videoQuality: string
  description: string
  isActive: boolean
}

export interface PlanWithRates extends Plan {
  price_gtq?: number
  price_local?: number
  local_currency?: string
  local_symbol?: string
}

// ─── Servicio de suscripciones ───────────────────────────
export const subscriptionAPI = {

  getPlans: async (): Promise<Plan[]> => {
    const res = await axios.get(`${API_BASE}/subscriptions/plans`, {
      headers: getAuthHeader()
    })
    return Array.isArray(res.data) ? res.data : res.data.plans ?? res.data.data ?? []
  },

  getPlansWithRates: async (currency: string): Promise<PlanWithRates[]> => {
    const res = await axios.get(`${API_BASE}/subscriptions/plans/with-rates`, {
      params: { currency },
      headers: getAuthHeader()
    })
    return Array.isArray(res.data) ? res.data : res.data.plans ?? res.data.data ?? []
  },

  subscribe: async (planId: number, currency: string, paymentMethod: string) => {
    const res = await axios.post(`${API_BASE}/subscriptions/subscribe`, {
      planId: String(planId),
      currency,
      paymentMethod,
    }, {
      headers: getAuthHeader()
    })
    return res.data
  },

  getMySubscription: async () => {
    const res = await axios.get(`${API_BASE}/subscriptions/me`, {
      headers: getAuthHeader()
    })
    return res.data
  },

cancelSubscription: async () => {
    const res = await axios.delete(`${API_BASE}/subscriptions`, {
      headers: getAuthHeader(),
      data: { reason: 'Cancelado por el usuario' }
    })
    return res.data
  },

  getPaymentHistory: async () => {
    const res = await axios.get(`${API_BASE}/subscriptions/payments`, {
      headers: getAuthHeader()
    })
    return res.data
  },
}