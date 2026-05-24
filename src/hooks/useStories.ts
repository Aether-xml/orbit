import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import { parseDbError } from '@/lib/utils'
import type { Story, Profile } from '@/types/database'

export interface StoryGroup {
  profile: Profile
  stories: StoryWithViewed[]
  hasUnviewed: boolean
}

export interface StoryWithViewed extends Story {
  viewed: boolean
}

// ── Hikayeleri getir (takip edilenler + kendi) ────────────
export const useStories = () => {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['stories', user?.id],
    queryFn: async () => {
      if (!user) return []

      // Takip edilenler
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = following?.map((f) => f.following_id) ?? []
      followingIds.push(user.id) // Kendi hikayelerini de göster

      // Son 24 saatin hikayeleri
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          profiles!stories_user_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus
          )
        `)
        .in('user_id', followingIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      // Görüntüleme durumu
      const storyIds = (data ?? []).map((s) => s.id)
      const { data: viewedData } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', user.id)
        .in('story_id', storyIds)

      const viewedSet = new Set(viewedData?.map((v) => v.story_id) ?? [])

      // Kullanıcıya göre grupla
      const groups = new Map<string, StoryGroup>()

      ;(data ?? []).forEach((story) => {
        const profile = story.profiles as Profile
        const existing = groups.get(profile.id)

        const storyWithViewed: StoryWithViewed = {
          ...story,
          profiles: profile,
          viewed: viewedSet.has(story.id),
        }

        if (existing) {
          existing.stories.push(storyWithViewed)
          if (!storyWithViewed.viewed) {
            existing.hasUnviewed = true
          }
        } else {
          groups.set(profile.id, {
            profile,
            stories: [storyWithViewed],
            hasUnviewed: !storyWithViewed.viewed,
          })
        }
      })

      // Kendi hikayeleri başa gelsin, sonra görülmemiş olanlar
      const result = Array.from(groups.values())
      result.sort((a, b) => {
        if (a.profile.id === user.id) return -1
        if (b.profile.id === user.id) return 1
        if (a.hasUnviewed && !b.hasUnviewed) return -1
        if (!a.hasUnviewed && b.hasUnviewed) return 1
        return 0
      })

      return result
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

// ── Hikaye görüntüle ──────────────────────────────────────
export const useViewStory = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (storyId: string) => {
      if (!user) return

      await supabase
        .from('story_views')
        .upsert(
          { story_id: storyId, viewer_id: user.id },
          { onConflict: 'story_id,viewer_id', ignoreDuplicates: true }
        )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

// ── Hikaye oluştur ────────────────────────────────────────
export const useCreateStory = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (params: {
      file: File
      caption?: string
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      const isVideo = params.file.type.startsWith('video')
      const ext = params.file.name.split('.').pop() ?? 'jpg'
      const path = `stories/${user.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, params.file, { cacheControl: '3600' })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(path)

      const { error } = await supabase.from('stories').insert({
        user_id: user.id,
        media_url: urlData.publicUrl,
        media_type: isVideo ? 'video' : 'image',
        caption: params.caption ?? null,
        duration_seconds: isVideo ? 15 : 5,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      toast.success('Hikaye paylaşıldı!')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Hikaye sil ────────────────────────────────────────────
export const useDeleteStory = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (storyId: string) => {
      if (!user) throw new Error('Oturum açılmamış')

      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      toast.success('Hikaye silindi.')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}