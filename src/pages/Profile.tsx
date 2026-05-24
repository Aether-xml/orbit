import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Grid3x3, FileText, Clapperboard, Heart, Bookmark, Lock } from 'lucide-react'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { PostCard } from '@/components/post/PostCard'
import { PostCardSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { BadgeDisplay } from '@/components/profile/BadgeDisplay'
import { Button } from '@/components/ui/Button'
import {
  useProfile,
  useFollowStatus,
  useUserPosts,
  useUserReels,
  useUserLikes,
  useUserBookmarks,
} from '@/hooks/useProfile'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { PostWithProfile } from '@/hooks/usePosts'

type ProfileTab = 'posts' | 'reels' | 'media' | 'likes' | 'bookmarks'

const TABS: { key: ProfileTab; label: string; icon: React.ElementType }[] = [
  { key: 'posts', label: 'Postlar', icon: FileText },
  { key: 'reels', label: 'Reels', icon: Clapperboard },
  { key: 'media', label: 'Medya', icon: Grid3x3 },
  { key: 'likes', label: 'Beğeniler', icon: Heart },
  { key: 'bookmarks', label: 'Kaydedilenler', icon: Bookmark },
]

export const Profile = () => {
  const { username } = useParams<{ username: string }>()
  const currentUser = useAuthStore((s) => s.user)
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts')

  const { data: profile, isLoading, isError } = useProfile(username ?? '')
  const { data: followStatus } = useFollowStatus(profile?.id ?? '')

  const isOwn = currentUser?.id === profile?.id
  const isPrivate = profile?.is_private ?? false
  const canViewContent =
    isOwn || !isPrivate || followStatus?.isFollowing

  if (!username) return <Navigate to="/ana-sayfa" replace />

  if (isError) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--text-secondary)]">Kullanıcı bulunamadı.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Profil başlığı */}
      <ProfileHeader
        profile={profile ?? ({} as Parameters<typeof ProfileHeader>[0]['profile'])}
        isLoading={isLoading}
      />

      {/* Özel hesap: takip etmiyorsan içerik görünmez */}
      {!isLoading && isPrivate && !canViewContent && (
        <PrivateAccountNotice />
      )}

      {/* İçerik sekmeleri */}
      {!isLoading && canViewContent && profile && (
        <>
          <ProfileTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            isOwn={isOwn}
          />
          <ProfileContent
            profile={profile}
            activeTab={activeTab}
            isOwn={isOwn}
          />
        </>
      )}
    </div>
  )
}

// ── Sekme Seçici ──────────────────────────────────────────
const ProfileTabs = ({
  activeTab,
  onChange,
  isOwn,
}: {
  activeTab: ProfileTab
  onChange: (tab: ProfileTab) => void
  isOwn: boolean
}) => {
  const visibleTabs = TABS.filter((t) => {
    // Kaydedilenler sadece kendi profilinde görünür
    if (t.key === 'bookmarks' && !isOwn) return false
    return true
  })

  return (
    <div className="sticky top-0 z-20 bg-[var(--bg-base)] border-b border-[var(--border)]">
      <div className="flex overflow-x-auto scrollbar-none">
        {visibleTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3',
              'text-xs font-medium whitespace-nowrap',
              'relative transition-colors duration-[var(--transition)]',
              activeTab === key
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            <Icon size={14} />
            {label}
            {activeTab === key && (
              <motion.div
                layoutId="profile-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Profil İçerik ─────────────────────────────────────────
interface ProfileContentProps {
  profile: NonNullable<ReturnType<typeof useProfile>['data']>
  activeTab: ProfileTab
  isOwn: boolean
}

const ProfileContent = ({
  profile,
  activeTab,
  isOwn,
}: ProfileContentProps) => {
  const { data: posts, isLoading: loadingPosts } = useUserPosts(profile.id)
  const { data: reels, isLoading: loadingReels } = useUserReels(profile.id)
  const { data: likes, isLoading: loadingLikes } = useUserLikes(profile.id)
  const { data: bookmarks, isLoading: loadingBookmarks } = useUserBookmarks(
    profile.id
  )

  if (activeTab === 'posts') {
    if (loadingPosts) return <PostListSkeleton />
    if ((posts ?? []).length === 0) {
      return (
        <EmptyTab
          message="Henüz post paylaşılmamış."
          icon="📝"
        />
      )
    }
    return (
      <div className="divide-y divide-[var(--border)]">
        {(posts ?? []).map((post) => (
          <PostCard
            key={post.id}
            post={post as PostWithProfile}
          />
        ))}
      </div>
    )
  }

  if (activeTab === 'reels') {
    if (loadingReels) return <GridSkeleton />
    if ((reels ?? []).length === 0) {
      return <EmptyTab message="Henüz reel paylaşılmamış." icon="🎬" />
    }
    return (
      <ReelGrid reels={reels ?? []} />
    )
  }

  if (activeTab === 'media') {
    // Medya postları (media_urls.length > 0)
    const mediaPosts = (posts ?? []).filter((p) => p.media_urls?.length > 0)
    if (loadingPosts) return <GridSkeleton />
    if (mediaPosts.length === 0) {
      return <EmptyTab message="Henüz medya paylaşılmamış." icon="🖼️" />
    }
    return <MediaGrid posts={mediaPosts} />
  }

  if (activeTab === 'likes') {
    if (loadingLikes) return <PostListSkeleton />
    if ((likes ?? []).length === 0) {
      return <EmptyTab message="Henüz beğenilen post yok." icon="❤️" />
    }
    return (
      <div className="divide-y divide-[var(--border)]">
        {(likes ?? []).map((post) =>
          post ? (
            <PostCard
              key={(post as PostWithProfile).id}
              post={post as PostWithProfile}
            />
          ) : null
        )}
      </div>
    )
  }

  if (activeTab === 'bookmarks') {
    if (loadingBookmarks) return <PostListSkeleton />
    if ((bookmarks ?? []).length === 0) {
      return <EmptyTab message="Henüz kaydedilen post yok." icon="🔖" />
    }
    return (
      <div className="divide-y divide-[var(--border)]">
        {(bookmarks ?? []).map((post) =>
          post ? (
            <PostCard
              key={(post as PostWithProfile).id}
              post={post as PostWithProfile}
            />
          ) : null
        )}
      </div>
    )
  }

  return null
}

// ── Reel Grid ─────────────────────────────────────────────
import type { Reel } from '@/types/database'

const ReelGrid = ({ reels }: { reels: Reel[] }) => (
  <div className="grid grid-cols-3 gap-0.5">
    {reels.map((reel) => (
      <div
        key={reel.id}
        className="relative aspect-[9/16] bg-[var(--bg-elevated)] overflow-hidden cursor-pointer group"
      >
        {reel.thumbnail_url ? (
          <img
            src={reel.thumbnail_url}
            alt="Reel"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <video
            src={reel.video_url}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
        )}
        <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs">
          <Clapperboard size={10} />
          <span>{reel.view_count}</span>
        </div>
      </div>
    ))}
  </div>
)

// ── Medya Grid ────────────────────────────────────────────
const MediaGrid = ({ posts }: { posts: ReturnType<typeof useUserPosts>['data'] }) => (
  <div className="grid grid-cols-3 gap-0.5">
    {(posts ?? []).map((post) => {
      const firstMedia = post.media_urls?.[0]
      const firstType = post.media_types?.[0]
      if (!firstMedia) return null

      return (
        <div
          key={post.id}
          className="relative aspect-square bg-[var(--bg-elevated)] overflow-hidden cursor-pointer group"
        >
          {firstType === 'video' ? (
            <video
              src={firstMedia}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
          ) : (
            <img
              src={firstMedia}
              alt="Medya"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          )}
          {post.media_urls.length > 1 && (
            <div className="absolute top-1 right-1 bg-black/60 rounded-sm px-1 py-0.5 text-white text-[10px]">
              +{post.media_urls.length - 1}
            </div>
          )}
        </div>
      )
    })}
  </div>
)

// ── Özel Hesap Uyarısı ────────────────────────────────────
const PrivateAccountNotice = () => (
  <div className="py-16 flex flex-col items-center gap-4 px-6 text-center border-t border-[var(--border)]">
    <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center">
      <Lock size={24} className="text-[var(--text-muted)]" />
    </div>
    <div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
        Bu hesap gizli
      </h3>
      <p className="text-sm text-[var(--text-muted)] max-w-xs">
        Bu hesabın paylaşımlarını görmek için takip etmen gerekiyor.
      </p>
    </div>
  </div>
)

// ── Skeleton ve Empty ─────────────────────────────────────
const PostListSkeleton = () => (
  <div className="divide-y divide-[var(--border)]">
    {Array.from({ length: 3 }).map((_, i) => (
      <PostCardSkeleton key={i} />
    ))}
  </div>
)

const GridSkeleton = () => (
  <div className="grid grid-cols-3 gap-0.5">
    {Array.from({ length: 9 }).map((_, i) => (
      <Skeleton key={i} className="aspect-square" rounded="sm" />
    ))}
  </div>
)

const EmptyTab = ({
  message,
  icon,
}: {
  message: string
  icon: string
}) => (
  <div className="py-16 flex flex-col items-center gap-3 text-center">
    <span className="text-4xl">{icon}</span>
    <p className="text-sm text-[var(--text-muted)]">{message}</p>
  </div>
)