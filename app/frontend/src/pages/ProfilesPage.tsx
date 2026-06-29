import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Settings, X, Eye, EyeOff } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { profilesAPI } from '@/api/profiles'
import CreateProfileModal from '@/components/ui/CreateProfileModal'

interface BackendProfile {
  profileId: string
  displayName: string
  isKidsMode: boolean
}

// ─────────────────────────────────────────────
//  Modal de Control Parental
// ─────────────────────────────────────────────

function ParentalControlModal({
  profiles,
  userId,
  onClose,
  onProfilesChanged,
}: {
  profiles: BackendProfile[]
  userId: string
  onClose: () => void
  onProfilesChanged: () => void
}) {
  // 'locked' → pedir PIN | 'unlocked' → mostrar controles | 'check' → verificando
  const [phase, setPhase] = useState<'check' | 'locked' | 'unlocked'>('check')
  const [pinInput, setPinInput] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [pinError, setPinError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  // Sección de PIN dentro del panel desbloqueado
  const [pinSection, setPinSection] = useState<'idle' | 'set' | 'change' | 'remove'>('idle')
  const [newPin, setNewPin] = useState('')
  const [newPinConfirm, setNewPinConfirm] = useState('')
  const [pinMsg, setPinMsg] = useState('')
  const [hasPinSet, setHasPinSet] = useState(false)

  // Al abrir: verificar si hay PIN enviando "" → valid:true = sin PIN
  useEffect(() => {
    profilesAPI.verifyParentalPin('').then(({ valid }) => {
      if (valid) {
        setPhase('unlocked')
        setHasPinSet(false)
      } else {
        setPhase('locked')
        setHasPinSet(true)
      }
    })
  }, [])

  const handleVerifyPin = async () => {
    if (pinInput.length !== 4) { setPinError('El PIN tiene 4 dígitos.'); return }
    const { valid } = await profilesAPI.verifyParentalPin(pinInput)
    if (valid) { setPhase('unlocked'); setPinError('') }
    else { setPinError('PIN incorrecto.'); setPinInput('') }
  }

  const handleToggleKids = async (profile: BackendProfile) => {
    setSavingId(profile.profileId)
    try {
      await profilesAPI.updateProfile(
        userId,
        profile.profileId,
        profile.displayName,
        !profile.isKidsMode,
      )
      onProfilesChanged()
    } finally {
      setSavingId(null)
    }
  }

  const handleSavePin = async () => {
    if (!/^\d{4}$/.test(newPin)) { setPinMsg('El PIN debe tener exactamente 4 dígitos numéricos.'); return }
    if (newPin !== newPinConfirm) { setPinMsg('Los PIN no coinciden.'); return }
    await profilesAPI.setParentalPin(newPin)
    setHasPinSet(true)
    setPinSection('idle')
    setNewPin('')
    setNewPinConfirm('')
    setPinMsg('PIN configurado correctamente.')
    setTimeout(() => setPinMsg(''), 3000)
  }

  const handleRemovePin = async () => {
    await profilesAPI.setParentalPin('')
    setHasPinSet(false)
    setPinSection('idle')
    setPinMsg('PIN eliminado.')
    setTimeout(() => setPinMsg(''), 3000)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1e1810] border border-[#3a2e1a] rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-silver hover:text-spotlight transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-display text-xl text-parchment mb-6 tracking-wider">
          Control Parental
        </h2>

        {/* ── Verificando ── */}
        {phase === 'check' && (
          <p className="text-silver text-sm">Verificando...</p>
        )}

        {/* ── Bloqueado: pedir PIN ── */}
        {phase === 'locked' && (
          <div className="flex flex-col gap-4">
            <p className="text-silver text-sm">
              Ingresa tu PIN para gestionar el control parental.
            </p>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pinInput}
                maxLength={4}
                onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '')); setPinError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                placeholder="• • • •"
                className="w-full bg-[#0f0b04] border border-[#3a2e1a] rounded px-4 py-2 text-parchment tracking-[0.5em] text-center font-mono focus:outline-none focus:border-spotlight pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPin(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-silver hover:text-spotlight"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pinError && <p className="text-red-400 text-xs">{pinError}</p>}
            <button
              onClick={handleVerifyPin}
              className="w-full bg-spotlight text-black font-bold py-2 rounded hover:bg-yellow-500 transition-colors"
            >
              Desbloquear
            </button>
          </div>
        )}

        {/* ── Desbloqueado: mostrar controles ── */}
        {phase === 'unlocked' && (
          <div className="flex flex-col gap-5">
            {/* Perfiles */}
            <div>
              <h3 className="text-silver text-xs uppercase tracking-widest mb-3">
                Modo infantil por perfil
              </h3>
              <div className="flex flex-col gap-2">
                {profiles.map((p) => (
                  <div
                    key={p.profileId}
                    className="flex items-center justify-between bg-[#0f0b04] border border-[#3a2e1a] rounded px-4 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{p.isKidsMode ? '🧸' : '👤'}</span>
                      <span className="text-parchment text-sm font-mono">
                        {p.displayName || 'Perfil principal'}
                      </span>
                    </div>
                    <button
                      disabled={savingId === p.profileId}
                      onClick={() => handleToggleKids(p)}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                        p.isKidsMode ? 'bg-blue-500' : 'bg-[#3a2e1a]'
                      } disabled:opacity-50`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                          p.isKidsMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* PIN management */}
            <div>
              <h3 className="text-silver text-xs uppercase tracking-widest mb-3">
                PIN de control parental
              </h3>

              {pinMsg && (
                <p className="text-green-400 text-xs mb-2">{pinMsg}</p>
              )}

              {pinSection === 'idle' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPinSection(hasPinSet ? 'change' : 'set'); setPinMsg('') }}
                    className="flex-1 border border-spotlight text-spotlight py-1.5 rounded text-sm hover:bg-spotlight hover:text-black transition-colors"
                  >
                    {hasPinSet ? 'Cambiar PIN' : 'Crear PIN'}
                  </button>
                  {hasPinSet && (
                    <button
                      onClick={handleRemovePin}
                      className="flex-1 border border-red-500 text-red-400 py-1.5 rounded text-sm hover:bg-red-500 hover:text-white transition-colors"
                    >
                      Eliminar PIN
                    </button>
                  )}
                </div>
              )}

              {(pinSection === 'set' || pinSection === 'change') && (
                <div className="flex flex-col gap-3">
                  <input
                    type="password"
                    value={newPin}
                    maxLength={4}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Nuevo PIN (4 dígitos)"
                    className="bg-[#0f0b04] border border-[#3a2e1a] rounded px-4 py-2 text-parchment tracking-widest text-center font-mono focus:outline-none focus:border-spotlight"
                  />
                  <input
                    type="password"
                    value={newPinConfirm}
                    maxLength={4}
                    onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, ''))}
                    placeholder="Confirmar PIN"
                    className="bg-[#0f0b04] border border-[#3a2e1a] rounded px-4 py-2 text-parchment tracking-widest text-center font-mono focus:outline-none focus:border-spotlight"
                  />
                  {pinMsg && <p className="text-red-400 text-xs">{pinMsg}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSavePin}
                      className="flex-1 bg-spotlight text-black font-bold py-2 rounded hover:bg-yellow-500 transition-colors text-sm"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => { setPinSection('idle'); setNewPin(''); setNewPinConfirm(''); setPinMsg('') }}
                      className="flex-1 border border-[#3a2e1a] text-silver py-2 rounded hover:border-spotlight transition-colors text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  ProfilesPage
// ─────────────────────────────────────────────

export default function ProfilesPage() {
  const navigate = useNavigate()
  const { user, setCurrentProfile } = useAuth()

  const userId = (user as any)?.userId ?? user?.id

  const [profiles, setProfiles] = useState<BackendProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [showParental, setShowParental] = useState(false)

  const loadProfiles = async () => {
    if (!userId) { setLoading(false); return }
    try {
      const data = await profilesAPI.listProfiles(userId)
      setProfiles(data.profiles)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfiles() }, [user])

  const handleSelectProfile = async (profile: BackendProfile) => {
    if (!userId) return
    try {
      const data = await profilesAPI.selectProfile(userId, profile.profileId)
      localStorage.setItem('quetxal_token', data.accessToken)
      setCurrentProfile({
        id: profile.profileId,
        name: profile.displayName,
        avatar: '',
        userId: userId,
        isKidsMode: profile.isKidsMode,
      })
      navigate('/home')
    } catch (error) {
      console.error(error)
    }
  }

  const handleCreateProfile = async (name: string, isKids: boolean) => {
    if (!userId) return
    try {
      await profilesAPI.createProfile(userId, name, isKids)
      await loadProfiles()
    } catch (error) {
      console.error(error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1408] flex items-center justify-center text-parchment">
        Cargando perfiles...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1408] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#2C2416_0%,_#0f0b04_70%)]" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-spotlight to-transparent opacity-60" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-spotlight to-transparent opacity-60" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="border-2 border-spotlight px-6 py-2 mb-4">
          <span className="font-display text-2xl font-bold text-spotlight tracking-widest">
            QUETXAL TV
          </span>
        </div>

        <div className="flex items-center gap-3 mb-12">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-spotlight/40" />
          <h1 className="font-display text-3xl font-bold text-parchment">
            ¿Quién está viendo?
          </h1>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-spotlight/40" />
        </div>

        <div className="flex gap-8 flex-wrap justify-center">
          {profiles.map((profile) => (
            <button
              key={profile.profileId}
              onClick={() => handleSelectProfile(profile)}
              className="flex flex-col items-center gap-3 group"
            >
              <div
                className={`w-28 h-28 rounded border-2 flex items-center justify-center text-5xl transition-all duration-300
                ${
                  profile.isKidsMode
                    ? 'border-silver-400 bg-[#1e1810] shadow-[0_0_15px_rgba(59,130,246,0.3)] group-hover:border-blue-400 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                    : 'border-silver-400 bg-[#1e1810] shadow-[0_0_15px_rgba(212,168,67,0.3)] group-hover:border-yellow-400 group-hover:shadow-[0_0_20px_rgba(212,168,67,0.3)]'
                }`}
              >
                {profile.isKidsMode ? '🧸' : '👤'}
              </div>

              <span
                className={`font-mono text-sm tracking-wider transition-colors ${
                  profile.isKidsMode
                    ? 'text-silver'
                    : 'text-silver group-hover:text-spotlight'
                }`}
              >
                {profile.displayName || 'Principal'}
              </span>
            </button>
          ))}

          {profiles.length < 5 && (
            <button
              onClick={() => setOpenModal(true)}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="w-28 h-28 rounded border-2 border-dashed border-[#3a2e1a] bg-[#1e1810] flex items-center justify-center group-hover:border-spotlight transition-all duration-300">
                <PlusCircle className="text-[#3a2e1a] group-hover:text-spotlight w-10 h-10 transition-colors" />
              </div>
              <span className="text-[#3a2e1a] group-hover:text-spotlight transition-colors font-mono text-sm tracking-wider">
                Agregar perfil
              </span>
            </button>
          )}
        </div>

        {/* Botón control parental */}
        <button
          onClick={() => setShowParental(true)}
          className="mt-12 flex items-center gap-2 text-silver/50 hover:text-spotlight transition-colors text-xs font-mono tracking-widest"
        >
          <Settings className="w-4 h-4" />
          Control Parental
        </button>
      </div>

      <CreateProfileModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onCreate={handleCreateProfile}
      />

      {showParental && (
        <ParentalControlModal
          profiles={profiles}
          userId={userId}
          onClose={() => setShowParental(false)}
          onProfilesChanged={loadProfiles}
        />
      )}
    </div>
  )
}
