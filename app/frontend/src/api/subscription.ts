import { gateway } from './client'
import type { Plan, ExchangeRate } from '@/types'

// ─── Mappers ─────────────────────────────────────────────

function mapPlan(p: Record<string, unknown>): Plan {
  const features: string[] = []
  if (p.maxProfiles) features.push(`${p.maxProfiles} perfil${Number(p.maxProfiles) > 1 ? 'es' : ''}`)
  if (p.maxStreams) features.push(`${p.maxStreams} pantalla${Number(p.maxStreams) > 1 ? 's' : ''}`)
  if (p.videoQuality) features.push(`Calidad ${p.videoQuality}`)
  return {
    id: p.id as string,
    name: p.name as string,
    description: (p.description as string) || '',
    priceUSD: (p.priceUsd as number) || 0,
    features,
    maxProfiles: p.maxProfiles as number,
    maxStreams: p.maxStreams as number,
    videoQuality: p.videoQuality as string,
  }
}

// ─── API functions ───────────────────────────────────────

export async function getPlans(): Promise<Plan[]> {
  const res = await gateway.get('/subscriptions/plans')
  const data = res.data as { plans?: Array<Record<string, unknown>> }
  const list = Array.isArray(res.data) ? res.data : (data.plans || [])
  return (list as Array<Record<string, unknown>>).map(mapPlan)
}

export async function getFxRates(): Promise<ExchangeRate[]> {
  try {
    const res = await gateway.get('/fx/rates')
    const data = res.data as { success: boolean; data: Array<Record<string, unknown>> }
    if (!data.success || !data.data) return []
    return data.data.map((r) => ({
      currency: (r.currency_code as string) || '',
      rate: (r.rate as number) || 1,
      symbol: (r.symbol as string) || '',
    }))
  } catch {
    return []
  }
}

export async function getUserSubscription(): Promise<Record<string, unknown> | null> {
  try {
    const res = await gateway.get('/subscriptions/me')
    return res.data as Record<string, unknown>
  } catch {
    return null
  }
}

export async function subscribe(planId: string, currency = 'GTQ', paymentMethod = 'card') {
  const res = await gateway.post('/subscriptions/subscribe', { planId, currency, paymentMethod })
  return res.data
}

export async function cancelSubscription(reason = 'Cancelado por el usuario') {
  const res = await gateway.delete('/subscriptions', { data: { reason } })
  return res.data
}

export async function getPaymentHistory(limit = 10, offset = 0) {
  const res = await gateway.get('/subscriptions/payments', { params: { limit, offset } })
  return res.data
}
