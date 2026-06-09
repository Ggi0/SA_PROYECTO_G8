import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { subscriptionAPI, SubscriptionPlan, SubscriptionPlanWithRate } from '@/api/subscription'
import { useAuth } from '@/context/AuthContext'
import { Check, RefreshCw } from 'lucide-react'

const currency = 'GTQ'

function planFeatures(plan: SubscriptionPlan) {
  if (plan.description) {
    try {
      const parsed = JSON.parse(plan.description)
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
        return parsed
      }
    } catch {
      return [plan.description]
    }
  }

  return [
    `${plan.maxProfiles} ${plan.maxProfiles === 1 ? 'perfil' : 'perfiles'}`,
    `${plan.maxStreams} ${plan.maxStreams === 1 ? 'pantalla simultánea' : 'pantallas simultáneas'}`,
    `Calidad ${plan.videoQuality}`,
  ]
}

function formatMoney(value: number, code: string) {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: code,
  }).format(value)
}

export default function PlansPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [rates, setRates] = useState<Record<string, SubscriptionPlanWithRate>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadPlans() {
      setLoading(true)
      setError('')
      try {
        const data = await subscriptionAPI.getPlans()
        if (cancelled) return
        setPlans(data)

        if (token) {
          const ratedPlans = await subscriptionAPI.getPlansWithRates(currency)
          if (cancelled) return
          setRates(Object.fromEntries(ratedPlans.map((item) => [item.plan.id, item])))
        }
      } catch {
        if (!cancelled) setError('No se pudieron cargar los planes de suscripción.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPlans()

    return () => {
      cancelled = true
    }
  }, [token])

  const handleChoosePlan = (planId: string) => {
    if (!token) {
      setError('Iniciá sesión para contratar o cambiar tu suscripción.')
      navigate('/login')
      return
    }

    navigate(`/checkout/${planId}`)
  }

  return (
    <MainLayout>
      <div className="px-8 py-16 max-w-5xl mx-auto">

        {/* Encabezado */}
        <div className="text-center mb-14">
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
          <p className="text-silver font-mono text-sm">
            Elegí el plan que mejor se adapte a vos
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-curtain/20 border border-curtain/50 text-red-300 px-4 py-3 rounded font-mono text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-3 text-silver font-mono text-sm py-16">
            <RefreshCw size={16} className="animate-spin text-spotlight" />
            Cargando planes desde Subscription Service...
          </div>
        )}

        {/* Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isPopular = plan.name === 'Estándar'
            const ratedPlan = rates[plan.id]

            return (
              <div
                key={plan.id}
                className={`relative bg-[#1e1810] border rounded p-6 flex flex-col transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,168,67,0.1)] ${
                  isPopular
                    ? 'border-spotlight shadow-[0_0_20px_rgba(212,168,67,0.15)]'
                    : 'border-[#3a2e1a] hover:border-spotlight/50'
                }`}
              >
                {/* Badge popular */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-spotlight text-film text-xs font-mono font-bold px-4 py-1 tracking-widest uppercase">
                    Más Popular
                  </div>
                )}

                {/* Nombre del plan */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-5 bg-spotlight" />
                  <h2 className="font-display text-xl font-bold text-parchment">
                    {plan.name}
                  </h2>
                </div>

                {/* Precio */}
                <div className="mb-2">
                  <span className="font-display text-5xl font-bold text-spotlight">
                    ${plan.priceUsd.toFixed(2)}
                  </span>
                  <span className="text-silver/60 font-mono text-sm"> /mes</span>
                </div>
                <p className="text-silver/40 font-mono text-xs mb-8">
                  {ratedPlan
                    ? `${formatMoney(ratedPlan.localPrice, ratedPlan.currency)} aprox. · tasa ${ratedPlan.exchangeRate.toFixed(2)}`
                    : token
                      ? 'Precio local no disponible por el momento'
                      : 'Iniciá sesión para ver precio en GTQ'}
                </p>

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-8">
                  {planFeatures(plan).map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-silver font-mono text-sm">
                      <Check size={14} className="text-spotlight shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleChoosePlan(plan.id)}
                  disabled={!plan.isActive}
                  className={`w-full font-mono tracking-widest uppercase text-sm h-11 ${
                    isPopular
                      ? 'bg-spotlight hover:bg-spotlight/80 text-film'
                      : 'bg-transparent border border-[#3a2e1a] hover:border-spotlight text-silver hover:text-spotlight'
                  }`}
                  variant={isPopular ? 'default' : 'outline'}
                >
                  Continuar al pago
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
