export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Yardımcı tipler ───────────────────────────────────

export type TargetType = 'post' | 'reel' | 'comment'
export type BookmarkTargetType = 'post' | 'reel'
export type MediaType = 'image' | 'video'
export type ServerRole = 'owner' | 'admin' | 'moderator' | 'member'
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
export type ReportReason = 'spam' | 'harassment' | 'hate_speech' | 'misinformation' | 'nsfw' | 'other'
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing'

export type PollOption = {
  id: string
  text: string
  vote_count: number
}

export type PollData = {
  question: string
  options: PollOption[]
  ends_at: string
  allows_multiple: boolean
}

export type EditHistoryEntry = {
  content: string
  edited_at: string
}

// ── Tablo Row tipleri ─────────────────────────────────

export type Profile = {
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
  google_setup_done: boolean
  search_vector: string | null
  created_at: string
  updated_at: string
}

export type Post = {
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
  search_vector: string | null
  created_at: string
  updated_at: string
}

export type Reel = {
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
}

export type Story = {
  id: string
  user_id: string
  media_url: string
  media_type: MediaType
  caption: string | null
  duration_seconds: number
  view_count: number
  expires_at: string
  created_at: string
}

export type StoryView = {
  story_id: string
  viewer_id: string
  viewed_at: string
}

export type PostView = {
  post_id: string
  viewer_id: string
  viewed_at: string
}

export type ReelView = {
  reel_id: string
  viewer_id: string
  viewed_at: string
}

export type Like = {
  id: string
  user_id: string
  target_id: string
  target_type: TargetType
  created_at: string
}

export type Repost = {
  id: string
  user_id: string
  post_id: string
  created_at: string
}

export type Bookmark = {
  id: string
  user_id: string
  target_id: string
  target_type: BookmarkTargetType
  created_at: string
}

export type Comment = {
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
}

export type Follow = {
  follower_id: string
  following_id: string
  created_at: string
}

export type FollowRequest = {
  requester_id: string
  target_id: string
  created_at: string
}

export type Block = {
  blocker_id: string
  blocked_id: string
  created_at: string
}

export type Mute = {
  muter_id: string
  muted_id: string
  created_at: string
}

export type Report = {
  id: string
  reporter_id: string
  target_id: string
  target_type: 'post' | 'reel' | 'comment' | 'profile' | 'server'
  reason: ReportReason
  description: string | null
  status: ReportStatus
  created_at: string
}

export type Server = {
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
}

export type ServerCategory = {
  id: string
  server_id: string
  name: string
  position: number
}

export type ServerChannel = {
  id: string
  server_id: string
  category_id: string | null
  name: string
  description: string | null
  position: number
  created_at: string
}

export type ServerMessage = {
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
}

export type ServerMember = {
  server_id: string
  user_id: string
  role: ServerRole
  nickname: string | null
  joined_at: string
}

export type Conversation = {
  id: string
  created_at: string
  last_message_at: string
}

export type ConversationParticipant = {
  conversation_id: string
  user_id: string
  last_read_at: string
}

export type DirectMessage = {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  media_urls: string[]
  is_read: boolean
  deleted_at: string | null
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  actor_id: string | null
  type: NotificationType
  target_id: string | null
  target_type: 'post' | 'reel' | 'comment' | 'profile' | 'server' | null
  message: string | null
  is_read: boolean
  created_at: string
}

export type Hashtag = {
  id: string
  name: string
  post_count: number
  created_at: string
}

export type PostHashtag = {
  post_id: string
  hashtag_id: string
}

export type Subscription = {
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

// ── Join tipleri (sorgularda kullanılan genişletilmiş tipler) ──

export type PostWithAuthor = Post & {
  profiles: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified' | 'is_nova_plus' | 'selected_badge'>
  quoted_post?: PostWithAuthor | null
}

export type ReelWithAuthor = Reel & {
  profiles: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified' | 'is_nova_plus'>
}

export type CommentWithAuthor = Comment & {
  profiles: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified' | 'is_nova_plus'>
}

export type ServerMessageWithAuthor = ServerMessage & {
  profiles: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified' | 'is_nova_plus'>
}

export type DirectMessageWithSender = DirectMessage & {
  profiles: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

export type NotificationWithActor = Notification & {
  actor: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null
}

// ── Insert tipleri (DB default'ları olan alanlar opsiyonel) ──

export type ProfileInsert = Pick<Profile, 'id' | 'username' | 'display_name'> & Partial<Omit<Profile, 'id' | 'username' | 'display_name'>>
export type PostInsert = Pick<Post, 'user_id' | 'content'> & Partial<Omit<Post, 'id' | 'user_id' | 'content' | 'created_at' | 'updated_at'>>
export type ReelInsert = Pick<Reel, 'user_id' | 'video_url' | 'duration_seconds'> & Partial<Omit<Reel, 'id' | 'user_id' | 'video_url' | 'duration_seconds' | 'created_at'>>
export type StoryInsert = Pick<Story, 'user_id' | 'media_url' | 'media_type'> & Partial<Omit<Story, 'id' | 'user_id' | 'media_url' | 'media_type' | 'created_at'>>
export type LikeInsert = Pick<Like, 'user_id' | 'target_id' | 'target_type'>
export type RepostInsert = Pick<Repost, 'user_id' | 'post_id'>
export type BookmarkInsert = Pick<Bookmark, 'user_id' | 'target_id' | 'target_type'>
export type CommentInsert = Pick<Comment, 'user_id' | 'target_id' | 'target_type' | 'content'> & Partial<Pick<Comment, 'reply_to_id'>>
export type CommentUpdate = Partial<Pick<Comment, 'content' | 'deleted_at'>>
export type FollowInsert = Pick<Follow, 'follower_id' | 'following_id'>
export type FollowRequestInsert = Pick<FollowRequest, 'requester_id' | 'target_id'>
export type BlockInsert = Pick<Block, 'blocker_id' | 'blocked_id'>
export type MuteInsert = Pick<Mute, 'muter_id' | 'muted_id'>
export type ReportInsert = Pick<Report, 'reporter_id' | 'target_id' | 'target_type' | 'reason'> & Partial<Pick<Report, 'description'>>
export type ServerInsert = Pick<Server, 'owner_id' | 'name'> & Partial<Omit<Server, 'id' | 'owner_id' | 'name' | 'created_at' | 'updated_at'>>
export type ServerCategoryInsert = Pick<ServerCategory, 'server_id' | 'name'> & Partial<Pick<ServerCategory, 'position'>>
export type ServerChannelInsert = Pick<ServerChannel, 'server_id' | 'name'> & Partial<Omit<ServerChannel, 'id' | 'server_id' | 'name' | 'created_at'>>
export type ServerMessageInsert = Pick<ServerMessage, 'channel_id' | 'user_id'> & Partial<Omit<ServerMessage, 'id' | 'channel_id' | 'user_id' | 'created_at' | 'updated_at'>>
export type ServerMemberInsert = Pick<ServerMember, 'server_id' | 'user_id'> & Partial<Pick<ServerMember, 'role' | 'nickname'>>
export type DirectMessageInsert = Pick<DirectMessage, 'conversation_id' | 'sender_id'> & Partial<Omit<DirectMessage, 'id' | 'conversation_id' | 'sender_id' | 'created_at'>>
export type StoryViewInsert = Pick<StoryView, 'story_id' | 'viewer_id'>
export type PostViewInsert = Pick<PostView, 'post_id' | 'viewer_id'>
export type ReelViewInsert = Pick<ReelView, 'reel_id' | 'viewer_id'>
export type PostHashtagInsert = Pick<PostHashtag, 'post_id' | 'hashtag_id'>

// ── Supabase Database tipi ────────────────────────────

type T<R, I = Partial<R>, U = Partial<R>> = { Row: R; Insert: I; Update: U; Relationships: [] }

export type Database = {
  public: {
    Tables: {
      profiles:                 T<Profile,                 ProfileInsert,                     Partial<ProfileInsert>>
      posts:                    T<Post,                    PostInsert,                        Partial<PostInsert>>
      reels:                    T<Reel,                    ReelInsert,                        Partial<ReelInsert>>
      stories:                  T<Story,                   StoryInsert,                       Partial<StoryInsert>>
      story_views:              T<StoryView,               StoryViewInsert,                   Partial<StoryViewInsert>>
      post_views:               T<PostView,                PostViewInsert,                    Partial<PostViewInsert>>
      reel_views:               T<ReelView,                ReelViewInsert,                    Partial<ReelViewInsert>>
      likes:                    T<Like,                    LikeInsert,                        Partial<LikeInsert>>
      reposts:                  T<Repost,                  RepostInsert,                      Partial<RepostInsert>>
      bookmarks:                T<Bookmark,                BookmarkInsert,                    Partial<BookmarkInsert>>
      comments:                 T<Comment,                 CommentInsert,                     CommentUpdate>
      follows:                  T<Follow,                  FollowInsert,                      Partial<FollowInsert>>
      follow_requests:          T<FollowRequest,           FollowRequestInsert,               Partial<FollowRequestInsert>>
      blocks:                   T<Block,                   BlockInsert,                       Partial<BlockInsert>>
      mutes:                    T<Mute,                    MuteInsert,                        Partial<MuteInsert>>
      reports:                  T<Report,                  ReportInsert,                      Partial<ReportInsert>>
      servers:                  T<Server,                  ServerInsert,                      Partial<ServerInsert>>
      server_categories:        T<ServerCategory,          ServerCategoryInsert,              Partial<ServerCategoryInsert>>
      server_channels:          T<ServerChannel,           ServerChannelInsert,               Partial<ServerChannelInsert>>
      server_messages:          T<ServerMessage,           ServerMessageInsert,               Partial<ServerMessageInsert>>
      server_members:           T<ServerMember,            ServerMemberInsert,                Partial<ServerMemberInsert>>
      conversations:            T<Conversation,            Partial<Conversation>,             Partial<Conversation>>
      conversation_participants: T<ConversationParticipant, Pick<ConversationParticipant, 'conversation_id' | 'user_id'>, Partial<ConversationParticipant>>
      direct_messages:          T<DirectMessage,           DirectMessageInsert,               Partial<DirectMessageInsert>>
      notifications:            T<Notification,            Partial<Notification>,             Partial<Notification>>
      hashtags:                 T<Hashtag,                 Pick<Hashtag, 'name'>,             Partial<Hashtag>>
      post_hashtags:            T<PostHashtag,             PostHashtagInsert,                 Partial<PostHashtag>>
      subscriptions:            T<Subscription,            Partial<Subscription>,             Partial<Subscription>>
    }
    Views: Record<string, never>
    Functions: {
      compute_post_score: {
        Args: {
          p_like_count: number
          p_repost_count: number
          p_reply_count: number
          p_created_at: string
        }
        Returns: number
      }
    }
  }
}
