import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { DirectMessage } from '@/types/database'
import Avatar from '@/components/ui/Avatar'
import { VerifiedIcon } from '@/components/ui/Badge'

type OtherUser = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  is_verified: boolean
  is_nova_plus: boolean
}

export default function Conversation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)

  // Fetch other participant
  const { data: otherUser } = useQuery({
    queryKey: ['conv-partner', id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('conversation_participants')
        .select('profiles!inner(id, username, display_name, avatar_url, is_verified, is_nova_plus)')
        .eq('conversation_id', id!)
        .neq('user_id', user!.id)
        .limit(1)
        .maybeSingle()
      return (data as unknown as { profiles: OtherUser } | null)?.profiles ?? null
    },
    enabled: !!id && !!user?.id,
  })

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', id!)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as DirectMessage[]
    },
    enabled: !!id,
  })

  // Realtime subscription
  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`conv:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['messages', id] })
          void queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] })
          void queryClient.invalidateQueries({ queryKey: ['unread-messages', user?.id] })
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [id, user?.id, queryClient])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Mark messages as read
  useEffect(() => {
    if (!id || !user?.id) return
    void supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('conversation_id', id)
      .eq('is_read', false)
      .neq('sender_id', user.id)
  }, [id, user?.id, messages.length])

  const handleSend = async () => {
    const text = messageText.trim()
    if (!text || !user?.id || !id || sending) return

    setSending(true)
    setMessageText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    const { error } = await supabase.from('direct_messages').insert({
      conversation_id: id,
      sender_id: user.id,
      content: text,
    })

    if (error) {
      toast.error('Mesaj gönderilemedi')
      setMessageText(text)
    }

    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  // Group consecutive messages by same sender
  type MessageGroup = { senderId: string; messages: DirectMessage[] }
  const groups: MessageGroup[] = []
  for (const msg of messages) {
    const last = groups[groups.length - 1]
    if (last && last.senderId === msg.sender_id) {
      last.messages.push(msg)
    } else {
      groups.push({ senderId: msg.sender_id, messages: [msg] })
    }
  }

  return (
    <div className="flex flex-col h-dvh">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-line bg-bg-base/80 backdrop-blur-md sticky top-0 z-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full text-text-primary hover:bg-bg-overlay transition-default"
        >
          <ArrowLeft size={20} />
        </button>

        {otherUser ? (
          <button
            type="button"
            onClick={() => navigate(`/${otherUser.username}`)}
            className="flex items-center gap-2.5 flex-1 min-w-0"
          >
            <Avatar src={otherUser.avatar_url} fallback={otherUser.display_name} size="sm" isNova={otherUser.is_nova_plus} />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-text-primary text-sm truncate">{otherUser.display_name}</span>
                {otherUser.is_verified && <VerifiedIcon size={13} />}
              </div>
              <p className="text-text-muted text-xs">@{otherUser.username}</p>
            </div>
          </button>
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-text-muted text-sm">Konuşmayı başlatmak için bir mesaj gönder.</p>
          </div>
        )}

        {groups.map((group, gi) => {
          const isOwn = group.senderId === user?.id
          return (
            <div key={gi} className={cn('flex flex-col gap-0.5', isOwn ? 'items-end' : 'items-start')}>
              {group.messages.map((msg, mi) => (
                <div key={msg.id} className={cn('max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
                  <div
                    className={cn(
                      'px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words',
                      isOwn
                        ? 'bg-accent text-bg-base rounded-br-sm'
                        : 'bg-bg-elevated text-text-primary rounded-bl-sm',
                      group.messages.length > 1 && mi < group.messages.length - 1 && isOwn && 'rounded-br-2xl',
                      group.messages.length > 1 && mi < group.messages.length - 1 && !isOwn && 'rounded-bl-2xl'
                    )}
                  >
                    {msg.content}
                  </div>
                  {mi === group.messages.length - 1 && (
                    <p className="text-text-muted text-[10px] mt-0.5 px-1">{timeAgo(msg.created_at)}</p>
                  )}
                </div>
              ))}
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-line px-4 py-3 bg-bg-base">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={messageText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Mesaj yaz..."
            rows={1}
            className="flex-1 bg-bg-surface border border-line rounded-2xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none leading-relaxed"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!messageText.trim() || sending}
            className="w-10 h-10 rounded-full bg-accent text-bg-base flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:opacity-80 transition-default"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
