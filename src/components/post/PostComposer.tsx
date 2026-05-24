import { useState, useRef, useCallback } from 'react'
import { Image, Video, BarChart2, X, Smile } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useCreatePost } from '@/hooks/usePosts'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/store/uiStore'
import type { PostWithProfile } from '@/hooks/usePosts'

interface PostComposerProps {
  replyTo?: PostWithProfile
  onSuccess?: () => void
  autoFocus?: boolean
  placeholder?: string
}

interface MediaPreview {
  file: File
  preview: string
  type: 'image' | 'video'
}

const MAX_IMAGES_FREE = 4
const MAX_IMAGES_NOVA = 10

export const PostComposer = ({
  replyTo,
  onSuccess,
  autoFocus = false,
  placeholder,
}: PostComposerProps) => {
  const profile = useAuthStore((s) => s.profile)
  const [content, setContent] = useState('')
  const [media, setMedia] = useState<MediaPreview[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutateAsync: createPost, isPending } = useCreatePost()

  const maxChars = profile?.is_nova_plus ? 500 : 280
  const maxMedia = profile?.is_nova_plus ? MAX_IMAGES_NOVA : MAX_IMAGES_FREE
  const charCount = content.length
  const isOverLimit = charCount > maxChars
  const canSubmit = content.trim().length > 0 && !isOverLimit && !isPending && !isUploading

  // Textarea otomatik yükseklik
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 300)}px`
  }

  // Medya seç
  const handleMediaSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (!files.length) return

      const remaining = maxMedia - media.length
      const selected = files.slice(0, remaining)

      if (files.length > remaining) {
        toast.warning(
          `En fazla ${maxMedia} medya ekleyebilirsiniz.${
            !profile?.is_nova_plus ? ' Nova+ ile daha fazla ekle.' : ''
          }`
        )
      }

      const previews: MediaPreview[] = selected.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith('video') ? 'video' : 'image',
      }))

      setMedia((prev) => [...prev, ...previews])
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [media.length, maxMedia, profile?.is_nova_plus]
  )

  const removeMedia = (index: number) => {
    setMedia((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // Medya Supabase Storage'a yükle
  const uploadMedia = async (): Promise<{
    urls: string[]
    types: string[]
  }> => {
    if (media.length === 0) return { urls: [], types: [] }

    const uploads = await Promise.all(
      media.map(async (m) => {
        const ext = m.file.name.split('.').pop() ?? 'jpg'
        const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error } = await supabase.storage
          .from('media')
          .upload(path, m.file, { cacheControl: '3600', upsert: false })

        if (error) throw error

        const { data } = supabase.storage.from('media').getPublicUrl(path)
        return { url: data.publicUrl, type: m.type }
      })
    )

    return {
      urls: uploads.map((u) => u.url),
      types: uploads.map((u) => u.type),
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit) return

    try {
      setIsUploading(true)
      const { urls, types } = await uploadMedia()
      setIsUploading(false)

      await createPost({
        content: content.trim(),
        mediaUrls: urls,
        mediaTypes: types,
        replyToId: replyTo?.id,
      })

      // Temizle
      setContent('')
      setMedia([])
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      onSuccess?.()
    } catch (err) {
      setIsUploading(false)
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      toast.error(message)
    }
  }

  if (!profile) return null

  const defaultPlaceholder = replyTo
    ? `@${replyTo.profiles.username}'e yanıtla...`
    : 'Yörüngene ne paylaşıyorsun?'

  return (
    <div className="p-4 border-b border-[var(--border)]">
      {/* Yanıtlanıyor gösterimi */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-3 text-xs text-[var(--text-muted)]">
          <span>↩</span>
          <span>
            <strong className="text-[var(--text-secondary)]">
              @{replyTo.profiles.username}
            </strong>{' '}
            kullanıcısına yanıt veriyorsun
          </span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar
          src={profile.avatar_url}
          fallback={profile.display_name}
          size="md"
          isNova={profile.is_nova_plus}
          className="shrink-0 mt-0.5"
        />

        {/* İçerik alanı */}
        <div className="flex-1 min-w-0">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder={placeholder ?? defaultPlaceholder}
            autoFocus={autoFocus}
            rows={replyTo ? 2 : 3}
            className={cn(
              'w-full bg-transparent',
              'text-[var(--text-primary)] text-sm',
              'placeholder:text-[var(--text-muted)]',
              'resize-none outline-none',
              'leading-relaxed',
              'min-h-[60px] max-h-[300px]',
              'transition-colors duration-[var(--transition)]'
            )}
          />

          {/* Medya önizleme */}
          {media.length > 0 && (
            <MediaPreviewGrid media={media} onRemove={removeMedia} />
          )}

          {/* Alt araç çubuğu */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
            {/* Sol: Araçlar */}
            <div className="flex items-center gap-1">
              {/* Medya ekle */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleMediaSelect}
                disabled={media.length >= maxMedia}
              />
              <ToolButton
                icon={<Image size={18} />}
                label="Fotoğraf/video ekle"
                onClick={() => fileInputRef.current?.click()}
                disabled={media.length >= maxMedia}
              />
            </div>

            {/* Sağ: Karakter sayacı + Paylaş */}
            <div className="flex items-center gap-3">
              {/* Karakter sayacı */}
              {charCount > 0 && (
                <div className="flex items-center gap-2">
                  {/* Dairesel göstergeg */}
                  <CharCircle current={charCount} max={maxChars} />
                  {isOverLimit && (
                    <span className="text-xs text-[var(--error)]">
                      -{charCount - maxChars}
                    </span>
                  )}
                </div>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={!canSubmit}
                isLoading={isPending || isUploading}
              >
                {replyTo ? 'Yanıtla' : 'Paylaş'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Medya Önizleme Grid ───────────────────────────────────
const MediaPreviewGrid = ({
  media,
  onRemove,
}: {
  media: { preview: string; type: 'image' | 'video' }[]
  onRemove: (index: number) => void
}) => (
  <div
    className={cn(
      'grid gap-2 mt-2 rounded-[var(--radius-lg)] overflow-hidden',
      media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
    )}
  >
    {media.map((m, i) => (
      <div key={i} className="relative group aspect-square bg-[var(--bg-elevated)] rounded-[var(--radius-md)] overflow-hidden">
        {m.type === 'video' ? (
          <video
            src={m.preview}
            className="w-full h-full object-cover"
            muted
          />
        ) : (
          <img
            src={m.preview}
            alt={`Önizleme ${i + 1}`}
            className="w-full h-full object-cover"
          />
        )}
        <button
          onClick={() => onRemove(i)}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
        >
          <X size={12} />
        </button>
      </div>
    ))}
  </div>
)

// ── Araç Butonu ───────────────────────────────────────────
const ToolButton = ({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={cn(
      'p-2 rounded-[var(--radius-full)]',
      'text-[var(--accent)]',
      'hover:bg-[var(--accent-muted)]',
      'transition-colors duration-[var(--transition)]',
      'disabled:opacity-30 disabled:cursor-not-allowed'
    )}
  >
    {icon}
  </button>
)

// ── Dairesel Karakter Göstergesi ──────────────────────────
const CharCircle = ({ current, max }: { current: number; max: number }) => {
  const pct = Math.min(current / max, 1)
  const isNearLimit = current > max * 0.8
  const isOver = current > max
  const size = 24
  const strokeWidth = 2.5
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const dash = circumference * pct

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={
          isOver
            ? 'var(--error)'
            : isNearLimit
            ? 'var(--warning)'
            : 'var(--accent)'
        }
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.15s ease' }}
      />
    </svg>
  )
}