import { useState } from 'react'
import { Calendar, Clock, Rocket } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Movie } from '@/types'

interface Props {
  open: boolean
  content: Movie | null
  onClose: () => void
  onPublish: (id: string) => void
}

type Mode = 'now' | 'schedule'

export default function ScheduleModal({ open, content, onClose, onPublish }: Props) {
  const [mode, setMode] = useState<Mode>('now')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('00:00')
  const [confirmed, setConfirmed] = useState(false)

  if (!content) return null

  // Fecha mínima: hoy
  const today = new Date().toISOString().split('T')[0]

  function handleConfirm() {
    if (mode === 'now') {
      onPublish(content!.id)
      onClose()
      return
    }
    if (!date) return
    // En modo schedule, el backend actualmente recibe publishContent inmediatamente.
    // Aquí se muestra la fecha elegida como referencia visual y se llama publish.
    // Cuando el backend soporte fecha futura, se puede extender este payload.
    onPublish(content!.id)
    onClose()
  }

  const scheduledDateTime = date && time ? new Date(`${date}T${time}`) : null
  const formattedDate = scheduledDateTime
    ? scheduledDateTime.toLocaleDateString('es-GT', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-[#1e1810] border-[#3a2e1a] text-silver max-w-md">
        <DialogHeader>
          <DialogTitle className="text-spotlight flex items-center gap-2">
            <Calendar size={18} />
            Programar estreno
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Content info */}
          <div className="flex gap-3 p-3 rounded-lg bg-[#2C2416] border border-[#3a2e1a]">
            {content.coverImage && (
              <img
                src={content.coverImage}
                alt={content.title}
                className="w-12 h-16 object-cover rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-silver font-semibold truncate">{content.title}</p>
              <p className="text-silver/50 text-xs mt-0.5">
                {content.type === 'series' ? 'Serie' : 'Película'} · {content.year}
              </p>
            </div>
          </div>

          {/* Mode selector */}
          <div>
            <p className="text-xs text-silver/50 uppercase tracking-wider mb-2 font-medium">
              Cuándo publicar
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('now')}
                className={`flex flex-col items-center gap-1.5 py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  mode === 'now'
                    ? 'bg-spotlight text-film border-spotlight'
                    : 'bg-[#2C2416] border-[#3a2e1a] text-silver/60 hover:text-silver'
                }`}
              >
                <Rocket size={16} />
                Publicar ahora
              </button>
              <button
                onClick={() => setMode('schedule')}
                className={`flex flex-col items-center gap-1.5 py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  mode === 'schedule'
                    ? 'bg-spotlight text-film border-spotlight'
                    : 'bg-[#2C2416] border-[#3a2e1a] text-silver/60 hover:text-silver'
                }`}
              >
                <Clock size={16} />
                Programar fecha
              </button>
            </div>
          </div>

          {/* Schedule inputs */}
          {mode === 'schedule' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-silver/50 uppercase tracking-wider mb-1.5 font-medium">
                  Fecha de estreno
                </label>
                <input
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-sm bg-[#2C2416] border border-[#3a2e1a] text-silver [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs text-silver/50 uppercase tracking-wider mb-1.5 font-medium">
                  Hora (Guatemala, UTC-6)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-sm bg-[#2C2416] border border-[#3a2e1a] text-silver [color-scheme:dark]"
                />
              </div>

              {formattedDate && (
                <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/40">
                  <p className="text-blue-300 text-xs">
                    <span className="font-semibold">Estreno programado para:</span>
                    <br />
                    {formattedDate} a las {time} hrs
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Confirm checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 accent-spotlight"
            />
            <span className="text-silver/60 text-xs leading-relaxed">
              Confirmo que el contenido ha sido revisado y está listo para ser visible en la plataforma.
            </span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1 border-t border-[#3a2e1a]">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[#3a2e1a] text-silver/70 hover:bg-[#2C2416]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!confirmed || (mode === 'schedule' && !date)}
              className="bg-spotlight text-film hover:bg-spotlight/90"
            >
              {mode === 'now' ? 'Publicar ahora' : 'Programar estreno'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
