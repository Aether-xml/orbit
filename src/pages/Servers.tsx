import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Compass, Hash, Link as LinkIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useMyServers,
  usePublicServers,
  useCreateServer,
  useJoinServer,
  useJoinByInvite,
} from '@/hooks/useServers'
import { formatCount, cn } from '@/lib/utils'
import type { ServerWithRole } from '@/hooks/useServers'

export const Servers = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'mine' | 'discover'>('mine')
  const [showCreate, setShowCreate] = useState(false)
  const [showJoinByInvite, setShowJoinByInvite] = useState(false)

  const { data: myServers, isLoading: loadingMine } = useMyServers()
  const { data: publicServers, isLoading: loadingPublic } = usePublicServers()
  const { mutate: joinServer } = useJoinServer()

  return (
    <div>
      {/* Başlık */}
      <div className="sticky top-0 z-30 bg-[var(--bg-base)]/95 border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">
            Sunucular
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<LinkIcon size={14} />}
              onClick={() => setShowJoinByInvite(true)}
            >
              Davet
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => setShowCreate(true)}
            >
              Oluştur
            </Button>
          </div>
        </div>

        {/* Sekmeler */}
        <div className="flex gap-1">
          {(
            [
              { key: 'mine', label: 'Sunucularım', icon: Hash },
              { key: 'discover', label: 'Keşfet', icon: Compass },
            ] as { key: 'mine' | 'discover'; label: string; icon: React.ElementType }[]
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5',
                'rounded-[var(--radius-full)] text-xs font-medium',
                'transition-colors duration-[var(--transition)]',
                activeTab === key
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* İçerik */}
      {activeTab === 'mine' ? (
        loadingMine ? (
          <ServerListSkeleton />
        ) : (myServers ?? []).length === 0 ? (
          <EmptyMyServers onCreate={() => setShowCreate(true)} />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {(myServers ?? []).map((server) => (
              <ServerRow
                key={server.id}
                server={server}
                onClick={() => navigate(`/sunucular/${server.id}`)}
                actionLabel="Aç"
                onAction={() => navigate(`/sunucular/${server.id}`)}
              />
            ))}
          </div>
        )
      ) : loadingPublic ? (
        <ServerListSkeleton />
      ) : (publicServers ?? []).length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[var(--text-muted)] text-sm">
            Keşfedilecek sunucu bulunamadı.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {(publicServers ?? []).map((server) => (
            <ServerRow
              key={server.id}
              server={server}
              onClick={() => navigate(`/sunucular/${server.id}`)}
              actionLabel="Katıl"
              onAction={() => joinServer(server.id)}
            />
          ))}
        </div>
      )}

      {/* Sunucu oluştur modal */}
      <CreateServerModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={(id) => navigate(`/sunucular/${id}`)}
      />

      {/* Davet ile katıl modal */}
      <JoinByInviteModal
        isOpen={showJoinByInvite}
        onClose={() => setShowJoinByInvite(false)}
      />
    </div>
  )
}

// ── Sunucu Satırı ─────────────────────────────────────────
interface ServerRowProps {
  server: ServerWithRole
  onClick: () => void
  actionLabel: string
  onAction: () => void
}

const ServerRow = ({
  server,
  onClick,
  actionLabel,
  onAction,
}: ServerRowProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
    onClick={onClick}
  >
    {/* Avatar */}
    <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--bg-elevated)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
      {server.avatar_url ? (
        <img
          src={server.avatar_url}
          alt={server.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-xl font-bold text-[var(--text-muted)]">
          {server.name[0].toUpperCase()}
        </span>
      )}
    </div>

    {/* Bilgiler */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
          {server.name}
        </p>
        {server.user_role === 'owner' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-muted)] text-[var(--accent)] font-medium shrink-0">
            Sahibi
          </span>
        )}
        {server.user_role === 'admin' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--info)]/15 text-[var(--info)] font-medium shrink-0">
            Admin
          </span>
        )}
      </div>
      {server.description && (
        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
          {server.description}
        </p>
      )}
      <p className="text-xs text-[var(--text-muted)] mt-0.5">
        {formatCount(server.member_count)} üye
      </p>
    </div>

    {/* Aksiyon */}
    <Button
      size="sm"
      variant={actionLabel === 'Aç' ? 'outline' : 'primary'}
      onClick={(e) => {
        e.stopPropagation()
        onAction()
      }}
      className="shrink-0"
    >
      {actionLabel}
    </Button>
  </motion.div>
)

// ── Sunucu Oluştur Modal ──────────────────────────────────
const CreateServerModal = ({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: (id: string) => void
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const { mutate: createServer, isPending } = useCreateServer()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    createServer(
      {
        name,
        description: description || undefined,
        isPublic,
        avatarFile: avatarFile ?? undefined,
      },
      {
        onSuccess: (server) => {
          onSuccess(server.id)
          onClose()
          setName('')
          setDescription('')
          setAvatarFile(null)
          setAvatarPreview(null)
        },
      }
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sunucu Oluştur" size="md">
      <div className="p-4 space-y-4">
        {/* Avatar seç */}
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-[var(--radius-xl)] bg-[var(--bg-elevated)] border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] overflow-hidden flex items-center justify-center transition-colors"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <Plus size={20} className="text-[var(--text-muted)]" />
            )}
          </button>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Sunucu İkonu
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              İsteğe bağlı
            </p>
          </div>
        </div>

        <Input
          label="Sunucu Adı"
          placeholder="Harika Sunucu"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
        />

        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
            Açıklama
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Sunucundan bahset..."
            rows={2}
            maxLength={200}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] resize-none transition-colors"
          />
        </div>

        {/* Gizlilik */}
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
            Gizlilik
          </p>
          <div className="flex gap-2">
            {[
              { value: true, label: 'Herkese Açık' },
              { value: false, label: 'Gizli' },
            ].map(({ value, label }) => (
              <button
                key={label}
                onClick={() => setIsPublic(value)}
                className={cn(
                  'flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-medium',
                  'border transition-all duration-[var(--transition)]',
                  isPublic === value
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent-border)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
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

// ── Davet ile Katıl Modal ─────────────────────────────────
const JoinByInviteModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  const [code, setCode] = useState('')
  const { mutate: joinByInvite, isPending } = useJoinByInvite()

  const handleSubmit = () => {
    if (!code.trim()) return
    joinByInvite(code, {
      onSuccess: () => {
        setCode('')
        onClose()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Davete Katıl" size="sm">
      <div className="p-4 space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Davet kodunu veya tam davet linkini gir.
        </p>
        <Input
          label="Davet Kodu"
          placeholder="abc123 veya orbit.app/davet/abc123"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          leftIcon={<LinkIcon size={15} />}
        />
        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={onClose}>
            İptal
          </Button>
          <Button
            fullWidth
            disabled={!code.trim()}
            isLoading={isPending}
            onClick={handleSubmit}
          >
            Katıl
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Skeleton & Empty ──────────────────────────────────────
const ServerListSkeleton = () => (
  <div className="divide-y divide-[var(--border)]">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-12 h-12 shrink-0" rounded="lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-20 h-3" />
        </div>
        <Skeleton className="w-16 h-8" />
      </div>
    ))}
  </div>
)

const EmptyMyServers = ({ onCreate }: { onCreate: () => void }) => (
  <div className="py-16 flex flex-col items-center gap-4 px-6 text-center">
    <span className="text-5xl">🪐</span>
    <div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
        Henüz bir sunucun yok
      </h3>
      <p className="text-sm text-[var(--text-muted)] max-w-xs">
        Kendi sunucunu oluştur ya da başkasının sunucusuna katıl.
      </p>
    </div>
    <Button onClick={onCreate} leftIcon={<Plus size={16} />}>
      Sunucu Oluştur
    </Button>
  </div>
)

// useRef import
import { useRef } from 'react'