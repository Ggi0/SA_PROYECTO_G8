import { useEffect, useRef, useState } from 'react'
import ReactPlayer from 'react-player'
import { X, Loader2 } from 'lucide-react'
import { saveProgress, getProgress } from '@/lib/progress'
import { getDownloadUrl } from '@/api/catalogAdmin'

const FALLBACK_VIDEO =
  'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4'

export interface VideoPlayerProps {
  contentId: string
  title: string
  posterUrl: string
  contentType: 'MOVIE' | 'SERIES'
  videoRef: string
  videoSource: string
  totalDuration: number
  seasonNum?: number
  episodeNum?: number
  episodeId?: string
  episodeTitle?: string
  onClose: () => void
}

export default function VideoPlayer(props: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null)
  const secondsRef = useRef<number>(0)
  const realDurationRef = useRef<number>(props.totalDuration)
  const hasSeenkedRef = useRef(false)

  // URL real a reproducir — se resuelve de forma async cuando la fuente es GCS
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [resolveError, setResolveError] = useState(false)

  // Keep props in a ref so the unmount cleanup always reads the latest values
  const propsRef = useRef(props)
  propsRef.current = props

  // ─── Resolver la URL real del video según la fuente ─────────────────────────
  useEffect(() => {
    let cancelled = false
    setVideoUrl(null)
    setResolveError(false)

    async function resolve() {
      const ref = props.videoRef
      const source = (props.videoSource || '').toLowerCase()

      if (!ref) {
        if (!cancelled) setVideoUrl(FALLBACK_VIDEO)
        return
      }

      // Link directo ya armado (http...) → úsalo tal cual
      if (ref.startsWith('http')) {
        if (!cancelled) setVideoUrl(ref)
        return
      }

      // Video subido a GCS → object_name guardado, hay que pedir signed URL
      if (source === 'gcs') {
        try {
          const { download_url } = await getDownloadUrl(ref)
          if (!cancelled) setVideoUrl(download_url)
        } catch {
          if (!cancelled) {
            setResolveError(true)
            setVideoUrl(FALLBACK_VIDEO)
          }
        }
        return
      }

      // YouTube por ID o por convención de longitud
      if (source === 'youtube' || source === 'yt' || ref.length === 11) {
        if (!cancelled) setVideoUrl(`https://www.youtube.com/watch?v=${ref}`)
        return
      }

      // Vimeo u otra fuente con id — intenta como link directo de respaldo
      if (!cancelled) setVideoUrl(FALLBACK_VIDEO)
    }

    resolve()
    return () => { cancelled = true }
  }, [props.videoRef, props.videoSource])

  // Persist uses only refs — no state deps, won't trigger effect re-runs
  const persist = () => {
    if (secondsRef.current < 5) return  // ignore if barely started
    const p = propsRef.current
    saveProgress({
      contentId: p.contentId,
      title: p.title,
      posterUrl: p.posterUrl,
      contentType: p.contentType,
      minuteReached: Math.floor(secondsRef.current / 60),
      totalDuration: realDurationRef.current,
      videoRef: p.videoRef,
      seasonNum: p.seasonNum,
      episodeNum: p.episodeNum,
    })
  }
  const persistRef = useRef(persist)
  persistRef.current = persist

  // Only runs cleanup on TRUE unmount — empty deps means no re-runs
  useEffect(() => {
    return () => { persistRef.current() }
  }, [])

  const handleDuration = (secs: number) => {
    realDurationRef.current = secs / 60
  }

  // Seek once to saved position.
  // Called from both onStart (autoplay) and onPlay (user pressed play manually).
  const trySeek = () => {
    if (hasSeenkedRef.current) return
    hasSeenkedRef.current = true
    const saved = getProgress(propsRef.current.contentId)
    if (saved && saved.minuteReached > 0) {
      setTimeout(() => {
        playerRef.current?.seekTo(saved.minuteReached * 60, 'seconds')
      }, 500)
    }
  }

  const handleProgress = ({ playedSeconds }: { playedSeconds: number }) => {
    secondsRef.current = playedSeconds
    persistRef.current()
  }

  const label = props.episodeTitle
    ? `Temp. ${props.seasonNum} · Ep. ${props.episodeNum} — ${props.episodeTitle}`
    : props.title

  return (
    <div className="fixed inset-0 z-50 bg-black/96 flex flex-col items-center justify-center">
      <button
        onClick={props.onClose}
        className="fixed top-4 right-4 z-[60] flex items-center gap-2 bg-black/80 border border-white/20 hover:border-white/60 text-white/80 hover:text-white px-4 py-2 rounded transition-all font-mono text-sm"
      >
        <X size={16} />
        Cerrar
      </button>

      <div className="w-full max-w-5xl px-4">
        <p className="text-spotlight font-mono text-sm truncate max-w-[80%] mb-3">{label}</p>

        {resolveError && (
          <p className="text-red-400 font-mono text-xs mb-2">
            No se pudo cargar el video original, mostrando contenido de respaldo.
          </p>
        )}

        <div className="aspect-video bg-black rounded overflow-hidden shadow-[0_0_40px_rgba(212,168,67,0.15)] flex items-center justify-center">
          {!videoUrl ? (
            <div className="flex flex-col items-center gap-3 text-silver/50">
              <Loader2 size={28} className="animate-spin text-spotlight" />
              <span className="font-mono text-xs">Cargando video...</span>
            </div>
          ) : (
            <ReactPlayer
              ref={playerRef}
              url={videoUrl}
              width="100%"
              height="100%"
              controls
              playing
              onStart={trySeek}
              onPlay={trySeek}
              onDuration={handleDuration}
              onProgress={handleProgress}
              progressInterval={10000}
            />
          )}
        </div>
      </div>
    </div>
  )
}
