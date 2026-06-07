import { useNavigate } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { mockHistory } from '@/services/mock/mockData'
import { LogOut, Play } from 'lucide-react'

export default function AccountPage() {
  const { user, currentProfile, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <MainLayout>
      <div className="px-8 py-16 max-w-4xl mx-auto space-y-8">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <h1 className="text-white text-3xl font-bold">Mi Cuenta</h1>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-zinc-700 text-red-400 hover:bg-zinc-800 hover:text-red-300"
          >
            <LogOut size={16} className="mr-2" />
            Cerrar sesión
          </Button>
        </div>

        {/* Información personal */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Información personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-zinc-400 text-sm">Nombre</label>
              <Input
                defaultValue={user?.name ?? 'Usuario'}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-400 text-sm">Correo electrónico</label>
              <Input
                defaultValue={user?.email ?? 'usuario@email.com'}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-400 text-sm">Contraseña</label>
              <Input
                type="password"
                defaultValue="••••••••"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              Guardar cambios
            </Button>
          </CardContent>
        </Card>

        {/* Suscripción */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Suscripción actual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">
                  Plan {user?.subscriptionPlan ?? 'Estándar'}
                </p>
                <p className="text-zinc-400 text-sm">Se renueva el 1 de julio, 2026</p>
              </div>
              <Badge className="bg-green-700 text-white">Activo</Badge>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate('/plans')}
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-800"
              >
                Cambiar plan
              </Button>
              <Button
                variant="outline"
                className="border-red-800 text-red-400 hover:bg-zinc-800"
              >
                Cancelar suscripción
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Historial de reproducción */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Continuar viendo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 bg-zinc-800 rounded-md hover:bg-zinc-700 transition-colors cursor-pointer"
                onClick={() => navigate(`/movie/${item.movieId}`)}
              >
                <img
                  src={item.movie.coverImage}
                  alt={item.movie.title}
                  className="w-16 h-10 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{item.movie.title}</p>
                  {item.season ? (
                    <p className="text-zinc-400 text-xs">
                      Temporada {item.season} · Ep. {item.episode} · {item.progressMinutes} min
                    </p>
                  ) : (
                    <p className="text-zinc-400 text-xs">{item.progressMinutes} min vistos</p>
                  )}
                </div>
                <Play size={16} className="text-zinc-400" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}