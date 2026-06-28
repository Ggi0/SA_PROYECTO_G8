import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, isKids: boolean) => void
}

export default function CreateProfileModal({
  isOpen,
  onClose,
  onCreate,
}: Props) {
  const [name, setName] = useState('')
  const [isKids, setIsKids] = useState(false)

  if (!isOpen) return null

  const handleSubmit = () => {
    if (!name.trim()) return
    onCreate(name.trim(), isKids)
    setName('')
    setIsKids(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
      <div className="bg-[#1e1810] border-2 border-spotlight p-6 rounded-md w-[320px] shadow-xl">
        
        <h2 className="text-spotlight font-display text-xl mb-4 text-center">
          Crear perfil
        </h2>

        {/* Nombre */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del perfil"
          className="w-full mb-4 px-3 py-2 bg-[#2a2116] border border-[#3a2e1a] text-parchment outline-none focus:border-spotlight"
        />

        {/* Kids Mode */}
        <label className="flex items-center gap-2 mb-4 text-silver font-mono text-sm">
          <input
            type="checkbox"
            checked={isKids}
            onChange={(e) => setIsKids(e.target.checked)}
            className="accent-spotlight"
          />
          Perfil para niños 👶
        </label>

        {/* Actions */}
        <div className="flex justify-between gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-[#3a2e1a] text-silver hover:border-red-400 hover:text-red-400 transition"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            className="flex-1 py-2 bg-spotlight text-black font-bold hover:brightness-110 transition"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  )
}