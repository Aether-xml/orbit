import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type MouseEvent,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface DropdownItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}

interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  className?: string
}

export const Dropdown = ({
  trigger,
  items,
  align = 'right',
  className,
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | globalThis.MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <div onClick={() => setIsOpen((v) => !v)}>{trigger}</div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className={cn(
              'absolute z-50 top-full mt-1',
              'min-w-[180px]',
              'bg-[var(--bg-overlay)]',
              'border border-[var(--border)]',
              'rounded-[var(--radius-lg)]',
              'shadow-[var(--shadow-lg)]',
              'overflow-hidden py-1',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {items.map((item, index) => (
              <button
                key={index}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick()
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-2.5',
                  'px-3 py-2.5 text-sm text-left',
                  'transition-colors duration-[var(--transition)]',
                  item.variant === 'danger'
                    ? 'text-[var(--error)] hover:bg-[var(--error)]/10'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
                  item.disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                {item.icon && (
                  <span className="shrink-0 text-current">{item.icon}</span>
                )}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}