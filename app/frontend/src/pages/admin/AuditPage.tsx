// src/pages/admin/AuditPage.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { gateway } from '@/api/client'
import { Download, Search, Filter, ChevronLeft, ChevronRight, FileText, FileSpreadsheet, Clock, Database, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuditLog {
  ID: number
  TableName: string
  Operation: 'INSERT' | 'UPDATE' | 'DELETE'
  ChangedBy: string
  ChangedAt: string
  OldData: string
  NewData: string
}

interface AuditResponse {
  data: AuditLog[]
  page: number
  page_size: number
  total: number
}

// ─── API ─────────────────────────────────────────────────────────────────────

async function getAuditLogs(page: number, pageSize: number): Promise<AuditResponse> {
  const res = await gateway.get('/catalog/admin/audit/logs', {
    params: { page, page_size: pageSize },
  })
  return res.data as AuditResponse
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-GT', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function parseData(raw: string): Record<string, unknown> | null {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

const OP_STYLES = {
  INSERT: 'bg-green-950/50 text-green-300 border-green-800/40',
  UPDATE: 'bg-amber-950/50 text-amber-300 border-amber-800/40',
  DELETE: 'bg-red-950/50 text-red-300 border-red-800/40',
}

// ─── Componente de diff ───────────────────────────────────────────────────────

function DataDiff({ oldRaw, newRaw }: { oldRaw: string; newRaw: string }) {
  const oldData = parseData(oldRaw)
  const newData = parseData(newRaw)
  const [expanded, setExpanded] = useState(false)

  if (!oldData && !newData) return <span className="text-silver/30 text-xs">—</span>

  const keys = Array.from(new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ]))

  const changed = keys.filter(k => {
    const o = JSON.stringify((oldData || {})[k])
    const n = JSON.stringify((newData || {})[k])
    return o !== n
  })

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-xs text-spotlight/70 hover:text-spotlight underline"
      >
        {changed.length > 0 ? `${changed.length} campo(s) modificado(s)` : 'Ver datos'}
      </button>
    )
  }

  return (
    <div className="space-y-1">
      {changed.map(k => (
        <div key={k} className="text-xs">
          <span className="text-silver/40 font-mono">{k}:</span>
          {oldData && (oldData)[k] !== undefined && (
            <span className="ml-1 line-through text-red-400/70">
              {String((oldData)[k] ?? 'null')}
            </span>
          )}
          <span className="mx-1 text-silver/30">→</span>
          {newData && (
            <span className="text-green-400/80">
              {String((newData)[k] ?? 'null')}
            </span>
          )}
        </div>
      ))}
      {!oldData && newData && (
        <div className="text-xs text-green-400/70 font-mono">
          {JSON.stringify(newData, null, 2).slice(0, 200)}...
        </div>
      )}
      <button onClick={() => setExpanded(false)} className="text-xs text-silver/30 hover:text-silver">
        Colapsar
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [opFilter, setOpFilter] = useState<string>('all')
  const [downloading, setDownloading] = useState<'csv' | 'pdf' | null>(null)
  const pageSize = 15

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => getAuditLogs(page, pageSize),
  })

  const logs = (data?.data || []).filter(log => {
    const matchSearch =
      !search ||
      log.TableName.toLowerCase().includes(search.toLowerCase()) ||
      log.ChangedBy.toLowerCase().includes(search.toLowerCase()) ||
      log.Operation.toLowerCase().includes(search.toLowerCase())
    const matchOp = opFilter === 'all' || log.Operation === opFilter
    return matchSearch && matchOp
  })

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize)

  async function handleDownload(format: 'csv' | 'pdf') {
    setDownloading(format)
    try {
      const res = await gateway.get('/catalog/admin/audit/export', {
        params: { format },
        responseType: 'blob',
      })
      const url  = URL.createObjectURL(res.data as Blob)
      const link = document.createElement('a')
      link.href  = url
      link.download = `auditoria_catalogo_${new Date().toISOString().split('T')[0]}.${format}`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-spotlight tracking-wide">Auditoría</h1>
          <p className="text-silver/50 text-sm mt-0.5">
            Log transaccional del catálogo — {data?.total ?? 0} registros
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleDownload('csv')}
            disabled={downloading === 'csv'}
            variant="outline"
            className="border-[#3a2e1a] text-silver/70 hover:bg-[#2C2416] hover:text-silver gap-2 h-9 text-xs"
          >
            <FileSpreadsheet size={14} />
            {downloading === 'csv' ? 'Descargando...' : 'CSV'}
          </Button>
          <Button
            onClick={() => handleDownload('pdf')}
            disabled={downloading === 'pdf'}
            variant="outline"
            className="border-[#3a2e1a] text-silver/70 hover:bg-[#2C2416] hover:text-silver gap-2 h-9 text-xs"
          >
            <FileText size={14} />
            {downloading === 'pdf' ? 'Descargando...' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Inserciones', op: 'INSERT', color: 'text-green-400', bg: 'bg-green-950/20 border-green-800/20' },
          { label: 'Actualizaciones', op: 'UPDATE', color: 'text-amber-400', bg: 'bg-amber-950/20 border-amber-800/20' },
          { label: 'Eliminaciones', op: 'DELETE', color: 'text-red-400', bg: 'bg-red-950/20 border-red-800/20' },
        ].map(({ label, op, color, bg }) => {
          const count = (data?.data || []).filter(l => l.Operation === op).length
          return (
            <div key={op} className={`rounded-lg border p-4 ${bg}`}>
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
              <p className="text-silver/50 text-xs mt-0.5">{label}</p>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver/40" />
          <Input
            placeholder="Buscar tabla, usuario..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-[#2C2416] border-[#3a2e1a] text-silver placeholder:text-silver/30 w-52"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#2C2416] rounded-lg p-1">
          <Filter size={12} className="text-silver/30 ml-1" />
          {(['all', 'INSERT', 'UPDATE', 'DELETE'] as const).map(op => (
            <button
              key={op}
              onClick={() => setOpFilter(op)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                opFilter === op
                  ? 'bg-spotlight text-film'
                  : 'text-silver/50 hover:text-silver'
              }`}
            >
              {op === 'all' ? 'Todos' : op}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-[#3a2e1a] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#241d0f] border-b border-[#3a2e1a]">
              {['#', 'Tabla', 'Operación', 'Usuario', 'Fecha/Hora', 'Cambios'].map((h, i) => (
                <th key={h} className={`px-4 py-3 text-silver/40 font-medium text-xs uppercase tracking-wider ${i === 0 ? 'text-center w-12' : 'text-left'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3a2e1a]">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="bg-[#1e1810]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 bg-[#2C2416] rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : logs.map(log => (
                  <tr key={log.ID} className="bg-[#1e1810] hover:bg-[#231c10] transition-colors">
                    {/* ID */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-silver/30 text-xs tabular-nums font-mono">#{log.ID}</span>
                    </td>

                    {/* Tabla */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Database size={12} className="text-silver/30 shrink-0" />
                        <span className="text-silver/70 font-mono text-xs">{log.TableName}</span>
                      </div>
                    </td>

                    {/* Operación */}
                    <td className="px-4 py-3">
                      <Badge className={`text-xs px-2 py-0.5 border ${OP_STYLES[log.Operation] || 'bg-[#2C2416] text-silver/50 border-[#3a2e1a]'}`}>
                        {log.Operation}
                      </Badge>
                    </td>

                    {/* Usuario */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-silver/30 shrink-0" />
                        <span className="text-silver/60 text-xs">
                          {log.ChangedBy || <span className="text-silver/25 italic">sin usuario</span>}
                        </span>
                      </div>
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-silver/30 shrink-0" />
                        <span className="text-silver/60 text-xs tabular-nums whitespace-nowrap">
                          {formatDate(log.ChangedAt)}
                        </span>
                      </div>
                    </td>

                    {/* Cambios */}
                    <td className="px-4 py-3 max-w-xs">
                      <DataDiff oldRaw={log.OldData} newRaw={log.NewData} />
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {!isLoading && logs.length === 0 && (
          <div className="py-16 text-center">
            <Database size={26} className="mx-auto mb-3 text-silver/15" />
            <p className="text-silver/40 text-sm">No hay registros de auditoría</p>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="p-1.5 rounded-md border border-[#3a2e1a] text-silver/50 hover:text-silver hover:bg-[#2C2416] disabled:opacity-25 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-silver/40 text-xs tabular-nums px-1">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="p-1.5 rounded-md border border-[#3a2e1a] text-silver/50 hover:text-silver hover:bg-[#2C2416] disabled:opacity-25 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
