import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

import App from './App.tsx'
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
        <App />
         </QueryClientProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
