import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useViewStory } from '@/hooks/useStories'
import { timeAgo, cn } from '@/lib/utils'
import type { StoryGroup } from '@/hooks/useStories'

interface StoryViewerProps {
  groups: StoryGroup[]
  initialGroupIndex: number
  onClose: () => void
}

export const StoryViewer = ({
  groups,
  initialGroupIndex,
  onClose,
}: StoryViewerProps) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex)
  const [storyIndex, setStoryIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { mutate: viewStory } = useViewStory()

  const currentGroup = groups[groupIndex]
  const currentStory = currentGroup?.stories[storyIndex]
  const duration = (currentStory?.duration_seconds ?? 5) * 1000

  // Hikayeyi görüntülendi işaretle
  useEffect(() => {
    if (currentStory) {
      viewStory(currentStory.id)
    }
  }, [currentStory?.id])

  // İlerleme çubuğu
  useEffect(() => {
    if (isPaused) return

    setProgress(0)
    const startTime = Date.now()

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min((elapsed / duration) * 100, 100)
      setProgress(pct)

      if (pct >= 100) {
        goNext()
      }
    }, 50)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [storyIndex, groupIndex, isPaused, duration])

  const goNext = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1)
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((g) => g + 1)
      setStoryIndex(0)
    } else {
      onClose()
    }
  }, [storyIndex, groupIndex, currentGroup, groups, onClose])

  const goPrev = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1)
    } else if (groupIndex > 0) {
      setGroupIndex((g) => g - 1)
      setStoryIndex(0)
    }
  }, [storyIndex, groupIndex])

  // Klavye kısayolları
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === ' ') setIsPaused((p) => !p)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, goNext, goPrev])

  if (!currentGroup || !currentStory) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
    >
      {/* İçerik */}
      <div className="relative w-full max-w-sm h-full md:h-[90vh] md:rounded-[var(--radius-xl)] overflow-hidden">
        {/* Medya */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${groupIndex}-${storyIndex}`}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {currentStory.media_type === 'video' ? (
              <video
                src={currentStory.media_url}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <img
                src={currentStory.media_url}
                alt="Hikaye"
                className="w-full h-full object-cover"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Karartma (üst ve alt) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30 pointer-events-none" />

        {/* İlerleme çubukları */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
          {currentGroup.stories.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width:
                    i < storyIndex
                      ? '100%'
                      : i === storyIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Başlık */}
        <div className="absolute top-7 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Avatar
              src={currentGroup.profile.avatar_url}
              fallback={currentGroup.profile.display_name}
              size="sm"
            />
            <div>
              <p className="text-white text-sm font-semibold leading-tight">
                {currentGroup.profile.display_name}
              </p>
              <p className="text-white/60 text-xs">
                {timeAgo(currentStory.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPaused((p) => !p)}
              className="p-2 text-white hover:text-white/80 transition-colors"
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white hover:text-white/80 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Altyazı */}
        {currentStory.caption && (
          <div className="absolute bottom-6 left-4 right-4 z-10">
            <p className="text-white text-sm leading-relaxed text-center drop-shadow">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Dokunma/tıklama alanları */}
        <div className="absolute inset-0 flex z-20">
          <div
            className="flex-1 cursor-pointer"
            onClick={goPrev}
          />
          <div
            className="flex-1 cursor-pointer"
            onClick={goNext}
          />
        </div>
      </div>

      {/* Grup navigasyonu (desktop) */}
      {groupIndex > 0 && (
        <button
          onClick={() => {
            setGroupIndex((g) => g - 1)
            setStoryIndex(0)
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors hidden md:flex"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {groupIndex < groups.length - 1 && (
        <button
          onClick={() => {
            setGroupIndex((g) => g + 1)
            setStoryIndex(0)
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors hidden md:flex"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Kapat (dışarı tıklama) */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </motion.div>
  )
}