import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { debounce } from '@/lib/utils'
import type { Profile, Hashtag, Server } from '@/types/database'
import type { PostWithProfile } from '@/hooks/usePosts'

export type SearchTab = 'profiles' | 'posts' | 'hashtags' | 'servers'

export interface SearchResults {
  profiles: Profile[]
  posts: PostWithProfile[]
  hashtags: Hashtag[]
  servers: Server[]
}

// ── Profil arama ──────────────────────────────────────────
export const useSearchProfiles = (query: string) => {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['search', 'profiles', query],
    queryFn: async () => {
      if (!query.trim()) return []

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, username, display_name, avatar_url, bio,
          is_verified, is_nova_plus, selected_badge,
          follower_count, following_count, is_private
        `)
        .or(
          `username.ilike.%${query}%,display_name.ilike.%${query}%`
        )
        .neq('id', user?.id ?? '')
        .order('follower_count', { ascending: false })
        .limit(20)

      if (error) throw error
      return (data ?? []) as Profile[]
    },
    enabled: query.trim().length >= 1,
    staleTime: 1000 * 30,
  })
}

// ── Post arama (full-text) ────────────────────────────────
export const useSearchPosts = (query: string) => {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['search', 'posts', query],
    queryFn: async () => {
      if (!query.trim()) return []

      // Engellenen kullanıcıları al
      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', user?.id ?? '')

      const blockedIds = blocks?.map((b) => b.blocked_id) ?? []

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus, selected_badge
          )
        `)
        .textSearch('search_vector', query, {
          type: 'websearch',
          config: 'turkish',
        })
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const filtered = (data ?? []).filter(
        (p) => !blockedIds.includes(p.user_id)
      )

      return filtered as PostWithProfile[]
    },
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 30,
  })
}

// ── Hashtag arama ─────────────────────────────────────────
export const useSearchHashtags = (query: string) => {
  const cleanQuery = query.startsWith('#') ? query.slice(1) : query

  return useQuery({
    queryKey: ['search', 'hashtags', cleanQuery],
    queryFn: async () => {
      if (!cleanQuery.trim()) return []

      const { data, error } = await supabase
        .from('hashtags')
        .select('*')
        .ilike('name', `%${cleanQuery}%`)
        .order('post_count', { ascending: false })
        .limit(20)

      if (error) throw error
      return (data ?? []) as Hashtag[]
    },
    enabled: cleanQuery.trim().length >= 1,
    staleTime: 1000 * 60,
  })
}

// ── Sunucu arama ──────────────────────────────────────────
export const useSearchServers = (query: string) => {
  return useQuery({
    queryKey: ['search', 'servers', query],
    queryFn: async () => {
      if (!query.trim()) return []

      const { data, error } = await supabase
        .from('servers')
        .select(`
          *,
          profiles!servers_owner_id_fkey (
            id, username, display_name, avatar_url
          )
        `)
        .eq('is_public', true)
        .ilike('name', `%${query}%`)
        .order('member_count', { ascending: false })
        .limit(20)

      if (error) throw error
      return (data ?? []) as Server[]
    },
    enabled: query.trim().length >= 1,
    staleTime: 1000 * 60,
  })
}

// ── Trend hashtagler ──────────────────────────────────────
export const useTrendingHashtags = () => {
  return useQuery({
    queryKey: ['trending', 'hashtags'],
    queryFn: async () => {
      // Son 7 günün en popüler hashtagleri
      const { data, error } = await supabase
        .from('hashtags')
        .select('*')
        .order('post_count', { ascending: false })
        .limit(10)

      if (error) throw error
      return (data ?? []) as Hashtag[]
    },
    staleTime: 1000 * 60 * 5, // 5 dakika
  })
}

// ── Önerilen profiller ────────────────────────────────────
export const useSuggestedProfiles = () => {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['suggested', 'profiles', user?.id],
    queryFn: async () => {
      if (!user) return []

      // Zaten takip ettiklerini al
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = following?.map((f) => f.following_id) ?? []
      followingIds.push(user.id)

      // Engellenenler
      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id)

      const blockedIds = blocks?.map((b) => b.blocked_id) ?? []
      const excludeIds = [...followingIds, ...blockedIds]

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, username, display_name, avatar_url, bio,
          is_verified, is_nova_plus, selected_badge,
          follower_count, is_private
        `)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .order('follower_count', { ascending: false })
        .limit(6)

      if (error) throw error
      return (data ?? []) as Profile[]
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })
}

// ── Önerilen sunucular ────────────────────────────────────
export const useSuggestedServers = () => {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['suggested', 'servers', user?.id],
    queryFn: async () => {
      if (!user) return []

      // Katıldığı sunucular
      const { data: joined } = await supabase
        .from('server_members')
        .select('server_id')
        .eq('user_id', user.id)

      const joinedIds = joined?.map((s) => s.server_id) ?? []

      let query = supabase
        .from('servers')
        .select(`
          *,
          profiles!servers_owner_id_fkey (
            id, username, display_name, avatar_url
          )
        `)
        .eq('is_public', true)
        .order('member_count', { ascending: false })
        .limit(5)

      if (joinedIds.length > 0) {
        query = query.not('id', 'in', `(${joinedIds.join(',')})`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Server[]
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })
}

// ── useFollow (Keşfet'te kullanılır) ─────────────────────
export const useFollow = () => {
  const user = useAuthStore((s) => s.user)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const toggleFollow = useCallback(
    async (targetId: string, isPrivate: boolean) => {
      if (!user) return

      const isFollowing = followingIds.has(targetId)
      const isPending = pendingIds.has(targetId)

      if (isFollowing) {
        // Takibi bırak
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetId)
        setFollowingIds((prev) => {
          const next = new Set(prev)
          next.delete(targetId)
          return next
        })
      } else if (isPending) {
        // İsteği geri al
        await supabase
          .from('follow_requests')
          .delete()
          .eq('requester_id', user.id)
          .eq('target_id', targetId)
        setPendingIds((prev) => {
          const next = new Set(prev)
          next.delete(targetId)
          return next
        })
      } else if (isPrivate) {
        // Özel hesap → istek gönder
        await supabase
          .from('follow_requests')
          .insert({ requester_id: user.id, target_id: targetId })
        setPendingIds((prev) => new Set(prev).add(targetId))
      } else {
        // Takip et
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: targetId })
        setFollowingIds((prev) => new Set(prev).add(targetId))
      }
    },
    [user, followingIds, pendingIds]
  )

  const isFollowing = (id: string) => followingIds.has(id)
  const isPending = (id: string) => pendingIds.has(id)

  const initFollowState = useCallback(
    async (profileIds: string[]) => {
      if (!user || profileIds.length === 0) return

      const [{ data: follows }, { data: requests }] = await Promise.all([
        supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', profileIds),
        supabase
          .from('follow_requests')
          .select('target_id')
          .eq('requester_id', user.id)
          .in('target_id', profileIds),
      ])

      setFollowingIds(
        new Set(follows?.map((f) => f.following_id) ?? [])
      )
      setPendingIds(
        new Set(requests?.map((r) => r.target_id) ?? [])
      )
    },
    [user]
  )

  return { toggleFollow, isFollowing, isPending, initFollowState }
}