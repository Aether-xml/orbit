import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/store/uiStore'

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
  const { loginWithGoogle } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      toast.error(
        error.message.includes('Invalid login credentials')
          ? 'E-posta veya şifre hatalı.'
          : 'Giriş yapılamadı. Tekrar dene.'
      )
    } else {
      navigate('/ana-sayfa')
    }
    setIsLoading(false)
  }

  const handleForgotPassword = async () => {
    const email = (document.getElementById('email') as HTMLInputElement)?.value
    if (!email) { toast.error('Önce e-posta adresini gir.'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/sifre-sifirla`,
    })
    if (error) toast.error('Şifre sıfırlama e-postası gönderilemedi.')
    else toast.success('Şifre sıfırlama bağlantısı e-postana gönderildi.')
  }

  return (
    <div className="min-h-dvh bg-bg-base flex items-center justify-center px-4">
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
          <p className="text-text-secondary text-sm">Tekrar hoş geldin</p>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 border border-line bg-bg-surface hover:bg-bg-elevated text-text-primary text-sm font-medium py-3 rounded-lg transition-default"
        >
          <GoogleIcon />
          Google ile Giriş Yap
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
              <p className="text-error text-xs">{errors.email.message}</p>
            )}
          </div>

          {/* Şifre */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-text-secondary text-sm">Şifre</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-accent text-xs hover:underline"
              >
                Şifremi unuttum
              </button>
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
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
              <p className="text-error text-xs">{errors.password.message}</p>
            )}
          </div>

          {/* Giriş butonu */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-text-inverse font-semibold py-3 rounded-lg transition-default"
          >
            {isLoading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>

        {/* Kayıt linki */}
        <p className="text-center text-text-muted text-sm">
          Hesabın yok mu?{' '}
          <Link to="/kayit" className="text-accent hover:underline">
            Kayıt ol
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
