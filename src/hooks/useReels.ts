import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import { parseDbError } from '@/lib/utils'
import type { Reel, Profile } from '@/types/database'

export interface ReelWithProfile extends Reel {
  profiles: Profile
  user_liked: boolean
  user_bookmarked: boolean
}

const REEL_PAGE_SIZE = 5

// ── Reel feed ─────────────────────────────────────────────
export const useReelFeed = () => {
  const user = useAuthStore((s) => s.user)

  return useInfiniteQuery({
    queryKey: ['reels', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) throw new Error('Oturum açılmamış')

      // Engel ve mute filtresi
      const [{ data: blocks }, { data: mutes }] = await Promise.all([
        supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id),
        supabase.from('mutes').select('muted_id').eq('muter_id', user.id),
      ])

      const excludedIds = [
        ...(blocks?.map((b) => b.blocked_id) ?? []),
        ...(mutes?.map((m) => m.muted_id) ?? []),
      ]

      let query = supabase
        .from('reels')
        .select(`
          *,
          profiles!reels_user_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus, selected_badge,
            follower_count
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(
          pageParam * REEL_PAGE_SIZE,
          (pageParam + 1) * REEL_PAGE_SIZE - 1
        )

      if (excludedIds.length > 0) {
        query = query.not(
          'user_id',
          'in',
          `(${excludedIds.join(',')})`
        )
      }

      const { data, error } = await query
      if (error) throw error

      const reelIds = (data ?? []).map((r) => r.id)

      const [{ data: likedData }, { data: bookmarkedData }] =
        await Promise.all([
          supabase
            .from('likes')
            .select('target_id')
            .eq('user_id', user.id)
            .eq('target_type', 'reel')
            .in('target_id', reelIds),
          supabase
            .from('bookmarks')
            .select('target_id')
            .eq('user_id', user.id)
            .eq('target_type', 'reel')
            .in('target_id', reelIds),
        ])

      const likedSet = new Set(likedData?.map((l) => l.target_id) ?? [])
      const bookmarkedSet = new Set(
        bookmarkedData?.map((b) => b.target_id) ?? []
      )

      const reels = (data ?? []).map((reel) => ({
        ...reel,
        user_liked: likedSet.has(reel.id),
        user_bookmarked: bookmarkedSet.has(reel.id),
      })) as ReelWithProfile[]

      return {
        reels,
        nextPage: reels.length === REEL_PAGE_SIZE ? pageParam + 1 : null,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!user,
  })
}

// ── Reel beğen ────────────────────────────────────────────
export const useLikeReel = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      reelId,
      isLiked,
    }: {
      reelId: string
      isLiked: boolean
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('target_id', reelId)
          .eq('target_type', 'reel')
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            target_id: reelId,
            target_type: 'reel',
          })
        if (error) throw error
      }
    },

    onMutate: async ({ reelId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['reels'] })
      const previous = queryClient.getQueriesData({ queryKey: ['reels'] })

      queryClient.setQueriesData(
        { queryKey: ['reels'] },
        (old: { pages: { reels: ReelWithProfile[] }[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              reels: page.reels.map((reel) =>
                reel.id === reelId
                  ? {
                      ...reel,
                      user_liked: !isLiked,
                      like_count: isLiked
                        ? reel.like_count - 1
                        : reel.like_count + 1,
                    }
                  : reel
              ),
            })),
          }
        }
      )

      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        context.previous.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error('Bir hata oluştu.')
    },
  })
}

// ── Reel kaydet ───────────────────────────────────────────
export const useBookmarkReel = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      reelId,
      isBookmarked,
    }: {
      reelId: string
      isBookmarked: boolean
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      if (isBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('target_id', reelId)
          .eq('target_type', 'reel')
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            target_id: reelId,
            target_type: 'reel',
          })
        if (error) throw error
      }
    },

    onMutate: async ({ reelId, isBookmarked }) => {
      await queryClient.cancelQueries({ queryKey: ['reels'] })
      const previous = queryClient.getQueriesData({ queryKey: ['reels'] })

      queryClient.setQueriesData(
        { queryKey: ['reels'] },
        (old: { pages: { reels: ReelWithProfile[] }[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              reels: page.reels.map((reel) =>
                reel.id === reelId
                  ? {
                      ...reel,
                      user_bookmarked: !isBookmarked,
                    }
                  : reel
              ),
            })),
          }
        }
      )

      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        context.previous.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error('Bir hata oluştu.')
    },

    onSuccess: (_data, { isBookmarked }) => {
      toast.success(isBookmarked ? 'Kaydedilenlerden çıkarıldı.' : 'Kaydedildi!')
    },
  })
}

// ── View count kaydet ─────────────────────────────────────
export const useRecordReelView = () => {
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (reelId: string) => {
      if (!user) return
      await supabase
        .from('reel_views')
        .upsert(
          { reel_id: reelId, viewer_id: user.id },
          { onConflict: 'reel_id,viewer_id', ignoreDuplicates: true }
        )
    },
  })
}

// ── Reel sil ──────────────────────────────────────────────
export const useDeleteReel = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (reelId: string) => {
      if (!user) throw new Error('Oturum açılmamış')

      const { error } = await supabase
        .from('reels')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', reelId)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reels'] })
      toast.success('Reel silindi.')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Reel yükle ────────────────────────────────────────────
export const useUploadReel = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  return useMutation({
    mutationFn: async (params: {
      file: File
      caption?: string
      musicName?: string
      musicArtist?: string
      duration: number
    }) => {
      if (!user || !profile) throw new Error('Oturum açılmamış')

      // Nova+ süre kontrolü (uygulama katmanı)
      const maxDuration = profile.is_nova_plus ? 180 : 60
      if (params.duration > maxDuration) {
        throw new Error(
          `Reel süresi en fazla ${maxDuration} saniye olabilir.${
            !profile.is_nova_plus
              ? ' Nova+ ile 3 dakikaya kadar yükleyebilirsin.'
              : ''
          }`
        )
      }

      // Video yükle
      const ext = params.file.name.split('.').pop() ?? 'mp4'
      const videoPath = `reels/${user.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(videoPath, params.file, { cacheControl: '3600' })

      if (uploadError) throw uploadError

      const { data: videoUrl } = supabase.storage
        .from('media')
        .getPublicUrl(videoPath)

      // Thumbnail Supabase Edge Function ile oluşturulur
      // Şimdilik null, Edge Function Faz 8'de entegre edilir
      const thumbnailUrl: string | null = null

      const { data, error } = await supabase
        .from('reels')
        .insert({
          user_id: user.id,
          video_url: videoUrl.publicUrl,
          thumbnail_url: thumbnailUrl,
          caption: params.caption ?? null,
          music_name: params.musicName ?? null,
          music_artist: params.musicArtist ?? null,
          duration_seconds: Math.round(params.duration),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reels'] })
      toast.success('Reel paylaşıldı!')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}