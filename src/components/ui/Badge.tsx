import { BADGES, type BadgeKey } from '@/types/user'
import { cn } from '@/lib/utils'

interface BadgeProps {
  badgeKey: BadgeKey
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export const Badge = ({
  badgeKey,
  size = 'sm',
  showLabel = false,
  className,
}: BadgeProps) => {
  const badge = BADGES[badgeKey]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        'font-medium rounded-[var(--radius-sm)]',
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1',
        className
      )}
      style={{
        backgroundColor: `${badge.color}20`,
        color: badge.color,
        border: `1px solid ${badge.color}40`,
      }}
      title={badge.label}
    >
      <span>{badge.icon}</span>
      {showLabel && <span>{badge.label}</span>}
    </span>
  )
}