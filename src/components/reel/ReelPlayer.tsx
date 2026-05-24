import {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface ReelPlayerHandle {
  play: () => void
  pause: () => void
  toggle: () => void
}

interface ReelPlayerProps {
  src: string
  isActive: boolean
  onEnded?: () => void
  className?: string
}

export const ReelPlayer = forwardRef<ReelPlayerHandle, ReelPlayerProps>(
  ({ src, isActive, onEnded, className }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(true)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [showPlayIcon, setShowPlayIcon] = useState(false)
    const playIconTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Dışarıya play/pause/toggle metodları
    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      toggle: () => {
        if (videoRef.current?.paused) {
          videoRef.current.play()
        } else {
          videoRef.current?.pause()
        }
      },
    }))

    // Aktif/inaktif yönetimi
    useEffect(() => {
      const video = videoRef.current
      if (!video) return

      if (isActive) {
        video.currentTime = 0
        video.play().catch(() => {})
      } else {
        video.pause()
        video.currentTime = 0
      }
    }, [isActive])

    // Progress güncelleme
    const handleTimeUpdate = useCallback(() => {
      const video = videoRef.current
      if (!video || !video.duration) return
      setProgress((video.currentTime / video.duration) * 100)
    }, [])

    const handleLoadedMetadata = useCallback(() => {
      if (videoRef.current) {
        setDuration(videoRef.current.duration)
      }
    }, [])

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    // Tap to play/pause
    const handleVideoClick = () => {
      const video = videoRef.current
      if (!video) return

      if (video.paused) {
        video.play()
      } else {
        video.pause()
      }

      // Kısa animasyon göster
      setShowPlayIcon(true)
      if (playIconTimer.current) clearTimeout(playIconTimer.current)
      playIconTimer.current = setTimeout(() => setShowPlayIcon(false), 800)
    }

    const toggleMute = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (videoRef.current) {
        videoRef.current.muted = !isMuted
        setIsMuted((v) => !v)
      }
    }

    return (
      <div
        className={cn(
          'relative w-full h-full bg-black overflow-hidden',
          className
        )}
        onClick={handleVideoClick}
      >
        {/* Video */}
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-cover"
          loop
          muted={isMuted}
          playsInline
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={onEnded}
        />

        {/* Play/Pause animasyon overlay */}
        <AnimatePresence>
          {showPlayIcon && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                {isPlaying ? (
                  <Pause size={28} className="text-white" />
                ) : (
                  <Play size={28} className="text-white ml-1" />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ses butonu */}
        <button
          onClick={toggleMute}
          className="absolute bottom-20 right-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
        >
          {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>

        {/* İlerleme çubuğu */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
          <div
            className="h-full bg-white transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }
)

ReelPlayer.displayName = 'ReelPlayer'