// src/pages/admin/AuditPage.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { gateway } from '@/api/client'
import {
  Search, Filter, ChevronLeft, ChevronRight,
  FileText, FileSpreadsheet, Clock, Database,
  User, ShieldCheck, BarChart2, Bell, CreditCard, History,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Tipos normalizados ───────────────────────────────────────────────────────

interface NormalizedLog {
  id: string
  table: string
  action: string
  user: string
  date: string
  oldState: string | null
  newState: string | null
}

// ─── Configuración por servicio ───────────────────────────────────────────────

type ServiceKey = 'catalogo' | 'historial' | 'auth' | 'fx' | 'notificaciones' | 'suscripciones'

interface ServiceConfig {
  label: string
  icon: React.ReactNode
  endpoint: string | null
  fieldMap: (item: any) => NormalizedLog
}

const SERVICE_CONFIG: Record<ServiceKey, ServiceConfig> = {
  catalogo: {
    label: 'Catálogo',
    icon: <Database size={14} />,
    endpoint: '/catalog/admin/audit/logs',
    fieldMap: (item) => ({
      id: String(item.ID),
      table: item.TableName,
      action: item.Operation,
      user: item.ChangedBy || '',
      date: item.ChangedAt,
      oldState: item.OldData ?? null,
      newState: item.NewData ?? null,
    }),
  },
  historial: {
    label: 'Historial',
    icon: <History size={14} />,
    endpoint: '/admin/reporte/historial/auditoria',
    fieldMap: (item) => ({
      id: item.audit_id,
      table: item.table_name,
      action: item.action,
      user: item.responsible_user_id || item.responsible_profile_id || '',
      date: item.created_at,
      oldState: item.old_state ? JSON.stringify(item.old_state) : null,
      newState: item.new_state ? JSON.stringify(item.new_state) : null,
    }),
  },
  auth: {
    label: 'Auth',
    icon: <ShieldCheck size={14} />,
    endpoint: null,
    fieldMap: (item) => ({
      id: item.audit_id ?? item.id,
      table: item.table_name,
      action: item.action,
      user: item.responsible_user_id || '',
      date: item.created_at,
      oldState: item.old_state ? JSON.stringify(item.old_state) : null,
      newState: item.new_state ? JSON.stringify(item.new_state) : null,
    }),
  },
  fx: {
    label: 'FX',
    icon: <BarChart2 size={14} />,
    endpoint: '/admin/reporte/fx/auditoria',
    fieldMap: (item) => ({
    id: String(item.log_id),
    table: item.target_currency ?? '',
    action: item.cache_hit ? 'CACHE_HIT' : 'API_CALL',
    user: item.requested_by || '',
    date: item.requested_at ? item.requested_at.replace(' ', 'T') : '',
    oldState: null,
    newState: JSON.stringify({ rate: item.rate_used }),
  }),
  },
  notificaciones: {
  label: 'Notificaciones',
  icon: <Bell size={14} />,
  endpoint: '/admin/reporte/notification/auditoria',
  fieldMap: (item) => ({
    id: String(item.log_id),
    table: 'notifications',
    action: item.new_status,
    user: item.notification_id || '',
    date: item.created_at ? item.created_at.replace(' ', 'T').replace('+00', '+00:00') : '',
    oldState: item.old_status ? JSON.stringify({ status: item.old_status }) : null,
    newState: JSON.stringify({ status: item.new_status, message: item.message }),
  }),
},
  suscripciones: {
  label: 'Suscripciones',
  icon: <CreditCard size={14} />,
  endpoint: '/admin/reporte/subscription/auditoria',
  fieldMap: (item) => ({
    id: String(item.log_id),
    table: 'subscriptions',
    action: item.event_type,
    user: item.user_id || '',
    date: item.created_at ? item.created_at.replace(' ', 'T').replace('+00', '+00:00') : '',
    oldState: item.old_data ? JSON.stringify(item.old_data) : null,
    newState: item.new_data ? JSON.stringify(item.new_data) : null,
  }),
},
}

const SERVICE_KEYS = Object.keys(SERVICE_CONFIG) as ServiceKey[]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    const normalized = iso.replace(' ', 'T').replace('+00', '+00:00')
    const date = new Date(normalized)
    if (isNaN(date.getTime())) return iso  // si falla, muestra el string original
    return date.toLocaleString('es-GT', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch {
    return iso
  }
}

function parseState(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

const ACTION_STYLES: Record<string, string> = {
  INSERT: 'bg-green-950/50 text-green-300 border-green-800/40',
  UPDATE: 'bg-amber-950/50 text-amber-300 border-amber-800/40',
  DELETE: 'bg-red-950/50 text-red-300 border-red-800/40',
}

// ─── Export: CSV ─────────────────────────────────────────────────────────────

function exportCSV(service: ServiceKey, logs: NormalizedLog[]) {
  const headers = ['#', 'Tabla', 'Acción', 'Usuario', 'Fecha', 'Estado anterior', 'Estado nuevo']
  const rows = logs.map((l, i) => [
    String(i + 1),
    l.table,
    l.action,
    l.user,
    l.date,
    l.oldState ?? '',
    l.newState ?? '',
  ])

  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const bom  = '\uFEFF'   // BOM para que Excel abra bien el UTF-8
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `auditoria_${service}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Export: PDF ─────────────────────────────────────────────────────────────

function exportPDF(service: ServiceKey, serviceLabel: string, logs: NormalizedLog[]) {
  const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const now  = new Date()
  const date = now.toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: '2-digit' })
  const time = now.toLocaleTimeString('es-GT')

  // ── Encabezado ──
  doc.setFillColor(26, 20, 8)
  doc.rect(0, 0, 297, 28, 'F')

  doc.setTextColor(255, 200, 50)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`QuetxalTV — Reporte de Auditoría`, 14, 11)

  doc.setTextColor(180, 160, 100)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Servicio: ${serviceLabel}`, 14, 19)
  doc.text(`Generado: ${date} ${time}`, 14, 24)
  doc.text(`Total de registros: ${logs.length}`, 200, 19)

  // ── Tabla ──
  autoTable(doc, {
    startY: 32,
    head: [['#', 'Tabla', 'Acción', 'Usuario', 'Fecha/Hora', 'Estado anterior', 'Estado nuevo']],
    body: logs.map((l, i) => [
      String(i + 1),
      l.table,
      l.action,
      l.user || '—',
      l.date ? formatDate(l.date) : '—',
      l.oldState
        ? JSON.stringify(parseState(l.oldState), null, 0).slice(0, 80)
        : '—',
      l.newState
        ? JSON.stringify(parseState(l.newState), null, 0).slice(0, 80)
        : '—',
    ]),
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      overflow: 'linebreak',
      textColor: [40, 30, 10],
    },
    headStyles: {
      fillColor: [26, 20, 8],
      textColor: [255, 200, 50],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [250, 245, 235],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 40 },
      4: { cellWidth: 38 },
      5: { cellWidth: 60 },
      6: { cellWidth: 60 },
    },
    didDrawCell: (data) => {
      // Colorea la celda de acción según el tipo
      if (data.section === 'body' && data.column.index === 2) {
        const val = String(data.cell.raw)
        const colors: Record<string, [number, number, number]> = {
          INSERT: [220, 252, 231],
          UPDATE: [254, 243, 199],
          DELETE: [254, 226, 226],
        }
        if (colors[val]) {
          doc.setFillColor(...colors[val])
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')
          doc.setTextColor(40, 30, 10)
          doc.setFontSize(7.5)
          doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, {
            align: 'center',
            baseline: 'middle',
          })
        }
      }
    },
    margin: { left: 14, right: 14 },
  })

  // ── Footer en cada página ──
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 130, 80)
    doc.text(
      `Página ${i} de ${pageCount}  —  QuetxalTV Panel de Administración`,
      297 / 2, 205,
      { align: 'center' }
    )
  }

  doc.save(`auditoria_${service}_${now.toISOString().split('T')[0]}.pdf`)
}

// ─── Fetch genérico ───────────────────────────────────────────────────────────

async function fetchAuditLogs(service: ServiceKey, page: number, pageSize: number) {
  const config = SERVICE_CONFIG[service]
  if (!config.endpoint) return { items: [], total: 0 }

  const res = await gateway.get(config.endpoint, {
    params: { page, page_size: pageSize, limit: pageSize, offset: (page - 1) * pageSize },
  })

  const raw      = res.data
  const rawItems: any[] = raw.data ?? raw.items ?? []
  const total: number   = raw.total ?? rawItems.length

  return {
    items: rawItems.map(config.fieldMap),
    total,
  }
}

// ─── DataDiff ─────────────────────────────────────────────────────────────────

function DataDiff({ oldRaw, newRaw }: { oldRaw: string | null; newRaw: string | null }) {
  const oldData = parseState(oldRaw)
  const newData = parseState(newRaw)
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
          {oldData && oldData[k] !== undefined && (
            <span className="ml-1 line-through text-red-400/70">
              {String(oldData[k] ?? 'null')}
            </span>
          )}
          <span className="mx-1 text-silver/30">→</span>
          {newData && (
            <span className="text-green-400/80">{String(newData[k] ?? 'null')}</span>
          )}
        </div>
      ))}
      {!oldData && newData && (
        <pre className="text-xs text-green-400/70 font-mono whitespace-pre-wrap">
          {JSON.stringify(newData, null, 2).slice(0, 300)}
        </pre>
      )}
      <button onClick={() => setExpanded(false)} className="text-xs text-silver/30 hover:text-silver">
        Colapsar
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [activeTab, setActiveTab]       = useState<ServiceKey>('catalogo')
  const [page, setPage]                 = useState(1)
  const [search, setSearch]             = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [downloading, setDownloading]   = useState<'csv' | 'pdf' | null>(null)
  const pageSize = 15

  const config    = SERVICE_CONFIG[activeTab]
  const isPending = config.endpoint === null

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', activeTab, page],
    queryFn: () => fetchAuditLogs(activeTab, page, pageSize),
    enabled: !isPending,
  })

  const logs = (data?.items ?? []).filter(log => {
    const matchSearch =
      !search ||
      log.table.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase())
    const matchAction = actionFilter === 'all' || log.action === actionFilter
    return matchSearch && matchAction
  })

  const totalPages  = Math.ceil((data?.total ?? 0) / pageSize)
  const insertCount = (data?.items ?? []).filter(l => l.action === 'INSERT').length
  const updateCount = (data?.items ?? []).filter(l => l.action === 'UPDATE').length
  const deleteCount = (data?.items ?? []).filter(l => l.action === 'DELETE').length

  function switchTab(key: ServiceKey) {
    setActiveTab(key)
    setPage(1)
    setSearch('')
    setActionFilter('all')
  }

  async function handleDownload(format: 'csv' | 'pdf') {
    setDownloading(format)
    try {
      if (format === 'csv') exportCSV(activeTab, logs)
      else exportPDF(activeTab, config.label, logs)
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
          <p className="text-silver/50 text-sm mt-0.5">Log transaccional por microservicio</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleDownload('csv')}
            disabled={downloading === 'csv' || isPending || logs.length === 0}
            variant="outline"
            className="border-[#3a2e1a] text-silver/70 hover:bg-[#2C2416] hover:text-silver gap-2 h-9 text-xs"
          >
            <FileSpreadsheet size={14} />
            {downloading === 'csv' ? 'Exportando...' : 'CSV'}
          </Button>
          <Button
            onClick={() => handleDownload('pdf')}
            disabled={downloading === 'pdf' || isPending || logs.length === 0}
            variant="outline"
            className="border-[#3a2e1a] text-silver/70 hover:bg-[#2C2416] hover:text-silver gap-2 h-9 text-xs"
          >
            <FileText size={14} />
            {downloading === 'pdf' ? 'Exportando...' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a1408] rounded-xl p-1 border border-[#3a2e1a] flex-wrap">
        {SERVICE_KEYS.map(key => {
          const svc      = SERVICE_CONFIG[key]
          const isActive = activeTab === key
          const pending  = svc.endpoint === null
          return (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-spotlight text-film shadow-sm'
                  : 'text-silver/50 hover:text-silver hover:bg-[#2C2416]'
              }`}
            >
              {svc.icon}
              {svc.label}
              {pending && (
                <span className="w-1.5 h-1.5 rounded-full bg-silver/25 inline-block" title="Pendiente" />
              )}
            </button>
          )
        })}
      </div>

      {/* Pendiente placeholder */}
      {isPending ? (
        <div className="rounded-xl border border-[#3a2e1a] border-dashed py-20 text-center">
          <Database size={28} className="mx-auto mb-3 text-silver/15" />
          <p className="text-silver/40 text-sm font-medium">{config.label}</p>
          <p className="text-silver/25 text-xs mt-1">Endpoint de auditoría pendiente de implementar</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Inserciones',     count: insertCount, color: 'text-green-400', bg: 'bg-green-950/20 border-green-800/20' },
              { label: 'Actualizaciones', count: updateCount, color: 'text-amber-400', bg: 'bg-amber-950/20 border-amber-800/20' },
              { label: 'Eliminaciones',   count: deleteCount, color: 'text-red-400',   bg: 'bg-red-950/20 border-red-800/20' },
            ].map(({ label, count, color, bg }) => (
              <div key={label} className={`rounded-lg border p-4 ${bg}`}>
                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                <p className="text-silver/50 text-xs mt-0.5">{label}</p>
              </div>
            ))}
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
                  onClick={() => setActionFilter(op)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    actionFilter === op ? 'bg-spotlight text-film' : 'text-silver/50 hover:text-silver'
                  }`}
                >
                  {op === 'all' ? 'Todos' : op}
                </button>
              ))}
            </div>
            {data && (
              <span className="text-silver/30 text-xs ml-auto">{data.total} registros totales</span>
            )}
          </div>

          {/* Tabla */}
          <div className="rounded-xl border border-[#3a2e1a] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#241d0f] border-b border-[#3a2e1a]">
                  {['#', 'Tabla', 'Acción', 'Usuario', 'Fecha/Hora', 'Cambios'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-silver/40 font-medium text-xs uppercase tracking-wider ${
                        i === 0 ? 'text-center w-12' : 'text-left'
                      }`}
                    >
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
                  : logs.map((log, idx) => (
                      <tr key={log.id} className="bg-[#1e1810] hover:bg-[#231c10] transition-colors">
                        <td className="px-4 py-3 text-center">
                          <span className="text-silver/30 text-xs tabular-nums font-mono">
                            #{(page - 1) * pageSize + idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Database size={12} className="text-silver/30 shrink-0" />
                            <span className="text-silver/70 font-mono text-xs">{log.table}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs px-2 py-0.5 border ${ACTION_STYLES[log.action] ?? 'bg-[#2C2416] text-silver/50 border-[#3a2e1a]'}`}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <User size={12} className="text-silver/30 shrink-0" />
                            <span className="text-silver/60 text-xs truncate max-w-[120px]" title={log.user}>
                              {log.user || <span className="text-silver/25 italic">sin usuario</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-silver/30 shrink-0" />
                            <span className="text-silver/60 text-xs tabular-nums whitespace-nowrap">
                              {formatDate(log.date)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <DataDiff oldRaw={log.oldState} newRaw={log.newState} />
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
                <p className="text-silver/25 text-xs mt-1">
                  Los registros aparecerán cuando se realicen operaciones en este servicio
                </p>
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
        </>
      )}
    </div>
  )
}
