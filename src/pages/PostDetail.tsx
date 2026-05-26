import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo, formatCount } from '@/lib/utils'
import { parseContent } from '@/lib/parseContent'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { PostWithAuthor, CommentWithAuthor } from '@/types/database'
import PostCard from '@/components/post/PostCard'
import PostComposer from '@/components/post/PostComposer'
import Avatar from '@/components/ui/Avatar'
import { VerifiedIcon } from '@/components/ui/Badge'
import { PostSkeleton, NotificationSkeleton } from '@/components/ui/Skeleton'

type UserInteractions = {
  likedIds: Set<string>
  repostedIds: Set<string>
  bookmarkedIds: Set<string>
}

async function fetchInteractions(userId: string): Promise<UserInteractions> {
  const [{ data: likes }, { data: reposts }, { data: bookmarks }] = await Promise.all([
    supabase.from('likes').select('target_id').eq('user_id', userId).eq('target_type', 'post'),
    supabase.from('reposts').select('post_id').eq('user_id', userId),
    supabase.from('bookmarks').select('target_id').eq('user_id', userId).eq('target_type', 'post'),
  ])
  return {
    likedIds: new Set(likes?.map((l) => l.target_id) ?? []),
    repostedIds: new Set(reposts?.map((r) => r.post_id) ?? []),
    bookmarkedIds: new Set(bookmarks?.map((b) => b.target_id) ?? []),
  }
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!inner(id, username, display_name, avatar_url, is_verified, is_nova_plus, selected_badge)')
        .eq('id', id!)
        .is('deleted_at', null)
        .single()
      if (error) throw error
      return data as unknown as PostWithAuthor
    },
    enabled: !!id,
  })

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles!inner(id, username, display_name, avatar_url, is_verified, is_nova_plus)')
        .eq('target_id', id!)
        .eq('target_type', 'post')
        .is('deleted_at', null)
        .is('reply_to_id', null)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as CommentWithAuthor[]
    },
    enabled: !!id,
  })

  const { data: interactions } = useQuery({
    queryKey: ['user-interactions', user?.id],
    queryFn: () => fetchInteractions(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-line flex items-center gap-4 px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full text-text-primary hover:bg-bg-overlay transition-default"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-semibold text-text-primary">Gönderi</h1>
      </div>

      {/* Post */}
      {postLoading ? (
        <PostSkeleton />
      ) : !post ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <p className="text-text-muted">Gönderi bulunamadı veya silinmiş.</p>
        </div>
      ) : (
        <PostCard
          post={post}
          isLiked={interactions?.likedIds.has(post.id) ?? false}
          isReposted={interactions?.repostedIds.has(post.id) ?? false}
          isBookmarked={interactions?.bookmarkedIds.has(post.id) ?? false}
          showBorder={true}
        />
      )}

      {/* Comment composer */}
      {post && (
        <PostComposer
          placeholder="Yanıtını yaz..."
          replyToId={post.id}
        />
      )}

      {/* Comments */}
      <div className="border-t border-line">
        {commentsLoading ? (
          Array.from({ length: 3 }).map((_, i) => <NotificationSkeleton key={i} />)
        ) : !comments || comments.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center px-4">
            <p className="text-text-muted text-sm">Henüz yorum yok. İlk yorumu sen yap!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} userId={user?.id} />
          ))
        )}
      </div>
    </div>
  )
}

function CommentCard({ comment, userId }: { comment: CommentWithAuthor; userId?: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const author = comment.profiles

  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(comment.like_count)

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userId) return

    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))

    try {
      if (next) {
        await supabase.from('likes').insert({ user_id: userId, target_id: comment.id, target_type: 'comment' })
      } else {
        await supabase.from('likes').delete().match({ user_id: userId, target_id: comment.id, target_type: 'comment' })
      }
    } catch {
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
      toast.error('İşlem başarısız')
    }
  }

  const handleDelete = async () => {
    if (userId !== comment.user_id) return
    const { error } = await supabase
      .from('comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', comment.id)

    if (error) {
      toast.error('Yorum silinemedi')
    } else {
      void queryClient.invalidateQueries({ queryKey: ['comments', comment.target_id] })
    }
  }

  return (
    <div className="px-4 py-3 border-b border-line hover:bg-bg-overlay/40 transition-default">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => navigate(`/${author.username}`)}
          className="flex-shrink-0"
        >
          <Avatar
            src={author.avatar_url}
            fallback={author.display_name}
            size="sm"
            isNova={author.is_nova_plus}
          />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => navigate(`/${author.username}`)}
              className="font-semibold text-text-primary text-sm hover:underline"
            >
              {author.display_name}
            </button>
            {author.is_verified && <VerifiedIcon size={13} />}
            <span className="text-text-muted text-xs">@{author.username}</span>
            <span className="text-text-muted text-xs">·</span>
            <span className="text-text-muted text-xs">{timeAgo(comment.created_at)}</span>
            {userId === comment.user_id && (
              <>
                <span className="text-text-muted text-xs">·</span>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="text-error text-xs hover:underline"
                >
                  Sil
                </button>
              </>
            )}
          </div>

          <p className="text-text-primary text-sm leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
            {parseContent(comment.content)}
          </p>

          <button
            type="button"
            onClick={(e) => void handleLike(e)}
            className={cn(
              'mt-2 flex items-center gap-1 text-xs transition-default',
              liked ? 'text-error' : 'text-text-muted hover:text-error'
            )}
          >
            <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
            {likeCount > 0 && <span className="tabular-nums">{formatCount(likeCount)}</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
