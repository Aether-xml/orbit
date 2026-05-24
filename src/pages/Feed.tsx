import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Clock, Sparkles, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { PostComposer } from '@/components/post/PostComposer'
import { PostCard } from '@/components/post/PostCard'
import { PostCardSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { StoryBar } from '@/components/story/StoryBar'
import { useFeed, type FeedType, type PostWithProfile } from '@/hooks/usePosts'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { cn } from '@/lib/utils'

export const Feed = () => {
  const [feedType, setFeedType] = useState<FeedType>('chronological')
  const parentRef = useRef<HTMLDivElement>(null)

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
    isFetching,
  } = useFeed(feedType)

  const posts = useMemo(
    () => data?.pages.flatMap((page) => page.posts) ?? [],
    [data]
  )

  const { sentinelRef } = useInfiniteScroll({
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  })

  // TanStack Virtual
  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  return (
    <div>
      {/* ── Başlık ── */}
      <div className="sticky top-0 z-30 bg-[var(--bg-base)]/95 border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">
            Ana Sayfa
          </h1>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-[var(--radius-full)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
            aria-label="Yenile"
          >
            <RefreshCw
              size={16}
              className={isFetching ? 'animate-spin' : ''}
            />
          </button>
        </div>

        {/* Feed toggle */}
        <FeedToggle feedType={feedType} onChange={setFeedType} />
      </div>

      {/* ── Hikayeler ── */}
      <StoryBar />

      {/* ── Post Composer ── */}
      <PostComposer />

      {/* ── İçerik ── */}
      {isError ? (
        <FeedError onRetry={() => refetch()} />
      ) : isLoading ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <FeedEmpty feedType={feedType} />
      ) : (
        <div ref={parentRef}>
          {/* Sanallaştırılmış liste */}
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const post = posts[virtualItem.index]
              if (!post) return null

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <PostCard post={post} />
                </div>
              )
            })}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />

          {/* Yükleniyor göstergesi */}
          {isFetchingNextPage && (
            <div className="py-4 flex justify-center">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Son */}
          {!hasNextPage && posts.length > 0 && (
            <div className="py-8 text-center">
              <p className="text-xs text-[var(--text-muted)]">
                Hepsi bu! 🪐
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Feed Toggle ───────────────────────────────────────────
interface FeedToggleProps {
  feedType: FeedType
  onChange: (type: FeedType) => void
}

const FeedToggle = ({ feedType, onChange }: FeedToggleProps) => (
  <div className="flex border-b border-[var(--border)]">
    {(
      [
        { key: 'chronological', label: 'Takip', icon: Clock },
        { key: 'explore', label: 'Keşfet', icon: Sparkles },
      ] as { key: FeedType; label: string; icon: React.ElementType }[]
    ).map(({ key, label, icon: Icon }) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        className={cn(
          'flex-1 flex items-center justify-center gap-2',
          'py-3 text-sm font-medium',
          'relative transition-colors duration-[var(--transition)]',
          feedType === key
            ? 'text-[var(--text-primary)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
        )}
      >
        <Icon size={15} />
        {label}
        {feedType === key && (
          <motion.div
            layoutId="feed-indicator"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
      </button>
    ))}
  </div>
)

// ── Durum Bileşenleri ─────────────────────────────────────
const FeedSkeleton = () => (
  <div className="divide-y divide-[var(--border)]">
    {Array.from({ length: 5 }).map((_, i) => (
      <PostCardSkeleton key={i} />
    ))}
  </div>
)

const FeedError = ({ onRetry }: { onRetry: () => void }) => (
  <div className="py-16 flex flex-col items-center gap-4">
    <p className="text-[var(--text-secondary)] text-sm">
      Feed yüklenirken bir hata oluştu.
    </p>
    <Button variant="outline" size="sm" onClick={onRetry}>
      Tekrar Dene
    </Button>
  </div>
)

const FeedEmpty = ({ feedType }: { feedType: FeedType }) => (
  <div className="py-16 flex flex-col items-center gap-3 px-6 text-center">
    <span className="text-4xl">🪐</span>
    <h3 className="text-base font-semibold text-[var(--text-primary)]">
      {feedType === 'chronological'
        ? 'Takip ettiğin kimse yok'
        : 'Keşfedecek içerik bulunamadı'}
    </h3>
    <p className="text-sm text-[var(--text-muted)] max-w-xs">
      {feedType === 'chronological'
        ? 'Keşfet sekmesinden ilginç insanları bul ve takip et.'
        : 'Yakında burada içerikler görünecek.'}
    </p>
  </div>
)