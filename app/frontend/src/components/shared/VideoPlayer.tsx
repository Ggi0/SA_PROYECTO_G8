import { useEffect, useRef } from 'react'
import ReactPlayer from 'react-player'
import { X } from 'lucide-react'
import { saveProgress, getProgress } from '@/lib/progress'

const FALLBACK_VIDEO =
  'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4'

function buildVideoUrl(videoRef: string, videoSource: string): string {
  if (!videoRef) return FALLBACK_VIDEO
  if (videoRef.startsWith('http')) return videoRef
  const src = videoSource?.toLowerCase()
  if (src === 'youtube' || src === 'yt' || videoRef.length === 11) {
    return `https://www.youtube.com/watch?v=${videoRef}`
  }
  return FALLBACK_VIDEO
}

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

  // Keep props in a ref so the unmount cleanup always reads the latest values
  const propsRef = useRef(props)
  propsRef.current = props

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

  const videoUrl = buildVideoUrl(props.videoRef, props.videoSource)

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

        <div className="aspect-video bg-black rounded overflow-hidden shadow-[0_0_40px_rgba(212,168,67,0.15)]">
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
        </div>
      </div>
    </div>
  )
}
