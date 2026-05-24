import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Compass,
  Clapperboard,
  Globe,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/store/notificationStore'

const navItems = [
  { path: '/ana-sayfa', label: 'Ana Sayfa', icon: Home },
  { path: '/kesif', label: 'Keşfet', icon: Compass },
  { path: '/reels', label: 'Reels', icon: Clapperboard },
  { path: '/sunucular', label: 'Sunucular', icon: Globe },
  { path: '/bildirimler', label: 'Bildirimler', icon: Bell },
]

export const MobileNav = () => {
  const location = useLocation()
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-[var(--bg-base)] border-t border-[var(--border)]',
        'safe-bottom',
        'flex items-center'
      )}
    >
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.path
        const badge =
          item.path === '/bildirimler' && unreadCount > 0 ? unreadCount : undefined

        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex-1 flex flex-col items-center justify-center',
              'py-3 gap-1',
              'min-h-[56px]', // min 44px touch area
              'transition-colors duration-[var(--transition)]',
              isActive
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-muted)] active:text-[var(--text-primary)]'
            )}
            aria-label={item.label}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {badge !== undefined && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-[var(--accent)] text-[var(--text-inverse)] text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}