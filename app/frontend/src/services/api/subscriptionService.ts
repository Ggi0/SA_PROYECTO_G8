import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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

  // Obtener todos los planes
 getPlans: async (): Promise<Plan[]> => {
    const res = await axios.get(`${API_BASE}/subscriptions/plans`)
    // Devuelve { plans: [...] }
    return res.data.plans ?? res.data ?? []
  },

  // Obtener planes con tipos de cambio incluidos
 getPlansWithRates: async (currency: string): Promise<PlanWithRates[]> => {
  const res = await axios.get(`${API_BASE}/subscriptions/plans/with-rates`, {
    params: { currency }
  })
  return res.data
},
  // Suscribirse a un plan
  subscribe: async (planId: number, currency: string, paymentMethod: string) => {
    const res = await axios.post(`${API_BASE}/subscriptions/subscribe`, {
      plan_id: planId,
      display_currency: currency,
      payment_method: paymentMethod,
    })
    return res.data
  },

  // Obtener suscripción actual del usuario
  getMySubscription: async () => {
    const res = await axios.get(`${API_BASE}/subscriptions/me`)
    return res.data
  },

  // Cancelar suscripción
  cancelSubscription: async () => {
    const res = await axios.delete(`${API_BASE}/subscriptions`)
    return res.data
  },

  // Obtener historial de pagos
  getPaymentHistory: async () => {
    const res = await axios.get(`${API_BASE}/subscriptions/payments`)
    return res.data
  },
}