import { api } from './auth'
import { AxiosError } from 'axios'

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string | string[]; error?: string } | undefined
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message
    return message || data?.error || error.message || fallback
  }

  return fallback
}

export interface SubscriptionPlan {
  id: string
  name: string
  description?: string
  priceUsd: number
  maxProfiles: number
  maxStreams: number
  videoQuality: string
  isActive: boolean
}

export interface SubscriptionPlanWithRate {
  plan: SubscriptionPlan
  localPrice: number
  currency: string
  exchangeRate: number
}

export interface UserSubscription {
  hasActiveSubscription: boolean
  subscriptionId: string
  planId: string
  planName: string
  planPriceUsd: number
  status: string
  startDate: string
  renewalDate: string
  daysRemaining: number
  maxProfiles: number
  maxStreams: number
  videoQuality: string
}

export interface Payment {
  id: string
  subscriptionId: string
  planName: string
  amountUsd: number
  amountLocal: number
  currency: string
  exchangeRate: number
  status: string
  paymentMethod: string
  transactionRef: string
  createdAt: string
}

export interface PaymentHistoryResponse {
  payments: Payment[]
  total: number
}

export interface SubscribeResponse {
  success: boolean
  subscriptionId: string
  paymentId: string
  message: string
}

export const subscriptionAPI = {
  getPlans: async () => {
    const res = await api.get<{ plans: SubscriptionPlan[] }>('/subscriptions/plans')
    return res.data.plans
  },

  getPlanById: async (planId: string) => {
    const res = await api.get<SubscriptionPlan>(`/subscriptions/plans/${planId}`)
    return res.data
  },

  getPlansWithRates: async (currency = 'GTQ') => {
    const res = await api.get<{ plans: SubscriptionPlanWithRate[]; currency: string }>('/subscriptions/plans/with-rates', {
      params: { currency },
    })
    return res.data.plans
  },

  subscribe: async (planId: string, currency = 'GTQ', paymentMethod = 'card') => {
    const res = await api.post<SubscribeResponse>('/subscriptions/subscribe', {
      planId,
      currency,
      paymentMethod,
    })
    return res.data
  },

  getCurrentSubscription: async () => {
    const res = await api.get<UserSubscription>('/subscriptions/me')
    return res.data
  },

  getPayments: async (limit = 10, offset = 0) => {
    const res = await api.get<PaymentHistoryResponse>('/subscriptions/payments', {
      params: { limit, offset },
    })
    return res.data
  },

  cancel: async (reason = 'Cancelado desde el panel de cuenta') => {
    const res = await api.delete<{ success: boolean; message: string }>('/subscriptions', {
      data: { reason },
    })
    return res.data
  },
}
