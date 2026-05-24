import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { PostThread } from '@/components/post/PostThread'
import { PostCardSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { AppLayout } from '@/components/layout/AppLayout'
import { usePost } from '@/hooks/usePosts'
import type { PostWithProfile } from '@/hooks/usePosts'

export const PostDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError } = usePost(id ?? '')

  // useInfiniteQuery'den tek sayfa verisi
  const post = data?.pages[0] as PostWithProfile | undefined

  return (
    <div>
      {/* Başlık */}
      <div className="sticky top-0 z-30 bg-[var(--bg-base)]/95 border-b border-[var(--border)] flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-[var(--radius-full)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-semibold text-[var(--text-primary)]">
          Post
        </h1>
      </div>

      {/* İçerik */}
      {isLoading ? (
        <PostCardSkeleton />
      ) : isError || !post ? (
        <div className="py-16 flex flex-col items-center gap-4">
          <p className="text-[var(--text-secondary)] text-sm">
            Post bulunamadı.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Geri Dön
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <PostThread post={post} />
        </motion.div>
      )}
    </div>
  )
}