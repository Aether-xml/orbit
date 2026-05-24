import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import { parseDbError } from '@/lib/utils'
import type { Profile, FollowRequest, Block, Mute, Report } from '@/types/database'

// ── Profil getir ──────────────────────────────────────────
export const useProfile = (username: string) => {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (error) throw error
      return data as Profile
    },
    enabled: !!username,
  })
}

// ── Profil ID ile getir ───────────────────────────────────
export const useProfileById = (userId: string) => {
  return useQuery({
    queryKey: ['profile-by-id', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data as Profile
    },
    enabled: !!userId,
  })
}

// ── Takip durumu ──────────────────────────────────────────
export const useFollowStatus = (targetId: string) => {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['follow-status', user?.id, targetId],
    queryFn: async () => {
      if (!user) return { isFollowing: false, isPending: false, isBlocked: false }

      const [
        { data: followData },
        { data: requestData },
        { data: blockData },
      ] = await Promise.all([
        supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', targetId)
          .maybeSingle(),
        supabase
          .from('follow_requests')
          .select('requester_id')
          .eq('requester_id', user.id)
          .eq('target_id', targetId)
          .maybeSingle(),
        supabase
          .from('blocks')
          .select('blocker_id')
          .eq('blocker_id', user.id)
          .eq('blocked_id', targetId)
          .maybeSingle(),
      ])

      return {
        isFollowing: !!followData,
        isPending: !!requestData,
        isBlocked: !!blockData,
      }
    },
    enabled: !!user && !!targetId,
  })
}

// ── Takip et / bırak ──────────────────────────────────────
export const useToggleFollow = (targetId: string, isPrivate: boolean) => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      isFollowing,
      isPending,
    }: {
      isFollowing: boolean
      isPending: boolean
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetId)
        if (error) throw error
        return 'unfollowed'
      } else if (isPending) {
        const { error } = await supabase
          .from('follow_requests')
          .delete()
          .eq('requester_id', user.id)
          .eq('target_id', targetId)
        if (error) throw error
        return 'request-cancelled'
      } else if (isPrivate) {
        const { error } = await supabase
          .from('follow_requests')
          .insert({ requester_id: user.id, target_id: targetId })
        if (error) throw error
        return 'request-sent'
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: targetId })
        if (error) throw error
        return 'followed'
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ['follow-status', user?.id, targetId],
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })

      const messages: Record<string, string> = {
        'followed': 'Takip edildi!',
        'unfollowed': 'Takipten çıkıldı.',
        'request-sent': 'Takip isteği gönderildi.',
        'request-cancelled': 'Takip isteği geri alındı.',
      }
      toast.success(messages[result] ?? 'İşlem tamamlandı.')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Profil güncelle ───────────────────────────────────────
export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  const { profile, setProfile } = useAuthStore((s) => ({
    profile: s.profile,
    setProfile: s.setProfile,
  }))

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!profile) throw new Error('Profil bulunamadı')

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single()

      if (error) throw error
      return data as Profile
    },
    onSuccess: (updated) => {
      setProfile(updated)
      queryClient.invalidateQueries({
        queryKey: ['profile', updated.username],
      })
      toast.success('Profil güncellendi.')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Avatar yükle ──────────────────────────────────────────
export const useUploadAvatar = () => {
  const { mutateAsync: updateProfile } = useUpdateProfile()
  const profile = useAuthStore((s) => s.profile)

  return useMutation({
    mutationFn: async (file: File) => {
      if (!profile) throw new Error('Profil bulunamadı')

      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `avatars/${profile.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, file, { upsert: true, cacheControl: '3600' })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('media').getPublicUrl(path)
      await updateProfile({ avatar_url: data.publicUrl })
      return data.publicUrl
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Banner yükle ──────────────────────────────────────────
export const useUploadBanner = () => {
  const { mutateAsync: updateProfile } = useUpdateProfile()
  const profile = useAuthStore((s) => s.profile)

  return useMutation({
    mutationFn: async (file: File) => {
      if (!profile) throw new Error('Profil bulunamadı')

      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `banners/${profile.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, file, { upsert: true, cacheControl: '3600' })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('media').getPublicUrl(path)
      await updateProfile({ banner_url: data.publicUrl })
      return data.publicUrl
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Kullanıcının postları ─────────────────────────────────
export const useUserPosts = (userId: string) => {
  return useQuery({
    queryKey: ['user-posts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus, selected_badge
          )
        `)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      return data ?? []
    },
    enabled: !!userId,
  })
}

// ── Kullanıcının reels'leri ───────────────────────────────
export const useUserReels = (userId: string) => {
  return useQuery({
    queryKey: ['user-reels', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reels')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      return data ?? []
    },
    enabled: !!userId,
  })
}

// ── Kullanıcının beğenileri ───────────────────────────────
export const useUserLikes = (userId: string) => {
  return useQuery({
    queryKey: ['user-likes', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('likes')
        .select(`
          target_id,
          posts!likes_target_id_fkey (
            *,
            profiles!posts_user_id_fkey (
              id, username, display_name, avatar_url,
              is_verified, is_nova_plus, selected_badge
            )
          )
        `)
        .eq('user_id', userId)
        .eq('target_type', 'post')
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      return (data ?? [])
        .map((l) => l.posts)
        .filter(Boolean)
    },
    enabled: !!userId,
  })
}

// ── Kullanıcının kaydettikleri ────────────────────────────
export const useUserBookmarks = (userId: string) => {
  const currentUser = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['user-bookmarks', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          target_id,
          posts!bookmarks_target_id_fkey (
            *,
            profiles!posts_user_id_fkey (
              id, username, display_name, avatar_url,
              is_verified, is_nova_plus, selected_badge
            )
          )
        `)
        .eq('user_id', userId)
        .eq('target_type', 'post')
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      return (data ?? [])
        .map((b) => b.posts)
        .filter(Boolean)
    },
    // Sadece kendi kaydettiklerine erişebilir
    enabled: !!userId && currentUser?.id === userId,
  })
}

// ── Engelle ───────────────────────────────────────────────
export const useBlock = (targetId: string) => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (isBlocked: boolean) => {
      if (!user) throw new Error('Oturum açılmamış')

      if (isBlocked) {
        const { error } = await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', user.id)
          .eq('blocked_id', targetId)
        if (error) throw error
      } else {
        // Önce takibi kaldır
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetId)

        const { error } = await supabase
          .from('blocks')
          .insert({ blocker_id: user.id, blocked_id: targetId })
        if (error) throw error
      }
    },
    onSuccess: (_data, isBlocked) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({
        queryKey: ['follow-status', user?.id, targetId],
      })
      toast.success(isBlocked ? 'Engel kaldırıldı.' : 'Kullanıcı engellendi.')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Sustur ────────────────────────────────────────────────
export const useMute = (targetId: string) => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (isMuted: boolean) => {
      if (!user) throw new Error('Oturum açılmamış')

      if (isMuted) {
        const { error } = await supabase
          .from('mutes')
          .delete()
          .eq('muter_id', user.id)
          .eq('muted_id', targetId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('mutes')
          .insert({ muter_id: user.id, muted_id: targetId })
        if (error) throw error
      }
    },
    onSuccess: (_data, isMuted) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      toast.success(isMuted ? 'Susturma kaldırıldı.' : 'Kullanıcı susturuldu.')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Şikayet et ────────────────────────────────────────────
export const useReport = () => {
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (params: {
      targetId: string
      targetType: Report['target_type']
      reason: Report['reason']
      description?: string
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        target_id: params.targetId,
        target_type: params.targetType,
        reason: params.reason,
        description: params.description ?? null,
      })

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Şikayetin alındı. İnceleyeceğiz.')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Takipçi listesi ───────────────────────────────────────
export const useFollowers = (userId: string) => {
  return useQuery({
    queryKey: ['followers', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          profiles!follows_follower_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus, selected_badge,
            follower_count, is_private
          )
        `)
        .eq('following_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []).map((f) => f.profiles) as Profile[]
    },
    enabled: !!userId,
  })
}

// ── Takip edilenler listesi ───────────────────────────────
export const useFollowing = (userId: string) => {
  return useQuery({
    queryKey: ['following', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles!follows_following_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus, selected_badge,
            follower_count, is_private
          )
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []).map((f) => f.profiles) as Profile[]
    },
    enabled: !!userId,
  })
}