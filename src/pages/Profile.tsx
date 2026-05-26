import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Badge, { VerifiedIcon } from '@/components/ui/Badge'
import type { BadgeId } from '@/components/ui/Badge'
import { ProfileSkeleton } from '@/components/ui/Skeleton'

type FollowState = 'none' | 'following' | 'requested'
type ProfileTab = 'posts' | 'media' | 'likes'

const editSchema = z.object({
  display_name: z.string().min(1, 'Görünen ad gerekli').max(50, 'En fazla 50 karakter'),
  bio: z.string().max(160, 'En fazla 160 karakter').optional(),
  website: z.string().max(100).optional(),
  location: z.string().max(30, 'En fazla 30 karakter').optional(),
})
type EditForm = z.infer<typeof editSchema>

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
          'group px-4 py-2 rounded-lg text-sm font-semibold border border-line text-text-primary',
          'hover:border-error hover:text-error transition-default flex items-center justify-center',
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
          'group px-4 py-2 rounded-lg text-sm font-semibold border border-line text-text-muted',
          'hover:border-error hover:text-error transition-default flex items-center justify-center',
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
  const [editOpen, setEditOpen] = useState(false)
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
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-full text-text-primary hover:bg-bg-overlay transition-default flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
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
          <Button variant="outline" className="w-full" onClick={() => setEditOpen(true)}>
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

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onSave={(updated) => {
          setMyProfile({ ...profile, ...updated })
          void queryClient.invalidateQueries({ queryKey: ['profile', username] })
          setEditOpen(false)
          toast.success('Profil güncellendi')
        }}
      />
    </div>
  )
}

// ── Edit Profile Modal ────────────────────────────────

function EditProfileModal({
  open,
  onClose,
  profile,
  onSave,
}: {
  open: boolean
  onClose: () => void
  profile: ProfileType
  onSave: (data: Partial<ProfileType>) => void
}) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [accentColor, setAccentColor] = useState(profile.profile_accent ?? '#6C63FF')
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const ACCENT_PRESETS = ['#6C63FF', '#E05A5A', '#4CAF82', '#E8C547', '#5A9FE0', '#E07BA0', '#F07A3B']

  const { register, handleSubmit, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      display_name: profile.display_name,
      bio: profile.bio ?? '',
      website: profile.website ?? '',
      location: profile.location ?? '',
    },
  })

  const pickFile = (ref: React.RefObject<HTMLInputElement | null>, onPick: (file: File) => void) => {
    const input = ref.current
    if (!input) return
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) onPick(file)
      input.value = ''
    }
    input.click()
  }

  const onSubmit = async (data: EditForm) => {
    if (!user) return
    setSaving(true)

    let avatar_url = profile.avatar_url
    let banner_url = profile.banner_url

    try {
      if (avatarFile) avatar_url = await uploadFile('avatars', avatarFile, uniquePath(user.id, avatarFile))
      if (bannerFile) banner_url = await uploadFile('banners', bannerFile, uniquePath(user.id, bannerFile))
    } catch {
      toast.error('Resim yüklenemedi')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('profiles').update({
      display_name: data.display_name,
      bio: data.bio || null,
      website: data.website || null,
      location: data.location || null,
      avatar_url,
      banner_url,
      ...(profile.is_nova_plus ? { profile_accent: accentColor } : {}),
    }).eq('id', user.id)

    setSaving(false)
    if (error) {
      toast.error('Profil güncellenemedi')
    } else {
      onSave({ ...data, avatar_url, banner_url, ...(profile.is_nova_plus ? { profile_accent: accentColor } : {}) })
    }
  }

  const currentAvatar = avatarPreview ?? profile.avatar_url
  const currentBanner = bannerPreview ?? profile.banner_url

  return (
    <Modal open={open} onClose={onClose} title="Profili Düzenle" size="sm">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Banner + avatar picker */}
        <div className="relative mb-14">
          <button
            type="button"
            onClick={() => pickFile(bannerInputRef, (f) => { setBannerFile(f); setBannerPreview(URL.createObjectURL(f)) })}
            className="w-full h-24 bg-bg-surface overflow-hidden group relative"
          >
            {currentBanner && <img src={currentBanner} alt="" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={20} className="text-white" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => pickFile(avatarInputRef, (f) => { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) })}
            className="absolute -bottom-10 left-4 w-20 h-20 rounded-full border-4 border-bg-base overflow-hidden bg-bg-elevated group"
          >
            {currentAvatar ? (
              <img src={currentAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted text-2xl font-bold">
                {profile.display_name[0]?.toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              <Camera size={16} className="text-white" />
            </div>
          </button>
        </div>

        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" />
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" />

        <div className="px-5 pb-5 space-y-4">
          <Input
            label="Görünen Ad"
            error={errors.display_name?.message}
            {...register('display_name')}
          />

          <div className="space-y-1.5">
            <label className="block text-text-secondary text-sm">Bio</label>
            <textarea
              rows={3}
              placeholder="Kendini tanıt..."
              className="w-full bg-bg-surface border border-line rounded-lg px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted transition-default focus:border-accent focus:outline-none resize-none"
              {...register('bio')}
            />
            {errors.bio && <p className="text-error text-xs">{errors.bio.message}</p>}
          </div>

          <Input
            label="Web Sitesi"
            placeholder="https://..."
            error={errors.website?.message}
            leftIcon={<Link2 size={14} />}
            {...register('website')}
          />

          <Input
            label="Konum"
            placeholder="Şehir, Ülke"
            error={errors.location?.message}
            leftIcon={<MapPin size={14} />}
            {...register('location')}
          />

          {profile.is_nova_plus && (
            <div className="space-y-2">
              <label className="block text-text-secondary text-sm">
                Profil Rengi <span className="text-accent text-xs ml-1">Nova+</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {ACCENT_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAccentColor(color)}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 transition-transform',
                      accentColor === color ? 'border-text-primary scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <label className="relative w-7 h-7 rounded-full overflow-hidden border border-line cursor-pointer" title="Özel renk">
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
                  />
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>
              <p className="text-text-muted text-xs">Takipçi sayısı, butonlar ve vurgular bu renge bürünür</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              Kaydet
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
