import { cn } from '@/lib/utils'

// ── Rozet tanımları ───────────────────────────────────

export const BADGES = {
  'nova-plus':     { label: 'Nova+ Üyesi',     color: '#E8C547', icon: '⭐' },
  'early-adopter': { label: 'Erken Kullanıcı', color: '#4CAF82', icon: '🌱' },
  'founder':       { label: 'Kurucu',          color: '#E05A5A', icon: '🔥' },
  'verified':      { label: 'Doğrulanmış',     color: '#5A9FE0', icon: '✓'  },
} as const

export type BadgeId = keyof typeof BADGES

type BadgeProps = {
  id: BadgeId
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export default function Badge({ id, size = 'md', showLabel = false, className }: BadgeProps) {
  const badge = BADGES[id]
  if (!badge) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        className
      )}
      style={{
        color: badge.color,
        backgroundColor: `${badge.color}20`,
        borderColor: `${badge.color}40`,
        border: '1px solid',
      }}
      title={badge.label}
    >
      <span>{badge.icon}</span>
      {showLabel && <span>{badge.label}</span>}
    </span>
  )
}

// ── Verification checkmark ───────────────────────────

export function VerifiedIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="8" fill="#5A9FE0" />
      <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Nova+ badge (inline metin yanı için) ─────────────

export function NovaBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return <Badge id="nova-plus" size={size} />
}
