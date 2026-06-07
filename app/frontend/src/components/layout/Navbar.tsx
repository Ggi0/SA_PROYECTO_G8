import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Bell } from 'lucide-react'

export default function Navbar() {
  const { currentProfile, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-gradient-to-b from-black/90 to-transparent">
      {/* Logo */}
      <Link to="/home" className="text-red-600 text-2xl font-bold tracking-wider">
        QUETXAL TV
      </Link>

      {/* Links de navegación */}
      <div className="hidden md:flex items-center gap-6">
        <Link to="/home" className="text-white text-sm hover:text-zinc-300 transition-colors">
          Inicio
        </Link>
        <Link to="/home?type=series" className="text-white text-sm hover:text-zinc-300 transition-colors">
          Series
        </Link>
        <Link to="/home?type=movie" className="text-white text-sm hover:text-zinc-300 transition-colors">
          Películas
        </Link>
        <Link to="/plans" className="text-white text-sm hover:text-zinc-300 transition-colors">
          Planes
        </Link>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-4">
        <button className="text-white hover:text-zinc-300 transition-colors">
          <Search size={20} />
        </button>
        <button className="text-white hover:text-zinc-300 transition-colors">
          <Bell size={20} />
        </button>

        {/* Perfil dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2">
              <Avatar className="w-8 h-8 bg-zinc-700">
                <AvatarFallback className="bg-zinc-700 text-white text-sm">
                  {currentProfile?.avatar ?? '👤'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-700 text-white">
            <DropdownMenuItem
              onClick={() => navigate('/profiles')}
              className="hover:bg-zinc-800 cursor-pointer"
            >
              Cambiar perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate('/account')}
              className="hover:bg-zinc-800 cursor-pointer"
            >
              Mi cuenta
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-700" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="hover:bg-zinc-800 cursor-pointer text-red-400"
            >
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}