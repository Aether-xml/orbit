import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircle, Bookmark, Volume2, VolumeX, Music } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { ReelWithAuthor } from '@/types/database'
import Avatar from '@/components/ui/Avatar'
import { VerifiedIcon } from '@/components/ui/Badge'

type ReelPlayerProps = {
  reel: ReelWithAuthor
  isLiked: boolean
  isBookmarked: boolean
  isMuted: boolean
  isActive: boolean
  onMuteToggle: () => void
}

export default function ReelPlayer({ reel, isLiked, isBookmarked, isMuted, isActive, onMuteToggle }: ReelPlayerProps) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  const author = reel.profiles

  const [liked, setLiked] = useState(isLiked)
  const [likeCount, setLikeCount] = useState(reel.like_count)
  const [bookmarked, setBookmarked] = useState(isBookmarked)
  const [showFullCaption, setShowFullCaption] = useState(false)

  // Sync mute state to video element
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted
  }, [isMuted])

  // Play/pause controlled by isActive prop (parent tracks visible reel via IntersectionObserver)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isActive) {
      video.muted = isMuted
      void video.play().catch(() => {
        // Autoplay blocked — try muted
        video.muted = true
        void video.play()
      })
    } else {
      video.pause()
    }
  }, [isActive, isMuted])

  // Record view
  useEffect(() => {
    if (!user?.id) return
    void supabase.from('reel_views').upsert(
      { reel_id: reel.id, viewer_id: user.id },
      { ignoreDuplicates: true }
    )
  }, [reel.id, user?.id])

  const handleLike = async () => {
    if (!user) return
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    try {
      if (next) {
        await supabase.from('likes').insert({ user_id: user.id, target_id: reel.id, target_type: 'reel' })
      } else {
        await supabase.from('likes').delete().match({ user_id: user.id, target_id: reel.id, target_type: 'reel' })
      }
      void queryClient.invalidateQueries({ queryKey: ['reel-interactions'] })
    } catch {
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
      toast.error('İşlem başarısız')
    }
  }

  const handleBookmark = async () => {
    if (!user) return
    const next = !bookmarked
    setBookmarked(next)
    try {
      if (next) {
        await supabase.from('bookmarks').insert({ user_id: user.id, target_id: reel.id, target_type: 'reel' })
        toast.success('Kaydedildi')
      } else {
        await supabase.from('bookmarks').delete().match({ user_id: user.id, target_id: reel.id, target_type: 'reel' })
      }
      void queryClient.invalidateQueries({ queryKey: ['reel-interactions'] })
    } catch {
      setBookmarked(!next)
      toast.error('İşlem başarısız')
    }
  }

  const captionText = reel.caption ?? ''
  const isLongCaption = captionText.length > 80

  return (
    <div className="relative w-full h-dvh bg-black flex items-center justify-center overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.video_url}
        poster={reel.thumbnail_url ?? undefined}
        loop
        playsInline
        muted={isMuted}
        className="h-full w-full object-cover"
        onClick={() => videoRef.current?.paused ? void videoRef.current.play() : videoRef.current?.pause()}
      />

      {/* Top gradient */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

      {/* Mute button (top right) */}
      <button
        type="button"
        onClick={onMuteToggle}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-default"
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      {/* Right side actions */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        {/* Author avatar */}
        <button
          type="button"
          onClick={() => navigate(`/${author.username}`)}
          className="relative"
        >
          <Avatar src={author.avatar_url} fallback={author.display_name} size="md" isNova={author.is_nova_plus} />
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-accent border-2 border-bg-base flex items-center justify-center">
            <span className="text-bg-base text-[10px] font-bold">+</span>
          </span>
        </button>

        {/* Like */}
        <button type="button" onClick={() => void handleLike()} className="flex flex-col items-center gap-1">
          <div className={cn(
            'w-11 h-11 rounded-full bg-black/30 flex items-center justify-center transition-default',
            liked && 'bg-error/20'
          )}>
            <Heart size={22} className={liked ? 'text-error fill-error' : 'text-white'} />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button type="button" className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/30 flex items-center justify-center">
            <MessageCircle size={22} className="text-white" />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(reel.comment_count)}</span>
        </button>

        {/* Bookmark */}
        <button type="button" onClick={() => void handleBookmark()} className="flex flex-col items-center gap-1">
          <div className={cn(
            'w-11 h-11 rounded-full bg-black/30 flex items-center justify-center transition-default',
            bookmarked && 'bg-accent/20'
          )}>
            <Bookmark size={22} className={bookmarked ? 'text-accent fill-accent' : 'text-white'} />
          </div>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute left-3 right-16 bottom-6 space-y-2">
        {/* Author */}
        <button
          type="button"
          onClick={() => navigate(`/${author.username}`)}
          className="flex items-center gap-2"
        >
          <span className="text-white font-semibold text-sm">{author.display_name}</span>
          {author.is_verified && <VerifiedIcon size={13} />}
          <span className="text-white/70 text-sm">@{author.username}</span>
        </button>

        {/* Caption */}
        {captionText && (
          <p className="text-white text-sm leading-relaxed">
            {isLongCaption && !showFullCaption ? (
              <>
                {captionText.slice(0, 80)}
                <button
                  type="button"
                  onClick={() => setShowFullCaption(true)}
                  className="text-white/70 ml-1"
                >
                  ...daha fazla
                </button>
              </>
            ) : (
              captionText
            )}
          </p>
        )}

        {/* Music */}
        {reel.music_name && (
          <div className="flex items-center gap-1.5">
            <Music size={12} className="text-white/70 flex-shrink-0" />
            <p className="text-white/70 text-xs truncate">
              {reel.music_name}{reel.music_artist ? ` · ${reel.music_artist}` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
