import { cn } from '@/lib/utils'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type AvatarProps = {
  src?: string | null
  fallback?: string
  size?: Size
  isNova?: boolean
  showOnline?: boolean
  className?: string
  alt?: string
}

const sizes: Record<Size, { container: string; font: string; ring: string; dot: string }> = {
  xs: { container: 'w-6 h-6',   font: 'text-[10px]', ring: 'ring-1',  dot: 'w-1.5 h-1.5 bottom-0 right-0' },
  sm: { container: 'w-8 h-8',   font: 'text-xs',     ring: 'ring-1',  dot: 'w-2 h-2 bottom-0 right-0' },
  md: { container: 'w-10 h-10', font: 'text-sm',     ring: 'ring-2',  dot: 'w-2.5 h-2.5 bottom-0.5 right-0.5' },
  lg: { container: 'w-16 h-16', font: 'text-xl',     ring: 'ring-2',  dot: 'w-3 h-3 bottom-0.5 right-0.5' },
  xl: { container: 'w-24 h-24', font: 'text-3xl',    ring: 'ring-2',  dot: 'w-3.5 h-3.5 bottom-1 right-1' },
}

export default function Avatar({
  src,
  fallback = '?',
  size = 'md',
  isNova = false,
  showOnline = false,
  className,
  alt,
}: AvatarProps) {
  const s = sizes[size]
  const initial = fallback.trim()[0]?.toUpperCase() ?? '?'

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div
        className={cn(
          s.container,
          'rounded-full overflow-hidden bg-bg-elevated border border-line flex items-center justify-center',
          isNova && `${s.ring} ring-accent ring-offset-1 ring-offset-bg-base`
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt ?? fallback}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className={cn(s.font, 'font-medium text-text-secondary select-none')}>
            {initial}
          </span>
        )}
      </div>

      {showOnline && (
        <span
          className={cn(
            s.dot,
            'absolute rounded-full bg-success border-2 border-bg-base'
          )}
        />
      )}
    </div>
  )
}
