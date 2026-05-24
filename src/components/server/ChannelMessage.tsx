import { useState } from 'react'
import { Trash2, CornerUpLeft } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Dropdown } from '@/components/ui/Dropdown'
import { useDeleteMessage } from '@/hooks/useServers'
import { useAuthStore } from '@/store/authStore'
import { timeAgo, formatDateTime, cn } from '@/lib/utils'
import type { ServerMessageWithProfile } from '@/hooks/useServers'
import type { BadgeKey } from '@/types/user'
import type { ServerRole } from '@/types/database'

interface ChannelMessageProps {
  message: ServerMessageWithProfile
  channelId: string
  userRole: ServerRole | null
  onReply: (message: ServerMessageWithProfile) => void
  isGrouped?: boolean // Aynı kullanıcının art arda mesajları
}

export const ChannelMessage = ({
  message,
  channelId,
  userRole,
  onReply,
  isGrouped = false,
}: ChannelMessageProps) => {
  const currentUser = useAuthStore((s) => s.user)
  const { mutate: deleteMessage } = useDeleteMessage(channelId)
  const [hovered, setHovered] = useState(false)

  const isOwn = currentUser?.id === message.user_id
  const canDelete =
    isOwn ||
    userRole === 'owner' ||
    userRole === 'admin' ||
    userRole === 'moderator'

  const profile = message.profiles

  const dropdownItems = [
    {
      label: 'Yanıtla',
      icon: <CornerUpLeft size={14} />,
      onClick: () => onReply(message),
    },
    ...(canDelete
      ? [
          {
            label: 'Sil',
            icon: <Trash2 size={14} />,
            variant: 'danger' as const,
            onClick: () => deleteMessage(message.id),
          },
        ]
      : []),
  ]

  return (
    <div
      className={cn(
        'flex gap-3 px-4 group relative',
        isGrouped ? 'py-0.5' : 'pt-3 pb-0.5',
        'hover:bg-[var(--bg-surface)] transition-colors rounded-[var(--radius-sm)]'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar veya boşluk (gruplu mesajlarda) */}
      {isGrouped ? (
        <div className="w-10 shrink-0 flex items-center justify-center">
          {hovered && (
            <span className="text-[10px] text-[var(--text-muted)]">
              {formatDateTime(message.created_at).split(',')[1]?.trim()}
            </span>
          )}
        </div>
      ) : (
        <Avatar
          src={profile.avatar_url}
          fallback={profile.display_name}
          size="sm"
          isNova={profile.is_nova_plus}
          className="shrink-0 mt-0.5"
        />
      )}

      {/* İçerik */}
      <div className="flex-1 min-w-0">
        {/* Başlık (gruplu değilse) */}
        {!isGrouped && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="text-sm font-semibold text-[var(--text-primary)] hover:underline cursor-pointer"
            >
              {profile.display_name}
            </span>

            {profile.selected_badge && (
              <Badge
                badgeKey={profile.selected_badge as BadgeKey}
                size="sm"
              />
            )}

            {profile.is_verified && (
              <span className="text-[var(--info)] text-xs">✓</span>
            )}

            <span className="text-[10px] text-[var(--text-muted)]">
              {timeAgo(message.created_at)}
            </span>

            {message.is_edited && (
              <span className="text-[10px] text-[var(--text-muted)]">
                (düzenlendi)
              </span>
            )}
          </div>
        )}

        {/* Yanıtlanan mesaj */}
        {message.reply_to && (
          <div className="flex items-center gap-1.5 mb-1 text-xs text-[var(--text-muted)]">
            <CornerUpLeft size={12} className="shrink-0" />
            <span className="font-medium">
              {(message.reply_to as ServerMessageWithProfile).profiles
                ?.display_name ?? 'Bilinmeyen'}
            </span>
            <span className="truncate">
              {message.reply_to.content?.slice(0, 60)}
              {(message.reply_to.content?.length ?? 0) > 60 ? '...' : ''}
            </span>
          </div>
        )}

        {/* Metin */}
        {message.content && (
          <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {/* Medya */}
        {message.media_urls.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.media_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Medya ${i + 1}`}
                className="max-w-[240px] max-h-[180px] rounded-[var(--radius-md)] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>

      {/* Aksiyon menüsü */}
      {hovered && (
        <div className="absolute right-2 top-1 z-10">
          <Dropdown
            trigger={
              <button className="p-1.5 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <CornerUpLeft size={14} />
              </button>
            }
            items={dropdownItems}
            align="right"
          />
        </div>
      )}
    </div>
  )
}