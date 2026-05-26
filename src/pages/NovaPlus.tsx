import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Star, Zap, Palette, BarChart2, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import Button from '@/components/ui/Button'

const features = [
  { icon: <Zap size={16} />,       title: '500 Karakter',         desc: 'Daha uzun gönderiler paylaş',            free: '280',   nova: '500' },
  { icon: <Crown size={16} />,     title: 'Nova+ Rozeti',         desc: 'Profilinde özel ⭐ rozeti taşı',          free: false,   nova: true  },
  { icon: <Palette size={16} />,   title: 'Profil Rengi',         desc: 'Kullanıcı adı renk özelleştirme',        free: false,   nova: true  },
  { icon: <BarChart2 size={16} />, title: 'Gelişmiş İstatistik',  desc: 'Gönderi görüntüleme ve analitik',        free: false,   nova: true  },
] as const

const plans = [
  { id: 'monthly', label: 'Aylık', price: '₺49', period: '/ay',  badge: null,           priceId: 'price_monthly' },
  { id: 'yearly',  label: 'Yıllık', price: '₺399', period: '/yıl', badge: '%32 tasarruf', priceId: 'price_yearly'  },
] as const

export default function NovaPlus() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuthStore()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      toast.success('Nova+ aboneliğin aktif! Hoş geldin ⭐')
    }
  }, [searchParams])

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      navigate('/giris')
      return
    }
    if (profile?.is_nova_plus) {
      toast.info('Zaten Nova+ üyesisin!')
      return
    }
    setLoadingPlan(priceId)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, userId: user.id, returnUrl: window.location.origin + '/nova-plus?success=1' },
      })
      if (error || !data?.url) {
        toast.error('Ödeme sayfası açılamadı')
        return
      }
      window.location.href = data.url as string
    } catch {
      toast.error('Ödeme sayfası açılamadı')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-dvh pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-line flex items-center gap-4 px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full text-text-primary hover:bg-bg-overlay transition-default"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-semibold text-text-primary">Nova+</h1>
      </div>

      {/* Hero — flat surface, premium feel via type scale & spacing */}
      <div className="bg-bg-surface border-b border-line px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-full px-4 py-1.5 mb-8">
          <Star size={14} className="text-accent fill-accent" />
          <span className="text-accent text-sm font-semibold tracking-wide">Nova+</span>
        </div>
        <h2 className="font-display text-text-primary mb-5 text-5xl leading-[1.05] tracking-tight">
          Orbit'in tam<br />gücünü aç
        </h2>
        <p className="text-text-secondary text-base max-w-xs mx-auto leading-relaxed">
          Daha büyük ifade özgürlüğü, özel özellikler ve Orbit topluluğunun kalbinde bir yer.
        </p>
      </div>

      {/* Feature comparison */}
      <div className="px-4 py-6">
        <div className="grid grid-cols-3 text-xs font-semibold text-text-muted mb-2 px-2">
          <span>Özellik</span>
          <span className="text-center">Ücretsiz</span>
          <span className="text-center text-accent">Nova+</span>
        </div>
        <div className="rounded-xl border border-line overflow-hidden">
          {features.map((f, i) => (
            <div key={i} className={cn('grid grid-cols-3 items-center px-3 py-3', i < features.length - 1 && 'border-b border-line')}>
              <div className="flex items-center gap-2">
                <span className="text-text-muted flex-shrink-0">{f.icon}</span>
                <div>
                  <p className="text-text-primary text-xs font-medium">{f.title}</p>
                  <p className="text-text-muted text-[10px] leading-tight">{f.desc}</p>
                </div>
              </div>
              <div className="flex justify-center">
                {typeof f.free === 'string' ? (
                  <span className="text-text-secondary text-xs">{f.free}</span>
                ) : (
                  <span className="text-error text-sm">✗</span>
                )}
              </div>
              <div className="flex justify-center">
                {typeof f.nova === 'string' ? (
                  <span className="text-accent text-xs font-semibold">{f.nova}</span>
                ) : (
                  <Check size={15} className="text-accent" strokeWidth={2.5} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="px-4 pb-6 space-y-3">
        <h3 className="font-semibold text-text-primary text-center mb-4">Plan Seç</h3>
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              'relative rounded-xl border p-4',
              plan.id === 'yearly' ? 'border-accent bg-accent/5' : 'border-line bg-bg-elevated'
            )}
          >
            {plan.badge && (
              <span className="absolute -top-2.5 left-4 bg-accent text-bg-base text-[10px] font-bold px-2 py-0.5 rounded-full">
                {plan.badge}
              </span>
            )}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-text-primary">{plan.label}</p>
                <p className="text-text-muted text-xs">Tüm Nova+ özellikleri</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-text-primary">{plan.price}</span>
                <span className="text-text-muted text-xs">{plan.period}</span>
              </div>
            </div>
            <Button
              className="w-full"
              variant={plan.id === 'yearly' ? 'primary' : 'outline'}
              onClick={() => void handleSubscribe(plan.priceId)}
              disabled={!!profile?.is_nova_plus || !!loadingPlan}
              loading={loadingPlan === plan.priceId}
            >
              {profile?.is_nova_plus ? '✓ Aktif Abonelik' : `${plan.label} Başla`}
            </Button>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-text-muted text-xs text-center px-6">
        İstediğin zaman iptal edebilirsin. Stripe ile güvenli ödeme.
      </p>
    </div>
  )
}
