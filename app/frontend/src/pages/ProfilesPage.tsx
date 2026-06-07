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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
      <h1 className="text-white text-4xl font-bold mb-10">¿Quién está viendo?</h1>

      <div className="flex gap-6 flex-wrap justify-center">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => handleSelectProfile(profile)}
            className="flex flex-col items-center gap-3 group"
          >
            <div className="w-24 h-24 rounded-md bg-zinc-700 flex items-center justify-center text-4xl group-hover:ring-2 group-hover:ring-white transition-all">
              {profile.avatar}
            </div>
            <span className="text-zinc-400 group-hover:text-white transition-colors">
              {profile.name}
            </span>
          </button>
        ))}

        {/* Agregar perfil (máximo 5) */}
        {profiles.length < 5 && (
          <button className="flex flex-col items-center gap-3 group">
            <div className="w-24 h-24 rounded-md bg-zinc-800 flex items-center justify-center group-hover:ring-2 group-hover:ring-white transition-all">
              <PlusCircle className="text-zinc-400 group-hover:text-white w-10 h-10" />
            </div>
            <span className="text-zinc-400 group-hover:text-white transition-colors">
              Agregar perfil
            </span>
          </button>
        )}
      </div>
    </div>
  )
}