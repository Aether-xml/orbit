import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { StoryGroup } from './StoriesBar'

type StoryViewerProps = {
  groups: StoryGroup[]
  initialGroupIdx: number
  onClose: () => void
}

export default function StoryViewer({ groups, initialGroupIdx, onClose }: StoryViewerProps) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [groupIdx, setGroupIdx] = useState(initialGroupIdx)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const rafRef = useRef(0)
  const startTimeRef = useRef(0)
  const elapsedRef = useRef(0)

  const currentGroup = groups[groupIdx]
  const currentStory = currentGroup?.stories[storyIdx]

  const goNext = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const totalInGroup = currentGroup?.stories.length ?? 0
    if (storyIdx < totalInGroup - 1) {
      setStoryIdx((i) => i + 1)
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1)
      setStoryIdx(0)
    } else {
      onClose()
    }
  }, [storyIdx, groupIdx, currentGroup, groups.length, onClose])

  const goPrev = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1)
    } else if (groupIdx > 0) {
      setGroupIdx((i) => i - 1)
      setStoryIdx(0)
    }
  }, [storyIdx, groupIdx])

  // Record view
  useEffect(() => {
    if (!currentStory || !user?.id) return
    void supabase.from('story_views').upsert(
      { story_id: currentStory.id, viewer_id: user.id },
      { ignoreDuplicates: true }
    )
  }, [currentStory?.id, user?.id])

  // Progress animation
  useEffect(() => {
    if (!currentStory || paused) return
    setProgress(0)
    elapsedRef.current = 0
    const duration = currentStory.duration_seconds * 1000
    startTimeRef.current = Date.now()

    const tick = () => {
      const elapsed = elapsedRef.current + (Date.now() - startTimeRef.current)
      const p = Math.min(elapsed / duration, 1)
      setProgress(p)
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        goNext()
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [storyIdx, groupIdx, paused])

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, goNext, goPrev])

  const handlePointerDown = (e: React.PointerEvent) => {
    cancelAnimationFrame(rafRef.current)
    elapsedRef.current += Date.now() - startTimeRef.current
    setPaused(true)
    e.preventDefault()
  }

  const handlePointerUp = () => {
    setPaused(false)
    startTimeRef.current = Date.now()
  }

  if (!currentStory || !currentGroup) return null

  const isTextStory = currentStory.media_url.startsWith('#')

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Story container */}
      <div
        className="relative w-full h-full max-w-sm mx-auto select-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Content */}
        {isTextStory ? (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ backgroundColor: currentStory.media_url }}
          >
            <p className="text-white text-2xl font-semibold text-center leading-relaxed break-words">
              {currentStory.caption}
            </p>
          </div>
        ) : (
          <img
            src={currentStory.media_url}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        )}

        {/* Overlay gradient top */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

        {/* Progress bars */}
        <div className="absolute top-3 inset-x-3 flex gap-1 pointer-events-none">
          {currentGroup.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < storyIdx ? '100%' : i === storyIdx ? `${progress * 100}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Author info */}
        <div className="absolute top-8 inset-x-3 flex items-center justify-between pointer-events-auto">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); navigate(`/${currentGroup.profile.username}`) }}
            className="flex items-center gap-2"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/50">
              {currentGroup.profile.avatar_url ? (
                <img src={currentGroup.profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center text-white text-sm font-medium">
                  {currentGroup.profile.display_name[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">{currentGroup.profile.display_name}</p>
              <p className="text-white/70 text-xs">{timeAgo(currentStory.created_at)}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-default"
          >
            <X size={16} />
          </button>
        </div>

        {/* Caption overlay (for image stories) */}
        {!isTextStory && currentStory.caption && (
          <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
            <p className="text-white text-sm leading-relaxed">{currentStory.caption}</p>
          </div>
        )}

        {/* Tap zones */}
        <button
          type="button"
          className="absolute left-0 top-0 w-1/3 h-full"
          onClick={(e) => { e.stopPropagation(); goPrev() }}
        />
        <button
          type="button"
          className="absolute right-0 top-0 w-1/3 h-full"
          onClick={(e) => { e.stopPropagation(); goNext() }}
        />
      </div>
    </div>,
    document.body
  )
}
