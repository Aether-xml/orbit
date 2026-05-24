import { useState, useRef, useCallback } from 'react'
import { Send, Image, X, CornerUpLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { useSendMessage } from '@/hooks/useServers'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { ServerMessageWithProfile } from '@/hooks/useServers'
import type { ServerChannel } from '@/types/database'

interface MessageInputProps {
  channel: ServerChannel
  replyTo: ServerMessageWithProfile | null
  onClearReply: () => void
}

export const MessageInput = ({
  channel,
  replyTo,
  onClearReply,
}: MessageInputProps) => {
  const profile = useAuthStore((s) => s.profile)
  const [content, setContent] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { mutate: sendMessage, isPending } = useSendMessage(channel.id)

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    // Otomatik yükseklik
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 4)
    setMediaFiles(files)
    setMediaPreviews(files.map((f) => URL.createObjectURL(f)))
  }

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index])
    setMediaFiles((prev) => prev.filter((_, i) => i !== index))
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadMedia = async (): Promise<string[]> => {
    if (mediaFiles.length === 0) return []

    return Promise.all(
      mediaFiles.map(async (file) => {
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `messages/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`

        const { error } = await supabase.storage
          .from('media')
          .upload(path, file, { cacheControl: '3600' })

        if (error) throw error

        const { data } = supabase.storage.from('media').getPublicUrl(path)
        return data.publicUrl
      })
    )
  }

  const handleSend = useCallback(async () => {
    if ((!content.trim() && mediaFiles.length === 0) || isPending || isUploading)
      return

    try {
      setIsUploading(true)
      const mediaUrls = await uploadMedia()
      setIsUploading(false)

      sendMessage({
        content: content.trim(),
        mediaUrls,
        replyToId: replyTo?.id,
      })

      setContent('')
      setMediaFiles([])
      setMediaPreviews([])
      onClearReply()

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch {
      setIsUploading(false)
    }
  }, [content, mediaFiles, replyTo, isPending, isUploading, sendMessage, onClearReply])

  const canSend =
    (content.trim().length > 0 || mediaFiles.length > 0) &&
    !isPending &&
    !isUploading

  return (
    <div className="px-4 py-3 border-t border-[var(--border)]">
      {/* Yanıt gösterimi */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-2 mb-2 px-3 py-2 bg-[var(--bg-elevated)] rounded-[var(--radius-md)] border-l-2 border-[var(--accent)]"
          >
            <CornerUpLeft size={13} className="text-[var(--accent)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--accent)]">
                {replyTo.profiles.display_name} kullanıcısına yanıt veriyorsun
              </p>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {replyTo.content}
              </p>
            </div>
            <button
              onClick={onClearReply}
              className="shrink-0 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Medya önizleme */}
      {mediaPreviews.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {mediaPreviews.map((preview, i) => (
            <div
              key={i}
              className="relative w-16 h-16 rounded-[var(--radius-md)] overflow-hidden bg-[var(--bg-elevated)]"
            >
              <img
                src={preview}
                alt={`Önizleme ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removeMedia(i)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input alanı */}
      <div className="flex items-end gap-2">
        <Avatar
          src={profile?.avatar_url}
          fallback={profile?.display_name ?? 'U'}
          size="sm"
          className="shrink-0 mb-0.5"
        />

        <div className="flex-1 flex items-end gap-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-lg)] px-3 py-2 focus-within:border-[var(--accent)] transition-colors">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder={`#${channel.name} kanalına mesaj gönder`}
            rows={1}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none outline-none leading-relaxed min-h-[22px] max-h-[160px]"
          />

          {/* Medya ekle */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 p-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            <Image size={17} />
          </button>
        </div>

        {/* Gönder */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'shrink-0 w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center',
            'transition-all duration-[var(--transition)]',
            canSend
              ? 'bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)]'
              : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed'
          )}
        >
          {isUploading || isPending ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </div>
  )
}