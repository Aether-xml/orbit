import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, X, Music } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { uploadFile, uniquePath, generateVideoThumbnail } from '@/lib/upload'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const MAX_SIZE_MB = 200
const MAX_CAPTION = 500

export default function CreateReel() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [musicName, setMusicName] = useState('')
  const [musicArtist, setMusicArtist] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      toast.error('Lütfen bir video dosyası seç')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Video ${MAX_SIZE_MB}MB'dan küçük olmalı`)
      return
    }
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideoFile(file)
    setVideoPreviewUrl(URL.createObjectURL(file))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!videoFile || !user) return
    setUploading(true)
    setProgress(5)

    try {
      // Upload video
      const videoPath = uniquePath(user.id, videoFile)
      const uploadedVideoUrl = await uploadFile('reels', videoFile, videoPath)
      setProgress(65)

      // Generate + upload thumbnail
      let thumbnailUrl: string | null = null
      const thumbBlob = await generateVideoThumbnail(videoFile)
      if (thumbBlob) {
        const thumbFile = new File([thumbBlob], 'thumb.jpg', { type: 'image/jpeg' })
        thumbnailUrl = await uploadFile('thumbnails', thumbFile, uniquePath(user.id, thumbFile))
      }
      setProgress(85)

      // Read duration
      const duration = Math.round(videoRef.current?.duration ?? 0)

      const { error } = await supabase.from('reels').insert({
        user_id: user.id,
        video_url: uploadedVideoUrl,
        thumbnail_url: thumbnailUrl,
        duration_seconds: duration,
        caption: caption.trim() || null,
        music_name: musicName.trim() || null,
        music_artist: musicArtist.trim() || null,
      })

      setProgress(100)

      if (error) {
        toast.error('Reel yüklenemedi')
      } else {
        toast.success('Reel paylaşıldı!')
        navigate('/reels', { replace: true })
      }
    } catch {
      toast.error('Yükleme başarısız')
    }

    setUploading(false)
    setProgress(0)
  }

  const clearVideo = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideoFile(null)
    setVideoPreviewUrl(null)
  }

  return (
    <div className="fixed inset-0 bg-bg-base z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full text-text-primary hover:bg-bg-overlay transition-default"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-semibold text-text-primary flex-1">Reel Yükle</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {!videoFile ? (
          /* ── File picker ── */
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-8 hover:bg-bg-surface transition-default"
          >
            <div className="w-20 h-20 rounded-full bg-bg-elevated border border-line flex items-center justify-center">
              <Upload size={32} className="text-text-muted" />
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">Video seç</p>
              <p className="text-text-muted text-sm">MP4, MOV, WebM · Maks {MAX_SIZE_MB}MB</p>
            </div>
            <span className="px-5 py-2 rounded-full bg-accent text-bg-base text-sm font-medium">
              Dosya Seç
            </span>
          </button>
        ) : (
          /* ── Preview + form ── */
          <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
            {/* Video preview */}
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-[9/16] max-h-[55vh]">
              <video
                ref={videoRef}
                src={videoPreviewUrl ?? undefined}
                className="w-full h-full object-contain"
                controls
                playsInline
                muted
              />
              <button
                type="button"
                onClick={clearVideo}
                className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-default"
              >
                <X size={14} />
              </button>
            </div>

            {/* Caption */}
            <div className="space-y-1.5">
              <label className="block text-text-secondary text-sm">Açıklama</label>
              <textarea
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
                placeholder="Açıklama ekle, #hashtag kullan..."
                className="w-full bg-bg-surface border border-line rounded-xl px-4 py-3 text-text-primary text-sm placeholder:text-text-muted transition-default focus:border-accent focus:outline-none resize-none"
              />
              <p className="text-text-muted text-xs text-right">{caption.length}/{MAX_CAPTION}</p>
            </div>

            {/* Music */}
            <div className="rounded-xl border border-line p-4 space-y-3">
              <div className="flex items-center gap-2 text-text-muted">
                <Music size={15} />
                <span className="text-xs font-semibold uppercase tracking-wide">Müzik</span>
              </div>
              <Input
                label="Müzik Adı"
                value={musicName}
                onChange={(e) => setMusicName(e.target.value)}
                placeholder="Şarkı adı"
              />
              <Input
                label="Sanatçı"
                value={musicArtist}
                onChange={(e) => setMusicArtist(e.target.value)}
                placeholder="Sanatçı adı"
              />
            </div>

            {/* File info */}
            <p className="text-text-muted text-xs text-center">
              {videoFile.name} · {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          </div>
        )}
      </div>

      {/* Upload button + progress */}
      {videoFile && (
        <div className="px-4 py-4 border-t border-line flex-shrink-0 space-y-3">
          {uploading && (
            <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <Button
            className={cn('w-full', uploading && 'cursor-not-allowed opacity-80')}
            loading={uploading}
            onClick={() => void handleUpload()}
            disabled={uploading}
          >
            {uploading ? `Yükleniyor... %${progress}` : 'Paylaş'}
          </Button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
    </div>
  )
}
