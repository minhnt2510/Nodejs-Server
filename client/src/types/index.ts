export interface User {
  _id: string
  name: string
  email?: string
  username: string
  avatar?: string
  cover_photo?: string
  bio?: string
  location?: string
  website?: string
  date_of_birth?: string
  verify?: number
  twitter_circle?: string[]
  is_following?: boolean
  followers_count?: number
  following_count?: number
  created_at?: string
  updated_at?: string
  is_blocked?: boolean
  blocked_by?: boolean
}

export interface Tweet {
  _id: string
  user_id: string
  user?: User
  type: TweetTypeValue
  audience: TweetAudienceValue
  content: string
  parent_id: string | null
  hashtags: Array<{ _id: string; name: string }>
  mentions: User[]
  medias: Media[]
  guest_views: number
  user_views: number
  views?: number
  bookmarks?: number
  likes?: number
  retweet_count?: number
  comment_count?: number
  quote_count?: number
  is_liked?: boolean
  is_bookmarked?: boolean
  viewer_repost_id?: string | null
  created_at: string
  updated_at: string
}

export interface Media {
  url: string
  type: MediaTypeValue
}

export interface MessageReaction {
  user_id: string
  emoji: string
}

export interface Conversation {
  _id: string
  sender_id: string
  receiver_id: string
  content: string
  medias?: Media[]
  is_deleted?: boolean
  reactions?: MessageReaction[]
  created_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
}

export interface ApiResponse<T = unknown> {
  message: string
  result?: T
}

export interface PaginatedTweets {
  tweets: Tweet[]
  limit: number
  page: number
  total_page: number
}

export interface PaginatedConversations {
  conversations: Conversation[]
  limit: number
  page: number
  total_page: number
}

export interface PaginatedUsers {
  users: User[]
  limit: number
  page: number
  total_page: number
}

export interface UpdateProfilePayload {
  name?: string
  date_of_birth?: string
  bio?: string
  location?: string
  website?: string
  username?: string
  avatar?: string
  cover_photo?: string
}

export interface CreateTweetPayload {
  type: TweetTypeValue
  audience: TweetAudienceValue
  content: string
  parent_id: string | null
  hashtags: string[]
  mentions: string[]
  medias: Media[]
}

export interface UpdateTweetPayload {
  audience?: TweetAudienceValue
  content?: string
  hashtags?: string[]
  mentions?: string[]
  medias?: Media[]
}

export interface DeleteTweetResult {
  deleted_tweet_ids: string[]
}

export const TweetType = {
  Tweet: 0,
  Retweet: 1,
  Comment: 2,
  QuoteTweet: 3
} as const

export type TweetTypeValue = (typeof TweetType)[keyof typeof TweetType]

export const TweetAudience = {
  Everyone: 0,
  TwitterCircle: 1
} as const

export type TweetAudienceValue = (typeof TweetAudience)[keyof typeof TweetAudience]

export const MediaType = {
  Image: 0,
  Video: 1,
  HLS: 2
} as const

export type MediaTypeValue = (typeof MediaType)[keyof typeof MediaType]

export const UserVerifyStatus = {
  Unverified: 0,
  Verified: 1,
  Banned: 2
} as const

export type UserVerifyStatusValue = (typeof UserVerifyStatus)[keyof typeof UserVerifyStatus]
