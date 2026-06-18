// src/pages/admin/components/ScheduleModal.tsx
import { useState } from 'react'
import { Calendar, Clock, Rocket } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { adminScheduleContent } from '@/api/catalogAdmin'
import type { Movie } from '@/types'

interface Props {
  open: boolean
  content: Movie | null
  onClose: () => void
  onPublishNow: (id: string) => void
  onSchedule: (id: string, date: string) => void
}

type Mode = 'now' | 'schedule'

export default function ScheduleModal({ open, content, onClose, onPublishNow, onSchedule }: Props) {
  const [mode, setMode]         = useState<Mode>('now')
  const [date, setDate]         = useState('')
  const [time, setTime]         = useState('20:00')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading]   = useState(false)

  if (!content) return null

  const today = new Date().toISOString().split('T')[0]

  // El input date/time representa la hora LOCAL del navegador (Guatemala, UTC-6).
  // `new Date(date + 'T' + time)` sin sufijo Z se interpreta como hora local
  // por el motor de JS, y `.toISOString()` la convierte correctamente a UTC
  // para que el backend la guarde sin desfase.
  const localDateTime = date ? new Date(`${date}T${time}:00`) : null

  const scheduledLabel = localDateTime
    ? localDateTime.toLocaleDateString('es-GT', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  async function handleConfirm() {
    if (!confirmed) return
    setLoading(true)
    try {
      if (mode === 'now') {
        onPublishNow(content!.id)
      } else if (localDateTime) {
        const isoUtc = localDateTime.toISOString()  // siempre UTC, con 'Z'
        await adminScheduleContent(content!.id, isoUtc)
        onSchedule(content!.id, isoUtc)
      }
    } finally {
      setLoading(false)
      setConfirmed(false)
      setDate('')
      setTime('20:00')
      setMode('now')
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="bg-[#1e1810] border-[#3a2e1a] text-silver max-w-md">
        <DialogHeader>
          <DialogTitle className="text-spotlight flex items-center gap-2 text-base">
            <Calendar size={16} />
            Programar estreno
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Contenido */}
          <div className="flex gap-3 p-3 rounded-lg bg-[#2C2416] border border-[#3a2e1a]">
            {content.coverImage ? (
              <img src={content.coverImage} alt={content.title} className="w-10 h-14 object-cover rounded shrink-0" />
            ) : (
              <div className="w-10 h-14 bg-[#1e1810] rounded shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-silver font-semibold truncate">{content.title}</p>
              <p className="text-silver/40 text-xs mt-0.5">
                {content.type === 'series' ? 'Serie' : 'Película'} · {content.year}
              </p>
            </div>
          </div>

          {/* Selector de modo */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: 'now' as Mode,      label: 'Publicar ahora', icon: Rocket },
              { key: 'schedule' as Mode, label: 'Programar fecha', icon: Clock },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`flex flex-col items-center gap-2 py-3 rounded-lg border text-xs font-semibold transition-colors ${
                  mode === key
                    ? 'bg-spotlight text-film border-spotlight'
                    : 'bg-[#2C2416] border-[#3a2e1a] text-silver/50 hover:text-silver'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Inputs de fecha */}
          {mode === 'schedule' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-silver/40 uppercase tracking-wider mb-1.5 font-medium">
                  Fecha de estreno
                </label>
                <input
                  type="date"
                  min={today}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-sm bg-[#2C2416] border border-[#3a2e1a] text-silver [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs text-silver/40 uppercase tracking-wider mb-1.5 font-medium">
                  Hora (tu hora local)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-sm bg-[#2C2416] border border-[#3a2e1a] text-silver [color-scheme:dark]"
                />
              </div>
              {scheduledLabel && (
                <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/30">
                  <p className="text-blue-300 text-xs leading-relaxed">
                    Estreno programado para:<br />
                    <span className="font-semibold">{scheduledLabel} a las {time} hrs (tu hora local)</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Confirmación */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 accent-spotlight"
            />
            <span className="text-silver/50 text-xs leading-relaxed">
              Confirmo que el contenido ha sido revisado y está listo para publicarse en la plataforma.
            </span>
          </label>

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-1 border-t border-[#3a2e1a]">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[#3a2e1a] text-silver/60 hover:bg-[#2C2416] hover:text-silver h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!confirmed || loading || (mode === 'schedule' && !date)}
              className="bg-spotlight text-film hover:bg-spotlight/90 h-8 text-xs"
            >
              {loading
                ? 'Procesando...'
                : mode === 'now'
                  ? 'Publicar ahora'
                  : 'Confirmar estreno'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
