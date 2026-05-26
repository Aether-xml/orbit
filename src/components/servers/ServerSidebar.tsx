import { Hash, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Server, ServerCategory, ServerChannel } from '@/types/database'

type Props = {
  server: Server
  categories: ServerCategory[]
  channels: ServerChannel[]
  activeChannelId?: string
  // Mobile drawer support
  isDrawer?: boolean
  onClose?: () => void
}

export default function ServerSidebar({ server, categories, channels, activeChannelId, isDrawer, onClose }: Props) {
  const uncategorized = channels.filter((ch) => !ch.category_id)

  return (
    <div className="flex flex-col h-full bg-bg-surface">
      {/* Server header */}
      <div className="px-4 py-3.5 border-b border-line flex items-center justify-between flex-shrink-0">
        <p className="font-semibold text-text-primary text-sm truncate">{server.name}</p>
        {isDrawer && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-default p-1 -mr-1"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto py-2">
        {uncategorized.length > 0 && (
          <div className="mb-2">
            {uncategorized.map((ch) => (
              <ChannelLink
                key={ch.id}
                channel={ch}
                serverId={server.id}
                active={ch.id === activeChannelId}
                onClick={onClose}
              />
            ))}
          </div>
        )}

        {categories.map((cat) => {
          const catChannels = channels.filter((ch) => ch.category_id === cat.id)
          if (!catChannels.length) return null
          return (
            <div key={cat.id} className="mb-3">
              <p className="px-4 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-widest">
                {cat.name}
              </p>
              {catChannels.map((ch) => (
                <ChannelLink
                  key={ch.id}
                  channel={ch}
                  serverId={server.id}
                  active={ch.id === activeChannelId}
                  onClick={onClose}
                />
              ))}
            </div>
          )
        })}

        {channels.length === 0 && (
          <p className="px-4 py-3 text-text-muted text-xs">Henüz kanal yok</p>
        )}
      </div>

      {/* Invite code */}
      {server.invite_code && (
        <div className="px-4 py-3 border-t border-line flex-shrink-0">
          <p className="text-text-muted text-[10px] uppercase tracking-wide mb-1">Davet Kodu</p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(server.invite_code)
            }}
            className="font-mono text-xs text-text-secondary hover:text-accent transition-default tracking-wider"
            title="Kopyala"
          >
            {server.invite_code}
          </button>
        </div>
      )}
    </div>
  )
}

function ChannelLink({
  channel,
  serverId,
  active,
  onClick,
}: {
  channel: ServerChannel
  serverId: string
  active: boolean
  onClick?: () => void
}) {
  return (
    <NavLink
      to={`/sunucular/${serverId}/kanal/${channel.id}`}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 mx-2 px-2 py-1.5 rounded-md text-sm transition-default',
        active
          ? 'bg-bg-elevated text-text-primary'
          : 'text-text-muted hover:bg-bg-overlay hover:text-text-secondary'
      )}
    >
      <Hash size={15} className="flex-shrink-0" />
      <span className="truncate">{channel.name}</span>
    </NavLink>
  )
}
