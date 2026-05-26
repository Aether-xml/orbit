import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, AtSign, Check, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/store/uiStore'
import TurnstileWidget from '@/components/ui/TurnstileWidget'

const registerSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  username: z
    .string()
    .min(3, 'En az 3 karakter')
    .max(30, 'En fazla 30 karakter')
    .regex(/^[a-z0-9_]+$/, 'Sadece küçük harf, rakam ve alt çizgi'),
  password: z.string().min(8, 'En az 8 karakter'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken'

export default function Register() {
  const navigate = useNavigate()
  const { loginWithGoogle } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const watchedUsername = watch('username', '')

  // Kullanıcı adı müsaitlik kontrolü — debounced
  const checkUsername = useCallback(async (username: string) => {
    if (username.length < 3 || !/^[a-z0-9_]+$/.test(username)) { setUsernameStatus('idle'); return }
    setUsernameStatus('checking')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .limit(1)
        .abortSignal(controller.signal)

      clearTimeout(timeout)
      if (error) { setUsernameStatus('idle'); return }
      setUsernameStatus(data.length > 0 ? 'taken' : 'available')
    } catch {
      clearTimeout(timeout)
      setUsernameStatus('idle')
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => checkUsername(watchedUsername), 700)
    return () => clearTimeout(timer)
  }, [watchedUsername, checkUsername])

  const onSubmit = async (data: RegisterForm) => {
    if (usernameStatus === 'taken') {
      toast.error('Bu kullanıcı adı alınmış.')
      return
    }
    if (!turnstileToken) {
      toast.error('Lütfen robot kontrolünü tamamla.')
      return
    }
    setIsLoading(true)

    // Turnstile token doğrulama
    const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-turnstile', {
      body: { token: turnstileToken },
    })
    if (verifyError || !verifyData?.success) {
      toast.error('Robot kontrolü başarısız. Lütfen tekrar dene.')
      setTurnstileToken(null)
      setIsLoading(false)
      return
    }

    // 1. Auth kaydı
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { username: data.username } },
    })

    if (signUpError) {
      toast.error(
        signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')
          ? 'Bu e-posta zaten kayıtlı.'
          : 'Kayıt başarısız. Tekrar dene.'
      )
      setIsLoading(false)
      return
    }

    // Email onayı gerekiyorsa kullanıcıyı bilgilendir
    if (!authData.session) {
      toast.info('E-postana onay linki gönderdik. Onayladıktan sonra giriş yapabilirsin.')
      setIsLoading(false)
      navigate('/giris')
      return
    }

    // 2. Profil trigger'ı bazen yavaş çalışır — username'i güncelle
    if (authData.user) {
      await new Promise((r) => setTimeout(r, 500))
      await supabase
        .from('profiles')
        .update({ username: data.username, display_name: data.username })
        .eq('id', authData.user.id)
    }

    toast.success('Hoş geldin!')
    navigate('/onboarding')
    setIsLoading(false)
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
          <Link to="/">
            <h1 className="font-display text-4xl text-text-primary">Orbit</h1>
          </Link>
          <p className="text-text-secondary text-sm">Topluluğa katıl</p>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 border border-line bg-bg-surface hover:bg-bg-elevated text-text-primary text-sm font-medium py-3 rounded-lg transition-default"
        >
          <GoogleIcon />
          Google ile Kayıt Ol
        </button>

        {/* Ayraç */}
        <div className="flex items-center gap-4">
          <div className="flex-1 border-t border-line" />
          <span className="text-text-muted text-xs">veya</span>
          <div className="flex-1 border-t border-line" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* E-posta */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-text-secondary text-sm">E-posta</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ornek@eposta.com"
                {...register('email')}
                className="w-full bg-bg-surface border border-line rounded-lg pl-9 pr-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:border-accent transition-default"
              />
            </div>
            {errors.email && (
              <AnimatePresence>
                <motion.p
                  key="email-error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="text-error text-xs"
                >
                  {errors.email.message}
                </motion.p>
              </AnimatePresence>
            )}
          </div>

          {/* Kullanıcı adı */}
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-text-secondary text-sm">Kullanıcı Adı</label>
            <div className="relative">
              <AtSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="kullanici_adi"
                maxLength={30}
                onKeyDown={(e) => {
                  const allowed = /^[a-z0-9_]$/
                  if (e.key.length === 1 && !allowed.test(e.key)) e.preventDefault()
                }}
                {...register('username')}
                className="w-full bg-bg-surface border border-line rounded-lg pl-9 pr-9 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:border-accent transition-default"
              />
              {/* Durum ikonu */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && (
                  <Loader2 size={14} className="text-text-muted animate-spin" />
                )}
                {usernameStatus === 'available' && !errors.username && (
                  <Check size={14} className="text-success" />
                )}
                {(usernameStatus === 'taken' || !!errors.username) && (
                  <X size={14} className="text-error" />
                )}
              </div>
            </div>
            <AnimatePresence>
              {errors.username && (
                <motion.p
                  key="username-error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="text-error text-xs"
                >
                  {errors.username.message}
                </motion.p>
              )}
              {usernameStatus === 'taken' && !errors.username && (
                <motion.p
                  key="username-taken"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="text-error text-xs"
                >
                  Bu kullanıcı adı alınmış.
                </motion.p>
              )}
              {usernameStatus === 'available' && !errors.username && (
                <motion.p
                  key="username-available"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="text-success text-xs"
                >
                  Kullanıcı adı müsait!
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Şifre */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-text-secondary text-sm">Şifre</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="En az 8 karakter"
                {...register('password')}
                className="w-full bg-bg-surface border border-line rounded-lg pl-9 pr-10 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:border-accent transition-default"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-default"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && (
              <AnimatePresence>
                <motion.p
                  key="password-error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="text-error text-xs"
                >
                  {errors.password.message}
                </motion.p>
              </AnimatePresence>
            )}
          </div>

          {/* Şifreyi Onayla */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-text-secondary text-sm">Şifreyi Onayla</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Şifreni tekrar gir"
                {...register('confirmPassword')}
                className="w-full bg-bg-surface border border-line rounded-lg pl-9 pr-10 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:border-accent transition-default"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-default"
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <AnimatePresence>
                <motion.p
                  key="confirm-error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="text-error text-xs"
                >
                  {errors.confirmPassword.message}
                </motion.p>
              </AnimatePresence>
            )}
          </div>

          {/* Turnstile */}
          <TurnstileWidget
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => { setTurnstileToken(null); toast.error('Robot kontrolü yüklenemedi.') }}
          />

          <button
            type="submit"
            disabled={isLoading || usernameStatus === 'taken' || !turnstileToken}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-text-inverse font-semibold py-3 rounded-lg transition-default"
          >
            {isLoading ? 'Kayıt olunuyor…' : 'Kayıt Ol'}
          </button>
        </form>

        <p className="text-center text-text-muted text-sm">
          Zaten hesabın var mı?{' '}
          <Link to="/giris" className="text-accent hover:underline">
            Giriş yap
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
