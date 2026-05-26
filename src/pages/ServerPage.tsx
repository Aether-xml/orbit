import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Menu, Send, Hash } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { tr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { Server, ServerCategory, ServerChannel, ServerMessageWithAuthor } from '@/types/database'
import Avatar from '@/components/ui/Avatar'
import { VerifiedIcon } from '@/components/ui/Badge'
import ServerSidebar from '@/components/servers/ServerSidebar'

// ── Timestamp helper ──────────────────────────────────

function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr)
  const timeStr = format(d, 'HH:mm', { locale: tr })
  if (isToday(d)) return timeStr
  if (isYesterday(d)) return `Dün ${timeStr}`
  return format(d, 'd MMM HH:mm', { locale: tr })
}

// ── Single message ────────────────────────────────────

function MessageItem({
  msg,
  showHeader,
}: {
  msg: ServerMessageWithAuthor
  showHeader: boolean
}) {
  const author = msg.profiles
  return (
    <div className={cn('flex gap-3 px-4 group', showHeader ? 'mt-4' : 'mt-0.5')}>
      {/* Avatar column — only visible when header shown */}
      <div className="w-9 flex-shrink-0 flex items-start justify-center">
        {showHeader ? (
          <Avatar src={author.avatar_url} fallback={author.display_name} size="sm" isNova={author.is_nova_plus} />
        ) : (
          <span className="text-text-muted text-[10px] leading-5 opacity-0 group-hover:opacity-100 transition-opacity">
            {format(new Date(msg.created_at), 'HH:mm')}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-text-primary text-sm font-semibold">{author.display_name}</span>
            {author.is_verified && <VerifiedIcon size={12} />}
            <span className="text-text-muted text-xs">{formatMsgTime(msg.created_at)}</span>
          </div>
        )}
        <p className="text-text-primary text-sm leading-relaxed break-words whitespace-pre-wrap">
          {msg.content}
        </p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────

export default function ServerPage() {
  const { serverId, channelId } = useParams<{ serverId: string; channelId?: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [messages, setMessages] = useState<ServerMessageWithAuthor[]>([])
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ── Server data ──────────────────────────────────

  const { data: server } = useQuery({
    queryKey: ['server', serverId],
    queryFn: async () => {
      const { data } = await supabase.from('servers').select('*').eq('id', serverId!).single()
      return data as Server | null
    },
    enabled: !!serverId,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['server-categories', serverId],
    queryFn: async () => {
      const { data } = await supabase
        .from('server_categories')
        .select('*')
        .eq('server_id', serverId!)
        .order('position')
      return (data ?? []) as ServerCategory[]
    },
    enabled: !!serverId,
  })

  const { data: channels = [] } = useQuery({
    queryKey: ['server-channels', serverId],
    queryFn: async () => {
      const { data } = await supabase
        .from('server_channels')
        .select('*')
        .eq('server_id', serverId!)
        .order('position')
      return (data ?? []) as ServerChannel[]
    },
    enabled: !!serverId,
  })

  // ── Auto-redirect to first channel ──────────────

  useEffect(() => {
    if (!channelId && channels.length > 0 && serverId) {
      navigate(`/sunucular/${serverId}/kanal/${channels[0]?.id}`, { replace: true })
    }
  }, [channelId, channels, serverId, navigate])

  // ── Messages ─────────────────────────────────────

  const { data: initialMessages = [] } = useQuery({
    queryKey: ['server-messages', channelId],
    queryFn: async () => {
      const { data } = await supabase
        .from('server_messages')
        .select('*, profiles!inner(id, username, display_name, avatar_url, is_verified, is_nova_plus)')
        .eq('channel_id', channelId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(50)
      return (data ?? []) as unknown as ServerMessageWithAuthor[]
    },
    enabled: !!channelId,
  })

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  // ── Realtime ──────────────────────────────────────

  useEffect(() => {
    if (!channelId) return

    const channel = supabase
      .channel(`server-messages-${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'server_messages', filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          const raw = payload.new as { id: string; user_id: string }
          const { data: full } = await supabase
            .from('server_messages')
            .select('*, profiles!inner(id, username, display_name, avatar_url, is_verified, is_nova_plus)')
            .eq('id', raw.id)
            .single()
          if (full) {
            setMessages((prev) => [...prev, full as unknown as ServerMessageWithAuthor])
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [channelId])

  // ── Auto-scroll ───────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send ──────────────────────────────────────────

  const handleSend = async () => {
    if (!user?.id || !channelId || !content.trim() || sending) return
    const text = content.trim()
    setContent('')
    setSending(true)

    const { error } = await supabase
      .from('server_messages')
      .insert({ channel_id: channelId, user_id: user.id, content: text })

    if (error) {
      toast.error('Mesaj gönderilemedi')
      setContent(text)
    }
    setSending(false)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  // ── Auto-resize textarea ──────────────────────────

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const activeChannel = channels.find((ch) => ch.id === channelId)

  // ── Group messages (consecutive from same sender) ─

  const groupedMessages = messages.map((msg, i) => {
    const prev = messages[i - 1]
    const showHeader =
      !prev ||
      prev.user_id !== msg.user_id ||
      new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000
    return { msg, showHeader }
  })

  if (!server) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-60px)] sm:h-dvh overflow-hidden">
      {/* ── Desktop sidebar ──────────────────────── */}
      <div className="hidden sm:flex w-52 flex-shrink-0 flex-col border-r border-line">
        <ServerSidebar
          server={server}
          categories={categories}
          channels={channels}
          activeChannelId={channelId}
        />
      </div>

      {/* ── Mobile drawer ────────────────────────── */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 sm:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 z-50 sm:hidden shadow-xl">
            <ServerSidebar
              server={server}
              categories={categories}
              channels={channels}
              activeChannelId={channelId}
              isDrawer
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </>
      )}

      {/* ── Channel area ─────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Channel header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line flex-shrink-0 bg-bg-base">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="sm:hidden text-text-muted hover:text-text-primary transition-default"
          >
            <Menu size={20} />
          </button>
          <Hash size={16} className="text-text-muted flex-shrink-0" />
          <span className="font-semibold text-text-primary text-sm truncate">
            {activeChannel?.name ?? 'kanal'}
          </span>
          {activeChannel?.description && (
            <>
              <span className="text-line hidden sm:block">|</span>
              <span className="text-text-muted text-xs truncate hidden sm:block">
                {activeChannel.description}
              </span>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          {!channelId ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <Hash size={40} className="text-text-muted mb-3 opacity-40" />
              <p className="text-text-primary font-medium mb-1">
                #{activeChannel?.name ?? 'kanal'} kanalına hoş geldin!
              </p>
              <p className="text-text-muted text-sm">İlk mesajı göndermek için aşağıdaki alanı kullan.</p>
            </div>
          ) : (
            <>
              {groupedMessages.map(({ msg, showHeader }) => (
                <MessageItem key={msg.id} msg={msg} showHeader={showHeader} />
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {channelId && (
          <div className="px-4 py-3 border-t border-line flex-shrink-0 bg-bg-base">
            <div className="flex items-end gap-2 bg-bg-surface border border-line rounded-xl px-3 py-2">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={`#${activeChannel?.name ?? 'kanal'} kanalına mesaj yaz`}
                className="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-muted resize-none focus:outline-none leading-relaxed"
                style={{ maxHeight: '120px' }}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!content.trim() || sending}
                className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-default',
                  content.trim()
                    ? 'bg-accent text-bg-base hover:bg-accent/90'
                    : 'text-text-muted cursor-not-allowed'
                )}
              >
                <Send size={15} />
              </button>
            </div>
            <p className="text-text-muted text-[10px] mt-1.5 text-center">
              Enter ile gönder · Shift+Enter yeni satır
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
