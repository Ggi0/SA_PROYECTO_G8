import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    setError('')
    try {
      await authAPI.register(email, password, name)
      navigate('/login')
    } catch {
      setError('Error al crear la cuenta, intentá de nuevo')
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
                Crear Cuenta
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
                Nombre completo
              </label>
              <Input
                type="text"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#0f0b04] border-[#3a2e1a] text-parchment placeholder:text-silver/40 focus:border-spotlight focus:ring-spotlight/30 h-11"
              />
            </div>
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
            <div className="space-y-1">
              <label className="text-silver text-xs tracking-widest uppercase font-mono">
                Confirmar contraseña
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="bg-[#0f0b04] border-[#3a2e1a] text-parchment placeholder:text-silver/40 focus:border-spotlight focus:ring-spotlight/30 h-11"
              />
            </div>

            <Button
              onClick={handleRegister}
              disabled={loading}
              className="w-full h-11 bg-spotlight hover:bg-spotlight/80 text-film font-semibold tracking-widest uppercase text-sm mt-2"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
          </div>

          {/* Link login */}
          <div className="flex items-center gap-2 mt-6">
            <div className="h-px flex-1 bg-[#3a2e1a]" />
            <p className="text-silver/60 text-xs text-center">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="text-spotlight hover:text-spotlight/80 transition-colors">
                Iniciá sesión
              </Link>
            </p>
            <div className="h-px flex-1 bg-[#3a2e1a]" />
          </div>

        </div>
      </div>
    </div>
  )
}