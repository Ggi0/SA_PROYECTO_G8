import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { userAdminAPI, AdminUser } from '@/api/admin/userAdmin'
import {
  User, ChevronDown, ChevronUp, Clock,
  ShieldCheck, Mail, Calendar
} from 'lucide-react'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return '—'
  try {
    const date = new Date(iso)
    if (isNaN(date.getTime())) return iso
    return date.toLocaleString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function UserAdminPage() {
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: userAdminAPI.getAllUsers,
  })

  const users = data?.users ?? []

  function toggleUser(userId: string) {
    setExpandedUser(prev => (prev === userId ? null : userId))
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-spotlight tracking-wide">
          Usuarios
        </h1>
        <p className="text-silver/50 text-sm mt-0.5">
          Estado de cuentas, actividad y perfiles
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-[#3a2e1a] rounded-lg p-4 bg-[#1e1810]">
          <p className="text-2xl text-green-400 font-bold">
            {users.filter(u => u.isActive).length}
          </p>
          <p className="text-silver/40 text-xs">Activos</p>
        </div>

        <div className="border border-[#3a2e1a] rounded-lg p-4 bg-[#1e1810]">
          <p className="text-2xl text-red-400 font-bold">
            {users.filter(u => !u.isActive).length}
          </p>
          <p className="text-silver/40 text-xs">Inactivos</p>
        </div>

        <div className="border border-[#3a2e1a] rounded-lg p-4 bg-[#1e1810]">
          <p className="text-2xl text-spotlight font-bold">
            {users.length}
          </p>
          <p className="text-silver/40 text-xs">Total usuarios</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-[#3a2e1a] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#241d0f] border-b border-[#3a2e1a]">
              <th className="px-4 py-3 text-left text-silver/40 text-xs">Usuario</th>
              <th className="px-4 py-3 text-left text-silver/40 text-xs">Rol</th>
              <th className="px-4 py-3 text-left text-silver/40 text-xs">Estado</th>
              <th className="px-4 py-3 text-left text-silver/40 text-xs">Último login</th>
              <th className="px-4 py-3 text-left text-silver/40 text-xs">Creado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#3a2e1a]">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="bg-[#1e1810]">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-[#2C2416] rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : users.map((user) => {
                  const expanded = expandedUser === user.userId

                  return (
                    <>
                      {/* ROW */}
                      <tr
                        key={user.userId}
                        className="bg-[#1e1810] hover:bg-[#231c10] transition-colors cursor-pointer"
                        onClick={() => toggleUser(user.userId)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-silver/30" />
                              <span className="text-silver font-medium">
                                {user.email}
                              </span>
                            </div>
                            <span className="text-silver/30 text-xs font-mono">
                              {user.userId}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            user.role === 'admin'
                              ? 'bg-purple-950/40 text-purple-300'
                              : 'bg-[#2C2416] text-silver/50'
                          }`}>
                            {user.role}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            user.isActive
                              ? 'bg-green-950/50 text-green-300'
                              : 'bg-red-950/50 text-red-300'
                          }`}>
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-silver/60">
                            <Clock size={12} />
                            {formatDate(user.lastLoginAt)}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-xs text-silver/60">
                          {formatDate(user.createdAt)}
                        </td>

                        <td className="px-4 py-3 text-silver/40">
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>

                      {/* EXPANDED */}
                      {expanded && (
                        <tr className="bg-[#18120a]">
                          <td colSpan={6} className="px-6 py-5 space-y-4">

                            {/* Info extra */}
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div>
                                <p className="text-silver/30">Email</p>
                                <p className="text-silver">{user.email}</p>
                              </div>
                              <div>
                                <p className="text-silver/30">Última actualización</p>
                                <p className="text-silver">{formatDate(user.updatedAt)}</p>
                              </div>
                              <div>
                                <p className="text-silver/30">Desactivado en</p>
                                <p className="text-silver">
                                  {user.deactivatedAt ? formatDate(user.deactivatedAt) : '—'}
                                </p>
                              </div>
                            </div>

                            {/* Profiles */}
                            <div>
                              <h3 className="text-sm text-spotlight mb-3">
                                Perfiles
                              </h3>

                              {!user.profiles || user.profiles.length === 0 ? (
                                <p className="text-xs text-silver/30">
                                  No tiene perfiles
                                </p>
                              ) : (
                                <div className="grid grid-cols-3 gap-3">
                                  {user.profiles.map((p) => (
                                    <div
                                      key={p.profileId}
                                      className="border border-[#3a2e1a] rounded-lg p-3 bg-[#1e1810]"
                                    >
                                      <p className="text-silver text-sm font-medium">
                                        {p.displayName}
                                      </p>

                                      <p className="text-xs text-silver/30 font-mono">
                                        {p.profileId}
                                      </p>

                                      <span className={`text-xs mt-2 inline-block px-2 py-1 rounded ${
                                        p.isKidsMode
                                          ? 'bg-blue-950/50 text-blue-300'
                                          : 'bg-[#2C2416] text-silver/50'
                                      }`}>
                                        {p.isKidsMode ? 'Kids Mode' : 'Normal'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
          </tbody>
        </table>

        {!isLoading && users.length === 0 && (
          <div className="py-16 text-center">
            <User size={28} className="mx-auto mb-3 text-silver/15" />
            <p className="text-silver/40 text-sm">
              No hay usuarios registrados
            </p>
          </div>
        )}
      </div>
    </div>
  )
}