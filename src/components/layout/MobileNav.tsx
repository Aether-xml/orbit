import { NavLink } from 'react-router-dom'
import { Home, Search, Bell, Globe, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'

const navItems = [
  { to: '/ana-sayfa',   icon: Home,          label: 'Ana Sayfa'   },
  { to: '/kesif',       icon: Search,        label: 'Keşfet'      },
  { to: '/sunucular',   icon: Globe,         label: 'Sunucular'   },
  { to: '/bildirimler', icon: Bell,          label: 'Bildirimler' },
]

export default function MobileNav() {
  const { profile } = useAuthStore()
  const { unreadNotifications } = useUnreadCounts()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-bg-base border-t border-line pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const hasBadge = to === '/bildirimler' && unreadNotifications > 0
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-default min-w-[44px] min-h-[44px] justify-center',
                  isActive ? 'text-accent' : 'text-text-muted'
                )
              }
            >
              <div className="relative">
                <Icon size={20} />
                {hasBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-error rounded-full" />
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          )
        })}

        {/* Profil */}
        <NavLink
          to={profile?.username ? `/${profile.username}` : '/ana-sayfa'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-default min-w-[44px] min-h-[44px] justify-center',
              isActive ? 'text-accent' : 'text-text-muted'
            )
          }
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-6 h-6 rounded-full object-cover border border-line"
              loading="lazy"
            />
          ) : (
            <User size={20} />
          )}
          <span className="text-[10px] font-medium">Profil</span>
        </NavLink>
      </div>
    </nav>
  )
}
