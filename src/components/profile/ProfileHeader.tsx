import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  Link as LinkIcon,
  MapPin,
  Calendar,
  Lock,
  Mail,
  MoreHorizontal,
  UserX,
  VolumeX,
  Flag,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dropdown } from '@/components/ui/Dropdown'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useFollowStatus,
  useToggleFollow,
  useBlock,
  useMute,
  useReport,
  useFollowers,
  useFollowing,
  useUploadAvatar,
  useUploadBanner,
} from '@/hooks/useProfile'
import { useAuthStore } from '@/store/authStore'
import { formatCount, formatDate, cn } from '@/lib/utils'
import type { Profile, Report } from '@/types/database'
import type { BadgeKey } from '@/types/user'
import { ProfileRow } from '@/pages/Explore'

interface ProfileHeaderProps {
  profile: Profile
  isLoading?: boolean
}

export const ProfileHeader = ({
  profile,
  isLoading = false,
}: ProfileHeaderProps) => {
  const currentUser = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const isOwn = currentUser?.id === profile.id

  const { data: followStatus } = useFollowStatus(profile.id)
  const { mutate: toggleFollow, isPending: followPending } = useToggleFollow(
    profile.id,
    profile.is_private
  )
  const { mutate: block } = useBlock(profile.id)
  const { mutate: mute } = useMute(profile.id)
  const { mutate: report } = useReport()

  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const { mutate: uploadAvatar } = useUploadAvatar()
  const { mutate: uploadBanner } = useUploadBanner()

  if (isLoading) return <ProfileHeaderSkeleton />

  const isFollowing = followStatus?.isFollowing ?? false
  const isPending = followStatus?.isPending ?? false
  const isBlocked = followStatus?.isBlocked ?? false

  const followButtonLabel = isFollowing
    ? 'Takip Ediliyor'
    : isPending
    ? 'İstek Gönderildi'
    : profile.is_private
    ? 'İstek Gönder'
    : 'Takip Et'

  const moreItems = [
    {
      label: isBlocked ? 'Engeli Kaldır' : 'Engelle',
      icon: <UserX size={15} />,
      variant: 'danger' as const,
      onClick: () => block(isBlocked),
    },
    {
      label: 'Sustur',
      icon: <VolumeX size={15} />,
      onClick: () => mute(false),
    },
    {
      label: 'Şikayet Et',
      icon: <Flag size={15} />,
      onClick: () => setShowReportModal(true),
    },
  ]

  return (
    <>
      <div>
        {/* Banner */}
        <div className="relative h-32 md:h-40 bg-[var(--bg-elevated)] overflow-hidden">
          {profile.banner_url ? (
            <img
              src={profile.banner_url}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-overlay)]" />
          )}

          {/* Banner yükle butonu (kendi profili) */}
          {isOwn && (
            <>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadBanner(file)
                }}
              />
              <button
                onClick={() => bannerInputRef.current?.click()}
                className="absolute bottom-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <Camera size={16} />
              </button>
            </>
          )}
        </div>

        {/* Profil bilgileri */}
        <div className="px-4">
          {/* Avatar + Butonlar */}
          <div className="flex items-end justify-between -mt-10 mb-3">
            {/* Avatar */}
            <div className="relative">
              <Avatar
                src={profile.avatar_url}
                fallback={profile.display_name}
                size="xl"
                isNova={profile.is_nova_plus}
                className="ring-4 ring-[var(--bg-base)]"
              />
              {isOwn && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadAvatar(file)
                    }}
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)] transition-colors shadow-md"
                  >
                    <Camera size={13} />
                  </button>
                </>
              )}
            </div>

            {/* Aksiyon butonları */}
            <div className="flex items-center gap-2 pb-1">
              {isOwn ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/ayarlar')}
                >
                  Profili Düzenle
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate('/mesajlar', {
                        state: { targetUserId: profile.id },
                      })
                    }
                  >
                    <Mail size={15} />
                  </Button>

                  <Button
                    variant={
                      isFollowing || isPending ? 'outline' : 'primary'
                    }
                    size="sm"
                    isLoading={followPending}
                    onClick={() =>
                      toggleFollow({ isFollowing, isPending })
                    }
                  >
                    {followButtonLabel}
                  </Button>

                  <Dropdown
                    trigger={
                      <Button variant="outline" size="sm">
                        <MoreHorizontal size={15} />
                      </Button>
                    }
                    items={moreItems}
                    align="right"
                  />
                </>
              )}
            </div>
          </div>

          {/* İsim + Kullanıcı adı */}
          <div className="mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-xl font-bold text-[var(--text-primary)]"
                style={
                  profile.username_color
                    ? { color: profile.username_color }
                    : undefined
                }
              >
                {profile.display_name}
              </h1>

              {/* Rozetler */}
              {profile.selected_badge && (
                <Badge
                  badgeKey={profile.selected_badge as BadgeKey}
                  size="md"
                  showLabel
                />
              )}

              {profile.is_verified && (
                <span
                  className="text-sm font-medium px-1.5 py-0.5 rounded text-[var(--info)]"
                  style={{ background: '#5A9FE015' }}
                >
                  ✓ Doğrulanmış
                </span>
              )}

              {profile.is_nova_plus && (
                <span className="text-xs text-[var(--accent)]">⭐ Nova+</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-sm">
              <span>@{profile.username}</span>
              {profile.is_private && (
                <span className="flex items-center gap-0.5">
                  <Lock size={12} />
                  <span className="text-xs">Gizli hesap</span>
                </span>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-[var(--text-primary)] leading-relaxed mb-3 whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}

          {/* Meta bilgiler */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
            {profile.location && (
              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <MapPin size={13} />
                {profile.location}
              </span>
            )}
            {profile.website && (
              <a
                href={
                  profile.website.startsWith('http')
                    ? profile.website
                    : `https://${profile.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <LinkIcon size={13} />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Calendar size={13} />
              {formatDate(profile.created_at)} tarihinde katıldı
            </span>
          </div>

          {/* Takipçi/Takip sayısı */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setShowFollowing(true)}
              className="text-sm hover:underline"
            >
              <span className="font-bold text-[var(--text-primary)]">
                {formatCount(profile.following_count)}
              </span>{' '}
              <span className="text-[var(--text-muted)]">takip</span>
            </button>
            <button
              onClick={() => setShowFollowers(true)}
              className="text-sm hover:underline"
            >
              <span className="font-bold text-[var(--text-primary)]">
                {formatCount(profile.follower_count)}
              </span>{' '}
              <span className="text-[var(--text-muted)]">takipçi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Takipçi Modalı */}
      <FollowListModal
        userId={profile.id}
        type="followers"
        isOpen={showFollowers}
        onClose={() => setShowFollowers(false)}
        title="Takipçiler"
      />

      {/* Takip Modalı */}
      <FollowListModal
        userId={profile.id}
        type="following"
        isOpen={showFollowing}
        onClose={() => setShowFollowing(false)}
        title="Takip Edilenler"
      />

      {/* Şikayet Modalı */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={(reason, description) => {
          report({
            targetId: profile.id,
            targetType: 'profile',
            reason,
            description,
          })
          setShowReportModal(false)
        }}
      />
    </>
  )
}

// ── Takipçi/Takip Listesi Modalı ──────────────────────────
interface FollowListModalProps {
  userId: string
  type: 'followers' | 'following'
  isOpen: boolean
  onClose: () => void
  title: string
}

const FollowListModal = ({
  userId,
  type,
  isOpen,
  onClose,
  title,
}: FollowListModalProps) => {
  const { data: followers } = useFollowers(
    type === 'followers' ? userId : ''
  )
  const { data: following } = useFollowing(
    type === 'following' ? userId : ''
  )

  const profiles = type === 'followers' ? followers : following

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="max-h-96 overflow-y-auto divide-y divide-[var(--border)]">
        {(profiles ?? []).length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              {type === 'followers'
                ? 'Henüz takipçi yok.'
                : 'Henüz kimse takip edilmiyor.'}
            </p>
          </div>
        ) : (
          (profiles ?? []).map((profile) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              isFollowing={false}
              isPending={false}
              onFollow={() => {}}
              showBio={false}
            />
          ))
        )}
      </div>
    </Modal>
  )
}

// ── Şikayet Modalı ────────────────────────────────────────
const REPORT_REASONS: {
  value: Report['reason']
  label: string
}[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Taciz / Zorbalık' },
  { value: 'hate_speech', label: 'Nefret Söylemi' },
  { value: 'misinformation', label: 'Yanlış Bilgi' },
  { value: 'nsfw', label: 'Uygunsuz İçerik' },
  { value: 'other', label: 'Diğer' },
]

const ReportModal = ({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (reason: Report['reason'], description?: string) => void
}) => {
  const [reason, setReason] = useState<Report['reason'] | null>(null)
  const [description, setDescription] = useState('')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Şikayet Et" size="sm">
      <div className="p-4 space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Neden şikayet ediyorsun?
        </p>

        <div className="space-y-2">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-[var(--radius-md)]',
                'text-sm transition-colors duration-[var(--transition)]',
                reason === r.value
                  ? 'bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent-border)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {reason === 'other' && (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Açıklama ekle..."
            rows={3}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] resize-none"
          />
        )}

        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={onClose}>
            İptal
          </Button>
          <Button
            variant="danger"
            fullWidth
            disabled={!reason}
            onClick={() => reason && onSubmit(reason, description || undefined)}
          >
            Şikayet Gönder
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Header Skeleton ───────────────────────────────────────
const ProfileHeaderSkeleton = () => (
  <div>
    <Skeleton className="w-full h-32 md:h-40" rounded="sm" />
    <div className="px-4">
      <div className="flex justify-between items-end -mt-10 mb-3">
        <Skeleton className="w-24 h-24 ring-4 ring-[var(--bg-base)]" rounded="full" />
        <Skeleton className="w-28 h-9 mb-1" />
      </div>
      <Skeleton className="w-36 h-5 mb-1" />
      <Skeleton className="w-24 h-4 mb-3" />
      <Skeleton className="w-full h-4 mb-1" />
      <Skeleton className="w-2/3 h-4 mb-3" />
      <div className="flex gap-4">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-20 h-4" />
      </div>
    </div>
  </div>
)