import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactPlayer from 'react-player'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/context/AuthContext'
import { watchPartyAPI } from '@/api/watchParty'
import type { WatchPartyRoom, PartyMember, PartyState } from '@/api/watchParty'
import { getDownloadUrl } from '@/api/catalogAdmin'
import {
  Users, Play, Pause, Copy, Check, Crown, LogOut, Loader2, RefreshCcw
} from 'lucide-react'

const FALLBACK_VIDEO = 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4'

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function WatchPartyPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { currentProfile, user } = useAuth()

  const profileId = currentProfile?.id ?? (user as any)?.userId ?? ''
  const profileName = currentProfile?.name ?? user?.email?.split('@')[0] ?? 'Invitado'

  const [room, setRoom] = useState<WatchPartyRoom | null>(null)
  const [members, setMembers] = useState<PartyMember[]>([])
  const [partyState, setPartyState] = useState<PartyState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Player
  const playerRef = useRef<ReactPlayer>(null)
  const [playing, setPlaying] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const positionRef = useRef(0)
  const [videoUrl, setVideoUrl] = useState<string>('')

  // Socket ref
  const socketRef = useRef<Socket | null>(null)

  const isHost = room?.hostProfileId === profileId

  // ─── 1. HTTP join → get initial room state ──────────────────────────────────
  useEffect(() => {
    if (!code) return
    watchPartyAPI.join(code, profileName)
      .then((r) => {
        setRoom(r)
        setMembers(r.members)
        setPartyState(r.state)
        setPlaying(r.state.isPlaying)
      })
      .catch(() => setError('Sala no encontrada o expirada'))
      .finally(() => setLoading(false))
  }, [code]) // eslint-disable-line

  // ─── 1b. Resolver URL de video igual que VideoPlayer ────────────────────────
  useEffect(() => {
    if (!room) return
    let cancelled = false

    async function resolve() {
      const ref = room!.videoRef || ''
      const source = (room!.videoSource || '').toLowerCase()

      if (!ref) { if (!cancelled) setVideoUrl(FALLBACK_VIDEO); return }

      if (ref.startsWith('http')) { if (!cancelled) setVideoUrl(ref); return }

      if (source === 'gcs') {
        try {
          const { download_url } = await getDownloadUrl(ref)
          if (!cancelled) setVideoUrl(download_url)
        } catch {
          if (!cancelled) setVideoUrl(FALLBACK_VIDEO)
        }
        return
      }

      if (source === 'youtube' || source === 'yt' || ref.length === 11) {
        if (!cancelled) setVideoUrl(`https://www.youtube.com/watch?v=${ref}`)
        return
      }

      if (!cancelled) setVideoUrl(FALLBACK_VIDEO)
    }

    resolve()
    return () => { cancelled = true }
  }, [room])

  // ─── 2. WebSocket connection ─────────────────────────────────────────────────
  useEffect(() => {
    if (!code || !room || loading) return

    const token = localStorage.getItem('quetxal_token') || ''

    const socket = io(`${GATEWAY_URL}/watch-party`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    // Join socket.io room
    socket.emit('room:join', { code, profileId, displayName: profileName })

    // Miembros actualizados
    socket.on('members:update', (updatedMembers: PartyMember[]) => {
      setMembers(updatedMembers)
    })

    // Estado sincronizado (host actualizó posición/play/pause)
    socket.on('state:sync', (state: PartyState) => {
      setPartyState(state)
      if (!isHost) {
        setPlaying(state.isPlaying)
        if (playerRef.current && playerReady) {
          const diff = Math.abs(positionRef.current - state.positionSeconds)
          if (diff > 3) {
            playerRef.current.seekTo(state.positionSeconds, 'seconds')
          }
        }
      }
    })

    socket.on('error', (msg: string) => setError(msg))

    return () => {
      socket.emit('room:leave', { code, profileId })
      socket.disconnect()
      socketRef.current = null
    }
  }, [code, room, loading]) // eslint-disable-line

  // ─── 3. HOST: emitir state update vía WebSocket ──────────────────────────────
  const handlePlayPause = useCallback((newPlaying: boolean) => {
    if (!isHost || !code) return
    setPlaying(newPlaying)
    socketRef.current?.emit('state:update', {
      code,
      profileId,
      isPlaying: newPlaying,
      positionSeconds: positionRef.current,
    })
  }, [isHost, code, profileId])

  // HOST: sincronizar posición periódicamente (cada 15s)
  useEffect(() => {
    if (!isHost || !code || !room) return
    const interval = setInterval(() => {
      if (playing) {
        socketRef.current?.emit('state:update', {
          code,
          profileId,
          isPlaying: playing,
          positionSeconds: positionRef.current,
        })
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [isHost, code, room, playing, profileId])

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeave = async () => {
    if (code) await watchPartyAPI.leave(code).catch(() => {})
    navigate(-1)
  }

  const handleSyncNow = () => {
    if (!partyState || !playerRef.current || !playerReady) return
    playerRef.current.seekTo(partyState.positionSeconds, 'seconds')
    setPlaying(partyState.isPlaying)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0b04] flex items-center justify-center">
        <div className="flex items-center gap-3 text-silver/60 font-mono text-sm">
          <Loader2 size={18} className="animate-spin text-spotlight" />
          Uniéndose a la sala...
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-[#0f0b04] flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 font-mono text-sm">{error || 'Error al cargar la sala'}</p>
        <button onClick={() => navigate('/home')} className="text-spotlight hover:underline font-mono text-xs">
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0b04] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#3a2e1a] bg-[#1a1408]">
        <div className="flex items-center gap-3">
          <div className="border-2 border-spotlight px-3 py-1">
            <span className="font-display text-sm font-bold text-spotlight tracking-widest">QUETXAL TV</span>
          </div>
          <div className="h-px w-4 bg-spotlight/40" />
          <span className="text-silver/60 font-mono text-xs">Watch Party</span>
          <span className="text-parchment/80 font-mono text-sm truncate max-w-xs">{room.contentTitle}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-[#3a2e1a] px-3 py-1.5 bg-[#0f0b04]">
            <span className="text-silver/40 font-mono text-xs">Código:</span>
            <span className="text-spotlight font-mono font-bold text-sm tracking-widest">{code}</span>
            <button onClick={handleCopyCode} className="text-silver/40 hover:text-spotlight transition-colors">
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 border border-[#3a2e1a] hover:border-red-500/50 text-silver/60 hover:text-red-400 px-3 py-1.5 font-mono text-xs transition-colors"
          >
            <LogOut size={14} />
            Salir
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Player */}
        <div className="flex-1 flex flex-col">
          <div className="relative bg-black" style={{ aspectRatio: '16/9', maxHeight: 'calc(100vh - 180px)' }}>
            {videoUrl ? (
              <ReactPlayer
                ref={playerRef}
                url={videoUrl}
                playing={playing}
                width="100%"
                height="100%"
                onReady={() => setPlayerReady(true)}
                onPlay={() => { if (isHost) handlePlayPause(true) }}
                onPause={() => { if (isHost) handlePlayPause(false) }}
                onProgress={({ playedSeconds }) => { positionRef.current = playedSeconds }}
                controls={isHost}
                config={{ youtube: { playerVars: { modestbranding: 1, rel: 0 } } }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#1a1408]">
                {room.posterUrl ? (
                  <img src={room.posterUrl} alt={room.contentTitle} className="max-h-full object-contain opacity-40" />
                ) : (
                  <span className="text-silver/20 font-mono text-sm">Sin video disponible</span>
                )}
              </div>
            )}

            {/* Guest overlay */}
            {!isHost && (
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <div className="flex items-center gap-2 bg-black/70 border border-[#3a2e1a] px-3 py-1.5 text-xs font-mono text-silver/60">
                  {partyState?.isPlaying
                    ? <Play size={12} className="text-green-400" />
                    : <Pause size={12} className="text-silver/50" />}
                  <span>
                    Host: {partyState?.isPlaying ? 'Reproduciendo' : 'Pausado'} · {formatTime(partyState?.positionSeconds ?? 0)}
                  </span>
                </div>
                <button
                  onClick={handleSyncNow}
                  className="flex items-center gap-1.5 bg-spotlight/20 border border-spotlight/40 hover:bg-spotlight/30 text-spotlight px-3 py-1.5 text-xs font-mono transition-colors"
                >
                  <RefreshCcw size={12} />
                  Sincronizar
                </button>
              </div>
            )}
          </div>

          {/* Host controls */}
          {isHost && (
            <div className="px-6 py-3 border-t border-[#3a2e1a] bg-[#1a1408] flex items-center gap-4">
              <Crown size={14} className="text-spotlight shrink-0" />
              <span className="text-spotlight/80 font-mono text-xs">Eres el host — tus controles se sincronizan en tiempo real vía WebSocket</span>
              <div className="ml-auto flex items-center gap-3">
                <button
                  onClick={() => handlePlayPause(!playing)}
                  className="flex items-center gap-2 bg-spotlight hover:bg-spotlight/80 text-film px-5 py-2 font-mono text-xs tracking-widest uppercase transition-colors"
                >
                  {playing ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> Reproducir</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 border-l border-[#3a2e1a] bg-[#1a1408] flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-[#3a2e1a] flex items-center gap-2">
            <Users size={14} className="text-spotlight/60" />
            <span className="text-parchment font-mono text-sm">Sala · {members.length} viendo</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {members.map((m) => (
              <div
                key={m.profileId}
                className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                  m.profileId === room.hostProfileId ? 'bg-spotlight/10 border border-spotlight/20' : 'hover:bg-[#252015]'
                }`}
              >
                <div className="w-8 h-8 rounded-full border border-[#3a2e1a] bg-[#0f0b04] flex items-center justify-center text-sm">
                  {m.profileId === room.hostProfileId ? '👑' : '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-parchment font-mono text-sm truncate">{m.name}</p>
                  {m.profileId === room.hostProfileId && (
                    <p className="text-spotlight/60 font-mono text-xs">Host</p>
                  )}
                  {m.profileId === profileId && m.profileId !== room.hostProfileId && (
                    <p className="text-silver/40 font-mono text-xs">Tú</p>
                  )}
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400/80 shrink-0" />
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[#3a2e1a] space-y-2">
            <p className="text-silver/40 font-mono text-xs uppercase tracking-widest">Estado</p>
            <div className="flex items-center gap-2 text-xs font-mono">
              {partyState?.isPlaying
                ? <><Play size={12} className="text-green-400" /><span className="text-green-400">Reproduciendo</span></>
                : <><Pause size={12} className="text-silver/50" /><span className="text-silver/50">Pausado</span></>}
              <span className="text-silver/30">· {formatTime(partyState?.positionSeconds ?? 0)}</span>
            </div>
            <p className="text-silver/20 font-mono text-xs">
              Expira: {new Date(room.expiresAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
