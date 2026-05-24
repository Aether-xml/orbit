import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MoreHorizontal, Pencil, Trash2, Flag, VolumeX, UserX } from 'lucide-react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Dropdown } from '@/components/ui/Dropdown'
import { PostActions } from './PostActions'
import { cn, timeAgo, parseHashtags, parseMentions } from '@/lib/utils'
import { useDeletePost } from '@/hooks/usePosts'
import { useAuthStore } from '@/store/authStore'
import type { PostWithProfile } from '@/hooks/usePosts'
import type { BadgeKey } from '@/types/user'

interface PostCardProps {
  post: PostWithProfile
  showThread?: boolean
  isQuote?: boolean
  compact?: boolean
  onReplyClick?: (post: PostWithProfile) => void
}

export const PostCard = ({
  post,
  showThread = false,
  isQuote = false,
  compact = false,
  onReplyClick,
}: PostCardProps) => {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const { mutate: deletePost } = useDeletePost()
  const isOwner = currentUser?.id === post.user_id
  const profile = post.profiles

  const handleCardClick = useCallback(() => {
    if (!isQuote) navigate(`/post/${post.id}`)
  }, [post.id, isQuote, navigate])

  const handleProfileClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      navigate(`/${profile.username}`)
    },
    [profile.username, navigate]
  )

  const dropdownItems = [
    ...(isOwner
      ? [
          {
            label: 'Sil',
            icon: <Trash2 size={15} />,
            variant: 'danger' as const,
            onClick: () => deletePost(post.id),
          },
        ]
      : [
          {
            label: 'Şikayet Et',
            icon: <Flag size={15} />,
            onClick: () => {/* Faz 4'te */},
          },
          {
            label: 'Sustur',
            icon: <VolumeX size={15} />,
            onClick: () => {/* Faz 4'te */},
          },
          {
            label: 'Engelle',
            icon: <UserX size={15} />,
            variant: 'danger' as const,
            onClick: () => {/* Faz 4'te */},
          },
        ]),
  ]

  if (isQuote) {
    return <QuoteCard post={post} />
  }

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative flex gap-3 px-4 py-3',
        'border-b border-[var(--border)]',
        !isQuote && 'cursor-pointer hover:bg-[var(--bg-surface)]/50',
        'transition-colors duration-[var(--transition)]',
        'group'
      )}
      onClick={handleCardClick}
    >
      {/* Thread çizgisi */}
      {showThread && (
        <div className="absolute left-[34px] top-[56px] bottom-0 w-0.5 bg-[var(--border)]" />
      )}

      {/* Avatar */}
      <div className="shrink-0 z-10" onClick={handleProfileClick}>
        <Avatar
          src={profile.avatar_url}
          fallback={profile.display_name}
          size="md"
          isNova={profile.is_nova_plus}
          className="cursor-pointer"
        />
      </div>

      {/* İçerik */}
      <div className="flex-1 min-w-0">
        {/* Başlık */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <button
              onClick={handleProfileClick}
              className="font-semibold text-sm text-[var(--text-primary)] hover:underline truncate"
            >
              {profile.display_name}
            </button>

            {/* Rozet */}
            {profile.selected_badge && (
              <Badge badgeKey={profile.selected_badge as BadgeKey} size="sm" />
            )}

            {/* Doğrulanmış */}
            {profile.is_verified && (
              <span className="text-[var(--info)] text-xs">✓</span>
            )}

            <span className="text-[var(--text-muted)] text-sm truncate">
              @{profile.username}
            </span>
            <span className="text-[var(--text-muted)] text-xs shrink-0">·</span>
            <span className="text-[var(--text-muted)] text-xs shrink-0">
              {timeAgo(post.created_at)}
            </span>

            {/* Düzenlendi işareti */}
            {post.is_edited && (
              <>
                <span className="text-[var(--text-muted)] text-xs">·</span>
                <span className="flex items-center gap-0.5 text-[var(--text-muted)] text-xs">
                  <Pencil size={10} />
                  düzenlendi
                </span>
              </>
            )}
          </div>

          {/* Menü */}
          <div onClick={(e) => e.stopPropagation()}>
            <Dropdown
              trigger={
                <button className="p-1.5 rounded-[var(--radius-full)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors opacity-0 group-hover:opacity-100">
                  <MoreHorizontal size={16} />
                </button>
              }
              items={dropdownItems}
              align="right"
            />
          </div>
        </div>

        {/* Post içeriği */}
        <PostContent content={post.content} />

        {/* Medya */}
        {post.media_urls.length > 0 && (
          <PostMedia
            urls={post.media_urls}
            types={post.media_types}
          />
        )}

        {/* Anket */}
        {post.poll_data && (
          <PollDisplay poll={post.poll_data} />
        )}

        {/* Alıntı post */}
        {post.quoted_post && (
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <QuoteCard post={post.quoted_post as PostWithProfile} />
          </div>
        )}

        {/* Yanıtlanıyor bilgisi */}
        {post.reply_to_id && !showThread && (
          <ReplyingTo replyToId={post.reply_to_id} />
        )}

        {/* Aksiyonlar */}
        <div className="mt-2">
          <PostActions
            post={post}
            onReplyClick={() => onReplyClick?.(post)}
            compact={compact}
          />
        </div>
      </div>
    </motion.article>
  )
}

// ── Post İçerik (hashtag ve mention parse) ───────────────
const PostContent = ({ content }: { content: string }) => {
  const parts = content.split(/(#[\wğüşıöçĞÜŞİÖÇ]+|@\w+)/gi)

  return (
    <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words mb-2">
      {parts.map((part, i) => {
        if (part.startsWith('#')) {
          return (
            <Link
              key={i}
              to={`/kesif?q=${encodeURIComponent(part)}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[var(--accent)] hover:underline"
            >
              {part}
            </Link>
          )
        }
        if (part.startsWith('@')) {
          const username = part.slice(1)
          return (
            <Link
              key={i}
              to={`/${username}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[var(--info)] hover:underline"
            >
              {part}
            </Link>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}

// ── Medya Grid ────────────────────────────────────────────
interface PostMediaProps {
  urls: string[]
  types: string[]
}

const PostMedia = ({ urls, types }: PostMediaProps) => {
  const count = urls.length

  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-2',
    4: 'grid-cols-2',
  }[Math.min(count, 4)] ?? 'grid-cols-2'

  return (
    <div
      className={cn(
        'grid gap-1 rounded-[var(--radius-lg)] overflow-hidden mb-2',
        gridClass
      )}
    >
      {urls.slice(0, 4).map((url, i) => {
        const type = types[i] ?? 'image'
        const isLast = i === 3 && count > 4

        return (
          <div
            key={i}
            className={cn(
              'relative overflow-hidden bg-[var(--bg-elevated)]',
              count === 1 ? 'aspect-video' : 'aspect-square',
              count === 3 && i === 0 ? 'row-span-2' : ''
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {type === 'video' ? (
              <video
                src={url}
                className="w-full h-full object-cover"
                controls
                preload="metadata"
              />
            ) : (
              <img
                src={url}
                alt={`Medya ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
            {isLast && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  +{count - 4}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Anket ─────────────────────────────────────────────────
import type { PollData } from '@/types/database'

const PollDisplay = ({ poll }: { poll: PollData }) => {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.vote_count, 0)
  const isEnded = new Date(poll.ends_at) < new Date()

  return (
    <div
      className="mt-2 mb-2 space-y-2 p-3 bg-[var(--bg-elevated)] rounded-[var(--radius-lg)] border border-[var(--border)]"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-sm font-medium text-[var(--text-primary)]">
        {poll.question}
      </p>
      {poll.options.map((option) => {
        const pct =
          totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0
        return (
          <div key={option.id} className="relative">
            <div
              className="absolute inset-0 bg-[var(--accent-muted)] rounded-[var(--radius-sm)]"
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[var(--text-primary)]">
                {option.text}
              </span>
              <span className="text-xs text-[var(--text-muted)] tabular-nums">
                %{pct}
              </span>
            </div>
          </div>
        )
      })}
      <p className="text-xs text-[var(--text-muted)]">
        {totalVotes} oy · {isEnded ? 'Sona erdi' : 'Devam ediyor'}
      </p>
    </div>
  )
}

// ── Alıntı Kartı ──────────────────────────────────────────
const QuoteCard = ({ post }: { post: PostWithProfile }) => {
  const navigate = useNavigate()
  const profile = post.profiles

  return (
    <div
      className={cn(
        'mt-2 p-3',
        'bg-[var(--bg-elevated)] border border-[var(--border)]',
        'rounded-[var(--radius-lg)]',
        'cursor-pointer hover:bg-[var(--bg-overlay)]',
        'transition-colors duration-[var(--transition)]'
      )}
      onClick={(e) => {
        e.stopPropagation()
        navigate(`/post/${post.id}`)
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Avatar
          src={profile.avatar_url}
          fallback={profile.display_name}
          size="xs"
          isNova={profile.is_nova_plus}
        />
        <span className="text-xs font-semibold text-[var(--text-primary)]">
          {profile.display_name}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          @{profile.username}
        </span>
        <span className="text-xs text-[var(--text-muted)]">·</span>
        <span className="text-xs text-[var(--text-muted)]">
          {timeAgo(post.created_at)}
        </span>
      </div>
      <p className="text-sm text-[var(--text-secondary)] line-clamp-3">
        {post.content}
      </p>
      {post.media_urls.length > 0 && (
        <p className="text-xs text-[var(--text-muted)] mt-1">
          📎 {post.media_urls.length} medya
        </p>
      )}
    </div>
  )
}

// ── Yanıtlanıyor ──────────────────────────────────────────
const ReplyingTo = ({ replyToId }: { replyToId: string }) => {
  // Basit gösterim — gerçek kullanıcı adı Faz 2 ilerleyen adımlarında join ile gelir
  return (
    <p className="text-xs text-[var(--text-muted)] mb-1">
      ↩ bir yanıt
    </p>
  )
}