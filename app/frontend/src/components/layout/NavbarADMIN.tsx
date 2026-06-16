import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function Navbar() {
  const { currentProfile, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1408]/95 backdrop-blur-sm border-b border-[#3a2e1a]">
      {/* Línea dorada superior */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-spotlight to-transparent" />

      <div className="flex items-center justify-between px-8 py-3">
        {/* Logo */}
        <Link to="/admin" className="flex items-center gap-3">
          <div className="border border-spotlight px-3 py-1">
            <span className="font-display text-xl font-bold text-spotlight tracking-widest">
              QUETXAL TV
            </span>
          </div>
        </Link>

        <div className="border border-spotlight px-3 py-1">
            <span className="text-3xl font-bold text-spotlight mb-4">
              Panel Administrativo
            </span>
          </div>

        {/* Links de navegación */}

        {/* Acciones */}
        <div className="flex items-center gap-4">
          {/* Perfil dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 border border-[#3a2e1a] hover:border-spotlight rounded px-2 py-1 transition-colors">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-reel text-spotlight text-xs">
                    {currentProfile?.avatar ?? '🎬'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-silver text-xs font-mono hidden md:block">
                  {currentProfile?.name ?? 'Perfil'}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1e1810] border-[#3a2e1a] text-parchment min-w-40">
              <DropdownMenuItem
                onClick={() => navigate('/account')}
                className="hover:bg-[#2C2416] cursor-pointer text-sm font-mono tracking-wide"
              >
                Mi cuenta
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#3a2e1a]" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="hover:bg-[#2C2416] cursor-pointer text-sm font-mono tracking-wide text-curtain"
              >
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}