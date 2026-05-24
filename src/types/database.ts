export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  website: string | null
  location: string | null
  status_text: string | null
  is_verified: boolean
  is_nova_plus: boolean
  nova_plus_until: string | null
  is_private: boolean
  profile_accent: string
  username_color: string | null
  selected_badge: string | null
  earned_badges: string[]
  follower_count: number
  following_count: number
  post_count: number
  reel_count: number
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  content: string
  media_urls: string[]
  media_types: string[]
  poll_data: PollData | null
  reply_to_id: string | null
  quote_of_id: string | null
  thread_id: string | null
  thread_position: number | null
  like_count: number
  repost_count: number
  reply_count: number
  bookmark_count: number
  view_count: number
  is_edited: boolean
  edit_history: EditHistoryEntry[]
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Join'lar
  profiles?: Profile
  user_liked?: boolean
  user_reposted?: boolean
  user_bookmarked?: boolean
}

export interface PollData {
  question: string
  options: PollOption[]
  ends_at: string
  allows_multiple: boolean
}

export interface PollOption {
  id: string
  text: string
  vote_count: number
}

export interface EditHistoryEntry {
  content: string
  edited_at: string
}

export interface Reel {
  id: string
  user_id: string
  video_url: string
  thumbnail_url: string | null
  caption: string | null
  music_name: string | null
  music_artist: string | null
  duration_seconds: number
  like_count: number
  comment_count: number
  share_count: number
  view_count: number
  deleted_at: string | null
  created_at: string
  // Join'lar
  profiles?: Profile
  user_liked?: boolean
  user_bookmarked?: boolean
}

export interface Story {
  id: string
  user_id: string
  media_url: string
  media_type: 'image' | 'video'
  caption: string | null
  duration_seconds: number
  view_count: number
  expires_at: string
  created_at: string
  // Join'lar
  profiles?: Profile
  viewed?: boolean
}

export interface Comment {
  id: string
  user_id: string
  target_id: string
  target_type: 'post' | 'reel'
  content: string
  reply_to_id: string | null
  like_count: number
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Join'lar
  profiles?: Profile
  user_liked?: boolean
  replies?: Comment[]
}

export interface Server {
  id: string
  owner_id: string
  name: string
  description: string | null
  avatar_url: string | null
  banner_url: string | null
  invite_code: string
  is_public: boolean
  member_count: number
  created_at: string
  updated_at: string
  // Join'lar
  profiles?: Profile
  user_role?: ServerRole
}

export type ServerRole = 'owner' | 'admin' | 'moderator' | 'member'

export interface ServerChannel {
  id: string
  server_id: string
  category_id: string | null
  name: string
  description: string | null
  position: number
  created_at: string
}

export interface ServerCategory {
  id: string
  server_id: string
  name: string
  position: number
  channels?: ServerChannel[]
}

export interface ServerMessage {
  id: string
  channel_id: string
  user_id: string
  content: string | null
  media_urls: string[]
  reply_to_id: string | null
  is_edited: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Join'lar
  profiles?: Profile
}

export interface DirectMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  media_urls: string[]
  is_read: boolean
  deleted_at: string | null
  created_at: string
  // Join'lar
  profiles?: Profile
}

export interface Conversation {
  id: string
  created_at: string
  last_message_at: string
  // Join'lar
  participants?: Profile[]
  last_message?: DirectMessage
  unread_count?: number
}

export interface Notification {
  id: string
  user_id: string
  actor_id: string | null
  type: NotificationType
  target_id: string | null
  target_type: NotificationTargetType | null
  message: string | null
  is_read: boolean
  created_at: string
  // Join'lar
  actor?: Profile
}

export type NotificationType =
  | 'like'
  | 'repost'
  | 'follow'
  | 'follow_request'
  | 'follow_accepted'
  | 'comment'
  | 'mention'
  | 'reply'
  | 'server_invite'
  | 'quote'

export type NotificationTargetType =
  | 'post'
  | 'reel'
  | 'comment'
  | 'profile'
  | 'server'

export interface Hashtag {
  id: string
  name: string
  post_count: number
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing'

export interface Block {
  blocker_id: string
  blocked_id: string
  created_at: string
  profiles?: Profile
}

export interface Mute {
  muter_id: string
  muted_id: string
  created_at: string
  profiles?: Profile
}

export interface FollowRequest {
  requester_id: string
  target_id: string
  created_at: string
  profiles?: Profile
}

export interface Report {
  id: string
  reporter_id: string
  target_id: string
  target_type: ReportTargetType
  reason: ReportReason
  description: string | null
  status: ReportStatus
  created_at: string
}

export type ReportTargetType = 'post' | 'reel' | 'comment' | 'profile' | 'server'
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'misinformation'
  | 'nsfw'
  | 'other'
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'