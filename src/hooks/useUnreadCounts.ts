import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function useUnreadCounts() {
  const { user } = useAuthStore()

  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ['unread-notifications', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false)
      return count ?? 0
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  })

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      // RLS sadece katıldığı konuşmaları gösteriyor
      const { count } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user!.id)
        .is('deleted_at', null)
      return count ?? 0
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  })

  return { unreadNotifications, unreadMessages }
}
