import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ImageIcon, X, BarChart2, Quote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { uploadFile, uniquePath } from '@/lib/upload'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { PostWithAuthor } from '@/types/database'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'

type PostComposerProps = {
  onPost?: () => void
  placeholder?: string
  replyToId?: string
  quotePostId?: string
  quotePost?: PostWithAuthor
}

export default function PostComposer({
  onPost,
  placeholder = 'Ne düşünüyorsun?',
  replyToId,
  quotePostId,
  quotePost,
}: PostComposerProps) {
  const { user, profile } = useAuthStore()
  const queryClient = useQueryClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_IMAGES = profile?.is_nova_plus ? 10 : 4

  const [content, setContent] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Poll state
  const [pollOpen, setPollOpen] = useState(false)
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [pollDuration, setPollDuration] = useState(24)

  const LIMIT = profile?.is_nova_plus ? 500 : 280
  const remaining = LIMIT - content.length
  const isOverLimit = remaining < 0
  const isEmpty = content.trim().length === 0 && images.length === 0

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const slots = MAX_IMAGES - images.length
    const selected = files.slice(0, slots)
    setImages((prev) => [...prev, ...selected])
    setPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (i: number) => {
    const url = previews[i]
    if (url) URL.revokeObjectURL(url)
    setImages((prev) => prev.filter((_, idx) => idx !== i))
    setPreviews((prev) => prev.filter((_, idx) => idx !== i))
  }

  const togglePoll = () => {
    if (images.length > 0) return
    setPollOpen((v) => !v)
  }

  const addPollOption = () => {
    if (pollOptions.length >= 4) return
    setPollOptions((prev) => [...prev, ''])
  }

  const removePollOption = (i: number) => {
    if (pollOptions.length <= 2) return
    setPollOptions((prev) => prev.filter((_, idx) => idx !== i))
  }

  const updatePollOption = (i: number, value: string) => {
    setPollOptions((prev) => prev.map((opt, idx) => (idx === i ? value : opt)))
  }

  const handleSubmit = async () => {
    if (isEmpty || isOverLimit || isSubmitting || !user) return
    setIsSubmitting(true)

    let media_urls: string[] = []

    if (images.length > 0) {
      try {
        media_urls = await Promise.all(
          images.map((file) => uploadFile('post-images', file, uniquePath(user.id, file)))
        )
      } catch {
        toast.error('Resim yüklenemedi')
        setIsSubmitting(false)
        return
      }
    }

    const poll_data =
      pollOpen && pollOptions.every((o) => o.trim())
        ? {
            question: content.trim(),
            options: pollOptions
              .filter((o) => o.trim())
              .map((text, id) => ({ id: String(id), text, vote_count: 0 })),
            ends_at: new Date(Date.now() + pollDuration * 3600 * 1000).toISOString(),
            allows_multiple: false,
          }
        : null

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content.trim(),
      media_urls,
      ...(replyToId ? { reply_to_id: replyToId } : {}),
      ...(quotePostId ? { quote_of_id: quotePostId } : {}),
      ...(poll_data ? { poll_data } : {}),
    })

    if (error) {
      toast.error('Gönderi oluşturulamadı')
    } else {
      setContent('')
      previews.forEach((u) => URL.revokeObjectURL(u))
      setImages([])
      setPreviews([])
      setPollOpen(false)
      setPollOptions(['', ''])
      setPollDuration(24)
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
      if (replyToId) void queryClient.invalidateQueries({ queryKey: ['comments', replyToId] })
      onPost?.()
    }

    setIsSubmitting(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSubmit()
  }

  if (!profile) return null

  return (
    <div className="border-b border-line p-4">
      <div className="flex gap-3">
        <Avatar src={profile.avatar_url} fallback={profile.display_name} size="md" isNova={profile.is_nova_plus} />

        <div className="flex-1 min-w-0 space-y-3">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={3}
            className="w-full bg-transparent text-text-primary placeholder:text-text-muted resize-none outline-none text-[15px] leading-relaxed"
          />

          {/* Quote preview */}
          {quotePost && (
            <div className="border border-line rounded-xl p-3 text-sm text-text-secondary bg-bg-surface">
              <div className="flex items-center gap-1.5 mb-1">
                <Quote size={12} className="text-text-muted" />
                <span className="font-medium text-text-primary text-xs">@{quotePost.profiles.username}</span>
                <span className="text-text-muted text-xs">·</span>
                <span className="text-text-muted text-xs">{timeAgo(quotePost.created_at)}</span>
              </div>
              <p className="line-clamp-2 text-xs leading-relaxed">{quotePost.content}</p>
            </div>
          )}

          {/* Poll panel */}
          {pollOpen && (
            <div className="border border-line rounded-xl p-3 space-y-2 bg-bg-surface">
              <p className="text-xs font-medium text-text-secondary mb-2">Anket seçenekleri</p>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updatePollOption(i, e.target.value)}
                    placeholder={`Seçenek ${i + 1}`}
                    maxLength={80}
                    className="flex-1 bg-bg-elevated border border-line rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/60 transition-default"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removePollOption(i)}
                      className="p-1 rounded-full text-text-muted hover:text-error hover:bg-error/10 transition-default flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}

              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={addPollOption}
                  className="text-xs text-accent hover:text-accent/80 transition-default"
                >
                  + Seçenek ekle
                </button>
              )}

              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-text-secondary">Süre:</span>
                <select
                  value={pollDuration}
                  onChange={(e) => setPollDuration(Number(e.target.value))}
                  className="bg-bg-elevated border border-line rounded-lg px-2 py-1 text-xs text-text-primary outline-none focus:border-accent/60 transition-default"
                >
                  <option value={1}>1 saat</option>
                  <option value={24}>24 saat</option>
                  <option value={72}>3 gün</option>
                  <option value={168}>7 gün</option>
                </select>
              </div>
            </div>
          )}

          {/* Image preview grid */}
          {previews.length > 0 && (
            <div
              className={cn(
                'grid gap-1 rounded-xl overflow-hidden',
                previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
              )}
            >
              {previews.map((url, i) => (
                <div
                  key={url}
                  className={cn(
                    'relative bg-bg-surface',
                    previews.length === 1 ? 'aspect-video' : 'aspect-square',
                    previews.length === 3 && i === 0 ? 'row-span-2' : ''
                  )}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-default"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-line/50">
            <div className="flex gap-1">
              {/* Image button — disabled when poll is open */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= MAX_IMAGES || pollOpen}
                className={cn(
                  'p-2 rounded-full transition-default',
                  images.length >= MAX_IMAGES || pollOpen
                    ? 'text-text-muted opacity-40 cursor-not-allowed'
                    : 'text-text-muted hover:text-accent hover:bg-accent/10'
                )}
                title={
                  pollOpen
                    ? 'Anket açıkken medya eklenemez'
                    : images.length >= MAX_IMAGES
                      ? `En fazla ${MAX_IMAGES} resim`
                      : 'Resim ekle'
                }
              >
                <ImageIcon size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />

              {/* Poll button — disabled when images exist */}
              <button
                type="button"
                onClick={togglePoll}
                disabled={images.length > 0}
                className={cn(
                  'p-2 rounded-full transition-default',
                  images.length > 0
                    ? 'text-text-muted opacity-40 cursor-not-allowed'
                    : pollOpen
                      ? 'text-accent bg-accent/10'
                      : 'text-text-muted hover:text-accent hover:bg-accent/10'
                )}
                title={images.length > 0 ? 'Medya varken anket açılamaz' : 'Anket ekle'}
              >
                <BarChart2 size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <span
                  className={cn(
                    'text-sm tabular-nums',
                    remaining < 0
                      ? 'text-error font-medium'
                      : remaining < 20
                        ? 'text-warning'
                        : 'text-text-muted'
                  )}
                >
                  {remaining}
                </span>
              )}
              <Button
                size="sm"
                onClick={() => void handleSubmit()}
                disabled={isEmpty || isOverLimit}
                loading={isSubmitting}
              >
                Paylaş
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
