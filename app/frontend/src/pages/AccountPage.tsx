import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { getApiErrorMessage, Payment, subscriptionAPI, UserSubscription } from '@/api/subscription'
import { CreditCard, LogOut, RefreshCw, ReceiptText } from 'lucide-react'

function formatDate(value: string) {
  if (!value) return 'Sin fecha disponible'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium' }).format(date)
}

function formatMoney(value: number, currency = 'USD') {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency,
  }).format(value)
}

export default function AccountPage() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadSubscriptionData() {
      if (!token) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      try {
        const [subscriptionData, paymentsData] = await Promise.all([
          subscriptionAPI.getCurrentSubscription(),
          subscriptionAPI.getPayments(10, 0),
        ])
        if (cancelled) return
        setSubscription(subscriptionData)
        setPayments(paymentsData.payments)
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'No se pudo cargar la información de suscripción.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSubscriptionData()

    return () => {
      cancelled = true
    }
  }, [token])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleCancelSubscription = async () => {
    if (!subscription?.hasActiveSubscription) return

    if (!confirmingCancel) {
      setConfirmingCancel(true)
      setError('')
      setMessage('Revisá la advertencia y confirmá si realmente querés cancelar la suscripción.')
      return
    }

    setActionLoading(true)
    setError('')
    setMessage('')
    try {
      await subscriptionAPI.cancel('Cancelado desde el panel de cuenta')
      setSubscription({ ...subscription, hasActiveSubscription: false, status: 'CANCELLED' })
      setMessage('Suscripción cancelada. El acceso queda sujeto al período pagado registrado.')
      setConfirmingCancel(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo cancelar la suscripción. Intentá de nuevo.'))
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="px-8 py-16 max-w-4xl mx-auto space-y-10">

        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-spotlight" />
            <h1 className="font-display text-3xl font-bold text-parchment">Mi Cuenta</h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-[#3a2e1a] hover:border-curtain text-silver hover:text-red-400 font-mono text-xs tracking-widest uppercase bg-transparent"
          >
            <LogOut size={14} className="mr-2" />
            Cerrar sesión
          </Button>
        </div>

        {/* Información personal */}
        <div className="bg-[#1e1810] border border-[#3a2e1a] rounded p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-5 bg-spotlight" />
            <h2 className="font-display text-lg text-parchment">Información personal</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-silver/60 text-xs font-mono tracking-widest uppercase">
                Nombre
              </label>
              <Input
                defaultValue={user?.name ?? 'Usuario'}
                className="bg-[#0f0b04] border-[#3a2e1a] text-parchment focus:border-spotlight font-mono h-11"
              />
            </div>
            <div className="space-y-1">
              <label className="text-silver/60 text-xs font-mono tracking-widest uppercase">
                Correo electrónico
              </label>
              <Input
                defaultValue={user?.email ?? 'usuario@email.com'}
                className="bg-[#0f0b04] border-[#3a2e1a] text-parchment focus:border-spotlight font-mono h-11"
              />
            </div>
            <div className="space-y-1">
              <label className="text-silver/60 text-xs font-mono tracking-widest uppercase">
                Contraseña
              </label>
              <Input
                type="password"
                defaultValue="••••••••"
                className="bg-[#0f0b04] border-[#3a2e1a] text-parchment focus:border-spotlight font-mono h-11"
              />
            </div>
          </div>

          <Button className="bg-spotlight hover:bg-spotlight/80 text-film font-mono tracking-widest uppercase text-xs h-10 px-6">
            Guardar cambios
          </Button>
          <p className="text-silver/40 font-mono text-xs">
            Las credenciales pertenecen al Auth Service. Este panel solo consume el módulo de suscripciones.
          </p>
        </div>

        {error && (
          <div className="bg-curtain/20 border border-curtain/50 text-red-300 px-4 py-3 rounded font-mono text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-900/20 border border-green-700/40 text-green-300 px-4 py-3 rounded font-mono text-sm">
            {message}
          </div>
        )}

        {!token && (
          <div className="bg-[#1e1810] border border-[#3a2e1a] rounded p-6 space-y-4">
            <p className="text-silver font-mono text-sm">
              Iniciá sesión para consultar tu suscripción, pagos y operaciones protegidas por JWT.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="bg-spotlight hover:bg-spotlight/80 text-film font-mono tracking-widest uppercase text-xs h-10 px-6"
            >
              Ir a login
            </Button>
          </div>
        )}

        {loading && token && (
          <div className="flex items-center justify-center gap-3 text-silver font-mono text-sm py-10">
            <RefreshCw size={16} className="animate-spin text-spotlight" />
            Cargando suscripción desde Subscription Service...
          </div>
        )}

        {/* Suscripción */}
        {!loading && token && (
        <div className="bg-[#1e1810] border border-[#3a2e1a] rounded p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-5 bg-spotlight" />
            <h2 className="font-display text-lg text-parchment">Suscripción actual</h2>
          </div>

          <div className="flex items-center justify-between p-4 border border-[#3a2e1a] bg-[#0f0b04]">
            <div>
              <p className="text-parchment font-mono font-medium">
                {subscription?.hasActiveSubscription ? `Plan ${subscription.planName}` : 'Sin suscripción activa'}
              </p>
              <p className="text-silver/50 font-mono text-xs mt-1">
                {subscription?.hasActiveSubscription
                  ? `Renovación: ${formatDate(subscription.renewalDate)} · ${subscription.daysRemaining} días restantes`
                  : 'Elegí un plan para activar el acceso a la plataforma'}
              </p>
            </div>
            <span className={`text-xs font-mono px-3 py-1 tracking-widest uppercase ${subscription?.hasActiveSubscription ? 'bg-green-900/40 border border-green-700/50 text-green-400' : 'bg-[#3a2e1a] border border-[#4a3b22] text-silver/60'}`}>
              {subscription?.hasActiveSubscription ? subscription.status : 'Inactivo'}
            </span>
          </div>

          {subscription?.hasActiveSubscription && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="border border-[#3a2e1a] bg-[#0f0b04] p-3">
                <p className="text-silver/40 font-mono text-[11px] tracking-widest uppercase">Precio USD</p>
                <p className="text-parchment font-display text-xl mt-1">{formatMoney(subscription.planPriceUsd, 'USD')}</p>
              </div>
              <div className="border border-[#3a2e1a] bg-[#0f0b04] p-3">
                <p className="text-silver/40 font-mono text-[11px] tracking-widest uppercase">Pantallas</p>
                <p className="text-parchment font-display text-xl mt-1">{subscription.maxStreams}</p>
              </div>
              <div className="border border-[#3a2e1a] bg-[#0f0b04] p-3">
                <p className="text-silver/40 font-mono text-[11px] tracking-widest uppercase">Calidad</p>
                <p className="text-parchment font-display text-xl mt-1">{subscription.videoQuality}</p>
              </div>
            </div>
          )}

          {confirmingCancel && subscription?.hasActiveSubscription && (
            <div className="border border-curtain/50 bg-curtain/10 p-4 space-y-3">
              <p className="text-red-300 font-mono text-sm font-medium">
                Confirmación requerida
              </p>
              <p className="text-silver/60 font-mono text-xs leading-relaxed">
                Al confirmar, la suscripción se desactivará junto con la renovación automática y no se generará un nuevo pago. El historial de pagos se conservará para auditoría.
              </p>
              <Button
                onClick={() => setConfirmingCancel(false)}
                variant="outline"
                className="border-[#3a2e1a] hover:border-spotlight text-silver hover:text-spotlight font-mono text-xs tracking-widest uppercase bg-transparent h-9"
              >
                Mantener suscripción
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/plans')}
              variant="outline"
              className="border-[#3a2e1a] hover:border-spotlight text-silver hover:text-spotlight font-mono text-xs tracking-widest uppercase bg-transparent h-10"
            >
              Cambiar plan
            </Button>
            <Button
              onClick={handleCancelSubscription}
              disabled={!subscription?.hasActiveSubscription || actionLoading}
              variant="outline"
              className={`${confirmingCancel ? 'border-curtain text-red-300 hover:border-red-400' : 'border-[#3a2e1a] hover:border-curtain text-silver hover:text-red-400'} font-mono text-xs tracking-widest uppercase bg-transparent h-10`}
            >
              {actionLoading ? 'Cancelando...' : confirmingCancel ? 'Confirmar cancelación' : 'Cancelar suscripción'}
            </Button>
          </div>
        </div>
        )}

        {/* Historial de pagos */}
        {!loading && token && (
        <div className="bg-[#1e1810] border border-[#3a2e1a] rounded p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-5 bg-spotlight" />
            <h2 className="font-display text-lg text-parchment">Historial de pagos</h2>
          </div>

          {payments.length === 0 ? (
            <div className="border border-[#3a2e1a] bg-[#0f0b04] p-4 text-silver/50 font-mono text-sm">
              No hay pagos registrados todavía.
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center gap-4 p-3 border border-[#3a2e1a] bg-[#0f0b04]"
              >
                <div className="w-10 h-10 border border-[#3a2e1a] flex items-center justify-center text-spotlight">
                  <ReceiptText size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-parchment font-mono text-sm font-medium">
                    {payment.planName} · {formatMoney(payment.amountUsd, 'USD')}
                  </p>
                  <p className="text-silver/50 font-mono text-xs mt-0.5">
                    {formatDate(payment.createdAt)} · {payment.paymentMethod || 'card'} · {payment.transactionRef}
                  </p>
                  <p className="text-silver/40 font-mono text-xs mt-0.5">
                    Mostrado: {formatMoney(payment.amountLocal, payment.currency || 'USD')} · tasa {payment.exchangeRate.toFixed(2)}
                  </p>
                </div>
                <span className="text-xs font-mono bg-green-900/30 border border-green-700/40 text-green-300 px-3 py-1 tracking-widest uppercase">
                  {payment.status}
                </span>
                <CreditCard size={14} className="text-silver/40" />
              </div>
            ))
          )}
        </div>
        )}

      </div>
    </MainLayout>
  )
}
