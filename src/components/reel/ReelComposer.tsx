import { useState, useRef, useCallback } from 'react'
import { Upload, X, Music2, FileVideo } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useUploadReel } from '@/hooks/useReels'
import { useAuthStore } from '@/store/authStore'
import { formatFileSize, cn } from '@/lib/utils'

interface ReelComposerProps {
  isOpen: boolean
  onClose: () => void
}

export const ReelComposer = ({ isOpen, onClose }: ReelComposerProps) => {
  const profile = useAuthStore((s) => s.profile)
  const { mutateAsync: uploadReel, isPending } = useUploadReel()

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [caption, setCaption] = useState('')
  const [musicName, setMusicName] = useState('')
  const [musicArtist, setMusicArtist] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const maxDuration = profile?.is_nova_plus ? 180 : 60

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) {
      return
    }

    // Önizleme URL'i
    const url = URL.createObjectURL(file)
    setVideoFile(file)
    setVideoPreview(url)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration)
    }
  }

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideoFile(null)
    setVideoPreview(null)
    setVideoDuration(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!videoFile || !videoDuration) return

    try {
      await uploadReel({
        file: videoFile,
        caption: caption || undefined,
        musicName: musicName || undefined,
        musicArtist: musicArtist || undefined,
        duration: videoDuration,
      })

      // Formu temizle
      clearVideo()
      setCaption('')
      setMusicName('')
      setMusicArtist('')
      onClose()
    } catch {
      // Hata toast ile gösterilir (hook içinde)
    }
  }

  const durationOk = videoDuration > 0 && videoDuration <= maxDuration
  const canSubmit = videoFile && durationOk && !isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reel Paylaş"
      size="md"
    >
      <div className="p-4 space-y-4">
        {/* Video seçim alanı */}
        {!videoPreview ? (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-[var(--radius-xl)]',
              'flex flex-col items-center justify-center',
              'py-12 px-6 cursor-pointer',
              'transition-colors duration-[var(--transition)]',
              isDragging
                ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-surface)]'
            )}
          >
            <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--accent-muted)] flex items-center justify-center mb-3">
              <Upload size={24} className="text-[var(--accent)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
              Video yükle veya sürükle
            </p>
            <p className="text-xs text-[var(--text-muted)] text-center">
              MP4, MOV · Maks.{' '}
              <span className="text-[var(--accent)]">
                {maxDuration} saniye
              </span>
              {!profile?.is_nova_plus && (
                <span className="block mt-0.5">
                  Nova+ ile 3 dakikaya kadar
                </span>
              )}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        ) : (
          /* Video önizleme */
          <div className="relative">
            <div className="relative aspect-[9/16] max-h-64 mx-auto rounded-[var(--radius-lg)] overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={videoPreview}
                className="w-full h-full object-contain"
                controls
                onLoadedMetadata={handleVideoLoaded}
              />
            </div>

            {/* Kaldır butonu */}
            <button
              onClick={clearVideo}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
            >
              <X size={14} />
            </button>

            {/* Dosya bilgisi */}
            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <FileVideo size={13} />
              <span className="truncate">{videoFile?.name}</span>
              <span className="shrink-0">
                ({formatFileSize(videoFile?.size ?? 0)})
              </span>
            </div>

            {/* Süre uyarısı */}
            {videoDuration > 0 && (
              <div
                className={cn(
                  'mt-1 text-xs px-2 py-1 rounded-[var(--radius-sm)]',
                  durationOk
                    ? 'text-[var(--success)] bg-[var(--success)]/10'
                    : 'text-[var(--error)] bg-[var(--error)]/10'
                )}
              >
                {durationOk
                  ? `✓ ${Math.round(videoDuration)} saniye`
                  : `✗ ${Math.round(videoDuration)} saniye — limit ${maxDuration}sn`}
              </div>
            )}
          </div>
        )}

        {/* Altyazı */}
        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
            Altyazı
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Reel'ini anlat..."
            rows={2}
            maxLength={500}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] resize-none transition-colors"
          />
          <p className="text-right text-xs text-[var(--text-muted)] mt-1">
            {caption.length}/500
          </p>
        </div>

        {/* Müzik bilgisi */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
            <Music2 size={15} />
            <span>Müzik (isteğe bağlı)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Şarkı adı"
              value={musicName}
              onChange={(e) => setMusicName(e.target.value)}
            />
            <Input
              placeholder="Sanatçı"
              value={musicArtist}
              onChange={(e) => setMusicArtist(e.target.value)}
            />
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" fullWidth onClick={onClose}>
            İptal
          </Button>
          <Button
            fullWidth
            disabled={!canSubmit}
            isLoading={isPending}
            onClick={handleSubmit}
          >
            Paylaş
          </Button>
        </div>
      </div>
    </Modal>
  )
}