import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Hash } from 'lucide-react'
import { formatCount } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { PostWithAuthor } from '@/types/database'
import PostCard from '@/components/post/PostCard'
import { PostSkeleton } from '@/components/ui/Skeleton'

const PAGE_SIZE = 20

type UserInteractions = { likedIds: Set<string>; repostedIds: Set<string>; bookmarkedIds: Set<string> }

async function fetchInteractions(userId: string): Promise<UserInteractions> {
  const [{ data: likes }, { data: reposts }, { data: bookmarks }] = await Promise.all([
    supabase.from('likes').select('target_id').eq('user_id', userId).eq('target_type', 'post'),
    supabase.from('reposts').select('post_id').eq('user_id', userId),
    supabase.from('bookmarks').select('target_id').eq('user_id', userId).eq('target_type', 'post'),
  ])
  return {
    likedIds:     new Set(likes?.map((l) => l.target_id) ?? []),
    repostedIds:  new Set(reposts?.map((r) => r.post_id) ?? []),
    bookmarkedIds: new Set(bookmarks?.map((b) => b.target_id) ?? []),
  }
}

export default function HashtagFeed() {
  const { tag } = useParams<{ tag: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Hashtag metadata
  const { data: hashtagMeta } = useQuery({
    queryKey: ['hashtag-meta', tag],
    queryFn: async () => {
      const { data } = await supabase
        .from('hashtags')
        .select('name, post_count')
        .eq('name', tag!)
        .maybeSingle()
      return data
    },
    enabled: !!tag,
  })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['hashtag-feed', tag],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!inner(id, username, display_name, avatar_url, is_verified, is_nova_plus, selected_badge)')
        .ilike('content', `%#${tag}%`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(pageParam as number, (pageParam as number) + PAGE_SIZE - 1)
      if (error) throw error
      return (data ?? []) as unknown as PostWithAuthor[]
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      return allPages.reduce((sum, page) => sum + page.length, 0)
    },
    enabled: !!tag,
    staleTime: 1000 * 60,
  })

  const { data: interactions } = useQuery({
    queryKey: ['user-interactions', user?.id],
    queryFn: () => fetchInteractions(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const posts = data?.pages.flat() ?? []

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-line">
        <div className="flex items-center gap-4 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full text-text-primary hover:bg-bg-overlay transition-default"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <Hash size={16} className="text-accent" />
              <h1 className="font-bold text-text-primary">{tag}</h1>
            </div>
            {hashtagMeta && (
              <p className="text-text-muted text-xs">{formatCount(hashtagMeta.post_count)} gönderi</p>
            )}
          </div>
        </div>
      </div>

      {/* Posts */}
      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} />)
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mb-4">
            <Hash size={24} className="text-text-muted" />
          </div>
          <h3 className="text-text-primary font-semibold mb-1">Gönderi bulunamadı</h3>
          <p className="text-text-muted text-sm">#{tag} etiketi henüz kullanılmamış.</p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isLiked={interactions?.likedIds.has(post.id) ?? false}
              isReposted={interactions?.repostedIds.has(post.id) ?? false}
              isBookmarked={interactions?.bookmarkedIds.has(post.id) ?? false}
            />
          ))}
          <div ref={loadMoreRef} className="py-4 flex justify-center">
            {isFetchingNextPage && (
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          {!hasNextPage && posts.length > 0 && (
            <p className="text-center text-text-muted text-sm py-8">Tüm gönderiler yüklendi</p>
          )}
        </>
      )}
    </div>
  )
}
