import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Menu, X } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion, AnimatePresence } from 'framer-motion'
import { ServerSidebar } from '@/components/server/ServerSidebar'
import { ChannelMessage } from '@/components/server/ChannelMessage'
import { MessageInput } from '@/components/server/MessageInput'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import {
  useServer,
  useServerMessages,
  useServerMembers,
  useRealtimeMessages,
  type ServerMessageWithProfile,
  type ServerWithRole,
} from '@/hooks/useServers'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import type { ServerChannel } from '@/types/database'
import type { BadgeKey } from '@/types/user'

export const ServerDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const { data: server, isLoading: loadingServer } = useServer(id ?? '')
  const [activeChannel, setActiveChannel] = useState<ServerChannel | null>(null)
  const [showMemberList, setShowMemberList] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  // İlk kanalı otomatik seç
  useEffect(() => {
    if (!activeChannel && server) {
      // ServerDetail yüklenince varsayılan kanal seçilir
      // useServerChannels'dan ilk kanal alınır
    }
  }, [server])

  if (loadingServer) return <ServerDetailSkeleton />

  if (!server) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-4">
            Sunucu bulunamadı.
          </p>
          <Button onClick={() => navigate('/sunucular')}>Geri Dön</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      {/* Sol: Kanal Sidebar (desktop) */}
      {isDesktop ? (
        <ServerSidebar
          server={server}
          activeChannelId={activeChannel?.id ?? null}
          onChannelSelect={(ch) => {
            setActiveChannel(ch)
            setShowMobileSidebar(false)
          }}
        />
      ) : (
        /* Mobil sidebar overlay */
        <AnimatePresence>
          {showMobileSidebar && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-40"
                onClick={() => setShowMobileSidebar(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed left-0 top-0 h-full z-50"
              >
                <ServerSidebar
                  server={server}
                  activeChannelId={activeChannel?.id ?? null}
                  onChannelSelect={(ch) => {
                    setActiveChannel(ch)
                    setShowMobileSidebar(false)
                  }}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* Orta: Mesajlar */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeChannel ? (
          <ChannelView
            channel={activeChannel}
            server={server}
            showMemberList={showMemberList}
            onToggleMemberList={() => setShowMemberList((v) => !v)}
            onOpenSidebar={() => setShowMobileSidebar(true)}
            isDesktop={isDesktop}
          />
        ) : (
          <NoChannelSelected
            server={server}
            onOpenSidebar={() => setShowMobileSidebar(true)}
          />
        )}
      </div>

      {/* Sağ: Üye Listesi (desktop + toggle) */}
      {isDesktop && showMemberList && (
        <MemberList serverId={server.id} />
      )}
    </div>
  )
}

// ── Kanal Görünümü ────────────────────────────────────────
interface ChannelViewProps {
  channel: ServerChannel
  server: ServerWithRole
  showMemberList: boolean
  onToggleMemberList: () => void
  onOpenSidebar: () => void
  isDesktop: boolean
}

const ChannelView = ({
  channel,
  server,
  showMemberList,
  onToggleMemberList,
  onOpenSidebar,
  isDesktop,
}: ChannelViewProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [replyTo, setReplyTo] = useState<ServerMessageWithProfile | null>(null)
  const [newMessageCount, setNewMessageCount] = useState(0)

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useServerMessages(channel.id)

  const messages = useMemo(
    () => data?.pages.flatMap((p) => p.messages) ?? [],
    [data]
  )

  // Yeni mesaj gelince scroll
  const handleNewMessage = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100

    if (isAtBottom) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    } else {
      setNewMessageCount((c) => c + 1)
    }
  }, [])

  // Realtime
  useRealtimeMessages(channel.id, handleNewMessage)

  // İlk yüklemede en alta scroll
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView()
    }, 100)
  }, [channel.id])

  // Üst scroll → eski mesajları yükle
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    if (container.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }

    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100
    if (isAtBottom) setNewMessageCount(0)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Mesajları grupla (aynı kullanıcının art arda mesajları)
  const groupedMessages = useMemo(() => {
    return messages.map((msg, i) => {
      const prev = messages[i - 1]
      const isGrouped =
        prev &&
        prev.user_id === msg.user_id &&
        new Date(msg.created_at).getTime() -
          new Date(prev.created_at).getTime() <
          5 * 60 * 1000 // 5 dakika
      return { message: msg, isGrouped: !!isGrouped }
    })
  }, [messages])

  return (
    <>
      {/* Kanal başlığı */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-base)] shrink-0">
        {!isDesktop && (
          <button
            onClick={onOpenSidebar}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Menu size={18} />
          </button>
        )}

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[var(--text-muted)]">#</span>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {channel.name}
          </h2>
          {channel.description && (
            <>
              <span className="text-[var(--border)]">|</span>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {channel.description}
              </p>
            </>
          )}
        </div>

        <button
          onClick={onToggleMemberList}
          className={cn(
            'p-1.5 rounded-[var(--radius-md)] transition-colors',
            showMemberList
              ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          )}
          title="Üye Listesi"
        >
          <Users size={17} />
        </button>
      </div>

      {/* Mesajlar */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto py-2"
        onScroll={handleScroll}
      >
        {/* Eski mesaj yükleyici */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isLoading ? (
          <MessageListSkeleton />
        ) : messages.length === 0 ? (
          <EmptyChannel channelName={channel.name} />
        ) : (
          <div>
            {groupedMessages.map(({ message, isGrouped }) => (
              <ChannelMessage
                key={message.id}
                message={message}
                channelId={channel.id}
                userRole={server.user_role}
                onReply={setReplyTo}
                isGrouped={isGrouped}
              />
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Yeni mesaj butonu */}
      <AnimatePresence>
        {newMessageCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              setNewMessageCount(0)
            }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-[var(--text-inverse)] text-xs font-medium px-3 py-1.5 rounded-full shadow-lg z-10"
          >
            {newMessageCount} yeni mesaj ↓
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mesaj input */}
      <MessageInput
        channel={channel}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />
    </>
  )
}

// ── Üye Listesi ───────────────────────────────────────────
const MemberList = ({ serverId }: { serverId: string }) => {
  const { data: members, isLoading } = useServerMembers(serverId)

  const grouped = useMemo(() => {
    const online: typeof members = []
    const offline: typeof members = []
    ;(members ?? []).forEach((m) => {
      // Gerçekte online/offline durumu WebSocket ile takip edilir
      // Şimdilik hepsini online göster
      online.push(m)
    })
    return { online, offline }
  }, [members])

  return (
    <div className="w-[220px] shrink-0 border-l border-[var(--border)] bg-[var(--bg-surface)] overflow-y-auto">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Üyeler — {members?.length ?? 0}
        </p>
      </div>

      {isLoading ? (
        <MemberListSkeleton />
      ) : (
        <div className="py-2">
          {grouped.online.length > 0 && (
            <MemberGroup
              title={`Çevrimiçi — ${grouped.online.length}`}
              members={grouped.online}
            />
          )}
        </div>
      )}
    </div>
  )
}

const MemberGroup = ({
  title,
  members,
}: {
  title: string
  members: ReturnType<typeof useServerMembers>['data']
}) => (
  <div>
    <p className="px-4 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
      {title}
    </p>
    {(members ?? []).map((member) => (
      <div
        key={member.user_id}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-elevated)] rounded-[var(--radius-md)] mx-1 cursor-pointer transition-colors"
      >
        <Avatar
          src={member.profiles.avatar_url}
          fallback={member.profiles.display_name}
          size="sm"
          showOnline
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--text-primary)] truncate">
            {member.nickname ?? member.profiles.display_name}
          </p>
          {member.role !== 'member' && (
            <p
              className={cn(
                'text-[10px] font-medium',
                member.role === 'owner'
                  ? 'text-[var(--accent)]'
                  : member.role === 'admin'
                  ? 'text-[var(--info)]'
                  : 'text-[var(--success)]'
              )}
            >
              {member.role === 'owner'
                ? 'Sahip'
                : member.role === 'admin'
                ? 'Admin'
                : 'Moderatör'}
            </p>
          )}
        </div>
        {member.profiles.selected_badge && (
          <Badge
            badgeKey={member.profiles.selected_badge as BadgeKey}
            size="sm"
          />
        )}
      </div>
    ))}
  </div>
)

// ── Kanal Seçilmedi ───────────────────────────────────────
const NoChannelSelected = ({
  server,
  onOpenSidebar,
}: {
  server: ServerWithRole
  onOpenSidebar: () => void
}) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
    <button
      onClick={onOpenSidebar}
      className="lg:hidden p-2 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4"
    >
      <Menu size={20} />
    </button>
    <div className="w-16 h-16 rounded-[var(--radius-xl)] bg-[var(--bg-elevated)] flex items-center justify-center text-2xl font-bold text-[var(--text-muted)]">
      {server.name[0].toUpperCase()}
    </div>
    <div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
        {server.name}
      </h3>
      <p className="text-sm text-[var(--text-muted)]">
        Bir kanal seç ve konuşmaya başla.
      </p>
    </div>
  </div>
)

// ── Skeleton & Empty ──────────────────────────────────────
const ServerDetailSkeleton = () => (
  <div className="flex h-screen">
    <div className="w-[240px] border-r border-[var(--border)] p-4 space-y-2">
      <Skeleton className="w-full h-8" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="w-full h-7" />
      ))}
    </div>
    <div className="flex-1 flex flex-col">
      <Skeleton className="w-full h-12" rounded="sm" />
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-9 h-9 shrink-0" rounded="full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="w-24 h-3.5" />
              <Skeleton className="w-full h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

const MessageListSkeleton = () => (
  <div className="p-4 space-y-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex gap-3">
        <Skeleton className="w-9 h-9 shrink-0" rounded="full" />
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-2">
            <Skeleton className="w-20 h-3.5" />
            <Skeleton className="w-12 h-3" />
          </div>
          <Skeleton className={`h-3 ${i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-2/3' : 'w-1/2'}`} />
        </div>
      </div>
    ))}
  </div>
)

const MemberListSkeleton = () => (
  <div className="p-3 space-y-2">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-2 px-1">
        <Skeleton className="w-8 h-8 shrink-0" rounded="full" />
        <Skeleton className="flex-1 h-3.5" />
      </div>
    ))}
  </div>
)

const EmptyChannel = ({ channelName }: { channelName: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
    <div className="w-14 h-14 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center mb-3">
      <span className="text-[var(--text-muted)] text-xl">#</span>
    </div>
    <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
      #{channelName} kanalına hoş geldin!
    </h3>
    <p className="text-sm text-[var(--text-muted)]">
      Bu kanalın en başı. İlk mesajı sen gönder!
    </p>
  </div>
)