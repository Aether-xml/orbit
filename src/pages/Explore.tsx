import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Search, X, TrendingUp, Users, Globe, Hash } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { PostCard } from '@/components/post/PostCard'
import { PostCardSkeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import {
  useSearchProfiles,
  useSearchPosts,
  useSearchHashtags,
  useSearchServers,
  useTrendingHashtags,
  useSuggestedProfiles,
  useSuggestedServers,
  useFollow,
  type SearchTab,
} from '@/hooks/useSearch'
import { formatCount, cn, debounce } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Profile, Hashtag, Server } from '@/types/database'
import type { BadgeKey } from '@/types/user'
import type { PostWithProfile } from '@/hooks/usePosts'

export const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const [inputValue, setInputValue] = useState(initialQuery)
  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState<SearchTab>('profiles')
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced arama
  const debouncedSetQuery = useRef(
    debounce((val: string) => {
      setQuery(val)
      if (val) {
        setSearchParams({ q: val }, { replace: true })
      } else {
        setSearchParams({}, { replace: true })
      }
    }, 350)
  ).current

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    debouncedSetQuery(e.target.value)
  }

  const clearSearch = () => {
    setInputValue('')
    setQuery('')
    setSearchParams({}, { replace: true })
    inputRef.current?.focus()
  }

  const isSearching = query.trim().length >= 1

  return (
    <div>
      {/* Başlık + Arama */}
      <div className="sticky top-0 z-30 bg-[var(--bg-base)]/95 border-b border-[var(--border)] px-4 py-3 space-y-3">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">
          Keşfet
        </h1>

        {/* Arama kutusu */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Kişi, post, hashtag veya sunucu ara..."
            className={cn(
              'w-full h-10 pl-9 pr-9',
              'bg-[var(--bg-surface)]',
              'border border-[var(--border)] rounded-[var(--radius-full)]',
              'text-sm text-[var(--text-primary)]',
              'placeholder:text-[var(--text-muted)]',
              'outline-none',
              'focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)]',
              'transition-colors duration-[var(--transition)]'
            )}
          />
          {inputValue && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Sekme seçici (arama aktifken) */}
        {isSearching && (
          <SearchTabs activeTab={activeTab} onChange={setActiveTab} />
        )}
      </div>

      {/* İçerik */}
      <AnimatePresence mode="wait">
        {isSearching ? (
          <motion.div
            key="search-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <SearchResults
              query={query}
              activeTab={activeTab}
            />
          </motion.div>
        ) : (
          <motion.div
            key="discover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <DiscoverContent />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Sekme Seçici ──────────────────────────────────────────
const TABS: { key: SearchTab; label: string; icon: React.ElementType }[] = [
  { key: 'profiles', label: 'Kişiler', icon: Users },
  { key: 'posts', label: 'Postlar', icon: Search },
  { key: 'hashtags', label: 'Hashtagler', icon: Hash },
  { key: 'servers', label: 'Sunucular', icon: Globe },
]

const SearchTabs = ({
  activeTab,
  onChange,
}: {
  activeTab: SearchTab
  onChange: (tab: SearchTab) => void
}) => (
  <div className="flex gap-1 overflow-x-auto scrollbar-none">
    {TABS.map(({ key, label, icon: Icon }) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5',
          'rounded-[var(--radius-full)]',
          'text-xs font-medium whitespace-nowrap',
          'transition-all duration-[var(--transition)]',
          activeTab === key
            ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-muted)]'
        )}
      >
        <Icon size={13} />
        {label}
      </button>
    ))}
  </div>
)

// ── Arama Sonuçları ───────────────────────────────────────
const SearchResults = ({
  query,
  activeTab,
}: {
  query: string
  activeTab: SearchTab
}) => {
  const { toggleFollow, isFollowing, isPending, initFollowState } = useFollow()
  const { data: profiles, isLoading: loadingProfiles } = useSearchProfiles(
    activeTab === 'profiles' ? query : ''
  )
  const { data: posts, isLoading: loadingPosts } = useSearchPosts(
    activeTab === 'posts' ? query : ''
  )
  const { data: hashtags, isLoading: loadingHashtags } = useSearchHashtags(
    activeTab === 'hashtags' ? query : ''
  )
  const { data: servers, isLoading: loadingServers } = useSearchServers(
    activeTab === 'servers' ? query : ''
  )

  // Profil follow state'ini başlat
  useEffect(() => {
    if (profiles && profiles.length > 0) {
      initFollowState(profiles.map((p) => p.id))
    }
  }, [profiles, initFollowState])

  if (activeTab === 'profiles') {
    return (
      <ProfileResults
        profiles={profiles ?? []}
        isLoading={loadingProfiles}
        query={query}
        onFollow={toggleFollow}
        isFollowing={isFollowing}
        isPending={isPending}
      />
    )
  }

  if (activeTab === 'posts') {
    return (
      <PostResults
        posts={posts ?? []}
        isLoading={loadingPosts}
        query={query}
      />
    )
  }

  if (activeTab === 'hashtags') {
    return (
      <HashtagResults
        hashtags={hashtags ?? []}
        isLoading={loadingHashtags}
        query={query}
      />
    )
  }

  if (activeTab === 'servers') {
    return (
      <ServerResults
        servers={servers ?? []}
        isLoading={loadingServers}
        query={query}
      />
    )
  }

  return null
}

// ── Profil Sonuçları ──────────────────────────────────────
interface ProfileResultsProps {
  profiles: Profile[]
  isLoading: boolean
  query: string
  onFollow: (id: string, isPrivate: boolean) => void
  isFollowing: (id: string) => boolean
  isPending: (id: string) => boolean
}

const ProfileResults = ({
  profiles,
  isLoading,
  query,
  onFollow,
  isFollowing,
  isPending,
}: ProfileResultsProps) => {
  if (isLoading) return <ProfileListSkeleton />

  if (profiles.length === 0) {
    return <EmptyResult message={`"${query}" için kullanıcı bulunamadı.`} />
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {profiles.map((profile) => (
        <ProfileRow
          key={profile.id}
          profile={profile}
          isFollowing={isFollowing(profile.id)}
          isPending={isPending(profile.id)}
          onFollow={() => onFollow(profile.id, profile.is_private)}
        />
      ))}
    </div>
  )
}

// ── Profil Satırı ─────────────────────────────────────────
interface ProfileRowProps {
  profile: Profile
  isFollowing: boolean
  isPending: boolean
  onFollow: () => void
  showBio?: boolean
}

export const ProfileRow = ({
  profile,
  isFollowing,
  isPending,
  onFollow,
  showBio = true,
}: ProfileRowProps) => {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const isOwn = currentUser?.id === profile.id

  const followLabel = isFollowing
    ? 'Takip Ediliyor'
    : isPending
    ? 'İstek Gönderildi'
    : profile.is_private
    ? 'İstek Gönder'
    : 'Takip Et'

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
      onClick={() => navigate(`/${profile.username}`)}
    >
      <Avatar
        src={profile.avatar_url}
        fallback={profile.display_name}
        size="md"
        isNova={profile.is_nova_plus}
        className="shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {profile.display_name}
          </span>
          {profile.selected_badge && (
            <Badge badgeKey={profile.selected_badge as BadgeKey} size="sm" />
          )}
          {profile.is_verified && (
            <span className="text-[var(--info)] text-xs shrink-0">✓</span>
          )}
          {profile.is_private && (
            <span className="text-[var(--text-muted)] text-xs shrink-0">🔒</span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] truncate">
          @{profile.username} · {formatCount(profile.follower_count)} takipçi
        </p>
        {showBio && profile.bio && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">
            {profile.bio}
          </p>
        )}
      </div>

      {!isOwn && (
        <Button
          size="sm"
          variant={isFollowing || isPending ? 'outline' : 'primary'}
          onClick={(e) => {
            e.stopPropagation()
            onFollow()
          }}
          className="shrink-0"
        >
          {followLabel}
        </Button>
      )}
    </div>
  )
}

// ── Post Sonuçları ────────────────────────────────────────
const PostResults = ({
  posts,
  isLoading,
  query,
}: {
  posts: PostWithProfile[]
  isLoading: boolean
  query: string
}) => {
  if (isLoading) {
    return (
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return <EmptyResult message={`"${query}" için post bulunamadı.`} />
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}

// ── Hashtag Sonuçları ─────────────────────────────────────
const HashtagResults = ({
  hashtags,
  isLoading,
  query,
}: {
  hashtags: Hashtag[]
  isLoading: boolean
  query: string
}) => {
  if (isLoading) return <HashtagListSkeleton />

  if (hashtags.length === 0) {
    return <EmptyResult message={`"${query}" için hashtag bulunamadı.`} />
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {hashtags.map((hashtag) => (
        <HashtagRow key={hashtag.id} hashtag={hashtag} />
      ))}
    </div>
  )
}

const HashtagRow = ({ hashtag }: { hashtag: Hashtag }) => (
  <Link
    to={`/kesif?q=%23${hashtag.name}`}
    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors"
  >
    <div className="w-10 h-10 rounded-[var(--radius-full)] bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center shrink-0">
      <Hash size={18} className="text-[var(--accent)]" />
    </div>
    <div>
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        #{hashtag.name}
      </p>
      <p className="text-xs text-[var(--text-muted)]">
        {formatCount(hashtag.post_count)} post
      </p>
    </div>
  </Link>
)

// ── Sunucu Sonuçları ──────────────────────────────────────
const ServerResults = ({
  servers,
  isLoading,
  query,
}: {
  servers: Server[]
  isLoading: boolean
  query: string
}) => {
  if (isLoading) return <ServerListSkeleton />

  if (servers.length === 0) {
    return <EmptyResult message={`"${query}" için sunucu bulunamadı.`} />
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {servers.map((server) => (
        <ServerRow key={server.id} server={server} />
      ))}
    </div>
  )
}

const ServerRow = ({ server }: { server: Server }) => {
  const navigate = useNavigate()

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
      onClick={() => navigate(`/sunucular/${server.id}`)}
    >
      <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
        {server.avatar_url ? (
          <img
            src={server.avatar_url}
            alt={server.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Globe size={18} className="text-[var(--text-muted)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
          {server.name}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {formatCount(server.member_count)} üye
        </p>
        {server.description && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">
            {server.description}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/sunucular/${server.id}`)
        }}
      >
        Gör
      </Button>
    </div>
  )
}

// ── Keşfet Ana İçerik ─────────────────────────────────────
const DiscoverContent = () => {
  const { data: trending, isLoading: loadingTrending } = useTrendingHashtags()
  const { data: suggested, isLoading: loadingSuggested } = useSuggestedProfiles()
  const { data: servers, isLoading: loadingServers } = useSuggestedServers()
  const { toggleFollow, isFollowing, isPending, initFollowState } = useFollow()

  useEffect(() => {
    if (suggested && suggested.length > 0) {
      initFollowState(suggested.map((p) => p.id))
    }
  }, [suggested, initFollowState])

  return (
    <div className="divide-y divide-[var(--border)]">
      {/* Trend Hashtagler */}
      <section className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Gündemde
          </h2>
        </div>

        {loadingTrending ? (
          <TrendingSkeleton />
        ) : (
          <div className="space-y-1">
            {(trending ?? []).map((hashtag, i) => (
              <Link
                key={hashtag.id}
                to={`/kesif?q=%23${hashtag.name}`}
                className="flex items-center justify-between py-2 px-3 rounded-[var(--radius-md)] hover:bg-[var(--bg-surface)] transition-colors"
              >
                <div>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    #{i + 1} · Trend
                  </p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    #{hashtag.name}
                  </p>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {formatCount(hashtag.post_count)} post
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Önerilen Kişiler */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Önerilen Kişiler
            </h2>
          </div>
          <Link
            to="/kesif?tab=profiles"
            className="text-xs text-[var(--accent)] hover:underline"
          >
            Tümü
          </Link>
        </div>

        {loadingSuggested ? (
          <ProfileListSkeleton count={3} />
        ) : (suggested ?? []).length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            Şimdilik öneri yok.
          </p>
        ) : (
          <div className="space-y-1">
            {(suggested ?? []).map((profile) => (
              <ProfileRow
                key={profile.id}
                profile={profile}
                isFollowing={isFollowing(profile.id)}
                isPending={isPending(profile.id)}
                onFollow={() => toggleFollow(profile.id, profile.is_private)}
                showBio={false}
              />
            ))}
          </div>
        )}
      </section>

      {/* Önerilen Sunucular */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Keşfedilecek Sunucular
            </h2>
          </div>
          <Link
            to="/sunucular"
            className="text-xs text-[var(--accent)] hover:underline"
          >
            Tümü
          </Link>
        </div>

        {loadingServers ? (
          <ServerListSkeleton count={3} />
        ) : (servers ?? []).length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            Katılabileceğin sunucu bulunamadı.
          </p>
        ) : (
          <div className="space-y-1">
            {(servers ?? []).map((server) => (
              <ServerRow key={server.id} server={server} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ── Skeleton Bileşenleri ──────────────────────────────────
const ProfileListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="divide-y divide-[var(--border)]">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-10 h-10 shrink-0" rounded="full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="w-28 h-3.5" />
          <Skeleton className="w-20 h-3" />
        </div>
        <Skeleton className="w-20 h-8" />
      </div>
    ))}
  </div>
)

const HashtagListSkeleton = () => (
  <div className="divide-y divide-[var(--border)]">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-10 h-10 shrink-0" rounded="full" />
        <div className="space-y-1.5">
          <Skeleton className="w-24 h-3.5" />
          <Skeleton className="w-16 h-3" />
        </div>
      </div>
    ))}
  </div>
)

const ServerListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="divide-y divide-[var(--border)]">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-10 h-10 shrink-0" rounded="md" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="w-28 h-3.5" />
          <Skeleton className="w-16 h-3" />
        </div>
        <Skeleton className="w-14 h-8" />
      </div>
    ))}
  </div>
)

const TrendingSkeleton = () => (
  <div className="space-y-1">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between py-2 px-3">
        <div className="space-y-1">
          <Skeleton className="w-12 h-2.5" />
          <Skeleton className="w-24 h-3.5" />
        </div>
        <Skeleton className="w-14 h-3" />
      </div>
    ))}
  </div>
)

// ── Boş Sonuç ─────────────────────────────────────────────
const EmptyResult = ({ message }: { message: string }) => (
  <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
    <span className="text-4xl">🔭</span>
    <p className="text-sm text-[var(--text-muted)]">{message}</p>
  </div>
)