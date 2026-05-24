import { BADGES, type BadgeKey } from '@/types/user'
import { cn } from '@/lib/utils'

interface BadgeDisplayProps {
  earnedBadges: string[]
  selectedBadge?: string | null
  onSelect?: (badge: BadgeKey) => void
  editable?: boolean
}

export const BadgeDisplay = ({
  earnedBadges,
  selectedBadge,
  onSelect,
  editable = false,
}: BadgeDisplayProps) => {
  if (earnedBadges.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Henüz rozet kazanılmamış.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {earnedBadges.map((key) => {
        const badgeKey = key as BadgeKey
        const badge = BADGES[badgeKey]
        if (!badge) return null

        const isSelected = selectedBadge === key

        return (
          <button
            key={key}
            disabled={!editable}
            onClick={() => editable && onSelect?.(badgeKey)}
            className={cn(
              'flex items-center gap-2 px-3 py-2',
              'rounded-[var(--radius-md)]',
              'border transition-all duration-[var(--transition)]',
              editable && 'cursor-pointer hover:scale-105',
              !editable && 'cursor-default',
              isSelected
                ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                : 'border-[var(--border)] bg-[var(--bg-elevated)]'
            )}
            style={
              isSelected
                ? { borderColor: badge.color, background: `${badge.color}15` }
                : undefined
            }
            title={badge.label}
          >
            <span className="text-lg">{badge.icon}</span>
            <div className="text-left">
              <p
                className="text-xs font-medium"
                style={{ color: badge.color }}
              >
                {badge.label}
              </p>
              {isSelected && editable && (
                <p className="text-[10px] text-[var(--text-muted)]">
                  Aktif rozet
                </p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}