import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import type { Profile } from '@/types/database'

// ── İlgi alanları ─────────────────────────────────────

const INTERESTS = [
  { id: 'teknoloji', label: 'Teknoloji',  emoji: '💻' },
  { id: 'sanat',     label: 'Sanat',      emoji: '🎨' },
  { id: 'spor',      label: 'Spor',       emoji: '⚽' },
  { id: 'muzik',     label: 'Müzik',      emoji: '🎵' },
  { id: 'oyun',      label: 'Oyun',       emoji: '🎮' },
  { id: 'yemek',     label: 'Yemek',      emoji: '🍔' },
  { id: 'seyahat',   label: 'Seyahat',    emoji: '✈️' },
  { id: 'moda',      label: 'Moda',       emoji: '👗' },
  { id: 'bilim',     label: 'Bilim',      emoji: '🔬' },
  { id: 'film',      label: 'Film & Dizi', emoji: '🎬' },
  { id: 'edebiyat',  label: 'Edebiyat',   emoji: '📚' },
  { id: 'doga',      label: 'Doğa',       emoji: '🌿' },
]

const pageVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -40 },
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set())

  // Önerilen kullanıcılar (en çok takipçili, kendisi hariç)
  const { data: suggested = [] } = useQuery({
    queryKey: ['onboarding-suggested'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, is_verified, is_nova_plus, follower_count')
        .neq('id', user?.id ?? '')
        .order('follower_count', { ascending: false })
        .limit(6)
      return (data ?? []) as Profile[]
    },
    enabled: !!user?.id,
  })

  const toggleInterest = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleFollowToggle = async (profileId: string) => {
    if (!user?.id) return
    setFollowLoading((prev) => new Set(prev).add(profileId))

    const isFollowing = following.has(profileId)
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().match({ follower_id: user.id, following_id: profileId })
        setFollowing((prev) => { const n = new Set(prev); n.delete(profileId); return n })
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: profileId })
        setFollowing((prev) => new Set(prev).add(profileId))
      }
    } catch {
      toast.error('İşlem başarısız')
    } finally {
      setFollowLoading((prev) => { const n = new Set(prev); n.delete(profileId); return n })
    }
  }

  const handleStep1Continue = () => {
    if (selected.size < 1) {
      toast.info('En az bir ilgi alanı seç')
      return
    }
    setStep(2)
  }

  const handleFinish = async () => {
    void queryClient.invalidateQueries({ queryKey: ['feed'] })
    navigate('/ana-sayfa')
  }

  return (
    <div className="min-h-dvh bg-bg-base flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="font-display text-3xl text-text-primary">Orbit</h1>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 px-6 mb-6">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              s === step ? 'w-6 bg-accent' : s < step ? 'w-4 bg-accent/50' : 'w-4 bg-bg-elevated'
            )}
          />
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="px-6 pb-24"
            >
              <h2 className="text-xl font-semibold text-text-primary mb-1">İlgi Alanların</h2>
              <p className="text-text-muted text-sm mb-6">
                Seni en iyi anlatan konuları seç. Feed'ini kişiselleştireceğiz.
              </p>

              <div className="grid grid-cols-3 gap-2.5">
                {INTERESTS.map((item) => {
                  const isSelected = selected.has(item.id)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleInterest(item.id)}
                      className={cn(
                        'relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-150',
                        isSelected
                          ? 'border-accent bg-accent/10 text-text-primary'
                          : 'border-line bg-bg-surface text-text-secondary hover:bg-bg-elevated'
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                          <Check size={10} className="text-bg-base" strokeWidth={3} />
                        </div>
                      )}
                      <span className="text-xl leading-none">{item.emoji}</span>
                      <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="px-6 pb-24"
            >
              <h2 className="text-xl font-semibold text-text-primary mb-1">Kişileri Takip Et</h2>
              <p className="text-text-muted text-sm mb-6">
                Feed'inde görmek istediğin kişileri takip et. İstediğin zaman değiştirebilirsin.
              </p>

              <div className="space-y-3">
                {suggested.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-line bg-bg-surface"
                  >
                    <Avatar
                      src={profile.avatar_url}
                      fallback={profile.display_name}
                      size="md"
                      isNova={profile.is_nova_plus}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary text-sm truncate">{profile.display_name}</p>
                      <p className="text-text-muted text-xs truncate">@{profile.username}</p>
                      {profile.bio && (
                        <p className="text-text-muted text-xs truncate mt-0.5">{profile.bio}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={followLoading.has(profile.id)}
                      onClick={() => void handleFollowToggle(profile.id)}
                      className={cn(
                        'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-default',
                        following.has(profile.id)
                          ? 'bg-bg-overlay border border-line text-text-secondary'
                          : 'bg-accent text-bg-base hover:bg-accent-hover'
                      )}
                    >
                      {followLoading.has(profile.id)
                        ? '...'
                        : following.has(profile.id)
                          ? 'Takip Ediliyor'
                          : 'Takip Et'}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-gradient-to-t from-bg-base to-transparent">
        {step === 1 ? (
          <Button className="w-full" onClick={handleStep1Continue}>
            Devam Et
            <ArrowRight size={16} className="ml-1.5" />
          </Button>
        ) : (
          <div className="space-y-3">
            <Button className="w-full" onClick={() => void handleFinish()}>
              Orbit'e Başla
              <ArrowRight size={16} className="ml-1.5" />
            </Button>
            {following.size === 0 && (
              <button
                type="button"
                onClick={() => void handleFinish()}
                className="w-full text-text-muted text-sm hover:text-text-secondary transition-default"
              >
                Şimdi değil, atla
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
