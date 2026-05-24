import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import { parseDbError } from '@/lib/utils'
import type { Conversation, DirectMessage, Profile } from '@/types/database'

export interface ConversationWithDetails extends Conversation {
  other_user: Profile
  last_message: DirectMessage | null
  unread_count: number
}

export interface DirectMessageWithProfile extends DirectMessage {
  profiles: Profile
}

const DM_PAGE_SIZE = 30

// ── Konuşma listesi ───────────────────────────────────────
export const useConversations = () => {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          last_read_at,
          conversations (
            id,
            created_at,
            last_message_at
          )
        `)
        .eq('user_id', user.id)
        .order('conversation_id')

      if (error) throw error

      const conversationIds = (data ?? []).map((d) => d.conversation_id)
      if (conversationIds.length === 0) return []

      // Her konuşma için diğer kullanıcıyı bul
      const { data: participants, error: partError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          user_id,
          profiles!conversation_participants_user_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus, selected_badge
          )
        `)
        .in('conversation_id', conversationIds)
        .neq('user_id', user.id)

      if (partError) throw partError

      // Son mesajları al
      const { data: lastMessages, error: msgError } = await supabase
        .from('direct_messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (msgError) throw msgError

      // Okunmamış sayısını hesapla
      const lastReadMap = new Map(
        (data ?? []).map((d) => [d.conversation_id, d.last_read_at])
      )

      const result: ConversationWithDetails[] = (data ?? [])
        .map((d) => {
          const convo = d.conversations as Conversation
          if (!convo) return null

          const otherParticipant = (participants ?? []).find(
            (p) => p.conversation_id === convo.id
          )
          if (!otherParticipant) return null

          const lastReadAt = lastReadMap.get(convo.id)
          const convoMessages = (lastMessages ?? []).filter(
            (m) => m.conversation_id === convo.id
          )
          const lastMessage = convoMessages[0] ?? null
          const unreadCount = lastReadAt
            ? convoMessages.filter(
                (m) =>
                  m.sender_id !== user.id &&
                  new Date(m.created_at) > new Date(lastReadAt)
              ).length
            : 0

          return {
            ...convo,
            other_user: otherParticipant.profiles as Profile,
            last_message: lastMessage as DirectMessage | null,
            unread_count: unreadCount,
          }
        })
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(b!.last_message_at).getTime() -
            new Date(a!.last_message_at).getTime()
        ) as ConversationWithDetails[]

      return result
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  })
}

// ── Konuşma mesajları ─────────────────────────────────────
export const useDirectMessages = (conversationId: string) => {
  return useInfiniteQuery({
    queryKey: ['direct-messages', conversationId],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          profiles!direct_messages_sender_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus
          )
        `)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(
          pageParam * DM_PAGE_SIZE,
          (pageParam + 1) * DM_PAGE_SIZE - 1
        )

      if (error) throw error

      return {
        messages: ((data ?? []).reverse()) as DirectMessageWithProfile[],
        nextPage:
          (data ?? []).length === DM_PAGE_SIZE ? pageParam + 1 : null,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!conversationId,
  })
}

// ── Konuşma oluştur veya bul ──────────────────────────────
export const useGetOrCreateConversation = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error('Oturum açılmamış')

      // Blok kontrolü
      const { data: blockData } = await supabase
        .from('blocks')
        .select('blocker_id')
        .or(
          `and(blocker_id.eq.${user.id},blocked_id.eq.${targetUserId}),` +
          `and(blocker_id.eq.${targetUserId},blocked_id.eq.${user.id})`
        )
        .maybeSingle()

      if (blockData) {
        throw new Error('Bu kullanıcıyla mesajlaşamazsın.')
      }

      // Mevcut konuşmayı ara
      const { data: myConvos } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id)

      const myConvoIds = (myConvos ?? []).map((c) => c.conversation_id)

      if (myConvoIds.length > 0) {
        const { data: existing } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', targetUserId)
          .in('conversation_id', myConvoIds)
          .maybeSingle()

        if (existing) {
          return existing.conversation_id
        }
      }

      // Yeni konuşma oluştur
      const { data: newConvo, error: convoError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single()

      if (convoError) throw convoError

      // Her iki kullanıcıyı ekle
      await supabase.from('conversation_participants').insert([
        { conversation_id: newConvo.id, user_id: user.id },
        { conversation_id: newConvo.id, user_id: targetUserId },
      ])

      return newConvo.id as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── DM gönder ─────────────────────────────────────────────
export const useSendDM = (conversationId: string) => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  return useMutation({
    mutationFn: async (params: {
      content: string
      mediaUrls?: string[]
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: params.content,
          media_urls: params.mediaUrls ?? [],
        })
        .select(`
          *,
          profiles!direct_messages_sender_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus
          )
        `)
        .single()

      if (error) throw error

      // Konuşmanın last_message_at güncelle
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

      return data as DirectMessageWithProfile
    },
    onSuccess: (newMsg) => {
      // Cache'e optimistic ekle
      queryClient.setQueryData(
        ['direct-messages', conversationId],
        (old: {
          pages: { messages: DirectMessageWithProfile[] }[]
        } | undefined) => {
          if (!old) return old
          const pages = [...old.pages]
          const last = pages[pages.length - 1]
          pages[pages.length - 1] = {
            ...last,
            messages: [...last.messages, newMsg],
          }
          return { ...old, pages }
        }
      )
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── DM sil (soft delete) ──────────────────────────────────
export const useDeleteDM = (conversationId: string) => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) throw new Error('Oturum açılmamış')

      const { error } = await supabase
        .from('direct_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', user.id)

      if (error) throw error
      return messageId
    },
    onSuccess: (messageId) => {
      queryClient.setQueryData(
        ['direct-messages', conversationId],
        (old: {
          pages: { messages: DirectMessageWithProfile[] }[]
        } | undefined) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.filter((m) => m.id !== messageId),
            })),
          }
        }
      )
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Okundu işaretle ───────────────────────────────────────
export const useMarkAsRead = (conversationId: string) => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async () => {
      if (!user) return

      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

// ── Realtime DM dinleyici ─────────────────────────────────
export const useRealtimeDM = (
  conversationId: string,
  onNewMessage: (msg: DirectMessageWithProfile) => void
) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select(
              'id, username, display_name, avatar_url, is_verified, is_nova_plus'
            )
            .eq('id', payload.new.sender_id)
            .single()

          const newMsg: DirectMessageWithProfile = {
            ...(payload.new as DirectMessage),
            profiles: senderProfile as Profile,
          }

          queryClient.setQueryData(
            ['direct-messages', conversationId],
            (old: {
              pages: { messages: DirectMessageWithProfile[] }[]
            } | undefined) => {
              if (!old) return old
              const allMsgs = old.pages.flatMap((p) => p.messages)
              if (allMsgs.some((m) => m.id === newMsg.id)) return old

              const pages = [...old.pages]
              const last = pages[pages.length - 1]
              pages[pages.length - 1] = {
                ...last,
                messages: [...last.messages, newMsg],
              }
              return { ...old, pages }
            }
          )

          onNewMessage(newMsg)
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, queryClient, onNewMessage])
}