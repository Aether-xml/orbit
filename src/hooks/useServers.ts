import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import { parseDbError } from '@/lib/utils'
import type {
  Server,
  ServerCategory,
  ServerChannel,
  ServerMessage,
  Profile,
  ServerRole,
} from '@/types/database'

export interface ServerWithRole extends Server {
  user_role: ServerRole | null
  profiles: Profile
}

export interface ServerCategoryWithChannels extends ServerCategory {
  channels: ServerChannel[]
}

export interface ServerMemberWithProfile {
  server_id: string
  user_id: string
  role: ServerRole
  nickname: string | null
  joined_at: string
  profiles: Profile
}

export interface ServerMessageWithProfile extends ServerMessage {
  profiles: Profile
  reply_to?: ServerMessageWithProfile | null
}

const MESSAGE_PAGE_SIZE = 30

// ── Katıldığım sunucular ──────────────────────────────────
export const useMyServers = () => {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['my-servers', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('server_members')
        .select(`
          role,
          servers (
            *,
            profiles!servers_owner_id_fkey (
              id, username, display_name, avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })

      if (error) throw error

      return (data ?? [])
        .map((m) => ({
          ...(m.servers as Server),
          user_role: m.role as ServerRole,
        }))
        .filter(Boolean) as ServerWithRole[]
    },
    enabled: !!user,
  })
}

// ── Herkese açık sunucular ────────────────────────────────
export const usePublicServers = () => {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['public-servers'],
    queryFn: async () => {
      // Katıldığım sunucuları al
      const { data: joined } = user
        ? await supabase
            .from('server_members')
            .select('server_id')
            .eq('user_id', user.id)
        : { data: [] }

      const joinedIds = joined?.map((j) => j.server_id) ?? []

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
        .limit(20)

      if (joinedIds.length > 0) {
        query = query.not('id', 'in', `(${joinedIds.join(',')})`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as ServerWithRole[]
    },
    staleTime: 1000 * 60 * 2,
  })
}

// ── Sunucu detayı ─────────────────────────────────────────
export const useServer = (serverId: string) => {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['server', serverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servers')
        .select(`
          *,
          profiles!servers_owner_id_fkey (
            id, username, display_name, avatar_url
          )
        `)
        .eq('id', serverId)
        .single()

      if (error) throw error

      // Kullanıcının rolü
      let userRole: ServerRole | null = null
      if (user) {
        const { data: member } = await supabase
          .from('server_members')
          .select('role')
          .eq('server_id', serverId)
          .eq('user_id', user.id)
          .maybeSingle()

        userRole = (member?.role as ServerRole) ?? null
      }

      return { ...data, user_role: userRole } as ServerWithRole
    },
    enabled: !!serverId,
  })
}

// ── Sunucu kategorileri ve kanalları ─────────────────────
export const useServerChannels = (serverId: string) => {
  return useQuery({
    queryKey: ['server-channels', serverId],
    queryFn: async () => {
      const [{ data: categories, error: catError }, { data: channels, error: chanError }] =
        await Promise.all([
          supabase
            .from('server_categories')
            .select('*')
            .eq('server_id', serverId)
            .order('position'),
          supabase
            .from('server_channels')
            .select('*')
            .eq('server_id', serverId)
            .order('position'),
        ])

      if (catError) throw catError
      if (chanError) throw chanError

      // Kategorilere kanalları ata
      const categoryMap = new Map<string, ServerCategoryWithChannels>()
      const uncategorized: ServerChannel[] = []

      ;(categories ?? []).forEach((cat) => {
        categoryMap.set(cat.id, { ...cat, channels: [] })
      })

      ;(channels ?? []).forEach((ch) => {
        if (ch.category_id && categoryMap.has(ch.category_id)) {
          categoryMap.get(ch.category_id)!.channels.push(ch as ServerChannel)
        } else {
          uncategorized.push(ch as ServerChannel)
        }
      })

      return {
        categories: Array.from(categoryMap.values()),
        uncategorized,
        allChannels: (channels ?? []) as ServerChannel[],
      }
    },
    enabled: !!serverId,
  })
}

// ── Sunucu mesajları ──────────────────────────────────────
export const useServerMessages = (channelId: string) => {
  return useInfiniteQuery({
    queryKey: ['server-messages', channelId],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('server_messages')
        .select(`
          *,
          profiles!server_messages_user_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus, selected_badge
          ),
          reply_to:server_messages!server_messages_reply_to_id_fkey (
            id, content, user_id,
            profiles!server_messages_user_id_fkey (
              username, display_name
            )
          )
        `)
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(
          pageParam * MESSAGE_PAGE_SIZE,
          (pageParam + 1) * MESSAGE_PAGE_SIZE - 1
        )

      if (error) throw error

      return {
        messages: ((data ?? []).reverse()) as ServerMessageWithProfile[],
        nextPage:
          (data ?? []).length === MESSAGE_PAGE_SIZE ? pageParam + 1 : null,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!channelId,
  })
}

// ── Sunucu üyeleri ────────────────────────────────────────
export const useServerMembers = (serverId: string) => {
  return useQuery({
    queryKey: ['server-members', serverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('server_members')
        .select(`
          *,
          profiles!server_members_user_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus, selected_badge
          )
        `)
        .eq('server_id', serverId)
        .order('role')

      if (error) throw error
      return (data ?? []) as ServerMemberWithProfile[]
    },
    enabled: !!serverId,
  })
}

// ── Mesaj gönder ──────────────────────────────────────────
export const useSendMessage = (channelId: string) => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  return useMutation({
    mutationFn: async (params: {
      content: string
      mediaUrls?: string[]
      replyToId?: string
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      const { data, error } = await supabase
        .from('server_messages')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: params.content,
          media_urls: params.mediaUrls ?? [],
          reply_to_id: params.replyToId ?? null,
        })
        .select(`
          *,
          profiles!server_messages_user_id_fkey (
            id, username, display_name, avatar_url,
            is_verified, is_nova_plus, selected_badge
          )
        `)
        .single()

      if (error) throw error
      return data as ServerMessageWithProfile
    },
    onSuccess: (newMessage) => {
      // Optimistic: mesajı cache'e ekle
      queryClient.setQueryData(
        ['server-messages', channelId],
        (old: {
          pages: { messages: ServerMessageWithProfile[] }[]
        } | undefined) => {
          if (!old) return old
          const pages = [...old.pages]
          const lastPage = pages[pages.length - 1]
          pages[pages.length - 1] = {
            ...lastPage,
            messages: [...lastPage.messages, newMessage],
          }
          return { ...old, pages }
        }
      )
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Mesaj sil ─────────────────────────────────────────────
export const useDeleteMessage = (channelId: string) => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) throw new Error('Oturum açılmamış')

      const { error } = await supabase
        .from('server_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)

      if (error) throw error
      return messageId
    },
    onSuccess: (messageId) => {
      queryClient.setQueryData(
        ['server-messages', channelId],
        (old: {
          pages: { messages: ServerMessageWithProfile[] }[]
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

// ── Sunucu oluştur ────────────────────────────────────────
export const useCreateServer = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (params: {
      name: string
      description?: string
      isPublic: boolean
      avatarFile?: File
    }) => {
      if (!user) throw new Error('Oturum açılmamış')

      let avatarUrl: string | null = null

      if (params.avatarFile) {
        const ext = params.avatarFile.name.split('.').pop() ?? 'jpg'
        const path = `servers/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(path, params.avatarFile, { cacheControl: '3600' })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('media').getPublicUrl(path)
        avatarUrl = data.publicUrl
      }

      // Sunucu oluştur (limit trigger DB'de kontrol eder)
      const { data: server, error } = await supabase
        .from('servers')
        .insert({
          owner_id: user.id,
          name: params.name,
          description: params.description ?? null,
          is_public: params.isPublic,
          avatar_url: avatarUrl,
        })
        .select()
        .single()

      if (error) throw error

      // Owner olarak üye ekle
      await supabase.from('server_members').insert({
        server_id: server.id,
        user_id: user.id,
        role: 'owner',
      })

      // Varsayılan kanal oluştur
      await supabase.from('server_channels').insert({
        server_id: server.id,
        name: 'genel',
        position: 0,
      })

      return server as Server
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-servers'] })
      toast.success('Sunucu oluşturuldu!')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Sunucuya katıl ────────────────────────────────────────
export const useJoinServer = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (serverId: string) => {
      if (!user) throw new Error('Oturum açılmamış')

      const { error } = await supabase.from('server_members').insert({
        server_id: serverId,
        user_id: user.id,
        role: 'member',
      })
      if (error) throw error

      // Üye sayısını artır
      await supabase.rpc('increment_member_count', { server_id: serverId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-servers'] })
      queryClient.invalidateQueries({ queryKey: ['public-servers'] })
      toast.success('Sunucuya katıldın!')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Sunucudan ayrıl ───────────────────────────────────────
export const useLeaveServer = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (serverId: string) => {
      if (!user) throw new Error('Oturum açılmamış')

      const { error } = await supabase
        .from('server_members')
        .delete()
        .eq('server_id', serverId)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-servers'] })
      toast.success('Sunucudan ayrıldın.')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Davet linki ile katıl ─────────────────────────────────
export const useJoinByInvite = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!user) throw new Error('Oturum açılmamış')

      // Davet kodundan sunucuyu bul
      const { data: server, error: findError } = await supabase
        .from('servers')
        .select('id, name')
        .eq('invite_code', inviteCode.trim())
        .single()

      if (findError || !server) {
        throw new Error('Geçersiz davet kodu.')
      }

      // Zaten üye mi?
      const { data: existing } = await supabase
        .from('server_members')
        .select('user_id')
        .eq('server_id', server.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        throw new Error('Zaten bu sunucunun üyesisin.')
      }

      await supabase.from('server_members').insert({
        server_id: server.id,
        user_id: user.id,
        role: 'member',
      })

      return server
    },
    onSuccess: (server) => {
      queryClient.invalidateQueries({ queryKey: ['my-servers'] })
      toast.success(`${server.name} sunucusuna katıldın!`)
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Realtime mesaj dinleyici ──────────────────────────────
export const useRealtimeMessages = (
  channelId: string,
  onNewMessage: (msg: ServerMessageWithProfile) => void
) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!channelId) return

    const channel = supabase
      .channel(`server-channel-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'server_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Profil bilgisini getir
          const { data: profile } = await supabase
            .from('profiles')
            .select(
              'id, username, display_name, avatar_url, is_verified, is_nova_plus, selected_badge'
            )
            .eq('id', payload.new.user_id)
            .single()

          const newMsg: ServerMessageWithProfile = {
            ...(payload.new as ServerMessage),
            profiles: profile as Profile,
          }

          // Cache güncelle
          queryClient.setQueryData(
            ['server-messages', channelId],
            (old: {
              pages: { messages: ServerMessageWithProfile[] }[]
            } | undefined) => {
              if (!old) return old
              // Kendi gönderdiğimiz mesaj zaten eklenmiş, tekrar ekleme
              const allMessages = old.pages.flatMap((p) => p.messages)
              if (allMessages.some((m) => m.id === newMsg.id)) return old

              const pages = [...old.pages]
              const lastPage = pages[pages.length - 1]
              pages[pages.length - 1] = {
                ...lastPage,
                messages: [...lastPage.messages, newMsg],
              }
              return { ...old, pages }
            }
          )

          onNewMessage(newMsg)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelId, queryClient, onNewMessage])
}

// ── Kanal oluştur ─────────────────────────────────────────
export const useCreateChannel = (serverId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      name: string
      categoryId?: string
      description?: string
    }) => {
      const { data: existing } = await supabase
        .from('server_channels')
        .select('position')
        .eq('server_id', serverId)
        .order('position', { ascending: false })
        .limit(1)

      const nextPosition = (existing?.[0]?.position ?? -1) + 1

      const { data, error } = await supabase
        .from('server_channels')
        .insert({
          server_id: serverId,
          name: params.name.toLowerCase().replace(/\s+/g, '-'),
          category_id: params.categoryId ?? null,
          description: params.description ?? null,
          position: nextPosition,
        })
        .select()
        .single()

      if (error) throw error
      return data as ServerChannel
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['server-channels', serverId],
      })
      toast.success('Kanal oluşturuldu.')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}

// ── Üye rolü güncelle ─────────────────────────────────────
export const useUpdateMemberRole = (serverId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      userId: string
      role: ServerRole
    }) => {
      const { error } = await supabase
        .from('server_members')
        .update({ role: params.role })
        .eq('server_id', serverId)
        .eq('user_id', params.userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['server-members', serverId],
      })
      toast.success('Rol güncellendi.')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(parseDbError(message))
    },
  })
}