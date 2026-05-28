import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useAuthInit } from '@/hooks/useAuth'
import { ToastContainer } from '@/components/ui/Toast'
import ErrorBoundary from '@/components/ErrorBoundary'
import AppLayout from '@/components/layout/AppLayout'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Feed from '@/pages/Feed'
import PostDetail from '@/pages/PostDetail'
import Profile from '@/pages/Profile'
import Explore from '@/pages/Explore'
import HashtagFeed from '@/pages/HashtagFeed'
import Notifications from '@/pages/Notifications'
import Messages from '@/pages/Messages'
import Conversation from '@/pages/Conversation'
import Reels from '@/pages/Reels'
import CreateReel from '@/pages/CreateReel'
import NovaPlus from '@/pages/NovaPlus'
import Settings from '@/pages/Settings'
import EditProfile from '@/pages/EditProfile'
import EditProfileField from '@/pages/EditProfileField'
import Servers from '@/pages/Servers'
import ServerPage from '@/pages/ServerPage'
import Onboarding from '@/pages/Onboarding'
import GoogleSetup from '@/pages/GoogleSetup'

function ProtectedRoute({ children, skipSetupCheck = false }: { children: React.ReactNode; skipSetupCheck?: boolean }) {
  const { user, profile, isInitialized } = useAuthStore()
  if (!isInitialized) return <AppLoader />
  if (!user) return <Navigate to="/giris" replace />
  if (!skipSetupCheck && profile?.google_setup_done === false) {
    return <Navigate to="/google-setup" replace />
  }
  return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore()
  if (!isInitialized) return <AppLoader />
  if (user) return <Navigate to="/ana-sayfa" replace />
  return <>{children}</>
}

function AppLoader() {
  return (
    <div className="min-h-dvh bg-bg-base flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppRoutes() {
  useAuthInit()
  return (
    <Routes>
      {/* Guest-only */}
      <Route path="/"      element={<GuestRoute><Landing /></GuestRoute>} />
      <Route path="/giris" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/kayit" element={<GuestRoute><Register /></GuestRoute>} />

      {/* Protected — AppLayout içinde */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/ana-sayfa"       element={<Feed />} />
        <Route path="/gonderi/:id"     element={<PostDetail />} />
        <Route path="/kesif"           element={<Explore />} />
        <Route path="/etiket/:tag"     element={<HashtagFeed />} />
        <Route path="/bildirimler"     element={<Notifications />} />
        <Route path="/mesajlar"        element={<Messages />} />
        <Route path="/mesajlar/:id"    element={<Conversation />} />
        <Route path="/nova-plus"               element={<NovaPlus />} />
        <Route path="/ayarlar"               element={<Settings />} />
        <Route path="/sunucular"             element={<Servers />} />
        <Route path="/sunucular/:serverId"             element={<ServerPage />} />
        <Route path="/sunucular/:serverId/kanal/:channelId" element={<ServerPage />} />
        <Route path="/:username"             element={<Profile />} />
      </Route>

      {/* Full-screen routes (no AppLayout) */}
      <Route path="/reels"          element={<ProtectedRoute><Reels /></ProtectedRoute>} />
      <Route path="/reels/olustur"  element={<ProtectedRoute><CreateReel /></ProtectedRoute>} />
      <Route path="/profil-duzenle" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
      <Route path="/profil-duzenle/:field" element={<ProtectedRoute><EditProfileField /></ProtectedRoute>} />
      <Route path="/onboarding"     element={<ProtectedRoute skipSetupCheck><Onboarding /></ProtectedRoute>} />
      <Route path="/google-setup"   element={<ProtectedRoute skipSetupCheck><GoogleSetup /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
