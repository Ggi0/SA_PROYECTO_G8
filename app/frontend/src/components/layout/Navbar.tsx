import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Bell, X } from 'lucide-react'

export default function Navbar() {
  const { currentProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/home?q=${encodeURIComponent(searchQuery.trim())}`)
      setShowSearch(false)
      setSearchQuery('')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1408]/95 backdrop-blur-sm border-b border-[#3a2e1a]">
      {/* Línea dorada superior */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-spotlight to-transparent" />

      {/* Barra de búsqueda expandida */}
      {showSearch && (
        <div className="absolute inset-0 bg-[#1a1408] flex items-center px-8 gap-4 z-10">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-3">
            <Search size={18} className="text-spotlight shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar películas, series..."
              className="flex-1 bg-transparent text-parchment font-mono text-sm outline-none placeholder:text-silver/40"
            />
          </form>
          <button onClick={() => { setShowSearch(false); setSearchQuery('') }} className="text-silver hover:text-spotlight">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between px-8 py-3">
        {/* Logo */}
        <Link to="/home" className="flex items-center gap-3">
          <div className="border border-spotlight px-3 py-1">
            <span className="font-display text-xl font-bold text-spotlight tracking-widest">
              QUETXAL TV
            </span>
          </div>
        </Link>

        {/* Links de navegación */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Inicio', to: '/home' },
            { label: 'Series', to: '/home?type=series' },
            { label: 'Películas', to: '/home?type=movie' },
            { label: 'Planes', to: '/plans' },
          ].map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="text-silver hover:text-spotlight transition-colors text-sm tracking-wider uppercase font-mono"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSearch(true)} className="text-silver hover:text-spotlight transition-colors">
            <Search size={18} />
          </button>
          <button onClick={() => navigate('/account?tab=notifications')} className="text-silver hover:text-spotlight transition-colors">
            <Bell size={18} />
          </button>

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
                onClick={() => navigate('/profiles')}
                className="hover:bg-[#2C2416] cursor-pointer text-sm font-mono tracking-wide"
              >
                Cambiar perfil
              </DropdownMenuItem>
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