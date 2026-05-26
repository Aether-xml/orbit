import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import RightPanel from './RightPanel'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// Bu sayfalarda sağ panel gösterilmez
const noRightPanel = ['/mesajlar', '/reels', '/sunucular']

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const showRight = !noRightPanel.some((p) => pathname.startsWith(p))
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Realtime: bildirim ve DM sayaçlarını güncelle
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`app-realtime:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['unread-notifications', user.id] })
          void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['unread-messages', user.id] })
          void queryClient.invalidateQueries({ queryKey: ['conversations', user.id] })
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [user?.id, queryClient])

  return (
    <div className="min-h-dvh bg-bg-base">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Ana içerik alanı */}
      <div className="lg:pl-[240px]">
        <div className={`mx-auto flex ${showRight ? 'max-w-[1120px]' : 'max-w-[800px]'}`}>
          {/* Orta feed */}
          <main className="flex-1 min-w-0 min-h-dvh border-x border-line">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.12, ease: 'easeInOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Sağ panel — sadece desktop */}
          {showRight && (
            <div className="hidden xl:block pl-6 pt-4 pb-8">
              <RightPanel />
            </div>
          )}
        </div>
      </div>

      {/* Mobil alt nav */}
      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
