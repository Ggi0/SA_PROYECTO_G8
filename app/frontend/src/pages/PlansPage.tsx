import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { getPlans, getFxRates } from '@/api/subscription'
import type { Plan, ExchangeRate } from '@/types'

const FALLBACK_PLANS: Plan[] = [
  {
    id: 'plan-basic',
    name: 'Básico',
    priceUSD: 4.99,
    features: ['1 perfil', 'Calidad HD', 'Sin anuncios'],
    maxProfiles: 1,
    maxStreams: 1,
    videoQuality: 'HD',
  },
  {
    id: 'plan-standard',
    name: 'Estándar',
    priceUSD: 9.99,
    features: ['3 perfiles', 'Calidad Full HD', 'Sin anuncios', 'Descargas'],
    maxProfiles: 3,
    maxStreams: 2,
    videoQuality: 'Full HD',
  },
  {
    id: 'plan-premium',
    name: 'Premium',
    priceUSD: 14.99,
    features: ['5 perfiles', 'Calidad 4K + HDR', 'Sin anuncios', 'Descargas', 'Acceso anticipado'],
    maxProfiles: 5,
    maxStreams: 4,
    videoQuality: '4K + HDR',
  },
]

const CURRENCIES = ['GTQ', 'MXN', 'EUR'] as const
type Currency = typeof CURRENCIES[number]

const CURRENCY_NAMES: Record<Currency, string> = {
  GTQ: 'Quetzal (GTQ)',
  MXN: 'Peso MX (MXN)',
  EUR: 'Euro (EUR)',
}

export default function PlansPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [currency, setCurrency] = useState<Currency>('GTQ')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getPlans(), getFxRates()])
      .then(([p, r]) => {
        setPlans(p.length > 0 ? p : FALLBACK_PLANS)
        setRates(r)
      })
      .catch(() => setPlans(FALLBACK_PLANS))
      .finally(() => setLoading(false))
  }, [])

  const getRate = (cur: string) => rates.find((r) => r.currency === cur)?.rate ?? null
  const rate = getRate(currency)

  const localPrice = (usd: number) => {
    if (!rate) return null
    return (usd * rate).toFixed(2)
  }

  const localSymbol = () => {
    const r = rates.find((r) => r.currency === currency)
    return r?.symbol || currency
  }

  return (
    <MainLayout>
      <div className="px-8 py-16 max-w-5xl mx-auto">

        {/* Encabezado */}
        <div className="text-center mb-10">
          <div className="flex items-center gap-3 justify-center mb-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-spotlight/40" />
            <span className="text-spotlight text-xs font-mono tracking-widest uppercase">
              Membresía
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-spotlight/40" />
          </div>
          <h1 className="font-display text-4xl font-bold text-parchment mb-3">
            Planes y Suscripciones
          </h1>
          <p className="text-silver font-mono text-sm">Elegí el plan que mejor se adapte a vos</p>
        </div>

        {/* Selector de moneda */}
        {rates.length > 0 && (
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className="text-silver/50 font-mono text-xs tracking-widest uppercase">Moneda:</span>
            <div className="flex gap-2">
              {CURRENCIES.map((cur) => (
                <button
                  key={cur}
                  onClick={() => setCurrency(cur)}
                  className={`px-4 py-1.5 font-mono text-xs tracking-widest uppercase border transition-colors ${
                    currency === cur
                      ? 'border-spotlight text-spotlight bg-spotlight/10'
                      : 'border-[#3a2e1a] text-silver/60 hover:border-spotlight/50'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center text-silver/50 font-mono text-sm py-10">
            Cargando planes...
          </div>
        )}

        {/* Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isPopular = plan.name?.toLowerCase().includes('standard') ||
                plan.name?.toLowerCase().includes('estándar') ||
                plan.name?.toLowerCase().includes('estandar')

              return (
                <div
                  key={plan.id}
                  className={`relative bg-[#1e1810] border rounded p-6 flex flex-col transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,168,67,0.1)] ${
                    isPopular
                      ? 'border-spotlight shadow-[0_0_20px_rgba(212,168,67,0.15)]'
                      : 'border-[#3a2e1a] hover:border-spotlight/50'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-spotlight text-film text-xs font-mono font-bold px-4 py-1 tracking-widest uppercase">
                      Más Popular
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-5 bg-spotlight" />
                    <h2 className="font-display text-xl font-bold text-parchment">{plan.name}</h2>
                  </div>

                  {/* Precio */}
                  <div className="mb-1">
                    <span className="font-display text-5xl font-bold text-spotlight">
                      ${plan.priceUSD.toFixed(2)}
                    </span>
                    <span className="text-silver/60 font-mono text-sm"> USD/mes</span>
                  </div>

                  {localPrice(plan.priceUSD) !== null ? (
                    <p className="text-silver/60 font-mono text-sm mb-8">
                      {localSymbol()} {localPrice(plan.priceUSD)} {currency}/mes
                    </p>
                  ) : (
                    <p className="text-silver/40 font-mono text-xs mb-8">
                      Tipo de cambio no disponible
                    </p>
                  )}

                  {/* Features */}
                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-silver font-mono text-sm">
                        <Check size={14} className="text-spotlight shrink-0" />
                        {feature}
                      </li>
                    ))}
                    {plan.description && (
                      <li className="text-silver/50 font-mono text-xs">{plan.description}</li>
                    )}
                  </ul>

                  <Button
                    onClick={() => navigate('/account')}
                    className={`w-full font-mono tracking-widest uppercase text-sm h-11 ${
                      isPopular
                        ? 'bg-spotlight hover:bg-spotlight/80 text-film'
                        : 'bg-transparent border border-[#3a2e1a] hover:border-spotlight text-silver hover:text-spotlight'
                    }`}
                    variant={isPopular ? 'default' : 'outline'}
                  >
                    Elegir {plan.name}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
