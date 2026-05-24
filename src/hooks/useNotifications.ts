import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { parseDbError } from '@/lib/utils'
import { toast } from '@/store/uiStore'
import type { Notification, Profile } from '@/types/database'

export interface NotificationWithActor extends Notification {
  actor: Profile | null
}

type NotificationFilter = 'all' | 'likes' | 'follows' | 'replies' | 'requests'

const NOTIF_PAGE_SIZE = 20

// ── Bildirimler ───────────────────────────────────────────
export const useNotifications = (filter: NotificationFilter = 'all') => {
  const user = useAuthStore((s) => s.user)

  return useInfiniteQuery({
    queryKey: ['notifications', user?.id, filter],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return { notifications: [], nextPage: null }

      let query = supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!notifications_actor_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus, selected_badge
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(
          pageParam * NOTIF_PAGE_SIZE,
          (pageParam + 1) * NOTIF_PAGE_SIZE - 1
        )

      // Filtre uygula
      if (filter === 'likes') {
        query = query.eq('type', 'like')
      } else if (filter === 'follows') {
        query = query.in('type', ['follow', 'follow_accepted'])
      } else if (filter === 'replies') {
        query = query.in('type', ['reply', 'comment', 'mention', 'quote'])
      } else if (filter === 'requests') {
        query = query.eq('type', 'follow_request')
      }

      const { data, error } = await query
      if (error) throw error

      return {
        notifications: (data ?? []) as NotificationWithActor[],
        nextPage:
          (data ?? []).length === NOTIF_PAGE_SIZE ? pageParam + 1 : null,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!user,
  })
}

// ── Okunmamış sayısı ──────────────────────────────────────
export const useUnreadCount = () => {
  const user = useAuthStore((s) => s.user)
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)

  return useQuery({
    queryKey: ['notifications-unread', user?.id],
    queryFn: async () => {
      if (!user) return 0

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error

      const c = count ?? 0
      setUnreadCount(c)
      return c
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  })
}

// ── Tümünü okundu işaretle ────────────────────────────────
export const useMarkAllRead = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const resetUnread = useNotificationStore((s) => s.resetUnread)

  return useMutation({
    mutationFn: async () => {
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error
    },
    onSuccess: () => {
      resetUnread()
      queryClient.invalidateQueries({
        queryKey: ['notifications', user?.id],
      })
      queryClient.invalidateQueries({
        queryKey: ['notifications-unread', user?.id],
      })
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Tek bildirimi okundu işaretle ─────────────────────────
export const useMarkOneRead = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { unreadCount, setUnreadCount } = useNotificationStore()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error
    },
    onSuccess: () => {
      setUnreadCount(Math.max(0, unreadCount - 1))
      queryClient.invalidateQueries({
        queryKey: ['notifications', user?.id],
      })
    },
  })
}

// ── Takip isteği kabul / reddet ───────────────────────────
export const useHandleFollowRequest = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({
      requesterId,
      action,
    }: {
      requesterId: string
      action: 'accept' | 'reject'
      notificationId: string
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      if (action === 'accept') {
        // Takip isteğini sil + takibi ekle
        await Promise.all([
          supabase
            .from('follow_requests')
            .delete()
            .eq('requester_id', requesterId)
            .eq('target_id', user.id),
          supabase
            .from('follows')
            .insert({ follower_id: requesterId, following_id: user.id }),
        ])
      } else {
        // Sadece isteği sil
        await supabase
          .from('follow_requests')
          .delete()
          .eq('requester_id', requesterId)
          .eq('target_id', user.id)
      }
    },
    onSuccess: (_data, { action, notificationId }) => {
      // Bildirimi okundu yap
      supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      queryClient.invalidateQueries({
        queryKey: ['notifications', user?.id],
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })

      toast.success(
        action === 'accept'
          ? 'Takip isteği kabul edildi.'
          : 'Takip isteği reddedildi.'
      )
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Realtime bildirim dinleyici ───────────────────────────
export const useRealtimeNotifications = () => {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const incrementUnread = useNotificationStore((s) => s.incrementUnread)

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          incrementUnread()
          queryClient.invalidateQueries({
            queryKey: ['notifications', user.id],
          })
          queryClient.invalidateQueries({
            queryKey: ['notifications-unread', user.id],
          })

          // Bildirim toast'u (isteğe bağlı)
          const notif = payload.new as Notification
          const typeLabels: Partial<Record<Notification['type'], string>> = {
            like: 'postunu beğendi',
            follow: 'seni takip etmeye başladı',
            follow_request: 'takip isteği gönderdi',
            comment: 'yorum yaptı',
            reply: 'yanıtladı',
            mention: 'senden bahsetti',
            quote: 'postunu alıntıladı',
            repost: 'repost yaptı',
          }

          if (typeLabels[notif.type]) {
            toast.info(`Birisi ${typeLabels[notif.type]}`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, queryClient, incrementUnread])
}