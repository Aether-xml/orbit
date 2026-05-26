import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mobile bağlantı dalgalanmalarına karşı sağlamlaştır:
      staleTime: 1000 * 30,        // 30sn (5dk yerine) — kısa süre fresh, sonra revalidate
      gcTime:    1000 * 60 * 5,    // 5dk inactive cache tut
      retry: 3,                     // 1 yerine 3 — geçici hatalar tek fail'le ölmesin
      retryDelay: (i) => Math.min(1000 * 2 ** i, 5000),
      refetchOnWindowFocus: false, // mobile için kapalı kalsın
      refetchOnReconnect: 'always',// ağ tekrar gelirse zorla refetch (kritik)
      refetchOnMount: true,        // sayfa açılınca stale ise refetch
    },
    mutations: {
      retry: 1,
    },
  },
})

const root = document.getElementById('root')
if (!root) throw new Error('#root elementi bulunamadı')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
