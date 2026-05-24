import type {
  Server,
  ServerCategory,
  ServerChannel,
  ServerMessage,
  Profile,
  ServerRole,
} from './database'

export interface ServerWithDetails extends Server {
  categories: ServerCategoryWithChannels[]
  members: ServerMemberWithProfile[]
}

export interface ServerCategoryWithChannels extends ServerCategory {
  channels: ServerChannel[]
}

export interface ServerMemberWithProfile {
  server_id: string
  user_id: string
  role: ServerRole
  nickname: string | null
  joined_at: string
  profiles: Profile
}

export interface ServerMessageWithProfile extends ServerMessage {
  profiles: Profile
  reply_to?: ServerMessageWithProfile
}