import { useEffect, useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { fxAPI, RateItem } from '@/services/api/fxService'
import { mockPlans } from '@/services/mock/mockData'
import { subscriptionAPI, Plan } from '@/services/api/subscriptionService'
import { Check, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [gtqRate, setGtqRate] = useState<RateItem | null>(null)
  const [loading, setLoading] = useState(true)
// ─── Estado ──────────────────────────────────────────────
const [subscribing, setSubscribing] = useState<string | null>(null)
const navigate = useNavigate()
const handleSubscribe = (plan: Plan) => {
  navigate('/checkout', { state: { plan } })
}
 useEffect(() => {
  const fetchData = async () => {
    try{
      const [plansData, rateData] = await Promise.all([
        subscriptionAPI.getPlans(),
        fxAPI.getRate('GTQ'),
      ])
      setPlans(plansData)
      setGtqRate(rateData)
    } catch (error) {
      console.error('Subscription service no disponible, usando mock:', error)
      // Fallback a mock mientras el servicio no está listo
     setPlans(mockPlans.map((p, i) => ({
      id: String(i + 1),
      name: p.name,
      slug: p.name.toLowerCase(),
      priceUsd: p.priceUSD,
      maxProfiles: i + 1,
      maxStreams: i + 1,
      videoQuality: ['SD', 'HD', 'UHD'][i] ?? 'HD',
      description: JSON.stringify(p.features),
      isActive: true,
    })))
      // Igual intentamos obtener el tipo de cambio
      try {
        const rateData = await fxAPI.getRate('GTQ')
        setGtqRate(rateData)
      } catch {}
    } finally {
      setLoading(false)
    }
  }
   fetchData()
  }, [])

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 size={32} className="text-spotlight animate-spin" />
        </div>
      </MainLayout>
    )
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
          <p className="text-silver font-mono text-sm">
            Elegí el plan que mejor se adapte a vos
          </p>
          {gtqRate && (
            <p className="text-silver/40 font-mono text-xs mt-2">
              1 USD = {gtqRate.symbol}{gtqRate.rate} GTQ
            </p>
          )}
        </div>

    

        {loading && (
          <div className="text-center text-silver/50 font-mono text-sm py-10">
            Cargando planes...
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
           const isPopular = plan.name === 'Estándar'
            const priceGTQ = gtqRate
               ? (plan.priceUsd * gtqRate.rate).toFixed(2)
            : null
                  let features: string[] = []
            try {
              features = typeof plan.description === 'string'
                ? JSON.parse(plan.description)
                : []
            } catch {
              features = []
            }

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

                {/* Nombre */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-5 bg-spotlight" />
                  <h2 className="font-display text-xl font-bold text-parchment">
                    {plan.name}
                  </h2>
                </div>

                {/* Precio USD */}
                <div className="mb-1">
                  <span className="font-display text-5xl font-bold text-spotlight">
                    ${plan.priceUsd.toFixed(2)}
                  </span>
                  <span className="text-silver/60 font-mono text-sm"> /mes</span>
                </div>

                {/* Precio GTQ */}
                <div className="mb-8 h-5">
                  {priceGTQ ? (
                    <p className="text-spotlight/70 font-mono text-sm">
                      Q{priceGTQ} GTQ/mes
                    </p>
                  ) : (
                    <p className="text-silver/40 font-mono text-xs">
                      Precio en GTQ no disponible
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-8">
                  {features.map((feature: string) => (
                    <li key={feature} className="flex items-center gap-3 text-silver font-mono text-sm">
                      <Check size={14} className="text-spotlight shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Detalles técnicos */}
                <div className="flex gap-3 mb-6 flex-wrap">
                  <span className="text-xs font-mono border border-[#3a2e1a] text-silver/60 px-2 py-1">
                    {plan.videoQuality}
                  </span>
                  <span className="text-xs font-mono border border-[#3a2e1a] text-silver/60 px-2 py-1">
                    {plan.maxStreams} pantalla{plan.maxStreams > 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-mono border border-[#3a2e1a] text-silver/60 px-2 py-1">
                    {plan.maxProfiles} perfil{plan.maxProfiles > 1 ? 'es' : ''}
                  </span>
                </div>

                          <Button
                onClick={() => handleSubscribe(plan)}
                disabled={subscribing === plan.id}
                className={`w-full font-mono tracking-widest uppercase text-sm h-11 ${
                  isPopular
                    ? 'bg-spotlight hover:bg-spotlight/80 text-film'
                    : 'bg-transparent border border-[#3a2e1a] hover:border-spotlight text-silver hover:text-spotlight'
                }`}
                variant={isPopular ? 'default' : 'outline'}
              >
                {subscribing === plan.id ? (
                  <Loader2 size={14} className="animate-spin mr-2" />
                ) : null}
                Elegir {plan.name}
              </Button>
              </div>
            )
          })}
        </div>
      </div>
    </MainLayout>
  )
}
