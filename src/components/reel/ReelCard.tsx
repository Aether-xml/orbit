import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  Music2,
  Trash2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { ReelPlayer, type ReelPlayerHandle } from './ReelPlayer'
import {
  useLikeReel,
  useBookmarkReel,
  useRecordReelView,
  useDeleteReel,
} from '@/hooks/useReels'
import { useAuthStore } from '@/store/authStore'
import { formatCount, cn } from '@/lib/utils'
import type { ReelWithProfile } from '@/hooks/useReels'

interface ReelCardProps {
  reel: ReelWithProfile
  isActive: boolean
}

export const ReelCard = ({ reel, isActive }: ReelCardProps) => {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const playerRef = useRef<ReelPlayerHandle>(null)
  const isOwner = currentUser?.id === reel.user_id

  const { mutate: likeReel } = useLikeReel()
  const { mutate: bookmarkReel } = useBookmarkReel()
  const { mutate: recordView } = useRecordReelView()
  const { mutate: deleteReel } = useDeleteReel()

  const [showComments, setShowComments] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)

  // View count - aktif hale gelince kaydet
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        recordView(reel.id)
      }, 2000) // 2 saniye izlediyse view say
      return () => clearTimeout(timer)
    }
  }, [isActive, reel.id])

  const handleLike = () => {
    likeReel({ reelId: reel.id, isLiked: reel.user_liked })
  }

  const handleBookmark = () => {
    bookmarkReel({ reelId: reel.id, isBookmarked: reel.user_bookmarked })
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/reels/${reel.id}`
    try {
      if (navigator.share) {
        await navigator.share({ url, title: 'Orbit Reel' })
      } else {
        await navigator.clipboard.writeText(url)
      }
    } catch {
      // iptal
    }
  }

  const dropdownItems = [
    ...(isOwner
      ? [
          {
            label: 'Sil',
            icon: <Trash2 size={15} />,
            variant: 'danger' as const,
            onClick: () => deleteReel(reel.id),
          },
        ]
      : [
          {
            label: 'Şikayet Et',
            icon: <MoreHorizontal size={15} />,
            onClick: () => {},
          },
        ]),
  ]

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video */}
      <ReelPlayer
        ref={playerRef}
        src={reel.video_url}
        isActive={isActive}
        className="absolute inset-0"
      />

      {/* Üst karartma */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

      {/* Sağ aksiyonlar */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
        {/* Profil avatarı */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative">
            <Avatar
              src={reel.profiles.avatar_url}
              fallback={reel.profiles.display_name}
              size="md"
              className="ring-2 ring-white cursor-pointer"
              onClick={() => navigate(`/${reel.profiles.username}`)}
            />
            {!isFollowing && !isOwner && (
              <button
                onClick={() => setIsFollowing(true)}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center border-2 border-black text-black font-bold text-xs"
              >
                +
              </button>
            )}
          </div>
        </div>

        {/* Beğen */}
        <ActionButton
          icon={
            <Heart
              size={26}
              fill={reel.user_liked ? 'currentColor' : 'none'}
            />
          }
          count={reel.like_count}
          onClick={handleLike}
          isActive={reel.user_liked}
          activeColor="#E05A5A"
          label="Beğen"
        />

        {/* Yorum */}
        <ActionButton
          icon={<MessageCircle size={26} />}
          count={reel.comment_count}
          onClick={() => setShowComments(true)}
          label="Yorum yap"
        />

        {/* Kaydet */}
        <ActionButton
          icon={
            <Bookmark
              size={26}
              fill={reel.user_bookmarked ? 'currentColor' : 'none'}
            />
          }
          count={undefined}
          onClick={handleBookmark}
          isActive={reel.user_bookmarked}
          activeColor="var(--accent)"
          label="Kaydet"
        />

        {/* Paylaş */}
        <ActionButton
          icon={<Share2 size={24} />}
          onClick={handleShare}
          label="Paylaş"
        />

        {/* Daha fazla */}
        <Dropdown
          trigger={
            <button className="flex flex-col items-center gap-1">
              <MoreHorizontal size={24} className="text-white" />
            </button>
          }
          items={dropdownItems}
          align="right"
        />
      </div>

      {/* Alt bilgiler */}
      <div className="absolute bottom-4 left-4 right-20 z-10">
        {/* Kullanıcı adı */}
        <button
          onClick={() => navigate(`/${reel.profiles.username}`)}
          className="font-semibold text-white text-sm hover:underline mb-1 block"
        >
          @{reel.profiles.username}
        </button>

        {/* Altyazı */}
        {reel.caption && (
          <ReelCaption caption={reel.caption} />
        )}

        {/* Müzik */}
        {reel.music_name && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Music2 size={13} className="text-white/80 shrink-0" />
            <p className="text-white/80 text-xs truncate">
              {reel.music_name}
              {reel.music_artist && ` · ${reel.music_artist}`}
            </p>
          </div>
        )}

        {/* İzlenme */}
        <p className="text-white/50 text-xs mt-1">
          {formatCount(reel.view_count)} izlenme
        </p>
      </div>

      {/* Yorum paneli */}
      <AnimatePresence>
        {showComments && (
          <ReelCommentPanel
            reelId={reel.id}
            onClose={() => setShowComments(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Aksiyon Butonu ────────────────────────────────────────
interface ActionButtonProps {
  icon: React.ReactNode
  count?: number
  onClick: () => void
  isActive?: boolean
  activeColor?: string
  label: string
}

const ActionButton = ({
  icon,
  count,
  onClick,
  isActive = false,
  activeColor,
  label,
}: ActionButtonProps) => (
  <button
    onClick={onClick}
    aria-label={label}
    className="flex flex-col items-center gap-1"
  >
    <motion.div
      whileTap={{ scale: 0.85 }}
      className="text-white"
      style={isActive && activeColor ? { color: activeColor } : undefined}
    >
      {icon}
    </motion.div>
    {count !== undefined && (
      <span className="text-white text-xs font-medium tabular-nums">
        {formatCount(count)}
      </span>
    )}
  </button>
)

// ── Altyazı (genişlet/daralt) ─────────────────────────────
const ReelCaption = ({ caption }: { caption: string }) => {
  const [expanded, setExpanded] = useState(false)
  const isLong = caption.length > 80

  return (
    <p className="text-white text-sm leading-snug">
      {expanded || !isLong ? caption : `${caption.slice(0, 80)}...`}
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-white/60 ml-1 text-xs"
        >
          {expanded ? 'daha az' : 'daha fazla'}
        </button>
      )}
    </p>
  )
}

// ── Yorum Paneli ──────────────────────────────────────────
import { useComments, useCreateComment } from '@/hooks/useComments'
import { Skeleton } from '@/components/ui/Skeleton'
import { X } from 'lucide-react'

const ReelCommentPanel = ({
  reelId,
  onClose,
}: {
  reelId: string
  onClose: () => void
}) => {
  const { data: comments, isLoading } = useComments(reelId, 'reel')
  const { mutate: createComment, isPending } = useCreateComment()
  const [text, setText] = useState('')
  const profile = useAuthStore((s) => s.profile)

  const handleSubmit = () => {
    if (!text.trim()) return
    createComment({
      targetId: reelId,
      targetType: 'reel',
      content: text.trim(),
    })
    setText('')
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute inset-x-0 bottom-0 z-20 bg-[var(--bg-surface)] rounded-t-[var(--radius-xl)] border-t border-[var(--border)]"
      style={{ maxHeight: '70%' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Handle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Yorumlar
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
        >
          <X size={16} />
        </button>
      </div>

      {/* Yorumlar */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 120px)' }}>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="w-8 h-8 shrink-0" rounded="full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="w-20 h-3" />
                  <Skeleton className="w-full h-3" />
                </div>
              </div>
            ))}
          </div>
        ) : (comments ?? []).length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              Henüz yorum yok.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {(comments ?? []).map((comment) => (
              <div key={comment.id} className="flex gap-2.5 px-4 py-3">
                <Avatar
                  src={comment.profiles.avatar_url}
                  fallback={comment.profiles.display_name}
                  size="sm"
                  className="shrink-0"
                />
                <div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] mr-2">
                    {comment.profiles.username}
                  </span>
                  <span className="text-xs text-[var(--text-primary)]">
                    {comment.content}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Yorum yaz */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border)]">
        <Avatar
          src={profile?.avatar_url}
          fallback={profile?.display_name ?? 'U'}
          size="sm"
          className="shrink-0"
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Yorum ekle..."
          className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-full)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
        />
        <Button
          size="sm"
          disabled={!text.trim() || isPending}
          onClick={handleSubmit}
          isLoading={isPending}
        >
          Gönder
        </Button>
      </div>
    </motion.div>
  )
}