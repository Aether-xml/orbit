import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, lazy, type ReactNode, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthListener, useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'

// Lazy imports
const Landing = lazy(() =>
  import('@/pages/Landing').then((m) => ({ default: m.Landing }))
)
const Login = lazy(() =>
  import('@/pages/Login').then((m) => ({ default: m.Login }))
)
const Register = lazy(() =>
  import('@/pages/Register').then((m) => ({ default: m.Register }))
)
const Feed = lazy(() =>
  import('@/pages/Feed').then((m) => ({ default: m.Feed }))
)
const Explore = lazy(() =>
  import('@/pages/Explore').then((m) => ({ default: m.Explore }))
)
const Reels = lazy(() =>
  import('@/pages/Reels').then((m) => ({ default: m.Reels }))
)
const Servers = lazy(() =>
  import('@/pages/Servers').then((m) => ({ default: m.Servers }))
)
const ServerDetail = lazy(() =>
  import('@/pages/ServerDetail').then((m) => ({ default: m.ServerDetail }))
)
const Profile = lazy(() =>
  import('@/pages/Profile').then((m) => ({ default: m.Profile }))
)
const PostDetail = lazy(() =>
  import('@/pages/PostDetail').then((m) => ({ default: m.PostDetail }))
)
const Messages = lazy(() =>
  import('@/pages/Messages').then((m) => ({ default: m.Messages }))
)
const Conversation = lazy(() =>
  import('@/pages/Conversation').then((m) => ({ default: m.Conversation }))
)
const Notifications = lazy(() =>
  import('@/pages/Notifications').then((m) => ({ default: m.Notifications }))
)
const Settings = lazy(() =>
  import('@/pages/Settings').then((m) => ({ default: m.Settings }))
)
const NovaPlus = lazy(() =>
  import('@/pages/NovaPlus').then((m) => ({ default: m.NovaPlus }))
)

// ── QueryClient ───────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// ── Korumalı Route ────────────────────────────────────────
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isInitialized } = useAuth()

  if (!isInitialized) return <PageLoadingSkeleton />
  if (!isAuthenticated) return <Navigate to="/giris" replace />
  return <>{children}</>
}

// ── Sayfa geçiş animasyonu ────────────────────────────────
const PageTransition = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
)

// ── Global yükleme ────────────────────────────────────────
const PageLoadingSkeleton = () => (
  <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
    <div className="text-center space-y-4">
      <span className="font-display text-3xl text-[var(--accent)] italic">
        Orbit
      </span>
      <div className="flex gap-1.5 justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-[var(--accent)]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  </div>
)

// ── Auth Provider ─────────────────────────────────────────
const AuthProvider = ({ children }: { children: ReactNode }) => {
  useAuthListener()
  return <>{children}</>
}

// ── 404 ──────────────────────────────────────────────────
const NotFound = () => (
  <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center text-center p-6">
    <div>
      <p className="font-display text-6xl text-[var(--accent)] italic mb-4">
        404
      </p>
      <p className="text-[var(--text-secondary)] mb-6">
        Bu sayfa yörüngede değil.
      </p>
      <a href="/ana-sayfa" className="text-[var(--accent)] hover:underline text-sm">
        Ana sayfaya dön
      </a>
    </div>
  </div>
)

// ── Routes ────────────────────────────────────────────────
const AppRoutes = () => {
  const { isInitialized } = useAuth()

  if (!isInitialized) return <PageLoadingSkeleton />

  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <AnimatePresence mode="wait">
        <Routes>
          {/* ── Public ── */}
          <Route
            path="/"
            element={
              <PageTransition>
                <Landing />
              </PageTransition>
            }
          />
          <Route
            path="/giris"
            element={
              <PageTransition>
                <Login />
              </PageTransition>
            }
          />
          <Route
            path="/kayit"
            element={
              <PageTransition>
                <Register />
              </PageTransition>
            }
          />

          {/* ── Ana Sayfa ── */}
          <Route
            path="/ana-sayfa"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PageTransition>
                    <Feed />
                  </PageTransition>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* ── Keşfet ── */}
          <Route
            path="/kesif"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PageTransition>
                    <Explore />
                  </PageTransition>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* ── Reels ── */}
          <Route
            path="/reels"
            element={
              <ProtectedRoute>
                <AppLayout showRightPanel={false}>
                  <PageTransition>
                    <Reels />
                  </PageTransition>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* ── Sunucular ── */}
          <Route
            path="/sunucular"
            element={
              <ProtectedRoute>
                <AppLayout showRightPanel={false}>
                  <PageTransition>
                    <Servers />
                  </PageTransition>
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sunucular/:id"
            element={
              <ProtectedRoute>
                <AppLayout showRightPanel={false}>
                  <PageTransition>
                    <ServerDetail />
                  </PageTransition>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* ── Post Detay ── */}
          <Route
            path="/post/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PageTransition>
                    <PostDetail />
                  </PageTransition>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* ── Mesajlar ── */}
          <Route
            path="/mesajlar"
            element={
              <ProtectedRoute>
                <AppLayout showRightPanel={false}>
                  <PageTransition>
                    <Messages />
                  </PageTransition>
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mesajlar/:id"
            element={
              <ProtectedRoute>
                <AppLayout showRightPanel={false}>
                  <PageTransition>
                    <Conversation />
                  </PageTransition>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* ── Bildirimler ── */}
          <Route
            path="/bildirimler"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PageTransition>
                    <Notifications />
                  </PageTransition>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* ── Ayarlar ── */}
          <Route
            path="/ayarlar"
            element={
              <ProtectedRoute>
                <AppLayout showRightPanel={false}>
                  <PageTransition>
                    <Settings />
                  </PageTransition>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* ── Nova+ ── */}
          <Route
            path="/nova-plus"
            element={
              <ProtectedRoute>
                <AppLayout showRightPanel={false}>
                  <PageTransition>
                    <NovaPlus />
                  </PageTransition>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* ── Profil (en sona koy — catch-all olmasın diye) ── */}
          <Route
            path="/:username"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PageTransition>
                    <Profile />
                  </PageTransition>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* ── 404 ── */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}

// ── Ana App ───────────────────────────────────────────────
export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}