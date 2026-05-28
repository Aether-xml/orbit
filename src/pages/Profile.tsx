import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Lock, MapPin, Link2, Calendar, UserCheck, Camera, Settings as SettingsIcon, Images, Heart } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { cn, formatCount } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { uploadFile, uniquePath } from '@/lib/upload'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { Profile as ProfileType, PostWithAuthor } from '@/types/database'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Badge, { VerifiedIcon } from '@/components/ui/Badge'
import type { BadgeId } from '@/components/ui/Badge'
import { ProfileSkeleton } from '@/components/ui/Skeleton'

type FollowState = 'none' | 'following' | 'requested'
type ProfileTab = 'posts' | 'media' | 'likes'

// ── Grid cell ─────────────────────────────────────────

function PostGridCell({ post, onClick }: { post: PostWithAuthor; onClick: () => void }) {
  const hasMedia = (post.media_urls?.length ?? 0) > 0
  const firstUrl = post.media_urls?.[0]
  const isVideo = hasMedia && post.media_types?.[0] === 'video'
  const hasMultiple = (post.media_urls?.length ?? 0) > 1

  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-square bg-bg-elevated overflow-hidden relative group"
    >
      {hasMedia && firstUrl ? (
        isVideo ? (
          <video src={firstUrl} className="w-full h-full object-cover" muted preload="metadata" />
        ) : (
          <img
            src={firstUrl}
            alt=""
            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        )
      ) : (
        <div className="w-full h-full flex items-start p-2.5 bg-bg-surface">
          <p className="text-text-secondary text-[10px] leading-tight line-clamp-5 text-left">
            {post.content}
          </p>
        </div>
      )}

      {hasMultiple && (
        <div className="absolute top-1.5 right-1.5 drop-shadow-sm">
          <Images size={13} className="text-white" />
        </div>
      )}

      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5">
        <Heart size={9} className="fill-white text-white drop-shadow" />
        <span className="text-white text-[9px] font-semibold drop-shadow leading-none">
          {formatCount(post.like_count)}
        </span>
      </div>
    </button>
  )
}

// ── Follow button ─────────────────────────────────────

function FollowButton({
  followState,
  onToggle,
  isPrivate,
  className,
}: {
  followState: FollowState
  onToggle: () => void
  isPrivate: boolean
  className?: string
}) {
  if (followState === 'following') {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'group px-4 py-2 rounded-lg text-sm font-semibold',
          'border border-line bg-bg-surface hover:bg-bg-elevated text-text-primary',
          'hover:border-error/60 hover:text-error transition-default flex items-center justify-center',
          className
        )}
      >
        <span className="group-hover:hidden flex items-center gap-1.5">
          <UserCheck size={14} />Takip Ediliyor
        </span>
        <span className="hidden group-hover:block">Takibi Bırak</span>
      </button>
    )
  }
  if (followState === 'requested') {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'group px-4 py-2 rounded-lg text-sm font-semibold',
          'border border-line bg-bg-surface hover:bg-bg-elevated text-text-muted',
          'hover:border-error/60 hover:text-error transition-default flex items-center justify-center',
          className
        )}
      >
        <span className="group-hover:hidden">İstek Gönderildi</span>
        <span className="hidden group-hover:block">İptal Et</span>
      </button>
    )
  }
  return (
    <Button className={cn('py-2', className)} onClick={onToggle}>
      {isPrivate ? 'İstek Gönder' : 'Takip Et'}
    </Button>
  )
}

// ── Locked profile ────────────────────────────────────

function LockedProfile({ isRequested }: { isRequested: boolean }) {
  return (
    <div className="flex flex-col items-center py-16 px-4 text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-bg-elevated flex items-center justify-center">
        <Lock size={22} className="text-text-muted" />
      </div>
      <h3 className="font-semibold text-text-primary">Bu hesap gizli</h3>
      <p className="text-text-muted text-sm max-w-xs">
        {isRequested
          ? 'Takip isteğin onaylandığında gönderileri görebilirsin.'
          : 'Gönderileri görmek için bu hesabı takip et.'}
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────

export default function Profile() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user, setProfile: setMyProfile } = useAuthStore()
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<ProfileTab>('posts')
  const [followState, setFollowState] = useState<FollowState>('none')
  const [followerCount, setFollowerCount] = useState(0)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username!)
        .single()
      if (error) throw error
      return data as ProfileType
    },
    enabled: !!username,
  })

  const isOwn = user?.id === profile?.id

  useEffect(() => {
    if (profile) setFollowerCount(profile.follower_count)
  }, [profile])

  const { data: followStatus } = useQuery({
    queryKey: ['follow-status', profile?.id, user?.id],
    queryFn: async (): Promise<FollowState> => {
      if (!user?.id || !profile?.id) return 'none'
      const [{ data: follow }, { data: request }] = await Promise.all([
        supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', profile.id).maybeSingle(),
        supabase.from('follow_requests').select('requester_id').eq('requester_id', user.id).eq('target_id', profile.id).maybeSingle(),
      ])
      if (follow) return 'following'
      if (request) return 'requested'
      return 'none'
    },
    enabled: !!user?.id && !!profile?.id && !isOwn,
  })

  useEffect(() => {
    if (followStatus) setFollowState(followStatus)
  }, [followStatus])

  const canViewPosts = !profile?.is_private || isOwn || followState === 'following'

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['profile-posts', profile?.id, tab],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      const base = supabase
        .from('posts')
        .select('*, profiles!inner(id, username, display_name, avatar_url, is_verified, is_nova_plus, selected_badge)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(60)

      if (tab === 'posts') {
        const { data } = await base.eq('user_id', profile!.id).is('reply_to_id', null)
        return (data ?? []) as unknown as PostWithAuthor[]
      }
      if (tab === 'media') {
        const { data } = await base.eq('user_id', profile!.id).not('media_urls', 'eq', '{}')
        return (data ?? []) as unknown as PostWithAuthor[]
      }

      const { data: likedIds } = await supabase
        .from('likes')
        .select('target_id')
        .eq('user_id', profile!.id)
        .eq('target_type', 'post')
        .order('created_at', { ascending: false })
        .limit(60)

      if (!likedIds?.length) return []
      const ids = likedIds.map((l) => l.target_id)
      const { data } = await supabase
        .from('posts')
        .select('*, profiles!inner(id, username, display_name, avatar_url, is_verified, is_nova_plus, selected_badge)')
        .in('id', ids)
        .is('deleted_at', null)
      return (data ?? []) as unknown as PostWithAuthor[]
    },
    enabled: !!profile?.id && canViewPosts,
  })

  // ── Handlers ──────────────────────────────────────────

  const handleFollow = async () => {
    if (!user || !profile) return
    const prev = followState
    if (followState === 'following') {
      setFollowState('none')
      setFollowerCount((c) => c - 1)
      const { error } = await supabase.from('follows').delete().match({ follower_id: user.id, following_id: profile.id })
      if (error) { setFollowState(prev); setFollowerCount((c) => c + 1); toast.error('İşlem başarısız') }
    } else if (followState === 'requested') {
      setFollowState('none')
      const { error } = await supabase.from('follow_requests').delete().match({ requester_id: user.id, target_id: profile.id })
      if (error) { setFollowState(prev); toast.error('İşlem başarısız') }
    } else {
      if (profile.is_private) {
        setFollowState('requested')
        const { error } = await supabase.from('follow_requests').insert({ requester_id: user.id, target_id: profile.id })
        if (error) { setFollowState('none'); toast.error('İşlem başarısız') }
      } else {
        setFollowState('following')
        setFollowerCount((c) => c + 1)
        const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id })
        if (error) { setFollowState('none'); setFollowerCount((c) => c - 1); toast.error('İşlem başarısız') }
      }
    }
  }

  const handleMessage = async () => {
    if (!user || !profile) return
    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (myConvs?.length) {
      const myIds = myConvs.map((c) => c.conversation_id)
      const { data: shared } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', profile.id)
        .in('conversation_id', myIds)
        .limit(1)
      if (shared?.[0]) {
        navigate(`/mesajlar/${shared[0].conversation_id}`)
        return
      }
    }

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({})
      .select('id')
      .single()

    if (error || !conv) { toast.error('Mesaj başlatılamadı'); return }

    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: profile.id },
    ])
    navigate(`/mesajlar/${conv.id}`)
  }

  const pickFile = (
    ref: React.RefObject<HTMLInputElement | null>,
    onPick: (file: File) => void
  ) => {
    const input = ref.current
    if (!input) return
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) onPick(file)
      input.value = ''
    }
    input.click()
  }

  const handleAvatarChange = async (file: File) => {
    if (!user || !profile) return
    try {
      const url = await uploadFile('avatars', file, uniquePath(user.id, file))
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      setMyProfile({ ...profile, avatar_url: url })
      void queryClient.invalidateQueries({ queryKey: ['profile', username] })
      toast.success('Profil fotoğrafı güncellendi')
    } catch {
      toast.error('Fotoğraf yüklenemedi')
    }
  }

  const handleBannerChange = async (file: File) => {
    if (!user || !profile) return
    try {
      const url = await uploadFile('banners', file, uniquePath(user.id, file))
      await supabase.from('profiles').update({ banner_url: url }).eq('id', user.id)
      setMyProfile({ ...profile, banner_url: url })
      void queryClient.invalidateQueries({ queryKey: ['profile', username] })
      toast.success('Kapak fotoğrafı güncellendi')
    } catch {
      toast.error('Fotoğraf yüklenemedi')
    }
  }

  // ── Render guards ─────────────────────────────────────

  if (isLoading) return <ProfileSkeleton />

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <h2 className="text-text-primary font-semibold mb-2">Kullanıcı bulunamadı</h2>
        <p className="text-text-muted text-sm">@{username} adlı kullanıcı mevcut değil.</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh">
      {/* Hidden file inputs — own profile only */}
      {isOwn && (
        <>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" />
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" />
        </>
      )}

      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-line h-14 flex items-center px-2 gap-2">
        {isOwn ? (
          <div className="w-10 h-10 flex-shrink-0" />
        ) : (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full text-text-primary hover:bg-bg-overlay transition-default flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <span className="flex-1 text-center font-semibold text-text-primary text-sm truncate px-2">
          {profile.display_name}
        </span>
        {isOwn ? (
          <button
            type="button"
            onClick={() => navigate('/ayarlar')}
            aria-label="Ayarlar"
            className="p-2 rounded-full text-text-primary hover:bg-bg-overlay transition-default flex-shrink-0"
          >
            <SettingsIcon size={20} />
          </button>
        ) : (
          <div className="w-10 h-10 flex-shrink-0" />
        )}
      </div>

      {/* Banner */}
      <div className="relative">
        <div
          className={cn('h-32 overflow-hidden relative', isOwn && 'cursor-pointer group')}
          onClick={
            isOwn
              ? () => pickFile(bannerInputRef, (f) => void handleBannerChange(f))
              : undefined
          }
        >
          {profile.banner_url ? (
            <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-bg-surface" />
          )}
          {isOwn && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={22} className="text-white" />
            </div>
          )}
        </div>

        {/* Avatar — centered, overlapping banner bottom */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-12">
          <div
            className={cn(
              'relative rounded-full border-4 border-bg-base',
              isOwn && 'cursor-pointer group'
            )}
            onClick={
              isOwn
                ? () => pickFile(avatarInputRef, (f) => void handleAvatarChange(f))
                : undefined
            }
          >
            <Avatar
              src={profile.avatar_url}
              fallback={profile.display_name}
              size="xl"
              isNova={profile.is_nova_plus}
            />
            {isOwn && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={16} className="text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name — centered */}
      <div className="pt-16 px-4 text-center">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <h2 className="text-xl font-bold text-text-primary">{profile.display_name}</h2>
          {profile.is_verified && <VerifiedIcon size={17} />}
          {profile.selected_badge && (
            <Badge id={profile.selected_badge as BadgeId} size="sm" showLabel />
          )}
          {profile.is_private && <Lock size={13} className="text-text-muted" />}
        </div>
        <p className="text-text-secondary text-sm mt-0.5">@{profile.username}</p>
      </div>

      {/* Stats row */}
      <div className="flex mt-4 px-4 gap-1">
        <div className="flex-1 flex flex-col items-center gap-0.5 py-2">
          <span className="font-bold text-text-primary text-xl leading-none">
            {formatCount(profile.post_count)}
          </span>
          <span className="text-text-muted text-xs">Gönderi</span>
        </div>
        <button
          type="button"
          className="flex-1 flex flex-col items-center gap-0.5 py-2 hover:bg-bg-overlay rounded-lg transition-default"
          onClick={() => navigate(`/${username}/takipciler`)}
        >
          <span className="font-bold text-text-primary text-xl leading-none">
            {formatCount(followerCount)}
          </span>
          <span className="text-text-muted text-xs">Takipçi</span>
        </button>
        <button
          type="button"
          className="flex-1 flex flex-col items-center gap-0.5 py-2 hover:bg-bg-overlay rounded-lg transition-default"
          onClick={() => navigate(`/${username}/takip`)}
        >
          <span className="font-bold text-text-primary text-xl leading-none">
            {formatCount(profile.following_count)}
          </span>
          <span className="text-text-muted text-xs">Takip</span>
        </button>
      </div>

      {/* Action buttons */}
      <div className="px-4 mt-3">
        {isOwn ? (
          <Button variant="outline" className="w-full" onClick={() => navigate('/profil-duzenle')}>
            Profili Düzenle
          </Button>
        ) : (
          <div className="flex gap-2">
            <FollowButton
              className="flex-1"
              followState={followState}
              onToggle={() => void handleFollow()}
              isPrivate={profile.is_private}
            />
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => void handleMessage()}
            >
              Mesaj
            </Button>
          </div>
        )}
      </div>

      {/* Bio section */}
      <div className="px-4 mt-4 space-y-1.5">
        {profile.bio && (
          <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-accent text-xs hover:underline"
            >
              <Link2 size={12} />
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {profile.location && (
            <span className="flex items-center gap-1 text-text-muted text-xs">
              <MapPin size={12} /> {profile.location}
            </span>
          )}
          <span className="flex items-center gap-1 text-text-muted text-xs">
            <Calendar size={12} />
            {format(new Date(profile.created_at), 'MMMM yyyy', { locale: tr })} tarihinde katıldı
          </span>
        </div>
      </div>

      {/* Tabs with sliding gold indicator */}
      <div className="border-b border-line flex sticky top-14 z-10 bg-bg-base/90 backdrop-blur-md mt-4">
        {(['posts', 'media', 'likes'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-default relative',
              tab === t
                ? 'text-text-primary'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-overlay'
            )}
          >
            {{ posts: 'Gönderiler', media: 'Medya', likes: 'Beğendikleri' }[t]}
            {tab === t && (
              <motion.span
                layoutId="profile-tab-indicator"
                className="absolute bottom-0 inset-x-0 h-0.5 bg-accent"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {!canViewPosts ? (
        <LockedProfile isRequested={followState === 'requested'} />
      ) : postsLoading ? (
        <div className="grid grid-cols-3 gap-px bg-line mt-px">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-bg-elevated animate-pulse" />
          ))}
        </div>
      ) : !posts?.length ? (
        <div className="flex flex-col items-center py-16 text-center px-4">
          <p className="text-text-muted text-sm">
            {tab === 'posts'
              ? 'Henüz gönderi yok.'
              : tab === 'media'
              ? 'Medya içerikli gönderi yok.'
              : 'Beğenilen gönderi yok.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-px bg-line mt-px">
          {posts.map((post) => (
            <PostGridCell
              key={post.id}
              post={post}
              onClick={() => navigate(`/gonderi/${post.id}`)}
            />
          ))}
        </div>
      )}

    </div>
  )
}

