import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mockPlans } from '@/services/mock/mockData'
import { Check } from 'lucide-react'

export default function PlansPage() {
  return (
    <MainLayout>
      <div className="px-8 py-16 max-w-5xl mx-auto">
        {/* Encabezado */}
        <div className="text-center mb-12">
          <h1 className="text-white text-4xl font-bold mb-3">Planes y Suscripciones</h1>
          <p className="text-zinc-400">Elegí el plan que mejor se adapte a vos</p>
        </div>

        {/* Cards de planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockPlans.map((plan) => {
            const isPopular = plan.name === 'Estándar'

            return (
              <Card
                key={plan.id}
                className={`bg-zinc-900 border-zinc-800 relative ${
                  isPopular ? 'border-red-600 border-2' : ''
                }`}
              >
                {/* Badge popular */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-red-600 text-white">Más popular</Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-white">
                      ${plan.priceUSD}
                    </span>
                    <span className="text-zinc-400 text-sm"> /mes</span>
                  </div>
                  {/* Precio en quetzales - pendiente FX Service */}
                  <p className="text-zinc-500 text-xs mt-1">
                    Precio en GTQ disponible próximamente
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Features */}
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-zinc-300 text-sm">
                        <Check size={16} className="text-green-400 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full mt-4 ${
                      isPopular
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-zinc-700 hover:bg-zinc-600 text-white'
                    }`}
                  >
                    Elegir {plan.name}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </MainLayout>
  )
}