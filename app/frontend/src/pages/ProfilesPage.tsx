import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { mockProfiles } from '@/services/mock/mockData'
import { Profile } from '@/types'
import { PlusCircle } from 'lucide-react'

export default function ProfilesPage() {
  const navigate = useNavigate()
  const { user, setCurrentProfile } = useAuth()

  const profiles = user?.profiles ?? mockProfiles

  const handleSelectProfile = (profile: Profile) => {
    setCurrentProfile(profile)
    navigate('/home')
  }

  return (
    <div className="min-h-screen bg-[#1a1408] flex flex-col items-center justify-center relative overflow-hidden">

      {/* Fondo decorativo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#2C2416_0%,_#0f0b04_70%)]" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-spotlight to-transparent opacity-60" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-spotlight to-transparent opacity-60" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="border-2 border-spotlight px-6 py-2 mb-4">
          <span className="font-display text-2xl font-bold text-spotlight tracking-widest">
            QUETXAL TV
          </span>
        </div>

        {/* Título */}
        <div className="flex items-center gap-3 mb-12">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-spotlight/40" />
          <h1 className="font-display text-3xl font-bold text-parchment">
            ¿Quién está viendo?
          </h1>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-spotlight/40" />
        </div>

        {/* Perfiles */}
        <div className="flex gap-8 flex-wrap justify-center">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleSelectProfile(profile)}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="w-28 h-28 rounded border-2 border-[#3a2e1a] bg-[#1e1810] flex items-center justify-center text-5xl group-hover:border-spotlight transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(212,168,67,0.3)]">
                {profile.avatar}
              </div>
              <span className="text-silver group-hover:text-spotlight transition-colors font-mono text-sm tracking-wider">
                {profile.name}
              </span>
            </button>
          ))}

          {/* Agregar perfil */}
          {profiles.length < 5 && (
            <button className="flex flex-col items-center gap-3 group">
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