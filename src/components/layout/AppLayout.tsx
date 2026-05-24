import { type ReactNode } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { RightPanel } from './RightPanel'
import { ToastContainer } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: ReactNode
  showRightPanel?: boolean
}

export const AppLayout = ({
  children,
  showRightPanel = true,
}: AppLayoutProps) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isTablet = useMediaQuery('(min-width: 768px)')

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Desktop sidebar */}
      {isTablet && <Sidebar />}

      {/* Ana içerik */}
      <main
        className={cn(
          'min-h-screen',
          isTablet ? 'ml-[240px]' : 'mb-14', // mobilde bottom nav için
          isDesktop && showRightPanel ? 'mr-[320px]' : ''
        )}
      >
        <div
          className={cn(
            'mx-auto',
            'max-w-[600px]',
            isDesktop && showRightPanel ? 'max-w-none' : 'max-w-[600px]',
            isTablet ? 'border-x border-[var(--border)]' : ''
          )}
        >
          {children}
        </div>
      </main>

      {/* Sağ panel (desktop) */}
      {isDesktop && showRightPanel && (
        <div className="fixed right-0 top-0 h-full w-[320px] border-l border-[var(--border)] overflow-y-auto px-4 py-6">
          <RightPanel />
        </div>
      )}

      {/* Mobil alt nav */}
      {!isTablet && <MobileNav />}

      {/* Toast bildirimleri */}
      <ToastContainer />
    </div>
  )
}