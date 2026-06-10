import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { profilesAPI } from '@/api/profiles'

interface BackendProfile {
  profileId: string
  displayName: string
  isKidsMode: boolean
}

export default function ProfilesPage() {
  const navigate = useNavigate()
  const { user, setCurrentProfile } = useAuth()

  // ✅ Resuelve el mismatch: backend manda userId, el type dice id
  const userId = (user as any)?.userId ?? user?.id

  const [profiles, setProfiles] = useState<BackendProfile[]>([])
  const [loading, setLoading] = useState(true)

  const loadProfiles = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const data = await profilesAPI.listProfiles(userId)
      setProfiles(data.profiles)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [user])

  const handleSelectProfile = async (profile: BackendProfile) => {
    if (!userId) return

    try {
      const data = await profilesAPI.selectProfile(userId, profile.profileId)

      localStorage.setItem('quetxal_token', data.accessToken)

      setCurrentProfile({
        id: profile.profileId,
        name: profile.displayName,
        avatar: '👤',
        userId: userId,
      })

      navigate('/home')
    } catch (error) {
      console.error(error)
    }
  }

  const handleCreateProfile = async () => {
    if (!userId) return

    const displayName = prompt('Nombre del perfil')
    if (!displayName) return

    try {
      await profilesAPI.createProfile(userId, displayName, false)
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
              <div className="w-28 h-28 rounded border-2 border-[#3a2e1a] bg-[#1e1810] flex items-center justify-center text-5xl group-hover:border-spotlight transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(212,168,67,0.3)]">
                👤
              </div>
              <span className="text-silver group-hover:text-spotlight transition-colors font-mono text-sm tracking-wider">
                {profile.displayName}
              </span>
            </button>
          ))}

          {profiles.length < 5 && (
            <button
              onClick={handleCreateProfile}
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
      </div>
    </div>
  )
}