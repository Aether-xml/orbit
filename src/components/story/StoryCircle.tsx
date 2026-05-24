import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Plus } from 'lucide-react'
import type { StoryGroup } from '@/hooks/useStories'

interface StoryCircleProps {
  group: StoryGroup
  onClick: () => void
  isOwn?: boolean
  hasStory?: boolean
}

export const StoryCircle = ({
  group,
  onClick,
  isOwn = false,
  hasStory = true,
}: StoryCircleProps) => {
  const { profile, hasUnviewed } = group

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 w-16 shrink-0"
    >
      {/* Avatar çerçevesi */}
      <div className="relative">
        <div
          className={cn(
            'p-0.5 rounded-full',
            hasStory && hasUnviewed
              ? 'bg-gradient-to-tr from-[var(--accent)] to-[var(--warning)]'
              : hasStory && !hasUnviewed
              ? 'bg-[var(--border)]'
              : 'bg-transparent'
          )}
        >
          <div className="p-0.5 bg-[var(--bg-base)] rounded-full">
            <Avatar
              src={profile.avatar_url}
              fallback={profile.display_name}
              size="md"
              isNova={false} // Story çerçevesi kendi stilini kullanıyor
            />
          </div>
        </div>

        {/* Kendi hikayesi için + butonu */}
        {isOwn && !hasStory && (
          <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center border-2 border-[var(--bg-base)]">
            <Plus size={11} className="text-[var(--text-inverse)]" />
          </div>
        )}
      </div>

      {/* İsim */}
      <span className="text-[11px] text-[var(--text-secondary)] truncate w-full text-center leading-tight">
        {isOwn ? 'Hikayem' : profile.display_name.split(' ')[0]}
      </span>
    </button>
  )
}