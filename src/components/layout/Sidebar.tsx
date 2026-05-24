import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home,
  Compass,
  Clapperboard,
  Globe,
  Bell,
  Mail,
  Settings,
  LogOut,
  Star,
  PenSquare,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useAuth, useSignOut } from '@/hooks/useAuth'
import { useNotificationStore } from '@/store/notificationStore'

interface NavItem {
  path: string
  label: string
  icon: React.ElementType
  badge?: number
}

const useNavItems = (unreadCount: number): NavItem[] => [
  { path: '/ana-sayfa', label: 'Ana Sayfa', icon: Home },
  { path: '/kesif', label: 'Keşfet', icon: Compass },
  { path: '/reels', label: 'Reels', icon: Clapperboard },
  { path: '/sunucular', label: 'Sunucular', icon: Globe },
  {
    path: '/bildirimler',
    label: 'Bildirimler',
    icon: Bell,
    badge: unreadCount > 0 ? unreadCount : undefined,
  },
  { path: '/mesajlar', label: 'Mesajlar', icon: Mail },
]

interface SidebarNavItemProps {
  item: NavItem
  isActive: boolean
}

const SidebarNavItem = ({ item, isActive }: SidebarNavItemProps) => {
  const Icon = item.icon

  return (
    <Link
      to={item.path}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5',
        'rounded-[var(--radius-lg)]',
        'text-sm font-medium',
        'transition-all duration-[var(--transition)]',
        isActive
          ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute left-0 w-0.5 h-5 bg-[var(--accent)] rounded-full"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}

      <div className="relative">
        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        {item.badge !== undefined && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-[var(--accent)] text-[var(--text-inverse)] text-[10px] font-bold rounded-full flex items-center justify-center">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </div>

      <span>{item.label}</span>
    </Link>
  )
}

export const Sidebar = () => {
  const location = useLocation()
  const { profile } = useAuth()
  const { signOut } = useSignOut()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const navItems = useNavItems(unreadCount)

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] flex flex-col border-r border-[var(--border)] bg-[var(--bg-base)] z-40">
      {/* Logo */}
      <div className="px-4 py-5">
        <Link to="/ana-sayfa" className="flex items-center gap-2">
          <span className="font-display text-2xl text-[var(--accent)] italic">
            Orbit
          </span>
          <span className="text-[var(--text-muted)] text-xs">🪐</span>
        </Link>
      </div>

      {/* Navigasyon */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.path}
            item={item}
            isActive={location.pathname === item.path}
          />
        ))}
      </nav>

      {/* Post Oluştur */}
      <div className="px-3 py-3">
        <Button
          variant="primary"
          fullWidth
          leftIcon={<PenSquare size={16} />}
          onClick={() => {/* PostComposer modal açılır - Faz 2'de */}}
        >
          Paylaş
        </Button>
      </div>

      {/* Alt: Ayarlar / Nova+ / Çıkış */}
      <div className="border-t border-[var(--border)] p-3 space-y-0.5">
        {profile && !profile.is_nova_plus && (
          <Link
            to="/nova-plus"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5',
              'rounded-[var(--radius-lg)]',
              'text-sm font-medium text-[var(--accent)]',
              'hover:bg-[var(--accent-muted)]',
              'transition-colors duration-[var(--transition)]'
            )}
          >
            <Star size={18} />
            <span>Nova+ Al</span>
          </Link>
        )}

        <Link
          to="/ayarlar"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5',
            'rounded-[var(--radius-lg)]',
            'text-sm font-medium',
            location.pathname === '/ayarlar'
              ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
            'transition-colors duration-[var(--transition)]'
          )}
        >
          <Settings size={18} />
          <span>Ayarlar</span>
        </Link>

        <button
          onClick={signOut}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5',
            'rounded-[var(--radius-lg)]',
            'text-sm font-medium text-[var(--text-secondary)]',
            'hover:bg-[var(--bg-elevated)] hover:text-[var(--error)]',
            'transition-colors duration-[var(--transition)]'
          )}
        >
          <LogOut size={18} />
          <span>Çıkış</span>
        </button>
      </div>

      {/* Profil kısayolu */}
      {profile && (
        <Link
          to={`/${profile.username}`}
          className={cn(
            'flex items-center gap-3 p-3 m-2',
            'rounded-[var(--radius-lg)]',
            'border border-[var(--border)]',
            'bg-[var(--bg-surface)]',
            'hover:bg-[var(--bg-elevated)]',
            'transition-colors duration-[var(--transition)]'
          )}
        >
          <Avatar
            src={profile.avatar_url}
            fallback={profile.display_name}
            size="sm"
            isNova={profile.is_nova_plus}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {profile.display_name}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">
              @{profile.username}
            </p>
          </div>
        </Link>
      )}
    </aside>
  )
}