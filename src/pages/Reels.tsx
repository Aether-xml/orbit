import { useState, useMemo, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Plus, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ReelCard } from '@/components/reel/ReelCard'
import { ReelComposer } from '@/components/reel/ReelComposer'
import { Skeleton } from '@/components/ui/Skeleton'
import { useReelFeed } from '@/hooks/useReels'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useNavigate } from 'react-router-dom'

export const Reels = () => {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [composerOpen, setComposerOpen] = useState(false)

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useReelFeed()

  const reels = useMemo(
    () => data?.pages.flatMap((p) => p.reels) ?? [],
    [data]
  )

  const { sentinelRef } = useInfiniteScroll({
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    threshold: 200,
  })

  // TanStack Virtual — dikey snap scroll
  const virtualizer = useVirtualizer({
    count: reels.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => {
      // Tam ekran yüksekliği
      return containerRef.current?.clientHeight ?? window.innerHeight
    },
    overscan: 2,
  })

  // Scroll ile aktif index güncelle
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const scrollTop = container.scrollTop
    const itemHeight = container.clientHeight
    const newIndex = Math.round(scrollTop / itemHeight)

    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex)
    }
  }, [activeIndex])

  if (isLoading) return <ReelsSkeleton />

  if (isError || reels.length === 0) {
    return <ReelsEmpty onCompose={() => setComposerOpen(true)} />
  }

  return (
    <div className="relative h-screen bg-black overflow-hidden">
      {/* Üst bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-white font-semibold text-sm">Reels</h1>

        <button
          onClick={() => setComposerOpen(true)}
          className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Snap scroll container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
        onScroll={handleScroll}
        style={{ scrollSnapType: 'y mandatory' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const reel = reels[virtualItem.index]
            if (!reel) return null

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
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                  scrollSnapAlign: 'start',
                }}
              >
                <ReelCard
                  reel={reel}
                  isActive={virtualItem.index === activeIndex}
                />
              </div>
            )
          })}
        </div>

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />
      </div>

      {/* Yükleniyor (alt) */}
      <AnimatePresence>
        {isFetchingNextPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-8 left-0 right-0 flex justify-center z-20"
          >
            <div className="bg-black/60 rounded-full px-4 py-2">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-white"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reel yükle modal */}
      <ReelComposer
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
      />
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────
const ReelsSkeleton = () => (
  <div className="h-screen bg-black relative">
    <Skeleton className="absolute inset-0" rounded="sm" />
    <div className="absolute right-3 bottom-24 flex flex-col gap-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <Skeleton className="w-10 h-10" rounded="full" />
          <Skeleton className="w-8 h-3" />
        </div>
      ))}
    </div>
    <div className="absolute bottom-4 left-4 space-y-2">
      <Skeleton className="w-24 h-4" />
      <Skeleton className="w-48 h-3" />
      <Skeleton className="w-32 h-3" />
    </div>
  </div>
)

// ── Boş durum ─────────────────────────────────────────────
const ReelsEmpty = ({
  onCompose,
}: {
  onCompose: () => void
}) => {
  const navigate = useNavigate()

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center gap-6 p-6 text-center">
      <span className="text-6xl">🎬</span>
      <div>
        <h2 className="text-white text-xl font-semibold mb-2">
          Henüz reel yok
        </h2>
        <p className="text-white/60 text-sm max-w-xs">
          Takip ettiğin kişilerin reelleri burada görünecek.
          İlk reeli sen paylaş!
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onCompose}
          className="w-full py-3 rounded-[var(--radius-full)] bg-[var(--accent)] text-[var(--text-inverse)] font-semibold text-sm hover:bg-[var(--accent-hover)] transition-colors"
        >
          Reel Paylaş
        </button>
        <button
          onClick={() => navigate('/ana-sayfa')}
          className="w-full py-3 rounded-[var(--radius-full)] border border-white/20 text-white font-medium text-sm hover:bg-white/10 transition-colors"
        >
          Ana Sayfaya Dön
        </button>
      </div>
    </div>
  )
}