import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

const toastConfig = {
  success: {
    icon: CheckCircle,
    className: 'border-[var(--success)] text-[var(--success)]',
    bgClass: 'bg-[var(--bg-surface)]',
  },
  error: {
    icon: XCircle,
    className: 'border-[var(--error)] text-[var(--error)]',
    bgClass: 'bg-[var(--bg-surface)]',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-[var(--warning)] text-[var(--warning)]',
    bgClass: 'bg-[var(--bg-surface)]',
  },
  info: {
    icon: Info,
    className: 'border-[var(--info)] text-[var(--info)]',
    bgClass: 'bg-[var(--bg-surface)]',
  },
}

const ToastItem = ({
  id,
  message,
  type,
  duration = 4000,
}: {
  id: string
  message: string
  type: keyof typeof toastConfig
  duration?: number
}) => {
  const removeToast = useUiStore((s) => s.removeToast)
  const config = toastConfig[type]
  const Icon = config.icon

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, removeToast])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'flex items-start gap-3 p-3 pr-4',
        'rounded-[var(--radius-lg)]',
        'border-l-4',
        'shadow-[var(--shadow-md)]',
        'min-w-[280px] max-w-[380px]',
        config.bgClass,
        config.className
      )}
    >
      <Icon size={18} className="shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-[var(--text-primary)] leading-snug">
        {message}
      </p>
      <button
        onClick={() => removeToast(id)}
        className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

export const ToastContainer = () => {
  const toasts = useUiStore((s) => s.toasts)

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} {...toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}