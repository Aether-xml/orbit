import type { Post, Profile, Comment } from './database'

export interface PostWithProfile extends Post {
  profiles: Profile
}

export interface CommentWithProfile extends Comment {
  profiles: Profile
}

export type MediaType = 'image' | 'video' | 'gif'

export interface MediaFile {
  file: File
  preview: string
  type: MediaType
}

export interface PostComposerState {
  content: string
  media: MediaFile[]
  pollData: PollFormData | null
  replyToId: string | null
  quoteOfId: string | null
  threadId: string | null
}

export interface PollFormData {
  question: string
  options: string[]
  endsAt: string
  allowsMultiple: boolean
}