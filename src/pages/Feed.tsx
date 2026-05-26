import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Users, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { PostWithAuthor } from '@/types/database'
import PostComposer from '@/components/post/PostComposer'
import PostCard from '@/components/post/PostCard'
import StoriesBar from '@/components/stories/StoriesBar'
import { PostSkeleton } from '@/components/ui/Skeleton'

const PAGE_SIZE = 20

type Tab = 'following' | 'explore'

type UserInteractions = {
  likedIds: Set<string>
  repostedIds: Set<string>
  bookmarkedIds: Set<string>
}

async function fetchInteractions(userId: string): Promise<UserInteractions> {
  const [{ data: likes }, { data: reposts }, { data: bookmarks }] = await Promise.all([
    supabase.from('likes').select('target_id').eq('user_id', userId).eq('target_type', 'post'),
    supabase.from('reposts').select('post_id').eq('user_id', userId),
    supabase.from('bookmarks').select('target_id').eq('user_id', userId).eq('target_type', 'post'),
  ])
  return {
    likedIds: new Set(likes?.map((l) => l.target_id) ?? []),
    repostedIds: new Set(reposts?.map((r) => r.post_id) ?? []),
    bookmarkedIds: new Set(bookmarks?.map((b) => b.target_id) ?? []),
  }
}

async function fetchFeedPage(tab: Tab, userId: string, pageParam: number): Promise<PostWithAuthor[]> {
  let userIds: string[] = [userId]

  if (tab === 'following') {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
    userIds = [userId, ...(follows?.map((f) => f.following_id) ?? [])]
  }

  const query = supabase
    .from('posts')
    .select('*, profiles!inner(id, username, display_name, avatar_url, is_verified, is_nova_plus, selected_badge)')
    .is('deleted_at', null)
    .is('reply_to_id', null)
    .order('created_at', { ascending: false })
    .range(pageParam, pageParam + PAGE_SIZE - 1)

  if (tab === 'following') {
    const { data, error } = await query.in('user_id', userIds)
    if (error) throw error
    return (data ?? []) as unknown as PostWithAuthor[]
  } else {
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as unknown as PostWithAuthor[]
  }
}

export default function Feed() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('following')
  const parentRef = useRef<HTMLDivElement>(null)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['feed', tab, user?.id],
    queryFn: ({ pageParam }) => fetchFeedPage(tab, user!.id, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      return allPages.reduce((sum, page) => sum + page.length, 0)
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })

  const { data: interactions } = useQuery({
    queryKey: ['user-interactions', user?.id],
    queryFn: () => fetchInteractions(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })

  // Blok ve mute listesi — feed'den filtrele
  const { data: excludedIds } = useQuery({
    queryKey: ['excluded-ids', user?.id],
    queryFn: async () => {
      const [{ data: blocked }, { data: muted }] = await Promise.all([
        supabase.from('blocks').select('blocked_id').eq('blocker_id', user!.id),
        supabase.from('mutes').select('muted_id').eq('muter_id', user!.id),
      ])
      return new Set([
        ...(blocked?.map((b) => b.blocked_id) ?? []),
        ...(muted?.map((m) => m.muted_id) ?? []),
      ])
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  })

  const posts = (data?.pages.flat() ?? []).filter(
    (p) => !excludedIds?.has(p.user_id)
  )

  // TanStack Virtual — window scroll (AppLayout'ta overflow-y-auto yok, scroll window üzerinden)
  const virtualizer = useVirtualizer({
    count: hasNextPage ? posts.length + 1 : posts.length,
    getScrollElement: () => document.documentElement,
    estimateSize: () => 160,
    overscan: 5,
  })

  const virtualItems = virtualizer.getVirtualItems()

  // Load more: son virtual item görünürdeyse sonraki sayfayı getir
  useEffect(() => {
    const lastItem = virtualItems.at(-1)
    if (!lastItem) return
    if (lastItem.index >= posts.length - 1 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [virtualItems, hasNextPage, isFetchingNextPage, fetchNextPage, posts.length])

  return (
    <div className="min-h-dvh">
      {/* Sticky header with tabs */}
      <div className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-line">
        <div className="flex">
          {(['following', 'explore'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-default relative',
                tab === t ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary hover:bg-bg-overlay'
              )}
            >
              {t === 'following' ? 'Takip Ettiklerin' : 'Keşfet'}
              {tab === t && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stories */}
      <StoriesBar />

      {/* Composer */}
      <PostComposer />

      {/* Posts */}
      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} />)
      ) : posts.length === 0 ? (
        <EmptyFeed tab={tab} />
      ) : (
        <div ref={parentRef}>
          {/* Virtual scroll container */}
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const isLoaderRow = virtualRow.index === posts.length
              const post = posts[virtualRow.index]

              return (
                <div
                  key={virtualRow.index}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {isLoaderRow ? (
                    <div className="py-4 flex justify-center">
                      {isFetchingNextPage ? (
                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      ) : !hasNextPage ? (
                        <p className="text-center text-text-muted text-sm py-4">Tüm gönderiler yüklendi</p>
                      ) : null}
                    </div>
                  ) : post ? (
                    <PostCard
                      post={post}
                      isLiked={interactions?.likedIds.has(post.id) ?? false}
                      isReposted={interactions?.repostedIds.has(post.id) ?? false}
                      isBookmarked={interactions?.bookmarkedIds.has(post.id) ?? false}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyFeed({ tab }: { tab: Tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mb-4">
        {tab === 'following'
          ? <Users size={28} className="text-text-muted" />
          : <Globe size={28} className="text-text-muted" />}
      </div>
      <h3 className="text-text-primary font-semibold mb-1">
        {tab === 'following' ? 'Henüz bir şey yok' : 'Keşfedecek içerik bulunamadı'}
      </h3>
      <p className="text-text-muted text-sm max-w-xs">
        {tab === 'following'
          ? 'Takip ettiğin kişilerin gönderileri burada görünecek.'
          : 'Yeni içerikler yakında burada olacak.'}
      </p>
    </div>
  )
}
