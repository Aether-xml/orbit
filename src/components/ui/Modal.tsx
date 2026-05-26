import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ModalSize = 'sm' | 'md' | 'lg' | 'full'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  size?: ModalSize
  className?: string
  children: React.ReactNode
  hideClose?: boolean
}

const sizeClasses: Record<ModalSize, string> = {
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  full: 'max-w-full mx-4',
}

export default function Modal({
  open,
  onClose,
  title,
  size = 'md',
  className,
  children,
  hideClose = false,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // ESC ile kapat
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Scroll kilitle
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'relative w-full bg-bg-elevated border border-line rounded-xl shadow-lg overflow-hidden',
              sizeClasses[size],
              className
            )}
          >
            {/* Header */}
            {(title || !hideClose) && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                {title && (
                  <h2 className="text-text-primary font-semibold">{title}</h2>
                )}
                {!hideClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="ml-auto text-text-muted hover:text-text-primary transition-default p-1 rounded-md hover:bg-bg-overlay"
                    aria-label="Kapat"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}

            {/* İçerik */}
            <div className="overflow-y-auto max-h-[80dvh]">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
