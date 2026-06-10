import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ─── Tipos ───────────────────────────────────────────────
export interface RateItem {
  currency_code: string
  currency_name: string
  symbol: string
  rate: number
}

export interface ConvertResult {
  original_amount: number
  converted_amount: number
  currency_code: string
  symbol: string
  rate: number
  success: boolean
}

// ─── Servicio FX ─────────────────────────────────────────
export const fxAPI = {
  // Obtener todos los tipos de cambio
  getAllRates: async (): Promise<RateItem[]> => {
    const res = await axios.get(`${API_BASE}/fx/rates`)
    return res.data.data
  },

  // Obtener tipo de cambio de una divisa
  getRate: async (currency: string): Promise<RateItem> => {
    const res = await axios.get(`${API_BASE}/fx/rates/${currency}`)
    return res.data.data
  },

  // Convertir monto de USD a otra divisa
  convert: async (amount: number, currency: string): Promise<ConvertResult> => {
    const res = await axios.get(`${API_BASE}/fx/convert`, {
      params: { amount, currency }
    })
    return res.data.data
  },
}