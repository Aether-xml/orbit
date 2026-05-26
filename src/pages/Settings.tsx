import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, Lock, Mail, Shield, Bell, Trash2, LogOut, Star, UserX, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { BADGES, type BadgeId } from '@/components/ui/Badge'

// ── Schemas ───────────────────────────────────────────

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Mevcut şifreni gir'),
  newPassword:     z.string().min(8, 'En az 8 karakter'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
})
type PasswordForm = z.infer<typeof passwordSchema>

const emailSchema = z.object({
  newEmail: z.string().email('Geçerli bir e-posta gir'),
  password: z.string().min(1, 'Şifreni gir'),
})
type EmailForm = z.infer<typeof emailSchema>


// ── Toggle Switch ─────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none',
        checked ? 'bg-accent' : 'bg-bg-overlay border border-line',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

// ── Settings row ──────────────────────────────────────

function SettingsRow({
  icon,
  label,
  description,
  onClick,
  right,
  danger,
}: {
  icon: React.ReactNode
  label: string
  description?: string
  onClick?: () => void
  right?: React.ReactNode
  danger?: boolean
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 border-b border-line text-left transition-default',
        onClick && 'hover:bg-bg-overlay cursor-pointer',
        danger ? 'text-error' : 'text-text-primary'
      )}
    >
      <span className={cn('flex-shrink-0', danger ? 'text-error' : 'text-text-muted')}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', danger ? 'text-error' : 'text-text-primary')}>{label}</p>
        {description && <p className="text-text-muted text-xs mt-0.5">{description}</p>}
      </div>
      {right ?? (onClick && <ChevronRight size={16} className="text-text-muted flex-shrink-0" />)}
    </Wrapper>
  )
}

// ── Section header ────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 py-2 bg-bg-surface border-b border-line">
      <p className="text-text-muted text-xs font-semibold uppercase tracking-wide">{title}</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────

export default function Settings() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { user, profile, setProfile } = useAuthStore()

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [blockedOpen, setBlockedOpen] = useState(false)
  const [badgeOpen, setBadgeOpen] = useState(false)
  const [privacyLoading, setPrivacyLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // ── Privacy toggle ───────────────────────────────

  const handlePrivacyToggle = async (value: boolean) => {
    if (!user || !profile) return
    setPrivacyLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ is_private: value })
      .eq('id', user.id)

    if (error) {
      toast.error('Güncelleme başarısız')
    } else {
      setProfile({ ...profile, is_private: value })
      toast.success(value ? 'Hesabın gizlendi' : 'Hesabın herkese açıldı')
    }
    setPrivacyLoading(false)
  }

  // ── Logout ───────────────────────────────────────

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    setLoggingOut(false)
  }

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-line flex items-center gap-4 px-4 py-3">
        <button
          type="button"
          onClick={() => profile ? navigate(`/${profile.username}`) : navigate('/ana-sayfa')}
          className="p-2 -ml-2 rounded-full text-text-primary hover:bg-bg-overlay transition-default"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-semibold text-text-primary">Ayarlar</h1>
      </div>

      {/* Account info */}
      {profile && (
        <div className="px-4 py-4 border-b border-line flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-bg-elevated overflow-hidden flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted text-lg font-medium">
                {profile.display_name[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-text-primary">{profile.display_name}</p>
            <p className="text-text-muted text-sm">@{profile.username}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/${profile.username}`)}
            className="ml-auto text-accent text-sm font-medium hover:underline"
          >
            Profili Düzenle
          </button>
        </div>
      )}

      {/* Hesap */}
      <SectionHeader title="Hesap" />
      <SettingsRow
        icon={<Mail size={18} />}
        label="E-posta Değiştir"
        description={user?.email ?? 'E-posta adresini güncelle'}
        onClick={() => setEmailOpen(true)}
      />
      <SettingsRow
        icon={<Lock size={18} />}
        label="Şifre Değiştir"
        description="Hesap şifreni güncelle"
        onClick={() => setPasswordOpen(true)}
      />

      {/* Abonelik */}
      <SectionHeader title="Abonelik" />
      <SettingsRow
        icon={<Star size={18} className={profile?.is_nova_plus ? 'text-accent' : undefined} />}
        label={profile?.is_nova_plus ? 'Nova+ Aktif' : "Nova+'ya Geç"}
        description={profile?.is_nova_plus ? `Abonelik aktif` : '500 karakter, özel rozet ve daha fazlası'}
        onClick={() => navigate('/nova-plus')}
      />
      {profile?.is_nova_plus && (
        <SettingsRow
          icon={<Award size={18} className="text-accent" />}
          label="Rozet Seç"
          description="Profilinde görünecek rozeti belirle"
          onClick={() => setBadgeOpen(true)}
        />
      )}

      {/* Gizlilik */}
      <SectionHeader title="Gizlilik" />
      <SettingsRow
        icon={<Shield size={18} />}
        label="Gizli Hesap"
        description="Sadece takipçilerin gönderilerini görebilir"
        right={
          <ToggleSwitch
            checked={profile?.is_private ?? false}
            onChange={handlePrivacyToggle}
            disabled={privacyLoading}
          />
        }
      />
      <SettingsRow
        icon={<UserX size={18} />}
        label="Engellenenler"
        description="Engellediğin kullanıcıları yönet"
        onClick={() => setBlockedOpen(true)}
      />

      {/* Bildirimler */}
      <SectionHeader title="Bildirimler" />
      <SettingsRow
        icon={<Bell size={18} />}
        label="Bildirim Tercihleri"
        description="Hangi bildirimleri alacağını seç"
        onClick={() => toast.info('Bu özellik yakında eklenecek')}
      />

      {/* Tehlikeli alan */}
      <SectionHeader title="Tehlikeli Alan" />
      <SettingsRow
        icon={<LogOut size={18} />}
        label={loggingOut ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}
        onClick={() => void handleLogout()}
      />
      <SettingsRow
        icon={<Trash2 size={18} />}
        label="Hesabı Sil"
        description="Bu işlem geri alınamaz"
        danger
        onClick={() => setDeleteOpen(true)}
      />

      {/* Password modal */}
      <PasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />

      {/* Email modal */}
      <EmailModal open={emailOpen} onClose={() => setEmailOpen(false)} />

      {/* Delete account modal */}
      <DeleteModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />

      {/* Blocked users modal */}
      <BlockedUsersModal open={blockedOpen} onClose={() => setBlockedOpen(false)} />

      {/* Badge select modal */}
      <BadgeSelectModal open={badgeOpen} onClose={() => setBadgeOpen(false)} />
    </div>
  )
}

// ── Password Modal ────────────────────────────────────

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const onSubmit = async (data: PasswordForm) => {
    if (!user?.email) {
      toast.error('Oturum bilgisi okunamadı')
      return
    }
    setSaving(true)

    // Mevcut şifreyi doğrula
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: data.currentPassword,
    })

    if (verifyError) {
      setSaving(false)
      setError('currentPassword', { message: 'Mevcut şifre hatalı' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: data.newPassword })
    setSaving(false)
    if (error) {
      toast.error('Şifre değiştirilemedi')
    } else {
      toast.success('Şifre güncellendi')
      reset()
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Şifre Değiştir" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
        <Input
          label="Mevcut Şifre"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <Input
          label="Yeni Şifre"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Input
          label="Şifreyi Onayla"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>İptal</Button>
          <Button type="submit" className="flex-1" loading={saving}>Kaydet</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Email Modal ───────────────────────────────────────

function EmailModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  })

  const onSubmit = async (data: EmailForm) => {
    if (!user?.email) {
      toast.error('Oturum bilgisi okunamadı')
      return
    }
    if (data.newEmail.toLowerCase() === user.email.toLowerCase()) {
      setError('newEmail', { message: 'Bu zaten mevcut e-postan' })
      return
    }
    setSaving(true)

    // Şifre ile kimliği doğrula
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: data.password,
    })

    if (verifyError) {
      setSaving(false)
      setError('password', { message: 'Şifre hatalı' })
      return
    }

    const { error } = await supabase.auth.updateUser({ email: data.newEmail })
    setSaving(false)
    if (error) {
      toast.error('E-posta güncellenemedi')
    } else {
      toast.success('Onay bağlantısı yeni e-posta adresine gönderildi')
      reset()
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="E-posta Değiştir" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
        <div className="text-text-muted text-xs">
          Mevcut: <span className="text-text-secondary">{user?.email ?? '—'}</span>
        </div>
        <Input
          label="Yeni E-posta"
          type="email"
          autoComplete="email"
          error={errors.newEmail?.message}
          {...register('newEmail')}
        />
        <Input
          label="Şifren"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <p className="text-text-muted text-xs">
          Onay bağlantısı yeni adresine gönderilecek. Bağlantıya tıklayana kadar değişiklik geçerli olmaz.
        </p>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>İptal</Button>
          <Button type="submit" className="flex-1" loading={saving}>Gönder</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Delete Account Modal ──────────────────────────────

function DeleteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [confirmText, setConfirmText] = useState('')

  const handleDelete = () => {
    if (confirmText !== 'HESABIMI SİL') {
      toast.error('"HESABIMI SİL" yazman gerekiyor')
      return
    }
    toast.error('Hesap silme için destek@orbit.app adresine yazın.')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Hesabı Sil" size="sm">
      <div className="p-5 space-y-4">
        <div className="p-3 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-error text-sm font-medium">Bu işlem geri alınamaz!</p>
          <p className="text-error/70 text-xs mt-1">Tüm gönderilerin, takipçilerin ve verilerinin silinecek.</p>
        </div>
        <Input
          label='Onaylamak için "HESABIMI SİL" yaz'
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>İptal</Button>
          <Button type="button" variant="danger" className="flex-1" onClick={handleDelete}>Sil</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Blocked Users Modal ───────────────────────────────

function BlockedUsersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: blockedUsers = [], isLoading, refetch } = useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data: blockRows } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id)
      const ids = blockRows?.map((r) => r.blocked_id) ?? []
      if (!ids.length) return []
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', ids)
      return profiles ?? []
    },
    enabled: open && !!user?.id,
  })

  const handleUnblock = async (blockedId: string) => {
    if (!user?.id) return
    await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId)
    void refetch()
    void queryClient.invalidateQueries({ queryKey: ['excluded-ids', user.id] })
  }

  return (
    <Modal open={open} onClose={onClose} title="Engellenenler">
      <div className="max-h-[60vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="py-12 text-center">
            <UserX size={32} className="text-text-muted mx-auto mb-3 opacity-60" />
            <p className="text-text-muted text-sm">Engellediğin kimse yok</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {blockedUsers.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-bg-elevated overflow-hidden flex-shrink-0 flex items-center justify-center border border-line">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-text-muted text-sm font-medium">
                      {u.display_name[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{u.display_name}</p>
                  <p className="text-xs text-text-muted truncate">@{u.username}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs py-1 px-2 h-auto"
                  onClick={() => void handleUnblock(u.id)}
                >
                  Engeli Kaldır
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

// ── Badge Select Modal ────────────────────────────────

function BadgeSelectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, profile, setProfile } = useAuthStore()
  const [saving, setSaving] = useState(false)

  const earnedBadgeIds: BadgeId[] = [
    ...(profile?.is_nova_plus ? (['nova-plus'] as BadgeId[]) : []),
    ...(profile?.is_verified ? (['verified'] as BadgeId[]) : []),
    ...((profile?.earned_badges ?? []) as BadgeId[]),
  ].filter((id, index, arr) => id in BADGES && arr.indexOf(id) === index)

  const handleSelect = async (id: BadgeId | null) => {
    if (!user?.id || !profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ selected_badge: id })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      toast.error('Rozet kaydedilemedi')
    } else {
      setProfile({ ...profile, selected_badge: id })
      toast.success(id ? `${BADGES[id].label} rozeti seçildi` : 'Rozet kaldırıldı')
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Rozet Seç" size="sm">
      <div className="p-4 space-y-2">
        <p className="text-text-muted text-xs mb-3">
          Profilinde görünecek rozeti seç. Sadece kazandığın rozetleri seçebilirsin.
        </p>

        {earnedBadgeIds.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-6">Henüz kazanılmış rozet yok</p>
        ) : (
          <div className="space-y-2">
            {/* No badge option */}
            <button
              type="button"
              onClick={() => void handleSelect(null)}
              disabled={saving}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border transition-default text-left',
                profile?.selected_badge === null
                  ? 'border-accent bg-accent-muted'
                  : 'border-line hover:bg-bg-overlay'
              )}
            >
              <span className="w-8 h-8 rounded-full bg-bg-elevated border border-line flex items-center justify-center text-text-muted text-xs">—</span>
              <span className="text-sm text-text-primary font-medium">Rozetsiz</span>
              {profile?.selected_badge === null && (
                <span className="ml-auto text-accent text-xs font-medium">Seçili</span>
              )}
            </button>

            {earnedBadgeIds.map((id) => {
              const badge = BADGES[id]
              const isSelected = profile?.selected_badge === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => void handleSelect(id)}
                  disabled={saving}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-default text-left',
                    isSelected ? 'border-accent bg-accent-muted' : 'border-line hover:bg-bg-overlay'
                  )}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: `${badge.color}20`, border: `1px solid ${badge.color}40` }}
                  >
                    {badge.icon}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{badge.label}</p>
                  </div>
                  {isSelected && (
                    <span className="text-accent text-xs font-medium">Seçili</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
