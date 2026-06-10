import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { subscriptionAPI } from '@/services/api/subscriptionService'
import { fxAPI, RateItem } from '@/services/api/fxService'
import { Plan } from '@/services/api/subscriptionService'
import { Loader2, CreditCard, Lock } from 'lucide-react'
import { useEffect } from 'react'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // ─── Plan seleccionado viene desde PlansPage ─────────
  const plan = location.state?.plan as Plan | undefined

  const [gtqRate, setGtqRate] = useState<RateItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!plan) {
      navigate('/plans')
      return
    }
    fxAPI.getRate('GTQ').then(setGtqRate).catch(console.error)
  }, [])

  const priceGTQ = gtqRate
    ? (plan?.priceUsd ?? 0) * gtqRate.rate
    : null

  const handleSubmit = async () => {
    if (!cardNumber || !cardName || !expiry || !cvv) {
      setError('Por favor completá todos los campos')
      return
    }
    setLoading(true)
    setError('')
    try {
      await subscriptionAPI.subscribe(
        parseInt(plan!.id),
        'GTQ',
        'card'
      )
      navigate('/home', { state: { subscribed: true } })
    } catch (err) {
      setError('No se pudo procesar el pago, intentá de nuevo')
    } finally {
      setLoading(false)
    }
  }

  if (!plan) return null

  return (
    <MainLayout>
      <div className="px-8 py-16 max-w-4xl mx-auto">

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-1 h-8 bg-spotlight" />
          <h1 className="font-display text-3xl font-bold text-parchment">
            Finalizar suscripción
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Formulario de pago */}
          <div className="bg-[#1e1810] border border-[#3a2e1a] rounded p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard size={18} className="text-spotlight" />
              <h2 className="font-display text-lg text-parchment">
                Información de pago
              </h2>
            </div>

            {error && (
              <div className="bg-curtain/20 border border-curtain/50 text-red-300 px-4 py-2 rounded text-sm font-mono">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-silver/60 text-xs font-mono tracking-widest uppercase">
                Nombre en la tarjeta
              </label>
              <Input
                placeholder="NOMBRE APELLIDO"
                value={cardName}
                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                className="bg-[#0f0b04] border-[#3a2e1a] text-parchment focus:border-spotlight font-mono h-11 tracking-wider"
              />
            </div>

            <div className="space-y-1">
              <label className="text-silver/60 text-xs font-mono tracking-widest uppercase">
                Número de tarjeta
              </label>
              <Input
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                maxLength={19}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 16)
                  setCardNumber(val.replace(/(.{4})/g, '$1 ').trim())
                }}
                className="bg-[#0f0b04] border-[#3a2e1a] text-parchment focus:border-spotlight font-mono h-11 tracking-widest"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-silver/60 text-xs font-mono tracking-widest uppercase">
                  Vencimiento
                </label>
                <Input
                  placeholder="MM/AA"
                  value={expiry}
                  maxLength={5}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setExpiry(val.length > 2 ? `${val.slice(0, 2)}/${val.slice(2)}` : val)
                  }}
                  className="bg-[#0f0b04] border-[#3a2e1a] text-parchment focus:border-spotlight font-mono h-11 tracking-widest"
                />
              </div>
              <div className="space-y-1">
                <label className="text-silver/60 text-xs font-mono tracking-widest uppercase">
                  CVV
                </label>
                <Input
                  placeholder="000"
                  value={cvv}
                  maxLength={3}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  className="bg-[#0f0b04] border-[#3a2e1a] text-parchment focus:border-spotlight font-mono h-11 tracking-widest"
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-11 bg-spotlight hover:bg-spotlight/80 text-film font-mono tracking-widest uppercase text-sm mt-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Lock size={16} className="mr-2" />
              )}
              {loading ? 'Procesando...' : 'Confirmar pago'}
            </Button>

            <p className="text-silver/40 font-mono text-xs text-center flex items-center justify-center gap-1">
              <Lock size={10} />
              Pago seguro — tus datos están protegidos
            </p>
          </div>

          {/* Resumen del plan */}
          <div className="space-y-4">
            <div className="bg-[#1e1810] border border-spotlight rounded p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-spotlight" />
                <h2 className="font-display text-lg text-parchment">
                  Resumen
                </h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-silver font-mono text-sm">Plan</span>
                  <span className="text-parchment font-mono text-sm font-bold">
                    {plan.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver font-mono text-sm">Calidad</span>
                  <span className="text-parchment font-mono text-sm">
                    {plan.videoQuality}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver font-mono text-sm">Pantallas</span>
                  <span className="text-parchment font-mono text-sm">
                    {plan.maxStreams}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver font-mono text-sm">Perfiles</span>
                  <span className="text-parchment font-mono text-sm">
                    {plan.maxProfiles}
                  </span>
                </div>

                <div className="h-px bg-[#3a2e1a] my-2" />

                <div className="flex justify-between">
                  <span className="text-silver font-mono text-sm">Precio USD</span>
                  <span className="text-spotlight font-display text-lg font-bold">
                    ${plan.priceUsd}
                  </span>
                </div>

                {priceGTQ && (
                  <div className="flex justify-between">
                    <span className="text-silver font-mono text-sm">Precio GTQ</span>
                    <span className="text-spotlight/70 font-mono text-sm">
                      Q{priceGTQ.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-silver font-mono text-sm">Facturación</span>
                  <span className="text-parchment font-mono text-sm">Mensual</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1e1810] border border-[#3a2e1a] rounded p-4">
              <p className="text-silver/50 font-mono text-xs leading-relaxed">
                Al confirmar aceptás los términos de servicio. Tu suscripción se renovará automáticamente cada mes hasta que la canceles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}