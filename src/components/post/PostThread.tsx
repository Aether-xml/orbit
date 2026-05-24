import { useState } from 'react'
import { PostCard } from './PostCard'
import { PostComposer } from './PostComposer'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useComments, useCreateComment, useLikeComment, useDeleteComment } from '@/hooks/useComments'
import { useAuthStore } from '@/store/authStore'
import { timeAgo, formatCount } from '@/lib/utils'
import { Heart, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PostWithProfile } from '@/hooks/usePosts'
import type { CommentWithProfile } from '@/hooks/useComments'

interface PostThreadProps {
  post: PostWithProfile
}

export const PostThread = ({ post }: PostThreadProps) => {
  const [showComposer, setShowComposer] = useState(false)
  const { data: comments, isLoading } = useComments(post.id, 'post')

  return (
    <div>
      {/* Ana post */}
      <PostCard
        post={post}
        onReplyClick={() => setShowComposer(true)}
      />

      {/* Yorum yaz */}
      {showComposer && (
        <PostComposer
          replyTo={post}
          autoFocus
          onSuccess={() => setShowComposer(false)}
        />
      )}

      {/* Yorumlar */}
      <div>
        {isLoading ? (
          <CommentListSkeleton />
        ) : (comments ?? []).length === 0 ? (
          <EmptyComments />
        ) : (
          (comments ?? []).map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              postId={post.id}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Yorum Kartı ───────────────────────────────────────────
interface CommentCardProps {
  comment: CommentWithProfile
  postId: string
}

const CommentCard = ({ comment, postId }: CommentCardProps) => {
  const currentUser = useAuthStore((s) => s.user)
  const { mutate: likeComment } = useLikeComment()
  const { mutate: deleteComment } = useDeleteComment()
  const [showReplyComposer, setShowReplyComposer] = useState(false)
  const { mutate: createComment } = useCreateComment()

  const isOwner = currentUser?.id === comment.user_id
  const profile = comment.profiles

  const handleLike = () => {
    likeComment({
      commentId: comment.id,
      targetId: postId,
      targetType: 'post',
      isLiked: comment.user_liked,
    })
  }

  const handleDelete = () => {
    deleteComment({
      commentId: comment.id,
      targetId: postId,
      targetType: 'post',
    })
  }

  return (
    <div className="px-4 py-3 border-b border-[var(--border)] group">
      <div className="flex gap-3">
        <Avatar
          src={profile.avatar_url}
          fallback={profile.display_name}
          size="sm"
          isNova={profile.is_nova_plus}
          className="shrink-0 mt-0.5"
        />

        <div className="flex-1 min-w-0">
          {/* Başlık */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {profile.display_name}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              @{profile.username}
            </span>
            <span className="text-xs text-[var(--text-muted)]">·</span>
            <span className="text-xs text-[var(--text-muted)]">
              {timeAgo(comment.created_at)}
            </span>
          </div>

          {/* İçerik */}
          <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words">
            {comment.content}
          </p>

          {/* Alt aksiyonlar */}
          <div className="flex items-center gap-3 mt-2">
            {/* Beğen */}
            <button
              onClick={handleLike}
              className={cn(
                'flex items-center gap-1 text-xs',
                'transition-colors duration-[var(--transition)]',
                comment.user_liked
                  ? 'text-[var(--error)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--error)]'
              )}
            >
              <Heart
                size={14}
                fill={comment.user_liked ? 'currentColor' : 'none'}
              />
              {comment.like_count > 0 && (
                <span>{formatCount(comment.like_count)}</span>
              )}
            </button>

            {/* Yanıtla */}
            <button
              onClick={() => setShowReplyComposer((v) => !v)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Yanıtla
            </button>

            {/* Sil */}
            {isOwner && (
              <button
                onClick={handleDelete}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--error)] transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {/* Yanıt yazma */}
          {showReplyComposer && (
            <div className="mt-3 flex gap-2">
              <Avatar
                src={useAuthStore.getState().profile?.avatar_url}
                fallback={useAuthStore.getState().profile?.display_name ?? 'U'}
                size="xs"
              />
              <InlineReplyInput
                onSubmit={(text) => {
                  createComment({
                    targetId: postId,
                    targetType: 'post',
                    content: text,
                    replyToId: comment.id,
                  })
                  setShowReplyComposer(false)
                }}
                onCancel={() => setShowReplyComposer(false)}
                placeholder={`@${profile.username}'e yanıtla...`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Satır içi yanıt input ─────────────────────────────────
const InlineReplyInput = ({
  onSubmit,
  onCancel,
  placeholder,
}: {
  onSubmit: (text: string) => void
  onCancel: () => void
  placeholder: string
}) => {
  const [value, setValue] = useState('')

  return (
    <div className="flex-1">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus
        rows={2}
        className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none outline-none leading-relaxed"
      />
      <div className="flex gap-2 mt-1">
        <Button
          size="sm"
          onClick={() => value.trim() && onSubmit(value.trim())}
          disabled={!value.trim()}
        >
          Yanıtla
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          İptal
        </Button>
      </div>
    </div>
  )
}

// ── Skeleton'lar ──────────────────────────────────────────
const CommentListSkeleton = () => (
  <div className="divide-y divide-[var(--border)]">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="px-4 py-3 flex gap-3">
        <Skeleton className="w-8 h-8 shrink-0" rounded="full" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="w-20 h-3" />
            <Skeleton className="w-14 h-3" />
          </div>
          <Skeleton className="w-full h-3" />
          <Skeleton className="w-2/3 h-3" />
        </div>
      </div>
    ))}
  </div>
)

const EmptyComments = () => (
  <div className="py-12 text-center">
    <p className="text-[var(--text-muted)] text-sm">
      Henüz yorum yok. İlk yorumu sen yap!
    </p>
  </div>
)