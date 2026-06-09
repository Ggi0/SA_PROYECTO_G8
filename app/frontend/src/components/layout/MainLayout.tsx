import { ReactNode } from 'react'
import Navbar from './Navbar'

// ─── Layout principal para páginas autenticadas ─────────
interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}