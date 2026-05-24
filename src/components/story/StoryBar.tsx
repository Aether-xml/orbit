import { useState, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { StoryCircle } from './StoryCircle'
import { StoryViewer } from './StoryViewer'
import { Skeleton } from '@/components/ui/Skeleton'
import { useStories, useCreateStory } from '@/hooks/useStories'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { StoryGroup } from '@/hooks/useStories'

export const StoryBar = () => {
  const user = useAuthStore((s) => s.user)
  const { data: storyGroups, isLoading } = useStories()
  const { mutate: createStory, isPending: uploading } = useCreateStory()
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ownGroup = storyGroups?.find((g) => g.profile.id === user?.id)
  const otherGroups = storyGroups?.filter((g) => g.profile.id !== user?.id) ?? []

  const allGroupsForViewer = storyGroups ?? []

  const handleStoryClick = (group: StoryGroup) => {
    const idx = allGroupsForViewer.findIndex(
      (g) => g.profile.id === group.profile.id
    )
    setSelectedGroupIndex(Math.max(0, idx))
    setViewerOpen(true)
  }

  const handleAddStory = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      createStory({ file })
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (isLoading) {
    return <StoryBarSkeleton />
  }

  return (
    <>
      <div className="border-b border-[var(--border)] px-4 py-3">
        <div className="flex gap-4 overflow-x-auto scrollbar-none">
          {/* Kendi hikaye butonu */}
          {ownGroup ? (
            <StoryCircle
              group={ownGroup}
              onClick={() => handleStoryClick(ownGroup)}
              isOwn
              hasStory
            />
          ) : (
            <AddStoryButton
              onClick={handleAddStory}
              isLoading={uploading}
            />
          )}

          {/* Diğer hikayeler */}
          {otherGroups.map((group) => (
            <StoryCircle
              key={group.profile.id}
              group={group}
              onClick={() => handleStoryClick(group)}
            />
          ))}

          {/* Hikayelerin olmadığı durumda */}
          {otherGroups.length === 0 && !ownGroup && (
            <p className="text-xs text-[var(--text-muted)] self-center ml-2">
              Takip ettiğin kişilerin hikayeleri burada görünecek.
            </p>
          )}
        </div>
      </div>

      {/* Gizli dosya input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Story viewer */}
      <AnimatePresence>
        {viewerOpen && allGroupsForViewer.length > 0 && (
          <StoryViewer
            groups={allGroupsForViewer}
            initialGroupIndex={selectedGroupIndex}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ── Hikaye Ekle Butonu ────────────────────────────────────
const AddStoryButton = ({
  onClick,
  isLoading,
}: {
  onClick: () => void
  isLoading: boolean
}) => {
  const profile = useAuthStore((s) => s.profile)

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="flex flex-col items-center gap-1.5 w-16 shrink-0"
    >
      <div className="relative">
        <div className="w-14 h-14 rounded-full bg-[var(--bg-elevated)] border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="w-full h-full bg-[var(--bg-overlay)]" />
          )}
        </div>
        <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center border-2 border-[var(--bg-base)]">
          {isLoading ? (
            <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus size={11} className="text-[var(--text-inverse)]" />
          )}
        </div>
      </div>
      <span className="text-[11px] text-[var(--text-secondary)] truncate w-full text-center">
        Hikaye Ekle
      </span>
    </button>
  )
}

// ── Skeleton ──────────────────────────────────────────────
const StoryBarSkeleton = () => (
  <div className="border-b border-[var(--border)] px-4 py-3">
    <div className="flex gap-4 overflow-x-auto scrollbar-none">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 w-16 shrink-0">
          <Skeleton className="w-14 h-14" rounded="full" />
          <Skeleton className="w-10 h-2.5" />
        </div>
      ))}
    </div>
  </div>
)