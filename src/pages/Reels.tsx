import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { ReelWithAuthor } from '@/types/database'
import ReelPlayer from '@/components/reels/ReelPlayer'
import { ReelSkeleton } from '@/components/ui/Skeleton'

const PAGE_SIZE = 5

type ReelInteractions = {
  likedIds: Set<string>
  bookmarkedIds: Set<string>
}

export default function Reels() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [muted, setMuted] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const reelRefs = useRef<Map<number, Element>>(new Map())

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['reels'],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from('reels')
        .select('*, profiles!inner(id, username, display_name, avatar_url, is_verified, is_nova_plus)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(pageParam as number, (pageParam as number) + PAGE_SIZE - 1)
      if (error) throw error
      return (data ?? []) as unknown as ReelWithAuthor[]
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      return allPages.reduce((sum, p) => sum + p.length, 0)
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })

  const { data: interactions } = useQuery({
    queryKey: ['reel-interactions', user?.id],
    queryFn: async (): Promise<ReelInteractions> => {
      const [{ data: likes }, { data: bookmarks }] = await Promise.all([
        supabase.from('likes').select('target_id').eq('user_id', user!.id).eq('target_type', 'reel'),
        supabase.from('bookmarks').select('target_id').eq('user_id', user!.id).eq('target_type', 'reel'),
      ])
      return {
        likedIds:     new Set(likes?.map((l) => l.target_id) ?? []),
        bookmarkedIds: new Set(bookmarks?.map((b) => b.target_id) ?? []),
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })

  // Load more when sentinel enters view
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  // Track which reel is active via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = []

    reelRefs.current.forEach((el, index) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setActiveIndex(index)
          }
        },
        { threshold: 0.6 }
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => {
      observers.forEach((obs) => obs.disconnect())
    }
  }, [data])

  const reels = data?.pages.flat() ?? []

  return (
    // Full-screen container without AppLayout
    <div className="fixed inset-0 bg-black z-40">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-default"
      >
        <ArrowLeft size={18} />
      </button>

      {/* Upload button */}
      <Link
        to="/reels/olustur"
        className="absolute top-4 right-4 z-50 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-default"
      >
        <Plus size={18} />
      </Link>

      {/* Scroll container with snap */}
      <div className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {isLoading ? (
          <div className="h-dvh flex items-center justify-center">
            <ReelSkeleton />
          </div>
        ) : reels.length === 0 ? (
          <div className="h-dvh flex flex-col items-center justify-center text-center px-8">
            <p className="text-white/60 text-lg mb-2">Henüz Reel yok</p>
            <p className="text-white/40 text-sm">İlk Reel'i paylaşan sen ol!</p>
          </div>
        ) : (
          <>
            {reels.map((reel, i) => (
              <div
                key={reel.id}
                data-index={i}
                ref={(el) => {
                  if (el) {
                    reelRefs.current.set(i, el)
                  } else {
                    reelRefs.current.delete(i)
                  }
                }}
                className="h-dvh snap-start flex-shrink-0"
              >
                <ReelPlayer
                  reel={reel}
                  isLiked={interactions?.likedIds.has(reel.id) ?? false}
                  isBookmarked={interactions?.bookmarkedIds.has(reel.id) ?? false}
                  isMuted={muted}
                  isActive={i === activeIndex}
                  onMuteToggle={() => setMuted((m) => !m)}
                />
              </div>
            ))}

            {/* Load more trigger + spinner */}
            <div ref={loadMoreRef} className="h-dvh snap-start flex items-center justify-center bg-black">
              {isFetchingNextPage && (
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {!hasNextPage && reels.length > 0 && (
                <p className="text-white/40 text-sm">Tüm Reels yüklendi</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
