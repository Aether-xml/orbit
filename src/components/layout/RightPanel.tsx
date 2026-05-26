import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Hashtag, Profile } from '@/types/database'

export default function RightPanel() {
  return (
    <aside className="w-[320px] flex-shrink-0">
      <div className="sticky top-0 pt-4 space-y-4">
        <SearchBox />
        <TrendingHashtags />
        <SuggestedUsers />
      </div>
    </aside>
  )
}

function SearchBox() {
  return (
    <Link
      to="/kesif"
      className="flex items-center gap-3 bg-bg-surface border border-line rounded-full px-4 py-2.5 text-text-muted hover:border-accent transition-default group"
    >
      <Search size={15} className="group-hover:text-accent transition-default" />
      <span className="text-sm">Ara...</span>
    </Link>
  )
}

function TrendingHashtags() {
  const [hashtags, setHashtags] = useState<Hashtag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('hashtags')
      .select('*')
      .order('post_count', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setHashtags(data as Hashtag[])
        setLoading(false)
      })
  }, [])

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp size={15} className="text-accent" />
        <h3 className="text-text-primary text-sm font-semibold">Gündem</h3>
      </div>

      {loading ? (
        <HashtagSkeletons />
      ) : hashtags.length === 0 ? (
        <p className="text-text-muted text-xs">Henüz trend yok.</p>
      ) : (
        <ul className="space-y-2">
          {hashtags.map((tag) => (
            <li key={tag.id}>
              <Link
                to={`/kesif?q=%23${tag.name}`}
                className="flex items-center justify-between group"
              >
                <span className="text-text-primary text-sm font-medium group-hover:text-accent transition-default">
                  #{tag.name}
                </span>
                <span className="text-text-muted text-xs">{tag.post_count} post</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type SuggestedProfile = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'follower_count' | 'is_verified' | 'is_nova_plus'>

function SuggestedUsers() {
  const { profile: currentProfile } = useAuthStore()
  const [users, setUsers] = useState<SuggestedProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentProfile) return
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, follower_count, is_verified, is_nova_plus')
      .neq('id', currentProfile.id)
      .order('follower_count', { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (data) setUsers(data as SuggestedProfile[])
        setLoading(false)
      })
  }, [currentProfile])

  return (
    <div className="card p-4 space-y-3">
      <h3 className="text-text-primary text-sm font-semibold">Önerilen Kişiler</h3>

      {loading ? (
        <UserSkeletons />
      ) : users.length === 0 ? (
        <p className="text-text-muted text-xs">Öneri bulunamadı.</p>
      ) : (
        <ul className="space-y-3">
          {users.map((user) => (
            <li key={user.id} className="flex items-center gap-3">
              <Link to={`/${user.username}`} className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-bg-elevated border border-line overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">
                      {user.display_name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/${user.username}`} className="flex items-center gap-1 hover:underline">
                  <span className="text-text-primary text-sm font-medium truncate">{user.display_name}</span>
                  {user.is_nova_plus && <span className="text-accent text-xs flex-shrink-0">⭐</span>}
                  {user.is_verified && <span className="text-info text-xs flex-shrink-0">✓</span>}
                </Link>
                <p className="text-text-muted text-xs">@{user.username}</p>
              </div>
              <FollowButton userId={user.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FollowButton({ userId }: { userId: string }) {
  const { user } = useAuthStore()
  const [followed, setFollowed] = useState(false)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (!user || loading) return
    setLoading(true)
    if (followed) {
      await supabase.from('follows').delete()
        .eq('follower_id', user.id).eq('following_id', userId)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: userId })
    }
    setFollowed((v) => !v)
    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-default flex-shrink-0 ${
        followed
          ? 'border border-line text-text-secondary hover:text-error hover:border-error'
          : 'bg-accent hover:bg-accent-hover text-text-inverse'
      }`}
    >
      {followed ? 'Takip Ediliyor' : 'Takip Et'}
    </button>
  )
}

function HashtagSkeletons() {
  return (
    <ul className="space-y-2">
      {[80, 60, 70, 50, 65].map((w) => (
        <li key={w} className="flex items-center justify-between">
          <div className={`skeleton h-4 rounded`} style={{ width: `${w}%` }} />
          <div className="skeleton h-3 w-12 rounded" />
        </li>
      ))}
    </ul>
  )
}

function UserSkeletons() {
  return (
    <ul className="space-y-3">
      {[1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3.5 w-24 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
          <div className="skeleton h-7 w-20 rounded-full" />
        </li>
      ))}
    </ul>
  )
}
