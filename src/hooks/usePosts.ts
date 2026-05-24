import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import { parseDbError } from '@/lib/utils'
import type { Post, Profile } from '@/types/database'

export type FeedType = 'chronological' | 'explore'

export interface PostWithProfile extends Post {
  profiles: Profile
  user_liked: boolean
  user_reposted: boolean
  user_bookmarked: boolean
  quoted_post?: PostWithProfile | null
}

const POST_PAGE_SIZE = 20

// ── Feed sorgusu ──────────────────────────────────────────
export const useFeed = (feedType: FeedType) => {
  const user = useAuthStore((s) => s.user)

  return useInfiniteQuery({
    queryKey: ['feed', feedType, user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) throw new Error('Oturum açılmamış')

      // Engellenen ve susturulan kullanıcıları al
      const [{ data: blocks }, { data: mutes }] = await Promise.all([
        supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id),
        supabase.from('mutes').select('muted_id').eq('muter_id', user.id),
      ])

      const blockedIds = blocks?.map((b) => b.blocked_id) ?? []
      const mutedIds = mutes?.map((m) => m.muted_id) ?? []
      const excludedIds = [...new Set([...blockedIds, ...mutedIds])]

      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus, selected_badge,
            profile_accent, earned_badges
          ),
          quoted_post:posts!posts_quote_of_id_fkey (
            *,
            profiles!posts_user_id_fkey (
              id, username, display_name, avatar_url,
              is_verified, is_nova_plus, selected_badge
            )
          )
        `)
        .is('deleted_at', null)
        .range(
          pageParam * POST_PAGE_SIZE,
          (pageParam + 1) * POST_PAGE_SIZE - 1
        )

      // Filtreler
      if (excludedIds.length > 0) {
        query = query.not('user_id', 'in', `(${excludedIds.join(',')})`)
      }

      if (feedType === 'chronological') {
        // Sadece takip edilenlerin postları
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)

        const followingIds = following?.map((f) => f.following_id) ?? []
        followingIds.push(user.id) // Kendi postlarını da gör

        if (followingIds.length === 0) {
          return { posts: [], nextPage: null }
        }

        query = query
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
      } else {
        // Keşfet: scoring fonksiyonu ile sırala
        query = query.order('created_at', { ascending: false })
        // Not: compute_post_score DB fonksiyonu Supabase RPC ile çağrılır
        // Şimdilik created_at + like_count kombinasyonu
      }

      const { data, error } = await query

      if (error) throw error

      // Kullanıcının etkileşimlerini kontrol et
      const postIds = (data ?? []).map((p) => p.id)

      const [{ data: likedData }, { data: repostedData }, { data: bookmarkedData }] =
        await Promise.all([
          supabase
            .from('likes')
            .select('target_id')
            .eq('user_id', user.id)
            .eq('target_type', 'post')
            .in('target_id', postIds),
          supabase
            .from('reposts')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds),
          supabase
            .from('bookmarks')
            .select('target_id')
            .eq('user_id', user.id)
            .eq('target_type', 'post')
            .in('target_id', postIds),
        ])

      const likedSet = new Set(likedData?.map((l) => l.target_id) ?? [])
      const repostedSet = new Set(repostedData?.map((r) => r.post_id) ?? [])
      const bookmarkedSet = new Set(bookmarkedData?.map((b) => b.target_id) ?? [])

      const posts = (data ?? []).map((post) => ({
        ...post,
        user_liked: likedSet.has(post.id),
        user_reposted: repostedSet.has(post.id),
        user_bookmarked: bookmarkedSet.has(post.id),
      })) as PostWithProfile[]

      return {
        posts,
        nextPage: posts.length === POST_PAGE_SIZE ? pageParam + 1 : null,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!user,
  })
}

// ── Tek post ──────────────────────────────────────────────
export const usePost = (postId: string) => {
  const user = useAuthStore((s) => s.user)

  return useInfiniteQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus, selected_badge,
            profile_accent, earned_badges
          ),
          quoted_post:posts!posts_quote_of_id_fkey (
            *,
            profiles!posts_user_id_fkey (
              id, username, display_name, avatar_url,
              is_verified, is_nova_plus, selected_badge
            )
          )
        `)
        .eq('id', postId)
        .is('deleted_at', null)
        .single()

      if (error) throw error

      if (user) {
        const [{ data: liked }, { data: reposted }, { data: bookmarked }] =
          await Promise.all([
            supabase
              .from('likes')
              .select('target_id')
              .eq('user_id', user.id)
              .eq('target_type', 'post')
              .eq('target_id', postId)
              .maybeSingle(),
            supabase
              .from('reposts')
              .select('post_id')
              .eq('user_id', user.id)
              .eq('post_id', postId)
              .maybeSingle(),
            supabase
              .from('bookmarks')
              .select('target_id')
              .eq('user_id', user.id)
              .eq('target_type', 'post')
              .eq('target_id', postId)
              .maybeSingle(),
          ])

        return {
          ...data,
          user_liked: !!liked,
          user_reposted: !!reposted,
          user_bookmarked: !!bookmarked,
        } as PostWithProfile
      }

      return { ...data, user_liked: false, user_reposted: false, user_bookmarked: false } as PostWithProfile
    },
    initialPageParam: 0,
    getNextPageParam: () => null,
    enabled: !!postId,
  })
}

// ── Post oluştur ──────────────────────────────────────────
export const useCreatePost = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (params: {
      content: string
      mediaUrls?: string[]
      mediaTypes?: string[]
      replyToId?: string
      quoteOfId?: string
      threadId?: string
      threadPosition?: number
      pollData?: Post['poll_data']
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: params.content,
          media_urls: params.mediaUrls ?? [],
          media_types: params.mediaTypes ?? [],
          reply_to_id: params.replyToId ?? null,
          quote_of_id: params.quoteOfId ?? null,
          thread_id: params.threadId ?? null,
          thread_position: params.threadPosition ?? null,
          poll_data: params.pollData ?? null,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      toast.success('Post paylaşıldı!')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Post sil (soft delete) ────────────────────────────────
export const useDeletePost = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error('Oturum açılmamış')

      const { error } = await supabase
        .from('posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', postId)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      toast.success('Post silindi.')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Beğeni (optimistic) ───────────────────────────────────
export const useLikePost = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      postId,
      isLiked,
    }: {
      postId: string
      isLiked: boolean
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('target_id', postId)
          .eq('target_type', 'post')
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: user.id, target_id: postId, target_type: 'post' })
        if (error) throw error
      }
    },

    onMutate: async ({ postId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] })
      const previousFeed = queryClient.getQueriesData({ queryKey: ['feed'] })

      // Optimistic update — tüm feed cache'ini güncelle
      queryClient.setQueriesData(
        { queryKey: ['feed'] },
        (old: { pages: { posts: PostWithProfile[] }[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((post) =>
                post.id === postId
                  ? {
                      ...post,
                      user_liked: !isLiked,
                      like_count: isLiked
                        ? post.like_count - 1
                        : post.like_count + 1,
                    }
                  : post
              ),
            })),
          }
        }
      )

      return { previousFeed }
    },

    onError: (_err, _vars, context) => {
      // Rollback
      if (context?.previousFeed) {
        context.previousFeed.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error('Bir hata oluştu.')
    },
  })
}

// ── Repost (optimistic) ───────────────────────────────────
export const useRepost = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      postId,
      isReposted,
    }: {
      postId: string
      isReposted: boolean
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      if (isReposted) {
        const { error } = await supabase
          .from('reposts')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('reposts')
          .insert({ user_id: user.id, post_id: postId })
        if (error) throw error
      }
    },

    onMutate: async ({ postId, isReposted }) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] })
      const previousFeed = queryClient.getQueriesData({ queryKey: ['feed'] })

      queryClient.setQueriesData(
        { queryKey: ['feed'] },
        (old: { pages: { posts: PostWithProfile[] }[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((post) =>
                post.id === postId
                  ? {
                      ...post,
                      user_reposted: !isReposted,
                      repost_count: isReposted
                        ? post.repost_count - 1
                        : post.repost_count + 1,
                    }
                  : post
              ),
            })),
          }
        }
      )

      return { previousFeed }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousFeed) {
        context.previousFeed.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error('Bir hata oluştu.')
    },

    onSuccess: (_data, { isReposted }) => {
      toast.success(isReposted ? 'Repost geri alındı.' : 'Repost yapıldı!')
    },
  })
}

// ── Bookmark (optimistic) ─────────────────────────────────
export const useBookmark = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      postId,
      isBookmarked,
    }: {
      postId: string
      isBookmarked: boolean
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      if (isBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('target_id', postId)
          .eq('target_type', 'post')
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, target_id: postId, target_type: 'post' })
        if (error) throw error
      }
    },

    onMutate: async ({ postId, isBookmarked }) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] })
      const previousFeed = queryClient.getQueriesData({ queryKey: ['feed'] })

      queryClient.setQueriesData(
        { queryKey: ['feed'] },
        (old: { pages: { posts: PostWithProfile[] }[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((post) =>
                post.id === postId
                  ? {
                      ...post,
                      user_bookmarked: !isBookmarked,
                      bookmark_count: isBookmarked
                        ? post.bookmark_count - 1
                        : post.bookmark_count + 1,
                    }
                  : post
              ),
            })),
          }
        }
      )

      return { previousFeed }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousFeed) {
        context.previousFeed.forEach(([queryKey, data]) => {
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