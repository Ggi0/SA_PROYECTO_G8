import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { LogOut, Play } from 'lucide-react'
import { getAllProgress } from '@/lib/progress'
import type { SavedProgress } from '@/lib/progress'

export default function AccountPage() {
  const { user, currentProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [history, setHistory] = useState<SavedProgress[]>([])

  useEffect(() => {
    setHistory(getAllProgress())
  }, [])

  const handleLogout = () => {
    logout()
    localStorage.removeItem('auth_token')
    navigate('/login')
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
                defaultValue={user?.name ?? currentProfile?.name ?? 'Usuario'}
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
        </div>

        {/* Suscripción */}
        <div className="bg-[#1e1810] border border-[#3a2e1a] rounded p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-5 bg-spotlight" />
            <h2 className="font-display text-lg text-parchment">Suscripción actual</h2>
          </div>

          <div className="flex items-center justify-between p-4 border border-[#3a2e1a] bg-[#0f0b04]">
            <div>
              <p className="text-parchment font-mono font-medium">
                Plan {user?.subscriptionPlan ?? 'Estándar'}
              </p>
              <p className="text-silver/50 font-mono text-xs mt-1">
                Próxima renovación: 1 de julio, 2026
              </p>
            </div>
            <span className="text-xs font-mono bg-green-900/40 border border-green-700/50 text-green-400 px-3 py-1 tracking-widest uppercase">
              Activo
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
            <Button
              variant="outline"
              className="border-[#3a2e1a] hover:border-curtain text-silver hover:text-red-400 font-mono text-xs tracking-widest uppercase bg-transparent h-10"
            >
              Cancelar suscripción
            </Button>
          </div>
        </div>

        {/* Continuar viendo */}
        <div className="bg-[#1e1810] border border-[#3a2e1a] rounded p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-5 bg-spotlight" />
            <h2 className="font-display text-lg text-parchment">Continuar viendo</h2>
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

      </div>
    </MainLayout>
  )
}
