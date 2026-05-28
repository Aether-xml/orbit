import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Camera, ChevronRight, Link2, MapPin, Music } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { uploadFile, uniquePath } from '@/lib/upload'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import Avatar from '@/components/ui/Avatar'

const BIO_MAX = 150

export default function EditProfile() {
  const navigate = useNavigate()
  const { user, profile, setProfile } = useAuthStore()
  const queryClient = useQueryClient()

  const [bio, setBio] = useState(profile?.bio ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const hasChanges =
    bio !== (profile?.bio ?? '') ||
    avatarFile !== null ||
    bannerFile !== null

  const pickFile = (
    ref: React.RefObject<HTMLInputElement | null>,
    onPick: (f: File) => void
  ) => {
    const input = ref.current
    if (!input) return
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) onPick(file)
      input.value = ''
    }
    input.click()
  }

  const handleSave = async () => {
    if (!user || !profile || !hasChanges || saving) return
    setSaving(true)
    try {
      let avatar_url = profile.avatar_url
      let banner_url = profile.banner_url
      if (avatarFile) avatar_url = await uploadFile('avatars', avatarFile, uniquePath(user.id, avatarFile))
      if (bannerFile) banner_url = await uploadFile('banners', bannerFile, uniquePath(user.id, bannerFile))

      const { error } = await supabase
        .from('profiles')
        .update({ bio: bio || null, avatar_url, banner_url })
        .eq('id', user.id)

      if (error) {
        toast.error('Kaydedilemedi')
      } else {
        setProfile({ ...profile, bio: bio || null, avatar_url, banner_url })
        void queryClient.invalidateQueries({ queryKey: ['profile'] })
        toast.success('Profil güncellendi')
        navigate(-1)
      }
    } catch {
      toast.error('Resim yüklenemedi')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return null

  const currentAvatar = avatarPreview ?? profile.avatar_url
  const currentBanner = bannerPreview ?? profile.banner_url
  const linkCount = profile.website ? 1 : 0

  return (
    <div className="min-h-dvh bg-bg-base">
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" />
      <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" />

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur-md border-b border-line h-14 flex items-center px-4 gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-bg-overlay transition-default text-text-primary flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="flex-1 text-center font-semibold text-text-primary">Profili Düzenle</span>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!hasChanges || saving}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-semibold transition-default flex-shrink-0',
            hasChanges && !saving
              ? 'bg-accent text-[#0E0E0E] hover:bg-accent/90'
              : 'bg-accent/25 text-accent/40 cursor-not-allowed'
          )}
        >
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      {/* Visual section — banner + avatar */}
      <div className="relative">
        {/* Banner */}
        <div
          className="h-36 bg-bg-surface relative cursor-pointer overflow-hidden"
          onClick={() =>
            pickFile(bannerInputRef, (f) => {
              setBannerFile(f)
              setBannerPreview(URL.createObjectURL(f))
            })
          }
        >
          {currentBanner ? (
            <img src={currentBanner} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-bg-surface" />
          )}
          {/* always-visible camera overlay on banner */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
              <Camera size={18} className="text-white" />
            </div>
          </div>
        </div>

        {/* Avatar — left side, overlapping banner bottom */}
        <div className="px-5 -mt-10">
          <div className="flex items-end gap-3">
            <div className="relative flex-shrink-0">
              <div
                className="rounded-full border-4 border-bg-base cursor-pointer"
                onClick={() =>
                  pickFile(avatarInputRef, (f) => {
                    setAvatarFile(f)
                    setAvatarPreview(URL.createObjectURL(f))
                  })
                }
              >
                <Avatar
                  src={currentAvatar}
                  fallback={profile.display_name}
                  size="xl"
                  isNova={profile.is_nova_plus}
                />
              </div>
              {/* Camera badge */}
              <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-accent flex items-center justify-center border-2 border-bg-base pointer-events-none">
                <Camera size={11} className="text-[#0E0E0E]" />
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                pickFile(avatarInputRef, (f) => {
                  setAvatarFile(f)
                  setAvatarPreview(URL.createObjectURL(f))
                })
              }
              className="mb-1.5 text-accent text-sm font-semibold"
            >
              Düzenle
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-5 space-y-6 pb-12">

        {/* Temel Bilgiler */}
        <section>
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Temel Bilgiler
          </p>
          <div className="bg-bg-surface rounded-2xl overflow-hidden">
            <RowItem
              label="Ad"
              value={profile.display_name}
              onClick={() => navigate('/profil-duzenle/ad')}
            />
            <RowItem
              label="Kullanıcı adı"
              value={`@${profile.username}`}
              onClick={() => navigate('/profil-duzenle/kullanici-adi')}
            />
            <RowItem
              label="Hitaplar"
              onClick={() => navigate('/profil-duzenle/hitaplar')}
              last
            />
          </div>
        </section>

        {/* Hakkında — bio */}
        <section>
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Hakkında
          </p>
          <div className="relative">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
              placeholder="Kendini tanıt..."
              rows={4}
              className={cn(
                'w-full bg-bg-surface rounded-2xl px-4 pt-3 pb-8 text-text-primary text-sm',
                'placeholder:text-text-muted transition-default resize-none',
                'border focus:outline-none',
                bio !== (profile.bio ?? '')
                  ? 'border-accent'
                  : 'border-line focus:border-accent'
              )}
            />
            <span className="absolute bottom-3 right-4 text-text-muted text-xs select-none">
              {bio.length}/{BIO_MAX}
            </span>
          </div>
        </section>

        {/* Ekstralar */}
        <section>
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Ekstralar
          </p>
          <div className="bg-bg-surface rounded-2xl overflow-hidden">
            <RowItem
              label="Bağlantılar"
              icon={<Link2 size={15} className="text-text-muted" />}
              badge={linkCount > 0 ? linkCount : undefined}
              onClick={() => navigate('/profil-duzenle/baglantilar')}
            />
            <RowItem
              label="Konum"
              value={profile.location ?? undefined}
              icon={<MapPin size={15} className="text-text-muted" />}
              onClick={() => navigate('/profil-duzenle/konum')}
            />
            <RowItem
              label="Müzik"
              icon={<Music size={15} className="text-text-muted" />}
              onClick={() => navigate('/profil-duzenle/muzik')}
              last
            />
          </div>
        </section>

      </div>
    </div>
  )
}

// ── Row item ──────────────────────────────────────────────

function RowItem({
  label,
  value,
  icon,
  badge,
  onClick,
  last = false,
}: {
  label: string
  value?: string
  icon?: React.ReactNode
  badge?: number
  onClick: () => void
  last?: boolean
}) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-bg-elevated active:bg-bg-elevated transition-default"
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <div className="flex-1 text-left min-w-0">
          <p className="text-text-muted text-xs leading-none">{label}</p>
          {value !== undefined && (
            <p className="text-text-primary text-sm font-medium mt-1 truncate">{value}</p>
          )}
        </div>
        {badge !== undefined && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-[#0E0E0E] text-xs font-bold flex items-center justify-center">
            {badge}
          </span>
        )}
        <ChevronRight size={16} className="text-text-muted flex-shrink-0" />
      </button>
      {!last && <div className="border-b border-line/50 ml-4" />}
    </>
  )
}
