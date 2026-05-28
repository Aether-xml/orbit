import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { Profile } from '@/types/database'

type FieldConfig = {
  title: string
  label: string
  placeholder: string
  dbKey: keyof { display_name: string; username: string; location: string; website: string }
  maxLength: number
  hint?: string
  stub?: boolean
}

const FIELDS: Record<string, FieldConfig> = {
  ad: {
    title: 'Ad',
    label: 'Görünen adın',
    placeholder: 'Adın nedir?',
    dbKey: 'display_name',
    maxLength: 50,
  },
  'kullanici-adi': {
    title: 'Kullanıcı Adı',
    label: 'Kullanıcı adın',
    placeholder: 'kullanici_adi',
    dbKey: 'username',
    maxLength: 30,
    hint: 'Yalnızca harf, rakam ve alt çizgi kullanılabilir.',
  },
  hitaplar: {
    title: 'Hitaplar',
    label: 'Hitaplarını gir',
    placeholder: 'örn. o/onun, ben/benim',
    dbKey: 'display_name',
    maxLength: 30,
    stub: true,
    hint: 'Bu özellik yakında kullanıma girecek.',
  },
  baglantilar: {
    title: 'Bağlantılar',
    label: 'Web sitesi URL',
    placeholder: 'https://siteni.com',
    dbKey: 'website',
    maxLength: 100,
  },
  konum: {
    title: 'Konum',
    label: 'Konumun',
    placeholder: 'Şehir, Ülke',
    dbKey: 'location',
    maxLength: 30,
  },
  muzik: {
    title: 'Müzik',
    label: 'Favori müziğin',
    placeholder: 'Sanatçı veya şarkı adı',
    dbKey: 'display_name',
    maxLength: 50,
    stub: true,
    hint: 'Bu özellik yakında kullanıma girecek.',
  },
}

export default function EditProfileField() {
  const { field } = useParams<{ field: string }>()
  const navigate = useNavigate()
  const { user, profile, setProfile } = useAuthStore()
  const queryClient = useQueryClient()

  const config = field ? FIELDS[field] : undefined

  const getInitialValue = () => {
    if (!profile || !config || config.stub) return ''
    const key = config.dbKey
    if (key === 'display_name') return profile.display_name
    if (key === 'username') return profile.username
    if (key === 'location') return profile.location ?? ''
    if (key === 'website') return profile.website ?? ''
    return ''
  }

  const [value, setValue] = useState(getInitialValue)
  const [saving, setSaving] = useState(false)

  if (!config) {
    navigate(-1)
    return null
  }

  const initialValue = getInitialValue()
  const hasChanges = !config.stub && value.trim() !== initialValue

  const handleSave = async () => {
    if (!user || !profile || !hasChanges || saving) return
    setSaving(true)
    try {
      const trimmed = value.trim()
      const nullable = trimmed || null
      const update: Partial<Profile> = {}
      if (config.dbKey === 'display_name') update.display_name = trimmed
      else if (config.dbKey === 'username') update.username = trimmed
      else if (config.dbKey === 'location') update.location = nullable
      else if (config.dbKey === 'website') update.website = nullable

      const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
      if (error) {
        toast.error('Kaydedilemedi')
      } else {
        setProfile({ ...profile, ...update })
        void queryClient.invalidateQueries({ queryKey: ['profile'] })
        toast.success('Güncellendi')
        navigate(-1)
      }
    } catch {
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg-base">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur-md border-b border-line h-14 flex items-center px-4 gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-bg-overlay transition-default text-text-primary flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="flex-1 text-center font-semibold text-text-primary">{config.title}</span>
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

      <div className="px-4 pt-6 space-y-4">
        <div className="space-y-1.5">
          <label className="block text-text-muted text-xs font-semibold uppercase tracking-wider">
            {config.label}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, config.maxLength))}
            placeholder={config.placeholder}
            disabled={config.stub}
            autoFocus={!config.stub}
            className={cn(
              'w-full bg-bg-surface rounded-xl px-4 py-3.5 text-text-primary text-sm',
              'placeholder:text-text-muted transition-default',
              'border focus:outline-none',
              config.stub
                ? 'border-line opacity-50 cursor-not-allowed'
                : value !== initialValue
                ? 'border-accent'
                : 'border-line focus:border-accent'
            )}
          />
          <div className="flex items-start justify-between gap-2">
            {config.hint && (
              <p className="text-text-muted text-xs leading-relaxed">{config.hint}</p>
            )}
            {!config.stub && (
              <p className="text-text-muted text-xs ml-auto flex-shrink-0">
                {value.length}/{config.maxLength}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
