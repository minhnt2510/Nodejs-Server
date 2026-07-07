import { Collection, Db, MongoClient } from 'mongodb'
import { envConfig } from '~/constants/config'
import { Bookmark } from '~/models/schemas/Bookmark.schema'
import { Conversation } from '~/models/schemas/Conversation.schema'
import { Follower } from '~/models/schemas/Follower.schema'
import { Hashtag } from '~/models/schemas/Hashtag.schema'
import { Like } from '~/models/schemas/Like.schema'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import Tweet from '~/models/schemas/Tweet.schema'
import User from '~/models/schemas/User.schema'
import VideoStatus from '~/models/schemas/VideoStatus.schema'
import { BlockedUser } from '~/models/schemas/BlockedUser.schema'


const uri = envConfig.dbHost

class DatabaseService {
  private client: MongoClient
  private db: Db

  constructor() {
    this.client = new MongoClient(uri)
    this.db = this.client.db(envConfig.dbName)
  }

  async connect() {
    try {
      await this.client.db('admin').command({ ping: 1 })
      console.log('Pinged your deployment. You successfully connected to MongoDB!')
      // Tạo indexes khi khởi động
      await this.indexUsers()
      await this.indexRefreshTokens()
      await this.indexVideoStatus()
      await this.indexFollowers()
      await this.indexConversations()
      await this.indexTweets()
      await this.indexBlockedUsers()
    } catch (error) {
      console.error('Error connecting to MongoDB:', error)
      throw error
    }
  }

  async disconnect() {
    await this.client.close()
    console.log('Disconnected from MongoDB')
  }

  // ----------- Collections -----------
  get users(): Collection<User> {
    return this.db.collection('users')
  }

  get refreshTokens(): Collection<RefreshToken> {
    return this.db.collection('refresh_tokens')
  }

  get followers(): Collection<Follower> {
    return this.db.collection('followers')
  }

  get tweets(): Collection<Tweet> {
    return this.db.collection('tweets')
  }

  get hashtags(): Collection<Hashtag> {
    return this.db.collection('hashtags')
  }

  get bookmarks(): Collection<Bookmark> {
    return this.db.collection('bookmarks')
  }

  get likes(): Collection<Like> {
    return this.db.collection('likes')
  }

  get videoStatus(): Collection<VideoStatus> {
    return this.db.collection('video_status')
  }

  get conversations(): Collection<Conversation> {
    return this.db.collection('conversations')
  }

  get blockedUsers(): Collection<BlockedUser> {
    return this.db.collection('blocked_users')
  }

  // ----------- Indexes -----------
  private async indexUsers() {
    try {
      await this.users.createIndex({ email: 1 }, { unique: true, sparse: true })
      await this.users.createIndex({ username: 1 }, { unique: true, sparse: true })
      await this.users.createIndex({ email: 1, password: 1 })
      await this.users.createIndex({ forgot_password_token: 1 }, { sparse: true })
    } catch {
      // Indexes may already exist
    }
  }

  private async indexRefreshTokens() {
    try {
      await this.refreshTokens.createIndex({ token: 1 }, { unique: true, sparse: true })
      await this.refreshTokens.createIndex({ exp: 1 }, { expireAfterSeconds: 0 })
    } catch {
      // Indexes may already exist
    }
  }

  private async indexVideoStatus() {
    try {
      await this.videoStatus.createIndex({ name: 1 })
    } catch {
      // Indexes may already exist
    }
  }

  private async indexFollowers() {
    try {
      await this.followers.createIndex({ user_id: 1, followed_user_id: 1 })
    } catch {
      // Indexes may already exist
    }
  }

  private async indexConversations() {
    try {
      await this.conversations.createIndex({ sender_id: 1, receiver_id: 1 })
      await this.conversations.createIndex({ receiver_id: 1, sender_id: 1 })
    } catch {
      // Indexes may already exist
    }
  }

  private async indexTweets() {
    try {
      /**
       * Bài 178: Fix lỗi tìm không được một số từ
       * ─────────────────────────────────────────────
       * Mặc định MongoDB dùng tiếng Anh (english) cho text index.
       * Điều này khiến các "stop words" (a, an, the, is, ...) bị bỏ qua
       * khi index và khi tìm kiếm → không tìm được một số từ.
       *
       * Fix: đặt default_language: 'none' để MongoDB không áp dụng
       * stemming và stop words — tìm kiếm chính xác từng từ.
       * Đây cũng là điều kiện cần để hỗ trợ tiếng Việt.
       */
      await this.tweets.createIndex({ content: 'text' }, { default_language: 'none' })
      await this.tweets.createIndex({ user_id: 1, created_at: -1 })
    } catch {
      // Indexes may already exist
    }
  }

  private async indexBlockedUsers() {
    try {
      await this.blockedUsers.createIndex({ user_id: 1, blocked_user_id: 1 }, { unique: true })
    } catch {
      // Indexes may already exist
    }
  }
}

const databaseService = new DatabaseService()
export default databaseService
