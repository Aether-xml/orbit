import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import { parseDbError } from '@/lib/utils'
import type { Comment, Profile } from '@/types/database'

export interface CommentWithProfile extends Comment {
  profiles: Profile
  replies?: CommentWithProfile[]
  user_liked: boolean
}

// ── Yorumları getir ───────────────────────────────────────
export const useComments = (targetId: string, targetType: 'post' | 'reel') => {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['comments', targetId, targetType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles!comments_user_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus, selected_badge
          )
        `)
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .is('deleted_at', null)
        .is('reply_to_id', null) // Sadece ana yorumlar
        .order('created_at', { ascending: true })

      if (error) throw error

      // Beğeni durumu
      const commentIds = (data ?? []).map((c) => c.id)
      let likedSet = new Set<string>()

      if (user && commentIds.length > 0) {
        const { data: liked } = await supabase
          .from('likes')
          .select('target_id')
          .eq('user_id', user.id)
          .eq('target_type', 'comment')
          .in('target_id', commentIds)

        likedSet = new Set(liked?.map((l) => l.target_id) ?? [])
      }

      return (data ?? []).map((c) => ({
        ...c,
        user_liked: likedSet.has(c.id),
      })) as CommentWithProfile[]
    },
    enabled: !!targetId,
  })
}

// ── Yorum oluştur ─────────────────────────────────────────
export const useCreateComment = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (params: {
      targetId: string
      targetType: 'post' | 'reel'
      content: string
      replyToId?: string
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          target_id: params.targetId,
          target_type: params.targetType,
          content: params.content,
          reply_to_id: params.replyToId ?? null,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, { targetId, targetType }) => {
      queryClient.invalidateQueries({
        queryKey: ['comments', targetId, targetType],
      })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      toast.success('Yorum eklendi!')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Yorum sil (soft delete) ───────────────────────────────
export const useDeleteComment = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      commentId,
      targetId,
      targetType,
    }: {
      commentId: string
      targetId: string
      targetType: 'post' | 'reel'
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      const { error } = await supabase
        .from('comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', user.id)

      if (error) throw error
      return { targetId, targetType }
    },
    onSuccess: (_data, { targetId, targetType }) => {
      queryClient.invalidateQueries({
        queryKey: ['comments', targetId, targetType],
      })
      toast.success('Yorum silindi.')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Yorum beğeni (optimistic) ─────────────────────────────
export const useLikeComment = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      commentId,
      isLiked,
    }: {
      commentId: string
      targetId: string
      targetType: 'post' | 'reel'
      isLiked: boolean
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('target_id', commentId)
          .eq('target_type', 'comment')
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            target_id: commentId,
            target_type: 'comment',
          })
        if (error) throw error
      }
    },

    onMutate: async ({ commentId, targetId, targetType, isLiked }) => {
      await queryClient.cancelQueries({
        queryKey: ['comments', targetId, targetType],
      })
      const previous = queryClient.getQueryData([
        'comments',
        targetId,
        targetType,
      ])

      queryClient.setQueryData(
        ['comments', targetId, targetType],
        (old: CommentWithProfile[] | undefined) => {
          if (!old) return old
          return old.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  user_liked: !isLiked,
                  like_count: isLiked ? c.like_count - 1 : c.like_count + 1,
                }
              : c
          )
        }
      )

      return { previous }
    },

    onError: (_err, { targetId, targetType }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['comments', targetId, targetType],
          context.previous
        )
      }
      toast.error('Bir hata oluştu.')
    },
  })
}