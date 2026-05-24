import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Hash,
  Plus,
  ChevronDown,
  ChevronRight,
  Settings,
  UserPlus,
  Copy,
  Check,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useServerChannels,
  useCreateChannel,
  type ServerWithRole,
  type ServerCategoryWithChannels,
} from '@/hooks/useServers'
import { cn } from '@/lib/utils'
import type { ServerChannel } from '@/types/database'

interface ServerSidebarProps {
  server: ServerWithRole
  activeChannelId: string | null
  onChannelSelect: (channel: ServerChannel) => void
}

export const ServerSidebar = ({
  server,
  activeChannelId,
  onChannelSelect,
}: ServerSidebarProps) => {
  const { data, isLoading } = useServerChannels(server.id)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  )
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [createCategoryId, setCreateCategoryId] = useState<
    string | undefined
  >(undefined)

  const canManage =
    server.user_role === 'owner' || server.user_role === 'admin'

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] border-r border-[var(--border)] w-[240px] shrink-0">
      {/* Sunucu başlığı */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 min-w-0">
          {server.avatar_url ? (
            <img
              src={server.avatar_url}
              alt={server.name}
              className="w-6 h-6 rounded-[var(--radius-sm)] object-cover shrink-0"
            />
          ) : (
            <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--accent-muted)] flex items-center justify-center shrink-0">
              <span className="text-[var(--accent)] text-xs font-bold">
                {server.name[0].toUpperCase()}
              </span>
            </div>
          )}
          <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {server.name}
          </h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Davet */}
          <button
            onClick={() => setShowInvite(true)}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            title="Davet Linki"
          >
            <UserPlus size={15} />
          </button>

          {/* Ayarlar (admin) */}
          {canManage && (
            <button
              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
              title="Sunucu Ayarları"
            >
              <Settings size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Kanal listesi */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {isLoading ? (
          <ChannelListSkeleton />
        ) : (
          <>
            {/* Kategorisiz kanallar */}
            {(data?.uncategorized ?? []).map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={activeChannelId === channel.id}
                onClick={() => onChannelSelect(channel)}
              />
            ))}

            {/* Kategorili kanallar */}
            {(data?.categories ?? []).map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                isCollapsed={collapsedCategories.has(category.id)}
                onToggle={() => toggleCategory(category.id)}
                activeChannelId={activeChannelId}
                onChannelSelect={onChannelSelect}
                canManage={canManage}
                onAddChannel={() => {
                  setCreateCategoryId(category.id)
                  setShowCreateChannel(true)
                }}
              />
            ))}

            {/* Kanal ekle (admin) */}
            {canManage && (
              <button
                onClick={() => {
                  setCreateCategoryId(undefined)
                  setShowCreateChannel(true)
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors rounded-[var(--radius-md)] mx-1"
              >
                <Plus size={14} />
                Kanal Ekle
              </button>
            )}
          </>
        )}
      </div>

      {/* Kanal oluştur modal */}
      <CreateChannelModal
        isOpen={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        serverId={server.id}
        categoryId={createCategoryId}
      />

      {/* Davet linki modal */}
      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        inviteCode={server.invite_code}
        serverName={server.name}
      />
    </div>
  )
}

// ── Kategori Bölümü ───────────────────────────────────────
interface CategorySectionProps {
  category: ServerCategoryWithChannels
  isCollapsed: boolean
  onToggle: () => void
  activeChannelId: string | null
  onChannelSelect: (channel: ServerChannel) => void
  canManage: boolean
  onAddChannel: () => void
}

const CategorySection = ({
  category,
  isCollapsed,
  onToggle,
  activeChannelId,
  onChannelSelect,
  canManage,
  onAddChannel,
}: CategorySectionProps) => (
  <div>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-1 group"
    >
      <div className="flex items-center gap-1 text-[var(--text-muted)]">
        {isCollapsed ? (
          <ChevronRight size={13} />
        ) : (
          <ChevronDown size={13} />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider">
          {category.name}
        </span>
      </div>
      {canManage && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAddChannel()
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
        >
          <Plus size={13} />
        </button>
      )}
    </button>

    <AnimatePresence initial={false}>
      {!isCollapsed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="overflow-hidden"
        >
          {category.channels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              isActive={activeChannelId === channel.id}
              onClick={() => onChannelSelect(channel)}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)

// ── Kanal Satırı ──────────────────────────────────────────
const ChannelItem = ({
  channel,
  isActive,
  onClick,
}: {
  channel: ServerChannel
  isActive: boolean
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-2 px-3 py-1.5',
      'rounded-[var(--radius-md)] mx-1',
      'text-sm transition-colors duration-[var(--transition)]',
      'text-left',
      isActive
        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-medium'
        : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]'
    )}
    style={{ width: 'calc(100% - 8px)' }}
  >
    <Hash size={15} className="shrink-0" />
    <span className="truncate text-sm">{channel.name}</span>
  </button>
)

// ── Kanal Oluştur Modal ───────────────────────────────────
const CreateChannelModal = ({
  isOpen,
  onClose,
  serverId,
  categoryId,
}: {
  isOpen: boolean
  onClose: () => void
  serverId: string
  categoryId?: string
}) => {
  const [name, setName] = useState('')
  const { mutate: createChannel, isPending } = useCreateChannel(serverId)

  const handleSubmit = () => {
    if (!name.trim()) return
    createChannel(
      { name, categoryId },
      {
        onSuccess: () => {
          setName('')
          onClose()
        },
      }
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kanal Oluştur" size="sm">
      <div className="p-4 space-y-4">
        <Input
          label="Kanal Adı"
          placeholder="yeni-kanal"
          value={name}
          onChange={(e) =>
            setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))
          }
          leftIcon={<Hash size={15} />}
          hint="Küçük harf, rakam ve - kullanılabilir"
        />
        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={onClose}>
            İptal
          </Button>
          <Button
            fullWidth
            disabled={!name.trim()}
            isLoading={isPending}
            onClick={handleSubmit}
          >
            Oluştur
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Davet Modal ───────────────────────────────────────────
const InviteModal = ({
  isOpen,
  onClose,
  inviteCode,
  serverName,
}: {
  isOpen: boolean
  onClose: () => void
  inviteCode: string
  serverName: string
}) => {
  const [copied, setCopied] = useState(false)
  const inviteUrl = `${window.location.origin}/davet/${inviteCode}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Davet Linki" size="sm">
      <div className="p-4 space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Bu linki paylaşarak arkadaşlarını{' '}
          <strong className="text-[var(--text-primary)]">{serverName}</strong>{' '}
          sunucusuna davet edebilirsin.
        </p>

        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-md)] p-3">
          <span className="flex-1 text-sm text-[var(--text-secondary)] truncate font-mono">
            {inviteUrl}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-[var(--text-inverse)] text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            {copied ? (
              <>
                <Check size={13} /> Kopyalandı
              </>
            ) : (
              <>
                <Copy size={13} /> Kopyala
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          Bu link kalıcıdır. Güvendiğin kişilerle paylaş.
        </p>
      </div>
    </Modal>
  )
}

// ── Skeleton ──────────────────────────────────────────────
const ChannelListSkeleton = () => (
  <div className="px-3 space-y-1">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-2 py-1.5">
        <Skeleton className="w-4 h-4 shrink-0" rounded="sm" />
        <Skeleton className={`h-3.5 ${i % 2 === 0 ? 'w-24' : 'w-16'}`} />
      </div>
    ))}
  </div>
)