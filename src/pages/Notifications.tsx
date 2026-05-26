import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, Repeat2, UserPlus, MessageCircle, AtSign, Quote, Bell, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { Notification, NotificationType } from '@/types/database'
import Avatar from '@/components/ui/Avatar'
import { NotificationSkeleton } from '@/components/ui/Skeleton'

type NotificationWithActor = Notification & {
  actor: { id: string; username: string; display_name: string; avatar_url: string | null } | null
}

function getNotificationMeta(type: NotificationType): { icon: React.ReactNode; color: string; text: string } {
  switch (type) {
    case 'like':           return { icon: <Heart size={14} fill="currentColor" />, color: 'text-error',   text: 'gönderini beğendi' }
    case 'repost':         return { icon: <Repeat2 size={14} />,                  color: 'text-success',  text: 'gönderini repostladı' }
    case 'follow':         return { icon: <UserPlus size={14} />,                 color: 'text-accent',   text: 'seni takip etmeye başladı' }
    case 'follow_request': return { icon: <UserPlus size={14} />,                 color: 'text-accent',   text: 'seni takip etmek istiyor' }
    case 'follow_accepted':return { icon: <CheckCheck size={14} />,               color: 'text-success',  text: 'takip isteğini kabul etti' }
    case 'comment':        return { icon: <MessageCircle size={14} />,            color: 'text-blue-400', text: 'gönderine yorum yaptı' }
    case 'reply':          return { icon: <MessageCircle size={14} />,            color: 'text-blue-400', text: 'yorumunu yanıtladı' }
    case 'mention':        return { icon: <AtSign size={14} />,                   color: 'text-accent',   text: 'senden bahsetti' }
    case 'quote':          return { icon: <Quote size={14} />,                    color: 'text-accent',   text: 'gönderini alıntıladı' }
    default:               return { icon: <Bell size={14} />,                     color: 'text-text-muted', text: 'yeni bildirim' }
  }
}

type NotifTab = 'all' | 'likes' | 'follows' | 'replies'

const TABS: { id: NotifTab; label: string }[] = [
  { id: 'all',     label: 'Tümü' },
  { id: 'likes',   label: 'Beğeniler' },
  { id: 'follows', label: 'Takipçiler' },
  { id: 'replies', label: 'Yanıtlar' },
]

export default function Notifications() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<NotifTab>('all')

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data: rawNotifs, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      if (!rawNotifs?.length) return []

      const actorIds = [...new Set(rawNotifs.map((n) => n.actor_id).filter(Boolean))] as string[]
      const { data: actors } = actorIds.length
        ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', actorIds)
        : { data: [] }

      const actorMap = new Map(actors?.map((a) => [a.id, a]))
      return rawNotifs.map((n) => ({
        ...n,
        actor: n.actor_id ? (actorMap.get(n.actor_id) ?? null) : null,
      })) as NotificationWithActor[]
    },
    enabled: !!user?.id,
  })

  // Mark all as read when visiting
  useEffect(() => {
    if (!user?.id) return
    void supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['unread-notifications', user.id] })
      })
  }, [user?.id, queryClient])

  const handleMarkAllRead = async () => {
    if (!user?.id) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
    void queryClient.invalidateQueries({ queryKey: ['unread-notifications', user.id] })
    toast.success('Tümü okundu işaretlendi')
  }

  const filtered = useMemo(() => {
    const base = notifications ?? []
    switch (activeTab) {
      case 'likes':   return base.filter(n => n.type === 'like' || n.type === 'repost')
      case 'follows': return base.filter(n => n.type === 'follow' || n.type === 'follow_request' || n.type === 'follow_accepted')
      case 'replies': return base.filter(n => n.type === 'reply' || n.type === 'comment' || n.type === 'mention' || n.type === 'quote')
      default:        return base
    }
  }, [notifications, activeTab])

  const followRequests = (activeTab === 'all' || activeTab === 'follows')
    ? filtered.filter(n => n.type === 'follow_request')
    : []
  const others = filtered.filter(n => n.type !== 'follow_request')

  return (
    <div className="min-h-dvh">
      <div className="sticky top-[52px] z-10 bg-bg-base/80 backdrop-blur-md border-b border-line px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-text-primary">Bildirimler</h1>
        {notifications && notifications.some((n) => !n.is_read) && (
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            className="p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-default"
            title="Tümünü okundu işaretle"
          >
            <CheckCheck size={18} />
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-line sticky top-[52px] z-10 bg-bg-base/80 backdrop-blur-md">
        {TABS.map(tab => {
          const tabNotifs = (() => {
            const base = notifications ?? []
            switch (tab.id) {
              case 'likes':   return base.filter(n => n.type === 'like' || n.type === 'repost')
              case 'follows': return base.filter(n => n.type === 'follow' || n.type === 'follow_request' || n.type === 'follow_accepted')
              case 'replies': return base.filter(n => n.type === 'reply' || n.type === 'comment' || n.type === 'mention' || n.type === 'quote')
              default:        return base
            }
          })()
          const hasUnread = tabNotifs.some(n => !n.is_read)
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-default relative',
                activeTab === tab.id
                  ? 'text-text-primary'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-overlay'
              )}
            >
              {tab.label}
              {hasUnread && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-accent inline-block" />}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => <NotificationSkeleton key={i} />)
      ) : !notifications?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-14 h-14 rounded-full bg-bg-elevated flex items-center justify-center mb-4">
            <Bell size={22} className="text-text-muted" />
          </div>
          <h3 className="font-semibold text-text-primary mb-1">Henüz bildirim yok</h3>
          <p className="text-text-muted text-sm">Birisi seninle etkileşime girdiğinde burada görünecek.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <Bell size={28} className="text-text-muted mb-3 opacity-60" />
          <p className="text-text-muted text-sm">Bu kategoride bildirim yok</p>
        </div>
      ) : (
        <>
          {/* Follow requests */}
          {followRequests.length > 0 && (
            <section>
              <h2 className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-line">
                Takip İstekleri
              </h2>
              {followRequests.map((n) => (
                <FollowRequestItem
                  key={n.id}
                  notification={n}
                  userId={user!.id}
                  onAction={() => {
                    queryClient.invalidateQueries({ queryKey: ['notifications'] })
                    queryClient.invalidateQueries({ queryKey: ['follow-status'] })
                  }}
                />
              ))}
            </section>
          )}

          {/* Other notifications */}
          {others.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </>
      )}
    </div>
  )
}

// ── NotificationItem ──────────────────────────────────

function NotificationItem({ notification: n }: { notification: NotificationWithActor }) {
  const navigate = useNavigate()
  const meta = getNotificationMeta(n.type)

  return (
    <button
      type="button"
      onClick={() => {
        if (n.target_id && (n.target_type === 'post' || n.target_type === 'comment')) {
          navigate(`/gonderi/${n.target_id}`)
        } else if (n.actor) {
          navigate(`/${n.actor.username}`)
        }
      }}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 border-b border-line text-left transition-default hover:bg-bg-overlay',
        !n.is_read && 'bg-accent/5'
      )}
    >
      {/* Icon */}
      <div className={cn('mt-1 flex-shrink-0', meta.color)}>
        {meta.icon}
      </div>

      {/* Avatar */}
      {n.actor && (
        <Avatar src={n.actor.avatar_url} fallback={n.actor.display_name} size="sm" />
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm leading-snug">
          <span className="font-semibold">{n.actor?.display_name ?? 'Birisi'}</span>
          {' '}{meta.text}
        </p>
        {n.message && (
          <p className="text-text-muted text-xs mt-0.5 truncate">{n.message}</p>
        )}
        <p className="text-text-muted text-xs mt-0.5">{timeAgo(n.created_at)}</p>
      </div>

      {!n.is_read && (
        <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
      )}
    </button>
  )
}

// ── FollowRequestItem ────────────────────────────────

function FollowRequestItem({
  notification: n,
  userId,
  onAction,
}: {
  notification: NotificationWithActor
  userId: string
  onAction: () => void
}) {
  const navigate = useNavigate()

  const handleAccept = async () => {
    if (!n.actor) return
    await supabase.from('follow_requests').delete().match({ requester_id: n.actor.id, target_id: userId })
    await supabase.from('follows').insert({ follower_id: n.actor.id, following_id: userId })
    await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
    toast.success(`${n.actor.display_name} takip isteği kabul edildi`)
    onAction()
  }

  const handleDecline = async () => {
    if (!n.actor) return
    await supabase.from('follow_requests').delete().match({ requester_id: n.actor.id, target_id: userId })
    await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
    onAction()
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
      <button type="button" onClick={() => n.actor && navigate(`/${n.actor.username}`)}>
        <Avatar src={n.actor?.avatar_url ?? null} fallback={n.actor?.display_name ?? '?'} size="md" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm">
          <span className="font-semibold">{n.actor?.display_name}</span>
          {' '}seni takip etmek istiyor
        </p>
        <p className="text-text-muted text-xs">{timeAgo(n.created_at)}</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleAccept()}
          className="px-3 py-1 rounded-full bg-accent text-bg-base text-xs font-semibold hover:opacity-80 transition-default"
        >
          Kabul
        </button>
        <button
          type="button"
          onClick={() => void handleDecline()}
          className="px-3 py-1 rounded-full border border-line text-text-secondary text-xs font-semibold hover:bg-bg-elevated transition-default"
        >
          Reddet
        </button>
      </div>
    </div>
  )
}
