import { cn } from '@/lib/utils'

type SkeletonProps = {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
  style?: React.CSSProperties
}

export default function Skeleton({ className, rounded = 'md', style }: SkeletonProps) {
  const r = {
    sm:   'rounded',
    md:   'rounded-md',
    lg:   'rounded-lg',
    full: 'rounded-full',
  }[rounded]

  return <div className={cn('skeleton', r, className)} style={style} />
}

// ── Hazır kompozisyonlar ──────────────────────────────

export function PostSkeleton() {
  return (
    <div className="p-4 border-b border-line space-y-3">
      <div className="flex gap-3">
        <Skeleton className="w-10 h-10 flex-shrink-0" rounded="full" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="flex gap-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
      <div className="flex gap-6 pl-13">
        {[60, 52, 48, 44].map((w) => (
          <Skeleton key={w} className="h-3" style={{ width: `${w}px` }} />
        ))}
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      {/* Banner */}
      <Skeleton className="w-full h-32" rounded="lg" />
      {/* Avatar + isim */}
      <div className="px-4 space-y-3">
        <Skeleton className="w-20 h-20 -mt-12" rounded="full" />
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="flex gap-4">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      </div>
    </div>
  )
}

export function ReelSkeleton() {
  return (
    <div className="w-full aspect-[9/16] relative">
      <Skeleton className="w-full h-full" rounded="lg" />
      <div className="absolute bottom-4 left-4 right-12 space-y-2">
        <Skeleton className="h-3.5 w-32" rounded="full" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="absolute bottom-8 right-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="w-9 h-9" rounded="full" />
        ))}
      </div>
    </div>
  )
}

export function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-line">
      <Skeleton className="w-10 h-10 flex-shrink-0" rounded="full" />
      <div className="flex-1 space-y-1.5 pt-0.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}
