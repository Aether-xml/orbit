import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useNotifications,
  useMarkAllRead,
  useMarkOneRead,
  useHandleFollowRequest,
  useUnreadCount,
  useRealtimeNotifications,
  type NotificationWithActor,
} from '@/hooks/useNotifications'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { timeAgo, cn } from '@/lib/utils'
import { useState } from 'react'
import type { Notification } from '@/types/database'

type NotifFilter = 'all' | 'likes' | 'follows' | 'replies' | 'requests'

const FILTERS: { key: NotifFilter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'likes', label: 'Beğeniler' },
  { key: 'follows', label: 'Takipçiler' },
  { key: 'replies', label: 'Yanıtlar' },
  { key: 'requests', label: 'İstekler' },
]

export const Notifications = () => {
  const [activeFilter, setActiveFilter] = useState<NotifFilter>('all')

  // Realtime dinle
  useRealtimeNotifications()
  useUnreadCount()

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotifications(activeFilter)

  const { mutate: markAllRead, isPending: markingAll } = useMarkAllRead()

  const notifications = useMemo(
    () => data?.pages.flatMap((p) => p.notifications) ?? [],
    [data]
  )

  const { sentinelRef } = useInfiniteScroll({
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  })

  return (
    <div>
      {/* Başlık */}
      <div className="sticky top-0 z-30 bg-[var(--bg-base)]/95 border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">
            Bildirimler
          </h1>
          <button
            onClick={() => markAllRead()}
            disabled={markingAll || notifications.every((n) => n.is_read)}
            className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline disabled:opacity-40 disabled:no-underline"
          >
            <CheckCheck size={14} />
            Tümünü okundu işaretle
          </button>
        </div>

        {/* Filtreler */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-none">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={cn(
                'px-3 py-1.5 rounded-[var(--radius-full)]',
                'text-xs font-medium whitespace-nowrap',
                'transition-colors duration-[var(--transition)]',
                activeFilter === key
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-muted)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* İçerik */}
      {isLoading ? (
        <NotificationListSkeleton />
      ) : notifications.length === 0 ? (
        <EmptyNotifications filter={activeFilter} />
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {notifications.map((notif) => (
            <NotificationRow key={notif.id} notification={notif} />
          ))}
          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="py-4 flex justify-center">
              <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Bildirim Satırı ───────────────────────────────────────
const NotificationRow = ({
  notification,
}: {
  notification: NotificationWithActor
}) => {
  const navigate = useNavigate()
  const { mutate: markRead } = useMarkOneRead()
  const { mutate: handleRequest } = useHandleFollowRequest()

  const actor = notification.actor
  const isUnread = !notification.is_read

  const handleClick = () => {
    if (isUnread) markRead(notification.id)

    if (notification.target_type === 'post' && notification.target_id) {
      navigate(`/post/${notification.target_id}`)
    } else if (actor) {
      navigate(`/${actor.username}`)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 px-4 py-3',
        'cursor-pointer transition-colors',
        isUnread
          ? 'bg-[var(--accent-muted)] hover:bg-[var(--bg-surface)]'
          : 'hover:bg-[var(--bg-surface)]'
      )}
    >
      {/* Okunmamış nokta */}
      {isUnread && (
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-4 shrink-0" />
      )}

      {/* Avatar */}
      {actor && (
        <Avatar
          src={actor.avatar_url}
          fallback={actor.display_name}
          size="md"
          isNova={actor.is_nova_plus}
          className="shrink-0"
        />
      )}

      {/* İçerik */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)] leading-snug">
          {actor && (
            <span className="font-semibold">{actor.display_name} </span>
          )}
          <span className="text-[var(--text-secondary)]">
            {notificationText(notification.type)}
          </span>
        </p>

        {notification.message && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
            {notification.message}
          </p>
        )}

        <p className="text-xs text-[var(--text-muted)] mt-1">
          {timeAgo(notification.created_at)}
        </p>

        {/* Takip isteği aksiyonları */}
        {notification.type === 'follow_request' && actor && (
          <div
            className="flex gap-2 mt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              onClick={() =>
                handleRequest({
                  requesterId: actor.id,
                  action: 'accept',
                  notificationId: notification.id,
                })
              }
            >
              Kabul Et
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                handleRequest({
                  requesterId: actor.id,
                  action: 'reject',
                  notificationId: notification.id,
                })
              }
            >
              Reddet
            </Button>
          </div>
        )}
      </div>

      {/* Bildirim ikonu */}
      <span className="text-lg shrink-0 mt-0.5">
        {notificationIcon(notification.type)}
      </span>
    </motion.div>
  )
}

// ── Yardımcı fonksiyonlar ─────────────────────────────────
const notificationText = (type: Notification['type']): string => {
  const map: Record<Notification['type'], string> = {
    like: 'postunu beğendi',
    repost: 'postunu repost yaptı',
    follow: 'seni takip etmeye başladı',
    follow_request: 'seni takip etmek istiyor',
    follow_accepted: 'takip isteğini kabul etti',
    comment: 'postuna yorum yaptı',
    mention: 'senden bahsetti',
    reply: 'yorumunu yanıtladı',
    server_invite: 'seni bir sunucuya davet etti',
    quote: 'postunu alıntıladı',
  }
  return map[type] ?? ''
}

const notificationIcon = (type: Notification['type']): string => {
  const map: Record<Notification['type'], string> = {
    like: '❤️',
    repost: '🔁',
    follow: '👤',
    follow_request: '🔔',
    follow_accepted: '✅',
    comment: '💬',
    mention: '@',
    reply: '↩️',
    server_invite: '🌐',
    quote: '💬',
  }
  return map[type] ?? '🔔'
}

// ── Skeleton & Empty ──────────────────────────────────────
const NotificationListSkeleton = () => (
  <div className="divide-y divide-[var(--border)]">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-start gap-3 px-4 py-3">
        <Skeleton className="w-10 h-10 shrink-0" rounded="full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="w-3/4 h-3.5" />
          <Skeleton className="w-1/2 h-3" />
          <Skeleton className="w-16 h-2.5" />
        </div>
      </div>
    ))}
  </div>
)

const EmptyNotifications = ({ filter }: { filter: NotifFilter }) => {
  const messages: Record<NotifFilter, string> = {
    all: 'Henüz bildirim yok.',
    likes: 'Henüz beğeni yok.',
    follows: 'Henüz takipçi yok.',
    replies: 'Henüz yanıt yok.',
    requests: 'Bekleyen takip isteği yok.',
  }

  return (
    <div className="py-16 flex flex-col items-center gap-3 text-center">
      <span className="text-4xl">🔔</span>
      <p className="text-sm text-[var(--text-muted)]">{messages[filter]}</p>
    </div>
  )
}