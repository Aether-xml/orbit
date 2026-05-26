import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { Story, Profile } from '@/types/database'
import StoryViewer from './StoryViewer'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'

export type StoryWithAuthor = Story & {
  profiles: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_nova_plus'>
}

export type StoryGroup = {
  userId: string
  profile: StoryWithAuthor['profiles']
  stories: StoryWithAuthor[]
  hasUnseen: boolean
}

const STORY_COLORS = ['#7C3AED', '#E05A5A', '#E8C547', '#4CAF82', '#5A9FE0', '#E05A9F']

export default function StoriesBar() {
  const { user, profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [viewingIdx, setViewingIdx] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [storyText, setStoryText] = useState('')
  const [selectedColor, setSelectedColor] = useState(STORY_COLORS[0] ?? '#7C3AED')
  const [creating, setCreating] = useState(false)

  const { data: groups = [] } = useQuery({
    queryKey: ['stories', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const userIds = [user.id, ...(follows?.map((f) => f.following_id) ?? [])]

      const { data: stories } = await supabase
        .from('stories')
        .select('*, profiles!inner(id, username, display_name, avatar_url, is_nova_plus)')
        .in('user_id', userIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (!stories?.length) return []

      const { data: views } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', user.id)
        .in('story_id', stories.map((s) => s.id))

      const viewedIds = new Set(views?.map((v) => v.story_id) ?? [])
      const grouped = new Map<string, StoryGroup>()

      for (const story of (stories as unknown as StoryWithAuthor[])) {
        if (!grouped.has(story.user_id)) {
          grouped.set(story.user_id, {
            userId: story.user_id,
            profile: story.profiles,
            stories: [],
            hasUnseen: false,
          })
        }
        const g = grouped.get(story.user_id)!
        g.stories.push(story)
        if (!viewedIds.has(story.id)) g.hasUnseen = true
      }

      return [...grouped.values()].sort((a, b) => {
        if (a.userId === user.id) return -1
        if (b.userId === user.id) return 1
        if (a.hasUnseen && !b.hasUnseen) return -1
        if (!a.hasUnseen && b.hasUnseen) return 1
        return 0
      })
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  })

  const myGroup = groups.find((g) => g.userId === user?.id)
  const otherGroups = groups.filter((g) => g.userId !== user?.id)

  const handleCreate = async () => {
    if (!storyText.trim() || !user) return
    setCreating(true)

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { error } = await supabase.from('stories').insert({
      user_id: user.id,
      media_url: selectedColor,
      media_type: 'image',
      caption: storyText.trim(),
      duration_seconds: 7,
      expires_at: expires,
    })

    setCreating(false)
    if (error) {
      toast.error('Hikaye oluşturulamadı')
    } else {
      setStoryText('')
      setCreateOpen(false)
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      toast.success('Hikaye paylaşıldı')
    }
  }

  const allGroupsForViewer = myGroup ? [myGroup, ...otherGroups] : otherGroups

  return (
    <>
      <div className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-line">
        {/* My story / Add story */}
        <button
          type="button"
          onClick={() => {
            if (myGroup) {
              setViewingIdx(0)
            } else {
              setCreateOpen(true)
            }
          }}
          className="flex flex-col items-center gap-1.5 flex-shrink-0"
        >
          <div className="relative">
            <div className={cn(
              'w-14 h-14 rounded-full',
              myGroup
                ? 'p-0.5 bg-gradient-to-tr from-accent to-accent/60'
                : 'border-2 border-dashed border-line'
            )}>
              <div className="w-full h-full rounded-full overflow-hidden bg-bg-elevated">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted text-lg font-medium">
                    {profile?.display_name[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            {!myGroup && (
              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-accent border-2 border-bg-base flex items-center justify-center">
                <Plus size={10} className="text-bg-base" strokeWidth={3} />
              </span>
            )}
          </div>
          <span className="text-[11px] text-text-muted w-14 text-center truncate">
            {myGroup ? 'Hikayem' : 'Hikaye ekle'}
          </span>
        </button>

        {/* Others' stories */}
        {otherGroups.map((group, i) => (
          <button
            key={group.userId}
            type="button"
            onClick={() => setViewingIdx(myGroup ? i + 1 : i)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className={cn(
              'w-14 h-14 rounded-full p-0.5',
              group.hasUnseen
                ? 'bg-gradient-to-tr from-accent to-purple-500'
                : 'bg-bg-elevated border border-line'
            )}>
              <div className="w-full h-full rounded-full overflow-hidden bg-bg-elevated">
                <Avatar src={group.profile.avatar_url} fallback={group.profile.display_name} size="lg" />
              </div>
            </div>
            <span className="text-[11px] text-text-muted w-14 text-center truncate">
              {group.profile.username}
            </span>
          </button>
        ))}
      </div>

      {/* Story Viewer */}
      {viewingIdx !== null && allGroupsForViewer.length > 0 && (
        <StoryViewer
          groups={allGroupsForViewer}
          initialGroupIdx={viewingIdx}
          onClose={() => {
            setViewingIdx(null)
            queryClient.invalidateQueries({ queryKey: ['stories'] })
          }}
        />
      )}

      {/* Create Story Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Hikaye Oluştur" size="sm">
        <div className="p-4 space-y-4">
          {/* Preview */}
          <div
            className="w-full h-48 rounded-xl flex items-center justify-center p-6 transition-colors"
            style={{ backgroundColor: selectedColor }}
          >
            <p className="text-white text-lg font-semibold text-center leading-relaxed break-words">
              {storyText || 'Hikaye metni buraya gelecek...'}
            </p>
          </div>

          {/* Text input */}
          <textarea
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            placeholder="Hikayene bir şeyler yaz..."
            rows={3}
            maxLength={200}
            className="w-full bg-bg-surface border border-line rounded-lg px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
          />

          {/* Color picker */}
          <div className="flex gap-2">
            {STORY_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={cn(
                  'w-8 h-8 rounded-full transition-default border-2',
                  selectedColor === color ? 'border-white scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <Button
            className="w-full"
            onClick={() => void handleCreate()}
            disabled={!storyText.trim()}
            loading={creating}
          >
            Paylaş
          </Button>
        </div>
      </Modal>
    </>
  )
}
