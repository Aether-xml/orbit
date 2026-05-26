import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import { useDebounce } from '@/hooks/useDebounce'
import Avatar from '@/components/ui/Avatar'
import { VerifiedIcon } from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'

type ConversationPreview = {
  id: string
  otherUser: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    is_verified: boolean
    is_nova_plus: boolean
  }
  lastMessage: {
    content: string | null
    created_at: string
    isOwn: boolean
  } | null
}

type SearchUser = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  is_verified: boolean
  is_nova_plus: boolean
}

async function getOrCreateConversation(myId: string, otherId: string): Promise<string> {
  // Find existing shared conversation
  const { data: mine } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', myId)

  const myConvIds = mine?.map((c) => c.conversation_id) ?? []

  if (myConvIds.length > 0) {
    const { data: shared } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherId)
      .in('conversation_id', myConvIds)
      .limit(1)
      .maybeSingle()

    if (shared) return shared.conversation_id
  }

  // Create new conversation
  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({})
    .select('id')
    .single()

  if (error || !conv) throw new Error('Konuşma oluşturulamadı')

  await supabase.from('conversation_participants').insert([
    { conversation_id: conv.id, user_id: myId },
    { conversation_id: conv.id, user_id: otherId },
  ])

  return conv.id
}

export default function Messages() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, 350)
  const [starting, setStarting] = useState(false)

  // Realtime: yeni mesaj gelince listeyi güncelle
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`messages-page:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        () => { void queryClient.invalidateQueries({ queryKey: ['conversations', user.id] }) }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [user?.id, queryClient])

  // Conversations
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async (): Promise<ConversationPreview[]> => {
      if (!user?.id) return []

      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id)

      const convIds = myConvs?.map((c) => c.conversation_id) ?? []
      if (!convIds.length) return []

      // Other participants
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('conversation_id, profiles!inner(id, username, display_name, avatar_url, is_verified, is_nova_plus)')
        .in('conversation_id', convIds)
        .neq('user_id', user.id)

      // Last message per conversation (parallel)
      const lastMessages = await Promise.all(
        convIds.map((convId) =>
          supabase
            .from('direct_messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', convId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => ({ convId, message: data }))
        )
      )

      const msgMap = new Map(lastMessages.map((m) => [m.convId, m.message]))

      return convIds
        .map((convId) => {
          const participant = (participants as unknown as Array<{
            conversation_id: string
            profiles: SearchUser
          }>)?.find((p) => p.conversation_id === convId)

          if (!participant) return null

          const lastMsg = msgMap.get(convId)
          return {
            id: convId,
            otherUser: participant.profiles,
            lastMessage: lastMsg
              ? { content: lastMsg.content, created_at: lastMsg.created_at, isOwn: lastMsg.sender_id === user.id }
              : null,
          } satisfies ConversationPreview
        })
        .filter(Boolean)
        .sort((a, b) => {
          const at = a!.lastMessage?.created_at ?? '0'
          const bt = b!.lastMessage?.created_at ?? '0'
          return bt.localeCompare(at)
        }) as ConversationPreview[]
    },
    enabled: !!user?.id,
  })

  // User search
  const { data: searchResults } = useQuery({
    queryKey: ['user-search-dm', debouncedQuery],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, is_verified, is_nova_plus')
        .or(`username.ilike.%${debouncedQuery}%,display_name.ilike.%${debouncedQuery}%`)
        .neq('id', user!.id)
        .limit(8)
      return (data ?? []) as SearchUser[]
    },
    enabled: debouncedQuery.length >= 2 && searchOpen,
  })

  const handleStartConversation = async (otherId: string) => {
    if (!user?.id || starting) return
    setStarting(true)
    try {
      const convId = await getOrCreateConversation(user.id, otherId)
      setSearchOpen(false)
      navigate(`/mesajlar/${convId}`)
    } catch {
      toast.error('Konuşma başlatılamadı')
    }
    setStarting(false)
  }

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-line flex items-center justify-between px-4 py-3">
        <h1 className="font-semibold text-text-primary">Mesajlar</h1>
        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          className="p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-default"
        >
          <Edit size={18} />
        </button>
      </div>

      {/* New conversation search */}
      {searchOpen && (
        <div className="border-b border-line p-3 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kullanıcı ara..."
              autoFocus
              className="w-full bg-bg-surface border border-line rounded-full pl-8 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>
          {searchResults?.map((u) => (
            <button
              key={u.id}
              type="button"
              disabled={starting}
              onClick={() => void handleStartConversation(u.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-elevated transition-default text-left"
            >
              <Avatar src={u.avatar_url} fallback={u.display_name} size="sm" isNova={u.is_nova_plus} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-text-primary text-sm font-medium truncate">{u.display_name}</span>
                  {u.is_verified && <VerifiedIcon size={12} />}
                </div>
                <span className="text-text-muted text-xs">@{u.username}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Conversation list */}
      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-line">
            <Skeleton className="w-12 h-12 flex-shrink-0" rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))
      ) : !conversations?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-14 h-14 rounded-full bg-bg-elevated flex items-center justify-center mb-4 text-2xl">
            💬
          </div>
          <h3 className="font-semibold text-text-primary mb-1">Mesaj yok</h3>
          <p className="text-text-muted text-sm">Yukarıdaki kalemi kullanarak konuşma başlat.</p>
        </div>
      ) : (
        conversations.map((conv) => (
          <button
            key={conv.id}
            type="button"
            onClick={() => navigate(`/mesajlar/${conv.id}`)}
            className="w-full flex items-center gap-3 px-4 py-3 border-b border-line hover:bg-bg-overlay transition-default text-left"
          >
            <Avatar
              src={conv.otherUser.avatar_url}
              fallback={conv.otherUser.display_name}
              size="md"
              isNova={conv.otherUser.is_nova_plus}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-text-primary text-sm truncate">{conv.otherUser.display_name}</span>
                {conv.otherUser.is_verified && <VerifiedIcon size={13} />}
                <span className="text-text-muted text-xs ml-1">@{conv.otherUser.username}</span>
              </div>
              <p className={cn('text-xs truncate', conv.lastMessage ? 'text-text-muted' : 'text-text-muted italic')}>
                {conv.lastMessage
                  ? `${conv.lastMessage.isOwn ? 'Sen: ' : ''}${conv.lastMessage.content ?? '📎 Medya'}`
                  : 'Konuşmayı başlat'}
              </p>
            </div>
            {conv.lastMessage && (
              <span className="text-text-muted text-xs flex-shrink-0">{timeAgo(conv.lastMessage.created_at)}</span>
            )}
          </button>
        ))
      )}
    </div>
  )
}
