import { Link, Outlet, useLocation } from 'react-router-dom'
import { Film, Users, Settings,ScrollText, FileBarChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import NavbarADMIN from '@/components/layout/NavbarADMIN'

const NAV_ITEMS = [
    { label: 'Dashboard',   href: '/admin',          icon: Film         },
    { label: 'Catálogo',    href: '/admin/catalog',  icon: Film         },
    { label: 'Usuarios',    href: '/admin/users',    icon: Users        },
    { label: 'Auditoría',   href: '/admin/audit',    icon: ScrollText   },
    { label: 'Reportes',    href: '/admin/reports',  icon: FileBarChart },
    { label: 'Configuración', href: '/admin/settings', icon: Settings   },
]

export default function LayoutAdmin() {
    const location = useLocation()

    return (
        <div className="min-h-screen flex bg-[#1a1408]">
            {/* Sidebar */}
       
            <aside className="w-64 border-r border-[#3a2e1a] bg-[#1e1810]">
                <div className="p-6">

                    <h2 className="font-display text-2xl font-bold text-spotlight tracking-widest mb-8">
                        QUETXAL TV
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
            </aside>

            {/* Contenido */}
            <main className="flex-1 p-8">
                <Outlet />
            </main>
        </div>
    )
}