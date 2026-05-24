import { useState } from 'react'
import { cn } from '@/lib/utils'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  src?: string | null
  fallback: string
  size?: AvatarSize
  isNova?: boolean
  showOnline?: boolean
  className?: string
  onClick?: () => void
}

const sizeMap: Record<AvatarSize, { container: string; text: string; ring: string; online: string }> = {
  xs: {
    container: 'w-6 h-6',
    text: 'text-xs',
    ring: 'ring-[1.5px]',
    online: 'w-1.5 h-1.5 border',
  },
  sm: {
    container: 'w-8 h-8',
    text: 'text-xs',
    ring: 'ring-2',
    online: 'w-2 h-2 border',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-sm',
    ring: 'ring-2',
    online: 'w-2.5 h-2.5 border-2',
  },
  lg: {
    container: 'w-16 h-16',
    text: 'text-xl',
    ring: 'ring-2',
    online: 'w-3.5 h-3.5 border-2',
  },
  xl: {
    container: 'w-24 h-24',
    text: 'text-3xl',
    ring: 'ring-[3px]',
    online: 'w-4 h-4 border-2',
  },
}

const getInitials = (name: string): string => {
  const words = name.trim().split(' ')
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export const Avatar = ({
  src,
  fallback,
  size = 'md',
  isNova = false,
  showOnline = false,
  className,
  onClick,
}: AvatarProps) => {
  const [imgError, setImgError] = useState(false)
  const sizes = sizeMap[size]

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      <div
        className={cn(
          'rounded-full overflow-hidden',
          'flex items-center justify-center',
          'bg-[var(--bg-elevated)]',
          sizes.container,
          isNova && [
            sizes.ring,
            'ring-[var(--accent)]',
          ]
        )}
      >
        {src && !imgError ? (
          <img
            src={src}
            alt={fallback}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <span
            className={cn(
              'font-semibold text-[var(--text-secondary)] select-none',
              sizes.text
            )}
          >
            {getInitials(fallback)}
          </span>
        )}
      </div>

      {/* Online göstergesi */}
      {showOnline && (
        <span
          className={cn(
            'absolute bottom-0 right-0',
            'rounded-full bg-[var(--success)]',
            'border-[var(--bg-base)]',
            sizes.online
          )}
        />
      )}
    </div>
  )
}