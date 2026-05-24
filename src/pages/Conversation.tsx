import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Send, Image, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import {
  useDirectMessages,
  useSendDM,
  useDeleteDM,
  useMarkAsRead,
  useRealtimeDM,
  type DirectMessageWithProfile,
} from '@/hooks/useMessages'
import { useConversations } from '@/hooks/useMessages'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { timeAgo, formatDateTime, cn } from '@/lib/utils'
import type { ConversationWithDetails } from '@/hooks/useMessages'

export const Conversation = () => {
  const { id: conversationId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)

  const { data: conversations } = useConversations()
  const conversation = conversations?.find((c) => c.id === conversationId)
  const otherUser = conversation?.other_user

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useDirectMessages(conversationId ?? '')

  const { mutate: sendDM, isPending: sending } = useSendDM(conversationId ?? '')
  const { mutate: deleteDM } = useDeleteDM(conversationId ?? '')
  const { mutate: markAsRead } = useMarkAsRead(conversationId ?? '')

  const messages = useMemo(
    () => data?.pages.flatMap((p) => p.messages) ?? [],
    [data]
  )

  const [content, setContent] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sayfaya girilince okundu işaretle
  useEffect(() => {
    if (conversationId) markAsRead()
  }, [conversationId])

  // İlk yüklemede en alta scroll
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView()
    }, 100)
  }, [conversationId])

  // Yeni mesaj gelince scroll
  const handleNewMessage = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100
    if (isAtBottom) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    }
    markAsRead()
  }, [markAsRead])

  // Realtime
  useRealtimeDM(conversationId ?? '', handleNewMessage)

  // Üste scroll → eski mesajlar
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    if (container.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
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

  const removeMedia = (i: number) => {
    URL.revokeObjectURL(mediaPreviews[i])
    setMediaFiles((p) => p.filter((_, idx) => idx !== i))
    setMediaPreviews((p) => p.filter((_, idx) => idx !== i))
  }

  const uploadMedia = async (): Promise<string[]> => {
    return Promise.all(
      mediaFiles.map(async (file) => {
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `dm/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage
          .from('media')
          .upload(path, file, { cacheControl: '3600' })
        if (error) throw error
        const { data } = supabase.storage.from('media').getPublicUrl(path)
        return data.publicUrl
      })
    )
  }

  const handleSend = async () => {
    if ((!content.trim() && mediaFiles.length === 0) || sending || isUploading)
      return

    try {
      setIsUploading(true)
      const mediaUrls = await uploadMedia()
      setIsUploading(false)

      sendDM({ content: content.trim(), mediaUrls })

      setContent('')
      setMediaFiles([])
      setMediaPreviews([])
      if (textareaRef.current) textareaRef.current.style.height = 'auto'

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch {
      setIsUploading(false)
    }
  }

  const canSend =
    (content.trim().length > 0 || mediaFiles.length > 0) &&
    !sending &&
    !isUploading

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-base)]">
      {/* Başlık */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-base)] shrink-0">
        <button
          onClick={() => navigate('/mesajlar')}
          className="p-1.5 -ml-1.5 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        {otherUser ? (
          <button
            onClick={() => navigate(`/${otherUser.username}`)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Avatar
              src={otherUser.avatar_url}
              fallback={otherUser.display_name}
              size="sm"
              showOnline
            />
            <div className="text-left">
              <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
                {otherUser.display_name}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                @{otherUser.username}
              </p>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8" rounded="full" />
            <Skeleton className="w-24 h-4" />
          </div>
        )}
      </div>

      {/* Mesajlar */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        onScroll={handleScroll}
      >
        {/* Eski mesaj yükleyici */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isLoading ? (
          <DMSkeleton />
        ) : messages.length === 0 ? (
          <EmptyDM name={otherUser?.display_name ?? ''} />
        ) : (
          <>
            {messages.map((msg, i) => {
              const prev = messages[i - 1]
              const isOwn = msg.sender_id === currentUser?.id
              const isGrouped =
                prev &&
                prev.sender_id === msg.sender_id &&
                new Date(msg.created_at).getTime() -
                  new Date(prev.created_at).getTime() <
                  5 * 60 * 1000

              // Tarih ayırıcı
              const showDate =
                !prev ||
                new Date(msg.created_at).toDateString() !==
                  new Date(prev.created_at).toDateString()

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-[var(--border)]" />
                      <span className="text-xs text-[var(--text-muted)] shrink-0">
                        {formatDateTime(msg.created_at).split(',')[0]}
                      </span>
                      <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>
                  )}
                  <DMMessage
                    message={msg}
                    isOwn={isOwn}
                    isGrouped={!!isGrouped}
                    onDelete={() => deleteDM(msg.id)}
                  />
                </div>
              )
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Medya önizleme */}
      {mediaPreviews.length > 0 && (
        <div className="px-4 py-2 flex gap-2 border-t border-[var(--border-subtle)]">
          {mediaPreviews.map((preview, i) => (
            <div
              key={i}
              className="relative w-14 h-14 rounded-[var(--radius-md)] overflow-hidden bg-[var(--bg-elevated)]"
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

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--border)] shrink-0">
        <div className="flex items-end gap-2">
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
            className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors shrink-0"
          >
            <Image size={20} />
          </button>

          <div className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-xl)] px-4 py-2.5 focus-within:border-[var(--accent)] transition-colors">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="Mesaj yaz..."
              rows={1}
              className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none outline-none leading-relaxed min-h-[20px] max-h-[120px]"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              'shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
              'transition-all duration-[var(--transition)]',
              canSend
                ? 'bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed'
            )}
          >
            {isUploading || sending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={17} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DM Mesaj Baloncuğu ────────────────────────────────────
interface DMMessageProps {
  message: DirectMessageWithProfile
  isOwn: boolean
  isGrouped: boolean
  onDelete: () => void
}

const DMMessage = ({
  message,
  isOwn,
  isGrouped,
  onDelete,
}: DMMessageProps) => {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'flex items-end gap-2 group',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        isGrouped ? 'mt-0.5' : 'mt-3'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar (sadece ilk mesajda ve karşı taraf için) */}
      {!isOwn && (
        <div className="w-8 shrink-0">
          {!isGrouped && (
            <Avatar
              src={message.profiles.avatar_url}
              fallback={message.profiles.display_name}
              size="sm"
            />
          )}
        </div>
      )}

      <div
        className={cn(
          'flex flex-col max-w-[70%]',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        {/* Metin baloncuğu */}
        {message.content && (
          <div
            className={cn(
              'px-3 py-2 rounded-[var(--radius-xl)] text-sm leading-relaxed',
              'break-words whitespace-pre-wrap',
              isOwn
                ? 'bg-[var(--accent)] text-[var(--text-inverse)] rounded-br-[var(--radius-sm)]'
                : 'bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] rounded-bl-[var(--radius-sm)]'
            )}
          >
            {message.content}
          </div>
        )}

        {/* Medya */}
        {message.media_urls.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.media_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Medya ${i + 1}`}
                className="max-w-[200px] max-h-[150px] rounded-[var(--radius-lg)] object-cover"
                loading="lazy"
              />
            ))}
          </div>
        )}

        {/* Zaman */}
        {hovered && (
          <span className="text-[10px] text-[var(--text-muted)] mt-0.5 px-1">
            {timeAgo(message.created_at)}
          </span>
        )}
      </div>

      {/* Sil butonu */}
      {isOwn && hovered && (
        <button
          onClick={onDelete}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      )}
    </motion.div>
  )
}

// ── Skeleton & Empty ──────────────────────────────────────
const DMSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className={cn(
          'flex items-end gap-2',
          i % 3 === 0 ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        {i % 3 !== 0 && <Skeleton className="w-8 h-8 shrink-0" rounded="full" />}
        <Skeleton
          className={cn('h-9 rounded-[var(--radius-xl)]', i % 3 === 0 ? 'w-32' : 'w-44')}
        />
      </div>
    ))}
  </div>
)

const EmptyDM = ({ name }: { name: string }) => (
  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
    <span className="text-4xl">👋</span>
    <div>
      <p className="text-sm font-medium text-[var(--text-primary)]">
        {name} ile konuşman başlıyor
      </p>
      <p className="text-xs text-[var(--text-muted)] mt-1">
        İlk mesajı sen gönder!
      </p>
    </div>
  </div>
)