import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Film, ScrollText, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const NAV_ITEMS = [
    { label: 'Dashboard',   href: '/admin',          icon: Film         },
    { label: 'Catálogo',    href: '/admin/catalog',  icon: Film         },
    { label: 'Auditoría',   href: '/admin/audit',    icon: ScrollText   },
    { label: 'Periles',   href: '/admin/users',    icon: ScrollText   },
]

export default function LayoutAdmin() {
    const location = useLocation()
    const navigate = useNavigate()
    const { logout, user } = useAuth()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="min-h-screen flex bg-[#1a1408]">
            {/* Sidebar */}
            <aside className="w-64 border-r border-[#3a2e1a] bg-[#1e1810] flex flex-col">
                <div className="p-6 flex-1">

                    <h2 className="font-display text-2xl font-bold text-spotlight tracking-widest mb-8">
                        Calificacion
                    </h2>

                    <nav className="space-y-2">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon

                            const active =
                                item.href === '/admin'
                                    ? location.pathname === '/admin'
                                    : location.pathname.startsWith(item.href)

                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-md px-4 py-3 text-sm transition-colors',
                                        active
                                            ? 'bg-spotlight text-film'
                                            : 'text-silver hover:bg-[#2C2416]'
                                    )}
                                >
                                    <Icon size={18} />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* Footer del sidebar: usuario + logout */}
                <div className="p-6 border-t border-[#3a2e1a]">
                    {user?.email && (
                        <p className="text-silver/40 text-xs mb-3 truncate font-mono">
                            {user.email}
                        </p>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 rounded-md px-4 py-3 text-sm w-full text-silver/70 hover:bg-[#2C2416] hover:text-red-400 transition-colors"
                    >
                        <LogOut size={18} />
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* Contenido */}
            <main className="flex-1 p-8">
                <Outlet />
            </main>
        </div>
    )
}
