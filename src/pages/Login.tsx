import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { signInWithEmail, signInWithGoogle } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/store/uiStore'
import { parseDbError } from '@/lib/utils'
import { useRedirectIfAuthenticated } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-posta zorunludur')
    .email('Geçerli bir e-posta adresi girin'),
  password: z
    .string()
    .min(1, 'Şifre zorunludur')
    .min(6, 'Şifre en az 6 karakter olmalıdır'),
})

type LoginFormData = z.infer<typeof loginSchema>

export const Login = () => {
  useRedirectIfAuthenticated()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await signInWithEmail(data.email, data.password)
      navigate('/ana-sayfa', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      if (message.includes('Invalid login credentials')) {
        toast.error('E-posta veya şifre hatalı.')
      } else {
        toast.error(parseDbError(message))
      }
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle()
    } catch {
      toast.error('Google ile giriş yapılamadı.')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-[400px]"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-display text-4xl text-[var(--accent)] italic">
            Orbit
          </span>
          <p className="mt-2 text-[var(--text-muted)] text-sm">
            Hoş geldin 🪐
          </p>
        </div>

        {/* Form Kartı */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 space-y-4">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Giriş Yap
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              type="email"
              label="E-posta"
              placeholder="ornek@mail.com"
              autoComplete="email"
              leftIcon={<Mail size={16} />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              type={showPassword ? 'text' : 'password'}
              label="Şifre"
              placeholder="••••••"
              autoComplete="current-password"
              leftIcon={<Lock size={16} />}
              rightIcon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              onRightIconClick={() => setShowPassword((v) => !v)}
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex justify-end">
              <Link
                to="/sifremi-unuttum"
                className="text-sm text-[var(--accent)] hover:underline"
              >
                Şifremi unuttum
              </Link>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
            >
              Giriş Yap
            </Button>
          </form>

          {/* Ayraç */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)]">veya</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Google */}
          <Button
            variant="outline"
            fullWidth
            size="lg"
            onClick={handleGoogleLogin}
            leftIcon={<GoogleIcon />}
          >
            Google ile Giriş Yap
          </Button>
        </div>

        {/* Kayıt linki */}
        <p className="text-center mt-5 text-sm text-[var(--text-muted)]">
          Hesabın yok mu?{' '}
          <Link
            to="/kayit"
            className="text-[var(--accent)] font-medium hover:underline"
          >
            Kayıt ol
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)