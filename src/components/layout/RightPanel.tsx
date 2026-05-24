import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingUp, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import {
  useTrendingHashtags,
  useSuggestedProfiles,
  useFollow,
} from '@/hooks/useSearch'
import { formatCount, cn } from '@/lib/utils'
import type { Profile } from '@/types/database'
import type { BadgeKey } from '@/types/user'

export const RightPanel = () => {
  return (
    <aside className="space-y-4">
      <SearchBox />
      <TrendingSection />
      <SuggestedProfiles />
    </aside>
  )
}

// ── Arama kutusu ──────────────────────────────────────────
const SearchBox = () => (
  <Link
    to="/kesif"
    className={cn(
      'flex items-center gap-3 w-full px-4 py-2.5',
      'bg-[var(--bg-surface)] border border-[var(--border)]',
      'rounded-[var(--radius-full)]',
      'text-[var(--text-muted)] text-sm',
      'hover:border-[var(--accent)]',
      'transition-colors duration-[var(--transition)]'
    )}
  >
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
    Ara...
  </Link>
)

// ── Trendler ──────────────────────────────────────────────
const TrendingSection = () => {
  const { data: trends, isLoading } = useTrendingHashtags()

  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <TrendingUp size={15} className="text-[var(--accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Gündemde
        </h3>
      </div>

      <div>
        {isLoading ? (
          <TrendingSkeleton />
        ) : (trends ?? []).length === 0 ? (
          <p className="px-4 py-3 text-xs text-[var(--text-muted)]">
            Henüz trend yok.
          </p>
        ) : (
          (trends ?? []).slice(0, 5).map((trend, i) => (
            <Link
              key={trend.id}
              to={`/kesif?q=%23${trend.name}`}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  #{i + 1} Trend
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  #{trend.name}
                </p>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {formatCount(trend.post_count)}
              </p>
            </Link>
          ))
        )}
      </div>

      <Link
        to="/kesif"
        className="block px-4 py-2.5 text-xs text-[var(--accent)] hover:bg-[var(--bg-elevated)] transition-colors text-center border-t border-[var(--border)]"
      >
        Daha fazla gör
      </Link>
    </section>
  )
}

// ── Önerilen Hesaplar ─────────────────────────────────────
const SuggestedProfiles = () => {
  const { data: profiles, isLoading } = useSuggestedProfiles()
  const { toggleFollow, isFollowing, isPending, initFollowState } = useFollow()

  useEffect(() => {
    if (profiles && profiles.length > 0) {
      initFollowState(profiles.map((p) => p.id))
    }
  }, [profiles, initFollowState])

  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Önerilen Hesaplar
          </h3>
        </div>
        <Link
          to="/kesif"
          className="text-xs text-[var(--accent)] hover:underline"
        >
          Tümü
        </Link>
      </div>

      <div>
        {isLoading ? (
          <ProfileSkeleton />
        ) : (profiles ?? []).length === 0 ? (
          <p className="px-4 py-3 text-xs text-[var(--text-muted)]">
            Şimdilik öneri yok.
          </p>
        ) : (
          (profiles ?? []).slice(0, 4).map((profile) => (
            <SuggestedProfileRow
              key={profile.id}
              profile={profile}
              isFollowing={isFollowing(profile.id)}
              isPending={isPending(profile.id)}
              onFollow={() => toggleFollow(profile.id, profile.is_private)}
            />
          ))
        )}
      </div>
    </section>
  )
}

// ── Profil Satırı (sağ panel için küçük) ──────────────────
interface SuggestedProfileRowProps {
  profile: Profile
  isFollowing: boolean
  isPending: boolean
  onFollow: () => void
}

const SuggestedProfileRow = ({
  profile,
  isFollowing,
  isPending,
  onFollow,
}: SuggestedProfileRowProps) => {
  const navigate = useNavigate()

  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
      onClick={() => navigate(`/${profile.username}`)}
    >
      <Avatar
        src={profile.avatar_url}
        fallback={profile.display_name}
        size="sm"
        isNova={profile.is_nova_plus}
        className="shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
            {profile.display_name}
          </span>
          {profile.selected_badge && (
            <Badge badgeKey={profile.selected_badge as BadgeKey} size="sm" />
          )}
          {profile.is_private && (
            <span className="text-[var(--text-muted)] text-[10px] shrink-0">
              🔒
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] truncate">
          @{profile.username}
        </p>
      </div>

      <Button
        size="sm"
        variant={isFollowing || isPending ? 'outline' : 'primary'}
        onClick={(e) => {
          e.stopPropagation()
          onFollow()
        }}
        className="shrink-0 text-xs px-2.5 h-7"
      >
        {isFollowing ? 'Takipte' : isPending ? 'Bekliyor' : 'Takip Et'}
      </Button>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────
const TrendingSkeleton = () => (
  <div>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between px-4 py-2.5">
        <div className="space-y-1">
          <Skeleton className="w-10 h-2.5" />
          <Skeleton className="w-20 h-3.5" />
        </div>
        <Skeleton className="w-10 h-3" />
      </div>
    ))}
  </div>
)

const ProfileSkeleton = () => (
  <div>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex items-center gap-2.5 px-4 py-2.5">
        <Skeleton className="w-8 h-8 shrink-0" rounded="full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-14 h-2.5" />
        </div>
        <Skeleton className="w-14 h-7" />
      </div>
    ))}
  </div>
)