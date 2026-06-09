import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage, subscriptionAPI, SubscriptionPlan, SubscriptionPlanWithRate } from '@/api/subscription'
import { ArrowLeft, Check, CreditCard, Landmark, ReceiptText, RefreshCw, WalletCards } from 'lucide-react'

const currency = 'GTQ'

const paymentMethods = [
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'paypal', label: 'PayPal', icon: WalletCards },
  { value: 'bank_transfer', label: 'Transferencia', icon: Landmark },
]

function formatMoney(value: number, code: string) {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: code,
  }).format(value)
}

function planFeatures(plan: SubscriptionPlan) {
  if (plan.description) {
    try {
      const parsed = JSON.parse(plan.description)
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) return parsed
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

export default function CheckoutPage() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [ratedPlan, setRatedPlan] = useState<SubscriptionPlanWithRate | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadCheckout() {
      if (!planId) {
        setError('No se encontró el plan seleccionado.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      try {
        const [planData, rates] = await Promise.all([
          subscriptionAPI.getPlanById(planId),
          subscriptionAPI.getPlansWithRates(currency),
        ])
        if (cancelled) return
        setPlan(planData)
        setRatedPlan(rates.find((item) => item.plan.id === planId) || null)
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'No se pudo cargar el detalle del pago.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCheckout()

    return () => {
      cancelled = true
    }
  }, [planId])

  const handleConfirmPayment = async () => {
    if (!plan) return

    setProcessing(true)
    setError('')
    try {
      await subscriptionAPI.subscribe(plan.id, ratedPlan?.currency || currency, paymentMethod)
      navigate('/account')
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo confirmar el pago. Intentá de nuevo.'))
    } finally {
      setProcessing(false)
    }
  }

  const localCurrency = ratedPlan?.currency || 'USD'
  const localPrice = ratedPlan?.localPrice || plan?.priceUsd || 0

  return (
    <MainLayout>
      <div className="px-8 py-16 max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/plans')}
          className="flex items-center gap-2 text-silver/70 hover:text-spotlight font-mono text-xs tracking-widest uppercase mb-8"
        >
          <ArrowLeft size={14} />
          Volver a planes
        </button>

        <div className="text-center mb-12">
          <div className="flex items-center gap-3 justify-center mb-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-spotlight/40" />
            <span className="text-spotlight text-xs font-mono tracking-widest uppercase">
              Pago de suscripción
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-spotlight/40" />
          </div>
          <h1 className="font-display text-4xl font-bold text-parchment mb-3">
            Revisá antes de confirmar
          </h1>
          <p className="text-silver font-mono text-sm">
            El pago se registra hasta presionar Confirmar pago.
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
            Cargando detalle de pago...
          </div>
        )}

        {!loading && plan && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-6">
            <div className="bg-[#1e1810] border border-[#3a2e1a] rounded p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-spotlight" />
                <div>
                  <h2 className="font-display text-2xl font-bold text-parchment">Plan {plan.name}</h2>
                  <p className="text-silver/50 font-mono text-xs mt-1">Resumen técnico de la suscripción</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border border-[#3a2e1a] bg-[#0f0b04] p-4">
                  <p className="text-silver/40 font-mono text-[11px] tracking-widest uppercase">Precio USD</p>
                  <p className="text-parchment font-display text-2xl mt-1">{formatMoney(plan.priceUsd, 'USD')}</p>
                </div>
                <div className="border border-[#3a2e1a] bg-[#0f0b04] p-4">
                  <p className="text-silver/40 font-mono text-[11px] tracking-widest uppercase">Precio visible</p>
                  <p className="text-parchment font-display text-2xl mt-1">{formatMoney(localPrice, localCurrency)}</p>
                </div>
                <div className="border border-[#3a2e1a] bg-[#0f0b04] p-4">
                  <p className="text-silver/40 font-mono text-[11px] tracking-widest uppercase">Tasa FX</p>
                  <p className="text-parchment font-display text-2xl mt-1">{(ratedPlan?.exchangeRate || 1).toFixed(2)}</p>
                </div>
              </div>

              <ul className="space-y-3">
                {planFeatures(plan).map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-silver font-mono text-sm">
                    <Check size={14} className="text-spotlight shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#1e1810] border border-[#3a2e1a] rounded p-6 space-y-6">
              <div className="flex items-center gap-3">
                <ReceiptText size={18} className="text-spotlight" />
                <h2 className="font-display text-xl font-bold text-parchment">Detalle de pago</h2>
              </div>

              <div className="space-y-3">
                <p className="text-silver/60 text-xs font-mono tracking-widest uppercase">Método de pago</p>
                <div className="grid grid-cols-1 gap-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon
                    const active = paymentMethod === method.value
                    return (
                      <button
                        key={method.value}
                        onClick={() => setPaymentMethod(method.value)}
                        className={`flex items-center gap-3 border p-3 font-mono text-sm transition-colors ${
                          active
                            ? 'border-spotlight bg-spotlight/10 text-spotlight'
                            : 'border-[#3a2e1a] bg-[#0f0b04] text-silver hover:border-spotlight/60'
                        }`}
                      >
                        <Icon size={16} />
                        {method.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Input
                  disabled
                  value="Pago simulado de suscripción"
                  className="bg-[#0f0b04] border-[#3a2e1a] text-silver font-mono h-11"
                />
                <Input
                  disabled
                  value="No se almacena tarjeta, CVV ni datos bancarios"
                  className="bg-[#0f0b04] border-[#3a2e1a] text-silver font-mono h-11"
                />
              </div>

              <div className="border border-[#3a2e1a] bg-[#0f0b04] p-4 space-y-2 font-mono text-sm">
                <div className="flex justify-between text-silver/60">
                  <span>Plan</span>
                  <span>{plan.name}</span>
                </div>
                <div className="flex justify-between text-silver/60">
                  <span>Período</span>
                  <span>1 mes</span>
                </div>
                <div className="flex justify-between text-parchment pt-3 border-t border-[#3a2e1a]">
                  <span>Total</span>
                  <span>{formatMoney(localPrice, localCurrency)}</span>
                </div>
              </div>

              <Button
                onClick={handleConfirmPayment}
                disabled={processing}
                className="w-full bg-spotlight hover:bg-spotlight/80 text-film font-mono tracking-widest uppercase text-sm h-11"
              >
                {processing ? 'Confirmando...' : 'Confirmar pago'}
              </Button>

              <p className="text-silver/40 font-mono text-xs leading-relaxed">
                Al confirmar se creará la suscripción, se registrará un pago COMPLETED en PostgreSQL y se generará una referencia TXN.
              </p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
