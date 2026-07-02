import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { subscriptionAPI } from '@/services/api/subscriptionService'
import { LogOut, Play, Loader2, Download, Trash2 } from 'lucide-react'
import { downloadAPI, type DownloadItem } from '@/api/download'
import { getAllProgress } from '@/lib/progress'
import type { SavedProgress } from '@/lib/progress'
import { gateway } from '@/api/client'

export default function AccountPage() {
  const { user, currentProfile, logout,setCurrentProfile } = useAuth()
  const navigate = useNavigate()
  const [history, setHistory] = useState<SavedProgress[]>([])
  useEffect(() => {
    setHistory(getAllProgress())
  }, [])
    // ─── Estado de descargas ─────────────────────────────
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [loadingDownloads, setLoadingDownloads] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
 

  // ─── Estado de suscripción ───────────────────────────
  const [subscription, setSubscription] = useState<any>(null)
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [loadingSub, setLoadingSub] = useState(true)
  const [cancelling, setCancelling] = useState(false)

const [profileName, setProfileName] = useState(
  currentProfile?.name || user?.name || user?.email?.split('@')[0] || 'Usuario'
)
const [savingProfile, setSavingProfile] = useState(false)

const handleSaveProfile = async () => {
  if (!currentProfile?.id) return
  setSavingProfile(true)
  try {
    await gateway.patch(`/auth/profiles/${currentProfile.id}`, {
      display_name: profileName
    })
    setCurrentProfile({ ...currentProfile, name: profileName })
  } catch (error) {
    console.error('Error al guardar perfil:', error)
  } finally {
    setSavingProfile(false)
  }
}
 useEffect(() => {
  const fetchSubscriptionData = async () => {
    try {
      const [subData, paymentsData] = await Promise.all([
        subscriptionAPI.getMySubscription(),
        subscriptionAPI.getPaymentHistory(),
      ])
      setSubscription(subData)
      setPaymentHistory(paymentsData)

      const premium = subData?.status === 'ACTIVE' && subData?.planName === 'Premium'
      console.log('isPremium:', premium, 'planName:', subData?.planName)
      setIsPremium(premium)

      // ← esto faltaba
      if (premium) {
        try {
          const dlData = await downloadAPI.listDownloads(3)
          console.log('downloads:', dlData)
          setDownloads(dlData.downloads || [])
        } catch (err) {
          console.log('error downloads:', err)
          setDownloads([])
        }
      }

    } catch (error) {
      console.error('Subscription service no disponible:', error)
      setSubscription({
        plan_name: 'Estándar',
        status: 'ACTIVE',
        current_period_end: '2026-07-01',
        days_remaining: 22,
      })
    } finally {
      setLoadingSub(false)
      setLoadingDownloads(false)  // ← esto también faltaba
    }
  }
  fetchSubscriptionData()
}, [])

  const handleLogout = () => {
    logout()
    localStorage.removeItem('auth_token')
    navigate('/login')
  }

  const handleCancelSubscription = async () => {
    if (!confirm('¿Estás segura que querés cancelar tu suscripción?')) return
    setCancelling(true)
    try {
      await subscriptionAPI.cancelSubscription()
      setSubscription((prev: any) => ({ ...prev, status: 'CANCELLED' }))
    } catch (error) {
      console.error('Error al cancelar:', error)
    } finally {
      setCancelling(false)
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
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
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
           
          </div>

          <Button 
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="bg-spotlight hover:bg-spotlight/80 text-film font-mono tracking-widest uppercase text-xs h-10 px-6"
          >
            {savingProfile ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
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

          {loadingSub ? (
            <div className="flex items-center gap-2 text-silver/50 font-mono text-sm">
              <Loader2 size={14} className="animate-spin" />
              Cargando suscripción...
            </div>
          ) : subscription ? (
            <>
              <div className="flex items-center justify-between p-4 border border-[#3a2e1a] bg-[#0f0b04]">
                <div>
                  <p className="text-parchment font-mono font-medium">
                  Plan {subscription.planName ?? subscription.plan_name}
                </p>
                  <p className="text-silver/50 font-mono text-xs mt-1">
                  {subscription.daysRemaining ?? subscription.days_remaining} días restantes · vence {new Date(subscription.renewalDate ?? subscription.current_period_end).toLocaleDateString('es-GT')}
                </p>
                </div>
                <span className={`text-xs font-mono border px-3 py-1 tracking-widest uppercase ${
                  subscription.status === 'ACTIVE'
                    ? 'bg-green-900/40 border-green-700/50 text-green-400'
                    : 'bg-red-900/40 border-red-700/50 text-red-400'
                }`}>
                  {subscription.status === 'ACTIVE' ? 'Activo' : 'Cancelado'}
                </span>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => navigate('/plans')}
                  variant="outline"
                  className="border-[#3a2e1a] hover:border-spotlight text-silver hover:text-spotlight font-mono text-xs tracking-widest uppercase bg-transparent h-10"
                >
                  Cambiar plan
                </Button>
                {subscription.status === 'ACTIVE' && (
                  <Button
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    variant="outline"
                    className="border-[#3a2e1a] hover:border-curtain text-silver hover:text-red-400 font-mono text-xs tracking-widest uppercase bg-transparent h-10"
                  >
                    {cancelling ? (
                      <Loader2 size={14} className="animate-spin mr-2" />
                    ) : null}
                    Cancelar suscripción
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 border border-dashed border-[#3a2e1a] text-center">
              <p className="text-silver/50 font-mono text-sm mb-3">No tenés una suscripción activa</p>
              <Button
                onClick={() => navigate('/plans')}
                className="bg-spotlight hover:bg-spotlight/80 text-film font-mono text-xs tracking-widest uppercase h-10"
              >
                Ver planes
              </Button>
            </div>
          )}
        </div>
        )}

        {/* Historial de pagos */}
        {paymentHistory.length > 0 && (
          <div className="bg-[#1e1810] border border-[#3a2e1a] rounded p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-5 bg-spotlight" />
              <h2 className="font-display text-lg text-parchment">Historial de pagos</h2>
            </div>
            {paymentHistory.map((payment: any) => (
              <div key={payment.payment_id} className="flex items-center justify-between p-3 border border-[#3a2e1a] bg-[#0f0b04]">
                <div>
                  <p className="text-parchment font-mono text-sm">{payment.plan_name}</p>
                  <p className="text-silver/50 font-mono text-xs mt-0.5">
                    {new Date(payment.paid_at).toLocaleDateString('es-GT')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-spotlight font-mono text-sm">${payment.amount_usd}</p>
                  {payment.display_currency && (
                    <p className="text-silver/50 font-mono text-xs">
                      {payment.display_currency} {payment.display_amount}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mis Descargas — solo Plan Premium */}
        {isPremium && (
          <div className="bg-[#1e1810] border border-[#3a2e1a] rounded p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-5 bg-spotlight" />
              <h2 className="font-display text-lg text-parchment">Mis Descargas</h2>
              <span className="text-xs font-mono border border-spotlight/40 text-spotlight px-2 py-0.5 tracking-widest uppercase">
                Premium
              </span>
            </div>

            {loadingDownloads ? (
              <div className="flex items-center gap-2 text-silver/50 font-mono text-sm">
                <Loader2 size={14} className="animate-spin" />
                Cargando descargas...
              </div>
            ) : downloads.length === 0 ? (
              <div className="p-4 border border-dashed border-[#3a2e1a] text-center">
                <p className="text-silver/40 font-mono text-sm">
                  Aún no tenés contenido descargado.
                </p>
                <p className="text-silver/30 font-mono text-xs mt-1">
                  Descargá películas o series desde su página de detalle.
                </p>
              </div>
            ) : (
              downloads.map((dl: any) => {
        const expiresMs = typeof dl.expires_at === 'object'
          ? dl.expires_at.low * 1000
          : (dl.expires_at || 0) * 1000
        const daysLeft = Math.ceil((expiresMs - Date.now()) / (1000 * 60 * 60 * 24))
        const sizeMB = dl.size_bytes > 0 ? `${(dl.size_bytes / (1024 * 1024)).toFixed(1)} MB` : null

        // status viene como número del proto: 1=QUEUED, 2=PENDING, 3=COMPLETED, 4=FAILED, 5=DELETED
        const statusLabel: Record<number, string> = {
          1: 'En cola', 2: 'Pendiente', 3: 'Listo', 4: 'Fallido', 5: 'Eliminado'
        }
        const isCompleted = dl.status === 3

  return (
    <div
      key={dl.download_id}
      className="flex items-center gap-4 p-3 border border-[#3a2e1a] bg-[#0f0b04] group"
    >
      <div className="w-10 h-10 flex items-center justify-center border border-[#3a2e1a] shrink-0">
        <Download size={14} className="text-spotlight/60" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-parchment font-mono text-sm font-medium truncate">
          {dl.title || `Contenido ${(dl.content_id || '').slice(0, 8)}...`}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          {sizeMB && (
            <span className="text-silver/40 font-mono text-xs">{sizeMB}</span>
          )}
          <span className={`font-mono text-xs ${daysLeft <= 3 ? 'text-red-400' : 'text-silver/40'}`}>
            {daysLeft <= 0 ? 'Expirado' : `Expira en ${daysLeft} días`}
          </span>
          <span className={`font-mono text-xs border px-2 py-0.5 ${
            isCompleted
              ? 'border-green-700/50 text-green-400'
              : 'border-[#3a2e1a] text-silver/40'
          }`}>
            {statusLabel[dl.status] || 'Desconocido'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isCompleted && (
          <button
            onClick={() => navigate(`/movie/${dl.content_id}?autoplay=1`)}
            className="flex items-center gap-1 border border-[#3a2e1a] hover:border-spotlight px-3 py-2 text-silver hover:text-spotlight transition-colors"
          >
            <Play size={12} />
            <span className="font-mono text-xs">Ver</span>
          </button>
        )}
        <button
          onClick={async () => {
            await downloadAPI.deleteDownload(dl.download_id)
            setDownloads((prev: any[]) => prev.filter((d) => d.download_id !== dl.download_id))
          }}
          className="border border-[#3a2e1a] hover:border-red-500/40 p-2 text-silver/40 hover:text-red-400 transition-colors"
          title="Eliminar descarga"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
})
            )}
          </div>
        )}

        {/* Continuar viendo */}
        <div className="bg-[#1e1810] border border-[#3a2e1a] rounded p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-5 bg-spotlight" />
            <h2 className="font-display text-lg text-parchment">Historial de pagos</h2>
          </div>

          {history.length === 0 && (
            <p className="text-silver/40 font-mono text-sm py-4">
              Aún no hay contenido en progreso.
            </p>
          )}

          {history.map((item) => {
            const totalMin = item.totalDuration || 90
            const pct = Math.min((item.minuteReached / totalMin) * 100, 100)

            return (
              <div
                key={item.contentId}
                onClick={() => navigate(`/movie/${item.contentId}`)}
                className="flex items-center gap-4 p-3 border border-[#3a2e1a] hover:border-spotlight bg-[#0f0b04] cursor-pointer transition-all group"
              >
                <img
                  src={item.posterUrl || 'https://i.pinimg.com/originals/8d/e8/d7/8de8d761d3b5ab6321856c3ec71858b1.gif'}
                  alt={item.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://i.pinimg.com/originals/8d/e8/d7/8de8d761d3b5ab6321856c3ec71858b1.gif'
                  }}
                  className="w-16 h-10 object-cover filter sepia-[0.3] group-hover:sepia-0 transition-all rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-parchment font-mono text-sm font-medium truncate">
                    {item.title}
                  </p>
                  {item.seasonNum ? (
                    <p className="text-silver/50 font-mono text-xs mt-0.5">
                      Temp. {item.seasonNum} · Ep. {item.episodeNum} · {item.minuteReached} min
                    </p>
                  ) : (
                    <p className="text-silver/50 font-mono text-xs mt-0.5">
                      {item.minuteReached} min vistos
                    </p>
                  )}
                </div>

                <div className="w-24 h-1 bg-[#3a2e1a] rounded-full overflow-hidden shrink-0">
                  <div className="h-full bg-spotlight" style={{ width: `${pct}%` }} />
                </div>

                <Play size={14} className="text-silver/40 group-hover:text-spotlight transition-colors shrink-0" />
              </div>
            )
          })}
        </div>
        )}

      </div>
    </MainLayout>
  )
}
