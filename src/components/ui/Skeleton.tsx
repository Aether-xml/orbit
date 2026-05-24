import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

export const Skeleton = ({ className, rounded = 'md' }: SkeletonProps) => {
  const roundedMap = {
    sm: 'rounded-[var(--radius-sm)]',
    md: 'rounded-[var(--radius-md)]',
    lg: 'rounded-[var(--radius-lg)]',
    full: 'rounded-full',
  }

  return (
    <div
      className={cn(
        'skeleton-shimmer',
        roundedMap[rounded],
        className
      )}
      aria-hidden="true"
    />
  )
}

// Post card skeleton
export const PostCardSkeleton = () => (
  <div className="p-4 border-b border-[var(--border)]">
    <div className="flex gap-3">
      <Skeleton className="w-10 h-10 shrink-0" rounded="full" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-3/4 h-4" />
        <div className="flex gap-6 mt-3">
          <Skeleton className="w-12 h-4" />
          <Skeleton className="w-12 h-4" />
          <Skeleton className="w-12 h-4" />
          <Skeleton className="w-12 h-4" />
        </div>
      </div>
    </div>
  </div>
)

// Profile header skeleton
export const ProfileHeaderSkeleton = () => (
  <div>
    <Skeleton className="w-full h-32" rounded="sm" />
    <div className="px-4 pb-4">
      <div className="flex justify-between items-end -mt-8 mb-4">
        <Skeleton className="w-20 h-20 ring-4 ring-[var(--bg-base)]" rounded="full" />
        <Skeleton className="w-28 h-9" />
      </div>
      <Skeleton className="w-36 h-5 mb-1" />
      <Skeleton className="w-24 h-4 mb-3" />
      <Skeleton className="w-full h-4 mb-1" />
      <Skeleton className="w-2/3 h-4 mb-4" />
      <div className="flex gap-4">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-20 h-4" />
      </div>
    </div>
  </div>
)