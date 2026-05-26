import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  MoreHorizontal,
  Trash2,
  Flag,
  VolumeX,
  UserX,
  Quote,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo, formatCount } from '@/lib/utils'
import { parseContent } from '@/lib/parseContent'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { PostWithAuthor, PollData, PollOption, ReportReason } from '@/types/database'
import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import Modal from '@/components/ui/Modal'
import { VerifiedIcon } from '@/components/ui/Badge'

const REPORT_REASONS = [
  { key: 'spam',           label: 'Spam' },
  { key: 'harassment',     label: 'Taciz veya zorbalık' },
  { key: 'hate_speech',    label: 'Nefret söylemi' },
  { key: 'misinformation', label: 'Yanlış bilgi' },
  { key: 'nsfw',           label: 'Uygunsuz içerik' },
  { key: 'other',          label: 'Diğer' },
] as const

// ── PollDisplay ─────────────────────────────────────────────────────────────

type PollDisplayProps = {
  post: PostWithAuthor
}

function PollDisplay({ post }: PollDisplayProps) {
  const { user } = useAuthStore()
  const [pollData, setPollData] = useState<PollData>(post.poll_data!)
  const [votedIndex, setVotedIndex] = useState<number | null>(null)
  const [isVoting, setIsVoting] = useState(false)

  const isExpired = new Date(pollData.ends_at) < new Date()
  const totalVotes = pollData.options.reduce((sum, o) => sum + o.vote_count, 0)
  const hasVoted = votedIndex !== null

  const getRemainingText = () => {
    if (isExpired) return 'Sona erdi'
    const diffMs = new Date(pollData.ends_at).getTime() - Date.now()
    const diffH = Math.floor(diffMs / 3600000)
    if (diffH < 1) return '< 1 saat kaldı'
    if (diffH < 24) return `${diffH} saat kaldı`
    const diffD = Math.floor(diffH / 24)
    return `${diffD} gün kaldı`
  }

  const handleVote = async (e: React.MouseEvent, idx: number) => {
    e.stopPropagation()
    if (!user || hasVoted || isExpired || isVoting) return
    setIsVoting(true)

    const updatedOptions: PollOption[] = pollData.options.map((opt, i) =>
      i === idx ? { ...opt, vote_count: opt.vote_count + 1 } : opt
    )
    const updatedPollData: PollData = { ...pollData, options: updatedOptions }

    const { error } = await supabase
      .from('posts')
      .update({ poll_data: updatedPollData })
      .eq('id', post.id)

    if (error) {
      toast.error('Oy verilemedi')
    } else {
      setPollData(updatedPollData)
      setVotedIndex(idx)
    }
    setIsVoting(false)
  }

  const showResults = hasVoted || isExpired

  return (
    <div
      className="mt-2 space-y-2"
      onClick={(e) => e.stopPropagation()}
    >
      {pollData.options.map((opt, i) => {
        const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0
        const isSelected = votedIndex === i

        return showResults ? (
          <div key={i} className="relative rounded-lg overflow-hidden border border-line">
            <div
              className={cn(
                'absolute inset-y-0 left-0 transition-all duration-500',
                isSelected ? 'bg-accent/20' : 'bg-bg-surface'
              )}
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex items-center justify-between px-3 py-2">
              <span
                className={cn(
                  'text-sm',
                  isSelected ? 'text-accent font-medium' : 'text-text-primary'
                )}
              >
                {opt.text}
              </span>
              <span className="text-xs text-text-muted tabular-nums">{pct}%</span>
            </div>
          </div>
        ) : (
          <button
            key={i}
            type="button"
            onClick={(e) => void handleVote(e, i)}
            disabled={isVoting}
            className="w-full text-left px-3 py-2 rounded-lg border border-line text-sm text-text-primary hover:border-accent/60 hover:bg-accent/5 transition-default disabled:opacity-50"
          >
            {opt.text}
          </button>
        )
      })}

      <p className="text-xs text-text-muted">
        {formatCount(totalVotes)} oy · {getRemainingText()}
      </p>
    </div>
  )
}

// ── QuotePreview ─────────────────────────────────────────────────────────────

type QuotePreviewProps = {
  post: PostWithAuthor
}

function QuotePreview({ post: quotedPost }: QuotePreviewProps) {
  const navigate = useNavigate()

  return (
    <div
      className="border border-line rounded-xl p-3 mt-2 cursor-pointer hover:bg-bg-overlay transition-default"
      onClick={(e) => {
        e.stopPropagation()
        navigate(`/gonderi/${quotedPost.id}`)
      }}
    >
      <div className="flex items-center gap-1.5 mb-1 min-w-0">
        <Avatar
          src={quotedPost.profiles.avatar_url}
          fallback={quotedPost.profiles.display_name}
          size="sm"
          isNova={quotedPost.profiles.is_nova_plus}
        />
        <span className="font-semibold text-text-primary text-xs truncate">
          {quotedPost.profiles.display_name}
        </span>
        <span className="text-text-muted text-xs truncate">@{quotedPost.profiles.username}</span>
        <span className="text-text-muted text-xs">·</span>
        <span className="text-text-muted text-xs flex-shrink-0">{timeAgo(quotedPost.created_at)}</span>
      </div>
      <p className="text-text-secondary text-xs leading-relaxed line-clamp-2 break-words">
        {quotedPost.content}
      </p>
    </div>
  )
}

// ── RepostDropdown ────────────────────────────────────────────────────────────

type RepostDropdownProps = {
  reposted: boolean
  repostCount: number
  onRepost: (e: React.MouseEvent) => void
  onQuote?: () => void
}

function RepostDropdown({ reposted, repostCount, onRepost, onQuote }: RepostDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className={cn(
          'group flex items-center gap-1 p-1 rounded-full transition-default',
          reposted ? 'text-success' : 'text-text-muted hover:text-success hover:bg-success/10'
        )}
      >
        <Repeat2 size={17} />
        {repostCount > 0 && (
          <span className="text-xs tabular-nums">{formatCount(repostCount)}</span>
        )}
        <ChevronDown size={11} className="opacity-60" />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-1 z-50 min-w-[160px] bg-bg-elevated border border-line rounded-xl shadow-xl py-1 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => { setOpen(false); onRepost(e) }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-overlay transition-default text-left"
          >
            <Repeat2 size={15} />
            Yeniden Paylaş
          </button>
          {onQuote && (
            <button
              type="button"
              onClick={() => { setOpen(false); onQuote() }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-overlay transition-default text-left"
            >
              <Quote size={15} />
              Alıntıyla Paylaş
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── PostCard ─────────────────────────────────────────────────────────────────

type PostCardProps = {
  post: PostWithAuthor
  isLiked: boolean
  isReposted: boolean
  isBookmarked: boolean
  showBorder?: boolean
  onQuote?: (post: PostWithAuthor) => void
}

export default function PostCard({
  post,
  isLiked,
  isReposted,
  isBookmarked,
  showBorder = true,
  onQuote,
}: PostCardProps) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const author = post.profiles

  const [liked, setLiked] = useState(isLiked)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [reposted, setReposted] = useState(isReposted)
  const [repostCount, setRepostCount] = useState(post.repost_count)
  const [bookmarked, setBookmarked] = useState(isBookmarked)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSubmitting, setReportSubmitting] = useState(false)

  const isOwn = user?.id === post.user_id

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return

    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))

    try {
      if (next) {
        await supabase.from('likes').insert({ user_id: user.id, target_id: post.id, target_type: 'post' })
      } else {
        await supabase.from('likes').delete().match({ user_id: user.id, target_id: post.id, target_type: 'post' })
      }
      void queryClient.invalidateQueries({ queryKey: ['user-interactions'] })
    } catch {
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
      toast.error('İşlem başarısız')
    }
  }

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return

    const next = !reposted
    setReposted(next)
    setRepostCount((c) => c + (next ? 1 : -1))

    try {
      if (next) {
        await supabase.from('reposts').insert({ user_id: user.id, post_id: post.id })
      } else {
        await supabase.from('reposts').delete().match({ user_id: user.id, post_id: post.id })
      }
      void queryClient.invalidateQueries({ queryKey: ['user-interactions'] })
    } catch {
      setReposted(!next)
      setRepostCount((c) => c + (next ? -1 : 1))
      toast.error('İşlem başarısız')
    }
  }

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return

    const next = !bookmarked
    setBookmarked(next)

    try {
      if (next) {
        await supabase.from('bookmarks').insert({ user_id: user.id, target_id: post.id, target_type: 'post' })
        toast.success('Kaydedildi')
      } else {
        await supabase.from('bookmarks').delete().match({ user_id: user.id, target_id: post.id, target_type: 'post' })
      }
      void queryClient.invalidateQueries({ queryKey: ['user-interactions'] })
    } catch {
      setBookmarked(!next)
      toast.error('İşlem başarısız')
    }
  }

  const handleDelete = async () => {
    const { error } = await supabase
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', post.id)

    if (error) {
      toast.error('Gönderi silinemedi')
    } else {
      toast.success('Gönderi silindi')
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
    }
  }

  const handleMute = async () => {
    if (!user) return
    try {
      await supabase.from('mutes').insert({ muter_id: user.id, muted_id: author.id })
      toast.success(`@${author.username} susturuldu`)
      void queryClient.invalidateQueries({ queryKey: ['excluded-ids', user.id] })
    } catch {
      toast.error('İşlem başarısız')
    }
  }

  const handleBlock = async () => {
    if (!user) return
    try {
      await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: author.id })
      toast.success(`@${author.username} engellendi`)
      void queryClient.invalidateQueries({ queryKey: ['excluded-ids', user.id] })
    } catch {
      toast.error('İşlem başarısız')
    }
  }

  const handleReport = async (reason: ReportReason) => {
    if (!user) return
    setReportSubmitting(true)
    try {
      await supabase.from('reports').insert({
        reporter_id: user.id,
        target_id: post.id,
        target_type: 'post',
        reason,
      })
      toast.success('Şikayetiniz iletildi')
      setReportOpen(false)
    } catch {
      toast.error('Şikayet gönderilemedi')
    } finally {
      setReportSubmitting(false)
    }
  }

  const dropdownItems = isOwn
    ? [{ label: 'Sil', icon: <Trash2 size={14} />, danger: true, onClick: () => void handleDelete() }]
    : [
        { label: 'Şikayet et', icon: <Flag size={14} />,   onClick: () => setReportOpen(true) },
        { label: 'Sustur',     icon: <VolumeX size={14} />, onClick: () => void handleMute() },
        { label: 'Engelle',    icon: <UserX size={14} />,   danger: true, onClick: () => void handleBlock() },
      ]

  return (
    <>
      <article
        className={cn(
          'px-4 py-2.5 hover:bg-bg-overlay/40 transition-default cursor-pointer',
          showBorder && 'border-b border-line'
        )}
        onClick={() => navigate(`/gonderi/${post.id}`)}
      >
        <div className="flex gap-2.5">
          {/* Avatar */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/${author.username}`) }}
            className="flex-shrink-0"
          >
            <Avatar
              src={author.avatar_url}
              fallback={author.display_name}
              size="md"
              isNova={author.is_nova_plus}
            />
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate(`/${author.username}`) }}
                  className="font-semibold text-text-primary text-sm hover:underline truncate max-w-[140px]"
                >
                  {author.display_name}
                </button>
                {author.is_verified && <VerifiedIcon size={14} />}
                <span className="text-text-muted text-sm truncate">@{author.username}</span>
                <span className="text-text-muted text-sm">·</span>
                <span className="text-text-muted text-sm flex-shrink-0" title={post.created_at}>
                  {timeAgo(post.created_at)}
                </span>
              </div>

              <Dropdown
                trigger={
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-bg-overlay transition-default flex-shrink-0"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                }
                items={dropdownItems}
                align="right"
              />
            </div>

            {/* Post content */}
            <p className="text-text-primary text-[15px] leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
              {parseContent(post.content)}
            </p>

            {/* Media grid */}
            {post.media_urls.length > 0 && (
              <div
                className={cn(
                  'mt-2 rounded-xl overflow-hidden',
                  post.media_urls.length === 1 && 'max-h-[400px]',
                  post.media_urls.length === 2 && 'grid grid-cols-2 gap-0.5',
                  post.media_urls.length >= 3 && 'grid grid-cols-2 gap-0.5'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {post.media_urls.slice(0, 4).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className={cn(
                      'w-full object-cover bg-bg-elevated',
                      post.media_urls.length === 1 && 'max-h-[400px]',
                      post.media_urls.length >= 2 && 'h-48'
                    )}
                    loading="lazy"
                  />
                ))}
              </div>
            )}

            {/* Poll */}
            {post.poll_data && <PollDisplay post={post} />}

            {/* Quote post */}
            {post.quote_of_id && (
              post.quoted_post
                ? <QuotePreview post={post.quoted_post} />
                : (
                  <div className="border border-line rounded-xl p-3 mt-2 text-xs text-text-muted italic">
                    Bu gönderi artık mevcut değil
                  </div>
                )
            )}

            {/* Action bar */}
            <div className="flex items-center justify-between mt-2 -ml-1 max-w-xs">
              {/* Comment */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate(`/gonderi/${post.id}`) }}
                className="group flex items-center gap-1 p-1 rounded-full text-text-muted hover:text-accent hover:bg-accent/10 transition-default"
              >
                <MessageCircle size={17} />
                {post.reply_count > 0 && (
                  <span className="text-xs tabular-nums">{formatCount(post.reply_count)}</span>
                )}
              </button>

              {/* Repost dropdown */}
              <RepostDropdown
                reposted={reposted}
                repostCount={repostCount}
                onRepost={(e) => void handleRepost(e)}
                onQuote={onQuote ? () => onQuote(post) : undefined}
              />

              {/* Like */}
              <button
                type="button"
                onClick={(e) => void handleLike(e)}
                className={cn(
                  'group flex items-center gap-1 p-1 rounded-full transition-default',
                  liked
                    ? 'text-error'
                    : 'text-text-muted hover:text-error hover:bg-error/10'
                )}
              >
                <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
                {likeCount > 0 && (
                  <span className="text-xs tabular-nums">{formatCount(likeCount)}</span>
                )}
              </button>

              {/* Bookmark */}
              <button
                type="button"
                onClick={(e) => void handleBookmark(e)}
                className={cn(
                  'group flex items-center gap-1 p-1 rounded-full transition-default',
                  bookmarked
                    ? 'text-accent'
                    : 'text-text-muted hover:text-accent hover:bg-accent/10'
                )}
              >
                <Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
        </div>
      </article>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Şikayet Et" size="sm">
        <div className="p-4 space-y-2">
          <p className="text-text-secondary text-sm mb-3">Bu içeriği neden şikayet ediyorsunuz?</p>
          {REPORT_REASONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => void handleReport(key)}
              disabled={reportSubmitting}
              className="w-full text-left px-4 py-3 rounded-lg bg-bg-surface hover:bg-bg-overlay text-text-primary text-sm transition-default disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      </Modal>
    </>
  )
}
