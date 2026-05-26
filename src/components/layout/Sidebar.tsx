import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, Search, Play, Globe, MessageCircle,
  Bell, User, Settings, LogOut, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'

const navItems = [
  { to: '/ana-sayfa',   icon: Home,          label: 'Ana Sayfa'   },
  { to: '/kesif',       icon: Search,        label: 'Keşfet'      },
  { to: '/reels',       icon: Play,          label: 'Reels'       },
  { to: '/sunucular',   icon: Globe,         label: 'Sunucular'   },
  { to: '/mesajlar',    icon: MessageCircle, label: 'Mesajlar'    },
  { to: '/bildirimler', icon: Bell,          label: 'Bildirimler' },
]

export default function Sidebar() {
  const { profile } = useAuthStore()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { unreadNotifications, unreadMessages } = useUnreadCounts()

  return (
    <aside className="fixed left-0 top-0 h-dvh w-[240px] flex flex-col border-r border-line bg-bg-base z-30">
      {/* Logo */}
      <div className="px-6 py-5">
        <span className="font-display text-2xl text-text-primary">Orbit</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const badge =
            (to === '/bildirimler' && unreadNotifications > 0) ||
            (to === '/mesajlar' && unreadMessages > 0)

          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-default',
                  isActive
                    ? 'bg-accent-muted text-accent'
                    : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                )
              }
            >
              <div className="relative">
                <Icon size={18} />
                {badge && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-error rounded-full" />
                )}
              </div>
              {label}
            </NavLink>
          )
        })}

        {/* Profil linki */}
        {profile && (
          <NavLink
            to={`/${profile.username}`}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-default',
                isActive
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              )
            }
          >
            <User size={18} />
            Profil
          </NavLink>
        )}

        <NavLink
          to="/ayarlar"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-default',
              isActive
                ? 'bg-accent-muted text-accent'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
            )
          }
        >
          <Settings size={18} />
          Ayarlar
        </NavLink>
      </nav>

      {/* Alt: Nova+ + profil */}
      <div className="px-3 pb-4 space-y-2">
        {/* Nova+ butonu — sadece ücretsiz kullanıcılara */}
        {profile && !profile.is_nova_plus && (
          <button
            type="button"
            onClick={() => navigate('/nova-plus')}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-accent-muted border border-accent-border hover:bg-accent/10 transition-default"
          >
            <Star size={15} className="text-accent" />
            <div className="text-left">
              <p className="text-accent text-xs font-semibold">Nova+'ya Geç</p>
              <p className="text-text-muted text-xs">500 karakter · sınırsız</p>
            </div>
          </button>
        )}

        {/* Kullanıcı kartı */}
        {profile && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg-elevated transition-default group">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-bg-elevated border border-line overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-text-muted font-medium">
                  {profile.display_name[0]?.toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-medium truncate leading-tight">
                {profile.display_name}
                {profile.is_nova_plus && <span className="text-accent ml-1 text-xs">⭐</span>}
              </p>
              <p className="text-text-muted text-xs truncate">@{profile.username}</p>
            </div>

            {/* Çıkış */}
            <button
              type="button"
              onClick={logout}
              className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition-default"
              title="Çıkış yap"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
