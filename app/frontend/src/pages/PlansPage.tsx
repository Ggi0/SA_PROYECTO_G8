import { useNavigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { mockPlans } from '@/services/mock/mockData'
import { Check } from 'lucide-react'

export default function PlansPage() {
  const navigate = useNavigate()

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

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockPlans.map((plan) => {
            const isPopular = plan.name === 'Estándar'

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
                    ${plan.priceUSD}
                  </span>
                  <span className="text-silver/60 font-mono text-sm"> /mes</span>
                </div>
                <p className="text-silver/40 font-mono text-xs mb-8">
                  Precio en GTQ disponible próximamente
                </p>

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-silver font-mono text-sm">
                      <Check size={14} className="text-spotlight shrink-0" />
                      {feature}
                    </li>
                  ))}
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
      </div>
    </MainLayout>
  )
}