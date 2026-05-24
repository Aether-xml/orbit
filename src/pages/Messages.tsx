import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PenSquare, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  useConversations,
  useGetOrCreateConversation,
} from '@/hooks/useMessages'
import { useSearchProfiles } from '@/hooks/useSearch'
import { useAuthStore } from '@/store/authStore'
import { timeAgo, cn } from '@/lib/utils'
import { useState } from 'react'
import type { ConversationWithDetails } from '@/hooks/useMessages'
import type { Profile } from '@/types/database'

export const Messages = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: conversations, isLoading } = useConversations()
  const { mutateAsync: getOrCreate } = useGetOrCreateConversation()
  const [showNewDM, setShowNewDM] = useState(false)

  // Feed'den "Mesaj At" butonuyla gelindiğinde otomatik konuşma aç
  useEffect(() => {
    const targetUserId = location.state?.targetUserId as string | undefined
    if (targetUserId) {
      getOrCreate(targetUserId).then((convoId) => {
        navigate(`/mesajlar/${convoId}`, { replace: true })
      })
    }
  }, [])

  return (
    <div>
      {/* Başlık */}
      <div className="sticky top-0 z-30 bg-[var(--bg-base)]/95 border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">
          Mesajlar
        </h1>
        <button
          onClick={() => setShowNewDM(true)}
          className="p-2 rounded-[var(--radius-full)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Yeni mesaj"
        >
          <PenSquare size={18} />
        </button>
      </div>

      {/* Konuşma listesi */}
      {isLoading ? (
        <ConversationListSkeleton />
      ) : (conversations ?? []).length === 0 ? (
        <EmptyMessages onNew={() => setShowNewDM(true)} />
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {(conversations ?? []).map((convo) => (
            <ConversationRow
              key={convo.id}
              conversation={convo}
              onClick={() => navigate(`/mesajlar/${convo.id}`)}
            />
          ))}
        </div>
      )}

      {/* Yeni DM Modal */}
      <NewDMModal
        isOpen={showNewDM}
        onClose={() => setShowNewDM(false)}
        onSelect={async (userId) => {
          const convoId = await getOrCreate(userId)
          setShowNewDM(false)
          navigate(`/mesajlar/${convoId}`)
        }}
      />
    </div>
  )
}

// ── Konuşma Satırı ────────────────────────────────────────
const ConversationRow = ({
  conversation,
  onClick,
}: {
  conversation: ConversationWithDetails
  onClick: () => void
}) => {
  const currentUser = useAuthStore((s) => s.user)
  const other = conversation.other_user
  const lastMsg = conversation.last_message
  const hasUnread = conversation.unread_count > 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
    >
      <Avatar
        src={other.avatar_url}
        fallback={other.display_name}
        size="md"
        isNova={other.is_nova_plus}
        showOnline
        className="shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className={cn(
              'text-sm truncate',
              hasUnread
                ? 'font-semibold text-[var(--text-primary)]'
                : 'font-medium text-[var(--text-primary)]'
            )}
          >
            {other.display_name}
          </span>
          {lastMsg && (
            <span className="text-[11px] text-[var(--text-muted)] shrink-0 ml-2">
              {timeAgo(lastMsg.created_at)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <p
            className={cn(
              'text-xs truncate flex-1',
              hasUnread
                ? 'text-[var(--text-primary)] font-medium'
                : 'text-[var(--text-muted)]'
            )}
          >
            {lastMsg
              ? lastMsg.sender_id === currentUser?.id
                ? `Sen: ${lastMsg.content ?? '📎 Medya'}`
                : lastMsg.content ?? '📎 Medya'
              : 'Henüz mesaj yok'}
          </p>
          {hasUnread && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-[var(--accent)] text-[var(--text-inverse)] text-[10px] font-bold rounded-full flex items-center justify-center">
              {conversation.unread_count > 99
                ? '99+'
                : conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Yeni DM Modal ─────────────────────────────────────────
const NewDMModal = ({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean
  onClose: () => void
  onSelect: (userId: string) => void
}) => {
  const [query, setQuery] = useState('')
  const { data: profiles, isLoading } = useSearchProfiles(query)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Yeni Mesaj" size="sm">
      <div className="p-4 space-y-3">
        <Input
          placeholder="Kullanıcı ara..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search size={15} />}
          autoFocus
        />

        <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border)]">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="w-9 h-9 shrink-0" rounded="full" />
                <div className="space-y-1.5">
                  <Skeleton className="w-24 h-3.5" />
                  <Skeleton className="w-16 h-3" />
                </div>
              </div>
            ))
          ) : (profiles ?? []).length === 0 && query ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-6">
              Kullanıcı bulunamadı.
            </p>
          ) : (
            (profiles ?? []).map((profile) => (
              <UserSelectRow
                key={profile.id}
                profile={profile}
                onSelect={() => onSelect(profile.id)}
              />
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}

const UserSelectRow = ({
  profile,
  onSelect,
}: {
  profile: Profile
  onSelect: () => void
}) => (
  <button
    onClick={onSelect}
    className="w-full flex items-center gap-3 py-2.5 hover:bg-[var(--bg-elevated)] transition-colors rounded-[var(--radius-md)] px-2"
  >
    <Avatar
      src={profile.avatar_url}
      fallback={profile.display_name}
      size="sm"
    />
    <div className="text-left">
      <p className="text-sm font-medium text-[var(--text-primary)]">
        {profile.display_name}
      </p>
      <p className="text-xs text-[var(--text-muted)]">@{profile.username}</p>
    </div>
  </button>
)

// ── Skeleton & Empty ──────────────────────────────────────
const ConversationListSkeleton = () => (
  <div className="divide-y divide-[var(--border)]">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-10 h-10 shrink-0" rounded="full" />
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between">
            <Skeleton className="w-28 h-3.5" />
            <Skeleton className="w-10 h-3" />
          </div>
          <Skeleton className="w-40 h-3" />
        </div>
      </div>
    ))}
  </div>
)

const EmptyMessages = ({ onNew }: { onNew: () => void }) => (
  <div className="py-16 flex flex-col items-center gap-4 px-6 text-center">
    <span className="text-5xl">💬</span>
    <div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
        Henüz mesajın yok
      </h3>
      <p className="text-sm text-[var(--text-muted)] max-w-xs">
        Birisiyle konuşmaya başla.
      </p>
    </div>
    <Button onClick={onNew} leftIcon={<PenSquare size={16} />}>
      Yeni Mesaj
    </Button>
  </div>
)