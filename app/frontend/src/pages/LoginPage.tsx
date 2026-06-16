import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)


  const handleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await authAPI.login(
        email,
        password,
      )

      console.log(data.accessToken)
        console.log('===== LOGIN RESPONSE =====')
  console.log(data)

  console.log('===== USER =====')
  console.log(data.user)

  console.log('===== ROLE =====')
  console.log(data.user?.role)

  console.log('===== PROFILES =====')
  console.log(data.profiles)

      setUser(
        {
          id: data.user.userId,
          email: data.user.email,
          name: 'Mi perfil',
          subscriptionPlan: null,
          role: data.user.role,
        },
        data.accessToken,
      )

       if (data.user.role === 'admin') {
    console.log('REDIRECT -> /admin')
    navigate('/admin')
  } else {
    console.log('REDIRECT -> /profiles')
    navigate('/profiles')
  }
    } catch (err) {
      console.error(err)
      setError('Correo o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1408] flex items-center justify-center relative overflow-hidden">

      {/* Fondo decorativo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#2C2416_0%,_#0f0b04_70%)]" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-spotlight to-transparent opacity-60" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-spotlight to-transparent opacity-60" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-[#1e1810] border border-[#3a2e1a] rounded-lg p-8 shadow-2xl">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-block border-2 border-spotlight px-6 py-2 mb-3">
              <h1 className="font-display text-3xl font-bold text-spotlight tracking-widest">
                QUETXAL TV
              </h1>
            </div>
            <div className="flex items-center gap-2 justify-center mt-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-spotlight/40" />
              <span className="text-silver text-xs tracking-widest uppercase font-mono">
                Iniciar Sesión
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-spotlight/40" />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-curtain/20 border border-curtain/50 text-red-300 px-4 py-2 rounded text-sm mb-4">
              {error}
            </div>
          )}

          {/* Inputs */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-silver text-xs tracking-widest uppercase font-mono">
                Correo electrónico
              </label>
              <Input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0f0b04] border-[#3a2e1a] text-parchment placeholder:text-silver/40 focus:border-spotlight focus:ring-spotlight/30 h-11"
              />
            </div>
            <div className="space-y-1">
              <label className="text-silver text-xs tracking-widest uppercase font-mono">
                Contraseña
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#0f0b04] border-[#3a2e1a] text-parchment placeholder:text-silver/40 focus:border-spotlight focus:ring-spotlight/30 h-11"
              />
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-11 bg-spotlight hover:bg-spotlight/80 text-film font-semibold tracking-widest uppercase text-sm mt-2"
            >
              {loading ? 'Cargando...' : 'Entrar'}
            </Button>
          </div>

          {/* Link registro */}
          <div className="flex items-center gap-2 mt-6">
            <div className="h-px flex-1 bg-[#3a2e1a]" />
            <p className="text-silver/60 text-xs text-center">
              ¿No tenés cuenta?{' '}
              <Link to="/register" className="text-spotlight hover:text-spotlight/80 transition-colors">
                Registrate
              </Link>
            </p>
            <div className="h-px flex-1 bg-[#3a2e1a]" />
          </div>

        </div>
      </div>
    </div>
  )
}