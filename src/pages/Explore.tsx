import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, TrendingUp, UserPlus, Hash, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import { useDebounce } from '@/hooks/useDebounce'
import type { PostWithAuthor, Server } from '@/types/database'
import Avatar from '@/components/ui/Avatar'
import PostCard from '@/components/post/PostCard'
import { VerifiedIcon } from '@/components/ui/Badge'
import { PostSkeleton } from '@/components/ui/Skeleton'
import Skeleton from '@/components/ui/Skeleton'

type UserResult = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  is_verified: boolean
  is_nova_plus: boolean
  follower_count: number
}

type ServerResult = Pick<Server, 'id' | 'name' | 'description' | 'avatar_url' | 'member_count'>

type SearchTab = 'users' | 'posts' | 'hashtags' | 'servers'

const SEARCH_TABS: { id: SearchTab; label: string }[] = [
  { id: 'users',    label: 'Kişiler'    },
  { id: 'posts',    label: 'Gönderiler' },
  { id: 'hashtags', label: 'Etiketler'  },
  { id: 'servers',  label: 'Sunucular'  },
]

// ── Interaction fetch ────────────────────────────────
type UserInteractions = { likedIds: Set<string>; repostedIds: Set<string>; bookmarkedIds: Set<string> }

async function fetchInteractions(userId: string): Promise<UserInteractions> {
  const [{ data: likes }, { data: reposts }, { data: bookmarks }] = await Promise.all([
    supabase.from('likes').select('target_id').eq('user_id', userId).eq('target_type', 'post'),
    supabase.from('reposts').select('post_id').eq('user_id', userId),
    supabase.from('bookmarks').select('target_id').eq('user_id', userId).eq('target_type', 'post'),
  ])
  return {
    likedIds:      new Set(likes?.map((l) => l.target_id) ?? []),
    repostedIds:   new Set(reposts?.map((r) => r.post_id) ?? []),
    bookmarkedIds: new Set(bookmarks?.map((b) => b.target_id) ?? []),
  }
}

// ── Component ────────────────────────────────────────

export default function Explore() {
  const { user } = useAuthStore()
  const [query, setQuery] = useState('')
  const [searchTab, setSearchTab] = useState<SearchTab>('users')
  const debouncedQuery = useDebounce(query, 400)
  const hasQuery = debouncedQuery.trim().length >= 2

  // Mevcut kullanıcının takip ettiği kişiler
  const { data: followingIds } = useQuery({
    queryKey: ['my-following-ids', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user!.id)
      return new Set((data ?? []).map((f) => f.following_id))
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  })

  const { data: interactions } = useQuery({
    queryKey: ['user-interactions', user?.id],
    queryFn: () => fetchInteractions(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })

  // ── Arama sorguları ─────────────────────────────────

  const { data: userResults, isLoading: usersLoading } = useQuery({
    queryKey: ['search-users', debouncedQuery],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, is_verified, is_nova_plus, follower_count')
        .or(`username.ilike.%${debouncedQuery}%,display_name.ilike.%${debouncedQuery}%`)
        .order('follower_count', { ascending: false })
        .limit(10)
      return (data ?? []) as UserResult[]
    },
    enabled: hasQuery,
  })

  const { data: postResults, isLoading: postsLoading } = useQuery({
    queryKey: ['search-posts', debouncedQuery],
    queryFn: async () => {
      const { data } = await supabase
        .from('posts')
        .select('*, profiles!inner(id, username, display_name, avatar_url, is_verified, is_nova_plus, selected_badge)')
        .ilike('content', `%${debouncedQuery}%`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20)
      return (data ?? []) as unknown as PostWithAuthor[]
    },
    enabled: hasQuery,
  })

  const { data: hashtagResults, isLoading: hashtagsLoading } = useQuery({
    queryKey: ['search-hashtags', debouncedQuery],
    queryFn: async () => {
      const tag = debouncedQuery.replace(/^#/, '').toLowerCase()
      const { data } = await supabase
        .from('hashtags')
        .select('id, name, post_count')
        .ilike('name', `%${tag}%`)
        .order('post_count', { ascending: false })
        .limit(20)
      return data ?? []
    },
    enabled: hasQuery,
  })

  const { data: serverResults, isLoading: serversLoading } = useQuery({
    queryKey: ['search-servers', debouncedQuery],
    queryFn: async () => {
      const { data } = await supabase
        .from('servers')
        .select('id, name, description, avatar_url, member_count')
        .eq('is_public', true)
        .ilike('name', `%${debouncedQuery}%`)
        .order('member_count', { ascending: false })
        .limit(10)
      return (data ?? []) as ServerResult[]
    },
    enabled: hasQuery,
  })

  // ── Discovery sorguları ────────────────────────────

  const { data: trendingHashtags, isLoading: trendingLoading } = useQuery({
    queryKey: ['trending-hashtags'],
    queryFn: async () => {
      const { data } = await supabase
        .from('hashtags')
        .select('id, name, post_count')
        .order('post_count', { ascending: false })
        .limit(15)
      return data ?? []
    },
    staleTime: 1000 * 60 * 5,
  })

  const { data: suggestedUsers, isLoading: suggestedLoading } = useQuery({
    queryKey: ['suggested-users', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, is_verified, is_nova_plus, follower_count')
        .neq('id', user!.id)
        .order('follower_count', { ascending: false })
        .limit(12)
      return (data ?? []) as UserResult[]
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })

  const { data: suggestedServers, isLoading: suggestedServersLoading } = useQuery({
    queryKey: ['suggested-servers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('servers')
        .select('id, name, description, avatar_url, member_count')
        .eq('is_public', true)
        .order('member_count', { ascending: false })
        .limit(6)
      return (data ?? []) as ServerResult[]
    },
    staleTime: 1000 * 60 * 5,
  })

  // Arama yapıldığında ilk sekmeye dön
  useEffect(() => {
    if (hasQuery) setSearchTab('users')
  }, [debouncedQuery, hasQuery])

  return (
    <div className="min-h-dvh">
      {/* Sticky search bar */}
      <div className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-line px-4 py-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kullanıcı, gönderi, etiket, sunucu ara..."
            className="w-full bg-bg-surface border border-line rounded-full pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-default"
          />
        </div>
      </div>

      {hasQuery ? (
        // ── Arama sonuçları ─────────────────────────
        <div>
          {/* Sekme seçici */}
          <div className="flex border-b border-line px-1">
            {SEARCH_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSearchTab(tab.id)}
                className={cn(
                  'flex-1 py-3 text-xs font-medium transition-default relative',
                  searchTab === tab.id
                    ? 'text-text-primary'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-overlay'
                )}
              >
                {tab.label}
                {searchTab === tab.id && (
                  <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-accent rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Kişiler */}
          {searchTab === 'users' && (
            <section>
              {usersLoading ? (
                Array.from({ length: 4 }).map((_, i) => <UserSkeleton key={i} />)
              ) : userResults?.length ? (
                userResults.map((u) => (
                  <UserCard
                    key={u.id}
                    user={u}
                    currentUserId={user?.id}
                    isFollowing={followingIds?.has(u.id) ?? false}
                  />
                ))
              ) : (
                <EmptyResult text="Kullanıcı bulunamadı" />
              )}
            </section>
          )}

          {/* Gönderiler */}
          {searchTab === 'posts' && (
            <section>
              {postsLoading ? (
                Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
              ) : postResults?.length ? (
                postResults.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    isLiked={interactions?.likedIds.has(post.id) ?? false}
                    isReposted={interactions?.repostedIds.has(post.id) ?? false}
                    isBookmarked={interactions?.bookmarkedIds.has(post.id) ?? false}
                  />
                ))
              ) : (
                <EmptyResult text="Gönderi bulunamadı" />
              )}
            </section>
          )}

          {/* Etiketler */}
          {searchTab === 'hashtags' && (
            <section>
              {hashtagsLoading ? (
                Array.from({ length: 6 }).map((_, i) => <HashtagSkeleton key={i} />)
              ) : hashtagResults?.length ? (
                hashtagResults.map((tag) => (
                  <HashtagRow key={tag.id} name={tag.name} postCount={tag.post_count} />
                ))
              ) : (
                <EmptyResult text="Etiket bulunamadı" />
              )}
            </section>
          )}

          {/* Sunucular */}
          {searchTab === 'servers' && (
            <section>
              {serversLoading ? (
                Array.from({ length: 4 }).map((_, i) => <ServerSkeleton key={i} />)
              ) : serverResults?.length ? (
                serverResults.map((s) => (
                  <ServerCard key={s.id} server={s} currentUserId={user?.id} />
                ))
              ) : (
                <EmptyResult text="Sunucu bulunamadı" />
              )}
            </section>
          )}
        </div>
      ) : (
        // ── Keşfet ─────────────────────────────────
        <div>
          {/* Gündemde */}
          <section>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
              <TrendingUp size={16} className="text-accent" />
              <h2 className="text-sm font-semibold text-text-primary">Gündemde</h2>
            </div>
            {trendingLoading
              ? Array.from({ length: 8 }).map((_, i) => <HashtagSkeleton key={i} />)
              : trendingHashtags?.map((tag) => (
                  <HashtagRow key={tag.id} name={tag.name} postCount={tag.post_count} />
                ))}
          </section>

          {/* Önerilen Kişiler */}
          <section>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
              <UserPlus size={16} className="text-accent" />
              <h2 className="text-sm font-semibold text-text-primary">Önerilen Kişiler</h2>
            </div>
            {suggestedLoading
              ? Array.from({ length: 4 }).map((_, i) => <UserSkeleton key={i} />)
              : suggestedUsers?.map((u) => (
                  <UserCard
                    key={u.id}
                    user={u}
                    currentUserId={user?.id}
                    isFollowing={followingIds?.has(u.id) ?? false}
                  />
                ))}
          </section>

          {/* Önerilen Sunucular */}
          <section>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
              <Globe size={16} className="text-accent" />
              <h2 className="text-sm font-semibold text-text-primary">Önerilen Sunucular</h2>
            </div>
            {suggestedServersLoading
              ? Array.from({ length: 3 }).map((_, i) => <ServerSkeleton key={i} />)
              : suggestedServers?.map((s) => (
                  <ServerCard key={s.id} server={s} currentUserId={user?.id} />
                ))}
          </section>
        </div>
      )}
    </div>
  )
}

// ── HashtagRow ─────────────────────────────────────────

function HashtagRow({ name, postCount }: { name: string; postCount: number }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(`/etiket/${name}`)}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-line hover:bg-bg-overlay transition-default text-left"
    >
      <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
        <Hash size={16} className="text-accent" />
      </div>
      <div>
        <p className="text-text-primary text-sm font-medium">#{name}</p>
        <p className="text-text-muted text-xs">{formatCount(postCount)} gönderi</p>
      </div>
    </button>
  )
}

// ── UserCard ──────────────────────────────────────────

function UserCard({
  user: targetUser,
  currentUserId,
  isFollowing = false,
}: {
  user: UserResult
  currentUserId?: string
  isFollowing?: boolean
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [following, setFollowing] = useState(isFollowing)

  useEffect(() => {
    setFollowing(isFollowing)
  }, [isFollowing])

  const isOwn = currentUserId === targetUser.id

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId) return

    const next = !following
    setFollowing(next)

    try {
      if (next) {
        await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetUser.id })
      } else {
        await supabase.from('follows').delete().match({ follower_id: currentUserId, following_id: targetUser.id })
      }
      void queryClient.invalidateQueries({ queryKey: ['follow-status', targetUser.id] })
      void queryClient.invalidateQueries({ queryKey: ['my-following-ids', currentUserId] })
    } catch {
      setFollowing(!next)
      toast.error('İşlem başarısız')
    }
  }

  return (
    <button
      type="button"
      onClick={() => navigate(`/${targetUser.username}`)}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-line hover:bg-bg-overlay transition-default text-left"
    >
      <Avatar src={targetUser.avatar_url} fallback={targetUser.display_name} size="md" isNova={targetUser.is_nova_plus} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-text-primary text-sm truncate">{targetUser.display_name}</span>
          {targetUser.is_verified && <VerifiedIcon size={13} />}
        </div>
        <p className="text-text-muted text-xs truncate">@{targetUser.username} · {formatCount(targetUser.follower_count)} takipçi</p>
      </div>

      {!isOwn && currentUserId && (
        <button
          type="button"
          onClick={(e) => void handleFollow(e)}
          className={cn(
            'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-default',
            following
              ? 'border border-line text-text-muted hover:border-error hover:text-error'
              : 'bg-text-primary text-bg-base hover:opacity-80'
          )}
        >
          {following ? 'Takip Ediliyor' : 'Takip Et'}
        </button>
      )}
    </button>
  )
}

// ── ServerCard ────────────────────────────────────────

function ServerCard({ server, currentUserId }: { server: ServerResult; currentUserId?: string }) {
  const navigate = useNavigate()
  const [joining, setJoining] = useState(false)

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId || joining) return
    setJoining(true)

    try {
      const { error } = await supabase
        .from('server_members')
        .insert({ server_id: server.id, user_id: currentUserId, role: 'member' })

      if (error) {
        if (error.code === '23505') {
          toast.info('Zaten bu sunucunun üyesisin')
        } else {
          throw error
        }
      } else {
        toast.success(`${server.name} sunucusuna katıldın!`)
        navigate(`/sunucular/${server.id}`)
      }
    } catch {
      toast.error('Sunucuya katılınamadı')
    } finally {
      setJoining(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => navigate(`/sunucular/${server.id}`)}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-line hover:bg-bg-overlay transition-default text-left"
    >
      {/* Sunucu avatarı */}
      <div className="w-10 h-10 rounded-xl bg-bg-elevated border border-line flex-shrink-0 overflow-hidden flex items-center justify-center">
        {server.avatar_url ? (
          <img src={server.avatar_url} alt={server.name} className="w-full h-full object-cover" />
        ) : (
          <Globe size={18} className="text-text-muted" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-text-primary text-sm truncate">{server.name}</p>
        <p className="text-text-muted text-xs truncate">
          {server.description ?? ''}{server.description ? ' · ' : ''}{formatCount(server.member_count)} üye
        </p>
      </div>

      {currentUserId && (
        <button
          type="button"
          onClick={(e) => void handleJoin(e)}
          disabled={joining}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-accent/10 text-accent hover:bg-accent/20 transition-default disabled:opacity-50"
        >
          {joining ? '...' : 'Katıl'}
        </button>
      )}
    </button>
  )
}

// ── Skeleton'lar ──────────────────────────────────────

function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
      <Skeleton className="w-10 h-10 flex-shrink-0" rounded="full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-7 w-20 rounded-full" />
    </div>
  )
}

function HashtagSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
      <Skeleton className="w-9 h-9 flex-shrink-0" rounded="full" />
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

function ServerSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
      <Skeleton className="w-10 h-10 flex-shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-7 w-16 rounded-full" />
    </div>
  )
}

function EmptyResult({ text }: { text: string }) {
  return <p className="px-4 py-8 text-text-muted text-sm text-center">{text}</p>
}
