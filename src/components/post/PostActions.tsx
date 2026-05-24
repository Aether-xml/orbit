import { useState } from 'react'
import { Heart, Repeat2, MessageCircle, Bookmark, Share2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatCount } from '@/lib/utils'
import { useLikePost, useRepost, useBookmark } from '@/hooks/usePosts'
import type { PostWithProfile } from '@/hooks/usePosts'

interface PostActionsProps {
  post: PostWithProfile
  onReplyClick?: () => void
  compact?: boolean
}

export const PostActions = ({
  post,
  onReplyClick,
  compact = false,
}: PostActionsProps) => {
  const { mutate: likePost } = useLikePost()
  const { mutate: repost } = useRepost()
  const { mutate: bookmark } = useBookmark()
  const [shareTooltip, setShareTooltip] = useState(false)

  const handleLike = () => {
    likePost({ postId: post.id, isLiked: post.user_liked })
  }

  const handleRepost = () => {
    repost({ postId: post.id, isReposted: post.user_reposted })
  }

  const handleBookmark = () => {
    bookmark({ postId: post.id, isBookmarked: post.user_bookmarked })
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`
    try {
      if (navigator.share) {
        await navigator.share({ url, title: 'Orbit Post' })
      } else {
        await navigator.clipboard.writeText(url)
        setShareTooltip(true)
        setTimeout(() => setShareTooltip(false), 2000)
      }
    } catch {
      // Kullanıcı iptal etti, hata gösterme
    }
  }

  const iconSize = compact ? 16 : 18

  return (
    <div
      className={cn(
        'flex items-center',
        compact ? 'gap-3' : 'gap-1 -ml-2'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Yanıtla */}
      <ActionButton
        icon={<MessageCircle size={iconSize} />}
        count={post.reply_count}
        onClick={onReplyClick}
        label="Yanıtla"
        compact={compact}
      />

      {/* Repost */}
      <ActionButton
        icon={<Repeat2 size={iconSize} />}
        count={post.repost_count}
        onClick={handleRepost}
        isActive={post.user_reposted}
        activeColor="var(--success)"
        label={post.user_reposted ? 'Repost geri al' : 'Repost yap'}
        compact={compact}
      />

      {/* Beğeni */}
      <LikeButton
        count={post.like_count}
        isLiked={post.user_liked}
        onClick={handleLike}
        iconSize={iconSize}
        compact={compact}
      />

      {/* Kaydet */}
      <ActionButton
        icon={<Bookmark size={iconSize} />}
        count={post.bookmark_count}
        onClick={handleBookmark}
        isActive={post.user_bookmarked}
        activeColor="var(--accent)"
        label={post.user_bookmarked ? 'Kaydedilenlerden çıkar' : 'Kaydet'}
        compact={compact}
      />

      {/* Paylaş */}
      <div className="relative">
        <ActionButton
          icon={<Share2 size={iconSize} />}
          onClick={handleShare}
          label="Paylaş"
          compact={compact}
        />
        <AnimatePresence>
          {shareTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs text-[var(--text-primary)] whitespace-nowrap shadow-[var(--shadow-md)]"
            >
              Kopyalandı!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Genel aksiyon butonu ──────────────────────────────────
interface ActionButtonProps {
  icon: React.ReactNode
  count?: number
  onClick?: () => void
  isActive?: boolean
  activeColor?: string
  label: string
  compact?: boolean
}

const ActionButton = ({
  icon,
  count,
  onClick,
  isActive = false,
  activeColor,
  label,
  compact,
}: ActionButtonProps) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={cn(
      'group flex items-center gap-1.5',
      'rounded-[var(--radius-full)]',
      compact ? 'p-1' : 'px-2 py-2',
      'transition-all duration-[var(--transition)]',
      'hover:bg-[var(--bg-elevated)]',
      isActive
        ? 'text-[var(--success)]'
        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
    )}
    style={isActive && activeColor ? { color: activeColor } : undefined}
  >
    <span className="transition-transform duration-[var(--transition)] group-hover:scale-110">
      {icon}
    </span>
    {count !== undefined && count > 0 && (
      <span className="text-xs tabular-nums">{formatCount(count)}</span>
    )}
  </button>
)

// ── Beğeni butonu (kalp animasyonu) ──────────────────────
interface LikeButtonProps {
  count: number
  isLiked: boolean
  onClick: () => void
  iconSize: number
  compact?: boolean
}

const LikeButton = ({
  count,
  isLiked,
  onClick,
  iconSize,
  compact,
}: LikeButtonProps) => (
  <button
    onClick={onClick}
    aria-label={isLiked ? 'Beğeniyi geri al' : 'Beğen'}
    className={cn(
      'group flex items-center gap-1.5',
      'rounded-[var(--radius-full)]',
      compact ? 'p-1' : 'px-2 py-2',
      'transition-all duration-[var(--transition)]',
      'hover:bg-[#E05A5A15]',
      isLiked
        ? 'text-[var(--error)]'
        : 'text-[var(--text-muted)] hover:text-[var(--error)]'
    )}
  >
    <motion.span
      animate={isLiked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <Heart
        size={iconSize}
        fill={isLiked ? 'currentColor' : 'none'}
        className="transition-all duration-[var(--transition)]"
      />
    </motion.span>
    {count > 0 && (
      <span className="text-xs tabular-nums">{formatCount(count)}</span>
    )}
  </button>
)