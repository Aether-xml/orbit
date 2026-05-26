import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AtSign, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import Button from '@/components/ui/Button'
import type { Profile } from '@/types/database'

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken'

export default function GoogleSetup() {
  const navigate = useNavigate()
  const { user, profile, setProfile } = useAuthStore()

  const googleAvatarUrl = (user?.user_metadata?.avatar_url ?? null) as string | null

  const [username, setUsername] = useState(profile?.username ?? '')
  const [useGooglePhoto, setUseGooglePhoto] = useState(true)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [isSaving, setIsSaving] = useState(false)

  // Reset username when profile loads
  useEffect(() => {
    if (profile?.username && !username) setUsername(profile.username)
  }, [profile?.username])

  const checkUsername = useCallback(
    async (val: string) => {
      if (val.length < 3 || !/^[a-z0-9_]+$/.test(val)) {
        setUsernameStatus('idle')
        return
      }
      // Current username is already ours — no need to check
      if (val === profile?.username) {
        setUsernameStatus('available')
        return
      }
      setUsernameStatus('checking')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', val)
          .limit(1)
          .abortSignal(controller.signal)
        clearTimeout(timeout)
        if (error) { setUsernameStatus('idle'); return }
        setUsernameStatus(data.length > 0 ? 'taken' : 'available')
      } catch {
        clearTimeout(timeout)
        setUsernameStatus('idle')
      }
    },
    [profile?.username]
  )

  useEffect(() => {
    const timer = setTimeout(() => void checkUsername(username), 700)
    return () => clearTimeout(timer)
  }, [username, checkUsername])

  const handleSave = async (skip: boolean) => {
    if (!user?.id || !profile) return

    if (!skip) {
      if (usernameStatus === 'taken') { toast.error('Bu kullanıcı adı alınmış.'); return }
      if (username.length < 3 || !/^[a-z0-9_]+$/.test(username)) {
        toast.error('Geçerli bir kullanıcı adı gir.')
        return
      }
    }

    setIsSaving(true)

    const updates: Partial<Profile> = { google_setup_done: true }

    if (!skip) {
      if (username !== profile.username) {
        updates.username = username
        updates.display_name = username
      }
      if (!useGooglePhoto) {
        updates.avatar_url = null
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    setIsSaving(false)

    if (error) {
      toast.error('Ayarlar kaydedilemedi.')
      return
    }

    setProfile({ ...profile, ...updates })
    navigate('/onboarding')
  }

  return (
    <div className="min-h-dvh bg-bg-base flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Logo */}
        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl text-text-primary">Orbit</h1>
          <p className="text-text-secondary text-sm">Profilini kişiselleştir</p>
        </div>

        {/* Google photo */}
        {googleAvatarUrl && (
          <div className="space-y-3">
            <p className="text-text-secondary text-sm font-medium">Profil fotoğrafı</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setUseGooglePhoto(true)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-default',
                  useGooglePhoto ? 'border-accent bg-accent/5' : 'border-line bg-bg-surface hover:bg-bg-elevated'
                )}
              >
                <div className="relative">
                  <img
                    src={googleAvatarUrl}
                    alt="Google profil"
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  {useGooglePhoto && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                      <Check size={10} className="text-bg-base" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-text-secondary">Google'dan al</span>
              </button>

              <button
                type="button"
                onClick={() => setUseGooglePhoto(false)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-default',
                  !useGooglePhoto ? 'border-accent bg-accent/5' : 'border-line bg-bg-surface hover:bg-bg-elevated'
                )}
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-bg-elevated border border-line flex items-center justify-center text-2xl font-bold text-text-muted">
                    {profile?.display_name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  {!useGooglePhoto && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                      <Check size={10} className="text-bg-base" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-text-secondary">Şimdilik atla</span>
              </button>
            </div>
          </div>
        )}

        {/* Username */}
        <div className="space-y-1.5">
          <label htmlFor="gs-username" className="text-text-secondary text-sm font-medium">
            Kullanıcı Adı
          </label>
          <div className="relative">
            <AtSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              id="gs-username"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={30}
              value={username}
              onKeyDown={(e) => {
                const allowed = /^[a-z0-9_]$/
                if (e.key.length === 1 && !allowed.test(e.key)) e.preventDefault()
              }}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full bg-bg-surface border border-line rounded-lg pl-9 pr-9 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:border-accent focus:outline-none transition-default"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === 'checking' && (
                <Loader2 size={14} className="text-text-muted animate-spin" />
              )}
              {usernameStatus === 'available' && (
                <Check size={14} className="text-success" />
              )}
              {usernameStatus === 'taken' && (
                <X size={14} className="text-error" />
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {usernameStatus === 'taken' && (
              <motion.p
                key="taken"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="text-error text-xs"
              >
                Bu kullanıcı adı alınmış.
              </motion.p>
            )}
            {usernameStatus === 'available' && (
              <motion.p
                key="available"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="text-success text-xs"
              >
                Kullanıcı adı müsait!
              </motion.p>
            )}
          </AnimatePresence>

          <p className="text-text-muted text-xs">Sadece küçük harf, rakam ve alt çizgi (_)</p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            className="w-full"
            onClick={() => void handleSave(false)}
            loading={isSaving}
            disabled={usernameStatus === 'taken' || usernameStatus === 'checking'}
          >
            İlerle
          </Button>
          <button
            type="button"
            onClick={() => void handleSave(true)}
            disabled={isSaving}
            className="w-full text-text-muted text-sm hover:text-text-secondary transition-default disabled:opacity-50"
          >
            Atla, varsayılanlarla devam et
          </button>
        </div>
      </motion.div>
    </div>
  )
}
