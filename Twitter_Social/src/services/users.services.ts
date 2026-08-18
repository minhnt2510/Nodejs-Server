import { ObjectId } from 'mongodb'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import { envConfig } from '~/constants/config'
import { USERS_MESSAGES } from '~/constants/messages'
import { RegisterReqBody, UpdateMeReqBody } from '~/models/requests/User.requests'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import User from '~/models/schemas/User.schema'
import { Follower } from '~/models/schemas/Follower.schema'
import { BlockedUser } from '~/models/schemas/BlockedUser.schema'

import databaseService from './database.services'
import { cacheGet, cacheSet, cacheDel, cacheKey, getTTL } from '~/utils/cache'
import { hashPassword } from '~/utils/crypto'
import { signToken, verifyToken } from '~/utils/jwt'
import { sendForgotPasswordEmail, sendVerifyEmail } from '~/utils/email'
import axios from 'axios'

// Tài khoản chính: user mới verify email sẽ được tự động follow
const MAIN_ACCOUNT_EMAIL = 'tanminh.office183@gmail.com'
const MAIN_ACCOUNT_USERNAME = 'miss_arty'

class UsersService {
  // -------------------- Token Helpers --------------------
  private signAccessToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: { user_id, token_type: TokenType.AccessToken, verify },
      privateKey: envConfig.jwtSecretAccessToken,
      options: { expiresIn: envConfig.accessTokenExpiresIn as any }
    })
  }

  private signRefreshToken({ user_id, verify, exp }: { user_id: string; verify: UserVerifyStatus; exp?: number }) {
    if (exp) {
      return signToken({
        payload: { user_id, token_type: TokenType.RefreshToken, verify, exp },
        privateKey: envConfig.jwtSecretRefreshToken
      })
    }
    return signToken({
      payload: { user_id, token_type: TokenType.RefreshToken, verify },
      privateKey: envConfig.jwtSecretRefreshToken,
      options: { expiresIn: envConfig.refreshTokenExpiresIn as any }
    })
  }

  private signEmailVerifyToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: { user_id, token_type: TokenType.EmailVerifyToken, verify },
      privateKey: envConfig.jwtSecretEmailVerifyToken,
      options: { expiresIn: envConfig.emailVerifyTokenExpiresIn as any }
    })
  }

  private signForgotPasswordToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: { user_id, token_type: TokenType.ForgotPasswordToken, verify },
      privateKey: envConfig.jwtSecretForgotPasswordToken,
      options: { expiresIn: envConfig.forgotPasswordTokenExpiresIn as any }
    })
  }

  private signAccessAndRefreshToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return Promise.all([this.signAccessToken({ user_id, verify }), this.signRefreshToken({ user_id, verify })])
  }

  private async insertRefreshToken(user_id: ObjectId, refresh_token: string, iat: number, exp: number) {
    try {
      await databaseService.refreshTokens.insertOne(
        new RefreshToken({ user_id, token: refresh_token, iat, exp })
      )
    } catch (err: any) {
      if (err.code === 11000) {
        // Token đã được insert trước đó bởi request song song, bỏ qua
        return
      }
      throw err
    }
  }

  // -------------------- Auth --------------------
  async checkEmailExist(email: string) {
    const user = await databaseService.users.findOne({ email })
    return Boolean(user)
  }

  async register(payload: RegisterReqBody) {
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified
    })

    await databaseService.users.insertOne(
      new User({
        ...payload,
        _id: user_id,
        username: `user${user_id.toString()}`,
        email_verify_token,
        date_of_birth: new Date(payload.date_of_birth),
        password: hashPassword(payload.password)
      })
    )

    const [access_token, refresh_token] = await this.signAccessAndRefreshToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified
    })
    const { iat, exp } = await verifyToken({ token: refresh_token, secretOrPublicKey: envConfig.jwtSecretRefreshToken })
    await this.insertRefreshToken(user_id, refresh_token, iat, exp)

    // Gửi email xác thực
    await sendVerifyEmail(payload.email, email_verify_token)

    return { access_token, refresh_token, email_verify_token }
  }

  async login({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    const [access_token, refresh_token] = await this.signAccessAndRefreshToken({ user_id, verify })
    const { iat, exp } = await verifyToken({ token: refresh_token, secretOrPublicKey: envConfig.jwtSecretRefreshToken })
    await this.insertRefreshToken(new ObjectId(user_id), refresh_token, iat, exp)
    return { access_token, refresh_token }
  }

  async logout(refresh_token: string) {
    await databaseService.refreshTokens.deleteOne({ token: refresh_token })
    return { message: USERS_MESSAGES.LOGOUT_SUCCESS }
  }

  async refreshToken({
    user_id,
    verify,
    refresh_token,
    exp
  }: {
    user_id: string
    verify: UserVerifyStatus
    refresh_token: string
    exp: number
  }) {
    const [new_access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken({ user_id, verify }),
      this.signRefreshToken({ user_id, verify, exp }),
      databaseService.refreshTokens.deleteOne({ token: refresh_token })
    ])
    const decoded_new_refresh_token = await verifyToken({
      token: new_refresh_token,
      secretOrPublicKey: envConfig.jwtSecretRefreshToken
    })
    await this.insertRefreshToken(
      new ObjectId(user_id),
      new_refresh_token,
      decoded_new_refresh_token.iat,
      decoded_new_refresh_token.exp
    )
    return { access_token: new_access_token, refresh_token: new_refresh_token }
  }

  // -------------------- Email Verify --------------------
  async verifyEmail(user_id: string) {
    const [token] = await Promise.all([
      this.signAccessAndRefreshToken({ user_id, verify: UserVerifyStatus.Verified }),
      databaseService.users.updateOne(
        { _id: new ObjectId(user_id) },
        {
          $set: { email_verify_token: '', verify: UserVerifyStatus.Verified },
          $currentDate: { updated_at: true }
        }
      )
    ])
    const [access_token, refresh_token] = token
    const { iat, exp } = await verifyToken({ token: refresh_token, secretOrPublicKey: envConfig.jwtSecretRefreshToken })
    await this.insertRefreshToken(new ObjectId(user_id), refresh_token, iat, exp)
    // Xóa cache user cũ (verify=0) để getMe trả về trạng thái đã verify ngay lập tức,
    // nếu không Redis trả dữ liệu cũ tới 5 phút khiến client vẫn thấy chưa verify.
    await cacheDel(cacheKey('user', user_id))
    await this.autoFollowMainAccount(user_id)
    return { access_token, refresh_token }
  }

  private async autoFollowMainAccount(user_id: string) {
    try {
      const mainUser = await databaseService.users.findOne(
        { $or: [{ email: MAIN_ACCOUNT_EMAIL }, { username: MAIN_ACCOUNT_USERNAME }] },
        { projection: { _id: 1 } }
      )
      if (!mainUser || mainUser._id.toString() === user_id) return
      const exists = await databaseService.followers.findOne({
        user_id: new ObjectId(user_id),
        followed_user_id: mainUser._id
      })
      if (!exists) {
        await databaseService.followers.insertOne(
          new Follower({ user_id: new ObjectId(user_id), followed_user_id: mainUser._id })
        )
      }
    } catch (error) {
      console.error(`[AutoFollow] Failed for user ${user_id}:`, (error as Error).message)
    }
  }

  async resendVerifyEmail(user_id: string, email: string) {
    const email_verify_token = await this.signEmailVerifyToken({ user_id, verify: UserVerifyStatus.Unverified })
    await sendVerifyEmail(email, email_verify_token)
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      { $set: { email_verify_token }, $currentDate: { updated_at: true } }
    )
    return { message: USERS_MESSAGES.RESEND_VERIFY_EMAIL_SUCCESS, result: { email_verify_token } }
  }

  // -------------------- Forgot Password --------------------
  async forgotPassword({ user_id, verify, email }: { user_id: string; verify: UserVerifyStatus; email: string }) {
    const forgot_password_token = await this.signForgotPasswordToken({ user_id, verify })
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      { $set: { forgot_password_token }, $currentDate: { updated_at: true } }
    )
    await sendForgotPasswordEmail(email, forgot_password_token)
    return { message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD, result: { forgot_password_token } }
  }

  async resetPassword(user_id: string, password: string) {
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: { forgot_password_token: '', password: hashPassword(password) },
        $currentDate: { updated_at: true }
      }
    )
    return { message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS }
  }

  // -------------------- Profile --------------------
  async getMe(user_id: string) {
    const cacheKeyStr = cacheKey('user', user_id)
    const cached = await cacheGet<any>(cacheKeyStr)
    if (cached) return cached

    const user = await databaseService.users.findOne(
      { _id: new ObjectId(user_id) },
      { projection: { password: 0, email_verify_token: 0, forgot_password_token: 0 } }
    )
    if (user) await cacheSet(cacheKeyStr, user, getTTL('user'))
    return user
  }

  async updateMe(user_id: string, payload: UpdateMeReqBody) {
    const _payload = payload.date_of_birth
      ? { ...payload, date_of_birth: new Date(payload.date_of_birth) }
      : payload
    const user = await databaseService.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      {
        $set: { ...(_payload as UpdateMeReqBody & { date_of_birth?: Date }) },
        $currentDate: { updated_at: true }
      },
      {
        returnDocument: 'after',
        projection: { password: 0, email_verify_token: 0, forgot_password_token: 0 }
      }
    )
    await cacheDel(cacheKey('user', user_id))
    return user
  }

  async getProfile(username: string, viewer_id?: string) {
    const pipeline: object[] = [
      { $match: { username } },
      {
        $lookup: {
          from: 'followers',
          let: { target_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$followed_user_id', '$$target_id'] },
                    viewer_id ? { $eq: ['$user_id', new ObjectId(viewer_id)] } : { $eq: [1, 0] }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: 'viewer_follow'
        }
      },
      // Đếm số followers
      {
        $lookup: {
          from: 'followers',
          let: { target_id: '$_id' },
          pipeline: [{ $match: { $expr: { $eq: ['$followed_user_id', '$$target_id'] } } }],
          as: 'followers_list'
        }
      },
      // Đếm số following
      {
        $lookup: {
          from: 'followers',
          let: { target_id: '$_id' },
          pipeline: [{ $match: { $expr: { $eq: ['$user_id', '$$target_id'] } } }],
          as: 'following_list'
        }
      },
      {
        $addFields: {
          is_following: { $gt: [{ $size: '$viewer_follow' }, 0] },
          followers_count: { $size: '$followers_list' },
          following_count: { $size: '$following_list' }
        }
      },
      {
        $project: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0,
          verify: 0,
          updated_at: 0,
          viewer_follow: 0,
          followers_list: 0,
          following_list: 0
        }
      }
    ]

    const [user] = await databaseService.users.aggregate(pipeline).toArray()
    return user || null
  }

  async searchUsers({
    user_id,
    q,
    limit,
    page
  }: {
    user_id: string
    q: string
    limit: number
    page: number
  }) {
    const viewer_id = new ObjectId(user_id)
    const escaped_query = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped_query, 'i')
    const match = {
      _id: { $ne: viewer_id },
      verify: { $ne: UserVerifyStatus.Banned },
      $or: [{ name: regex }, { username: regex }]
    }

    const [users, total] = await Promise.all([
      databaseService.users
        .aggregate([
          { $match: match },
          { $sort: { username: 1 } },
          { $skip: limit * (page - 1) },
          { $limit: limit },
          {
            $lookup: {
              from: 'followers',
              let: { target_user_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$user_id', viewer_id] },
                        { $eq: ['$followed_user_id', '$$target_user_id'] }
                      ]
                    }
                  }
                },
                { $limit: 1 }
              ],
              as: 'viewer_follow'
            }
          },
          {
            $addFields: {
              is_following: { $gt: [{ $size: '$viewer_follow' }, 0] }
            }
          },
          {
            $project: {
              password: 0,
              email: 0,
              email_verify_token: 0,
              forgot_password_token: 0,
              twitter_circle: 0,
              viewer_follow: 0
            }
          }
        ])
        .toArray(),
      databaseService.users.countDocuments(match)
    ])

    return { users, total }
  }

  // -------------------- Follow --------------------
  async follow(user_id: string, followed_user_id: string) {
    const follower = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    if (follower === null) {
      await databaseService.followers.insertOne(
        new Follower({ user_id: new ObjectId(user_id), followed_user_id: new ObjectId(followed_user_id) })
      )
      return { message: USERS_MESSAGES.FOLLOW_SUCCESS }
    }
    return { message: USERS_MESSAGES.ALREADY_FOLLOWED }
  }

  async unfollow(user_id: string, followed_user_id: string) {
    const follower = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    if (follower === null) {
      return { message: USERS_MESSAGES.ALREADY_UNFOLLOWED }
    }
    await databaseService.followers.deleteOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    return { message: USERS_MESSAGES.UNFOLLOW_SUCCESS }
  }

  // -------------------- Following list --------------------
  async getFollowing(user_id: string) {
    const following = await databaseService.followers
      .aggregate([
        { $match: { user_id: new ObjectId(user_id) } },
        { $sort: { created_at: -1 } },
        {
          $lookup: {
            from: 'users',
            localField: 'followed_user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: '$user._id',
            name: '$user.name',
            username: '$user.username',
            avatar: '$user.avatar'
          }
        }
      ])
      .toArray()
    return following
  }

  // -------------------- Followers list --------------------
  async getFollowers(user_id: string) {
    const followers = await databaseService.followers
      .aggregate([
        { $match: { followed_user_id: new ObjectId(user_id) } },
        { $sort: { created_at: -1 } },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: '$user._id',
            name: '$user.name',
            username: '$user.username',
            avatar: '$user.avatar'
          }
        }
      ])
      .toArray()
    return followers
  }

  // -------------------- Contacts (following + followers + chat history, deduped) --------------------
  async getContacts(user_id: string) {
    const uid = new ObjectId(user_id)
    const lookupUser = (localField: string) => ([
      {
        $lookup: {
          from: 'users',
          localField,
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: '$user._id',
          name: '$user.name',
          username: '$user.username',
          avatar: '$user.avatar'
        }
      }
    ])

    // Lấy danh sách user IDs từ hội thoại
    const chatUserIds = await databaseService.conversations
      .aggregate([
        {
          $match: {
            $or: [{ sender_id: uid }, { receiver_id: uid }]
          }
        },
        {
          $project: {
            userId: {
              $cond: {
                if: { $eq: ['$sender_id', uid] },
                then: '$receiver_id',
                else: '$sender_id'
              }
            }
          }
        },
        {
          $group: {
            _id: '$userId'
          }
        }
      ])
      .toArray()

    const chatIds = chatUserIds.map((item) => item._id)

    const [following, followers, chatUsers] = await Promise.all([
      databaseService.followers
        .aggregate([{ $match: { user_id: uid } }, ...lookupUser('followed_user_id')])
        .toArray(),
      databaseService.followers
        .aggregate([{ $match: { followed_user_id: uid } }, ...lookupUser('user_id')])
        .toArray(),
      databaseService.users
        .find(
          { _id: { $in: chatIds } },
          { projection: { _id: 1, name: 1, username: 1, avatar: 1 } }
        )
        .toArray()
    ])

    // Fetch block records involving this user
    const blocks = await databaseService.blockedUsers
      .find({
        $or: [{ user_id: uid }, { blocked_user_id: uid }]
      })
      .toArray()

    // Deduplicate bằng Map theo _id.toString() và gán block status
    const map = new Map<string, any>()
    for (const u of [...following, ...followers, ...chatUsers]) {
      const key = (u as any)._id.toString()
      if (!map.has(key)) {
        const contact = { ...u } as any
        contact.is_blocked = blocks.some((b) => b.user_id.equals(uid) && b.blocked_user_id.equals(contact._id))
        contact.blocked_by = blocks.some((b) => b.blocked_user_id.equals(uid) && b.user_id.equals(contact._id))
        map.set(key, contact)
      }
    }
    return Array.from(map.values())
  }

  // -------------------- Change Password --------------------
  async changePassword(user_id: string, new_password: string) {
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      { $set: { password: hashPassword(new_password) }, $currentDate: { updated_at: true } }
    )
    return { message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS }
  }

  // -------------------- Google OAuth --------------------
  private async getOauthGoogleToken(code: string) {
    const body = {
      code,
      client_id: envConfig.googleClientId,
      client_secret: envConfig.googleClientSecret,
      redirect_uri: envConfig.googleRedirectUri,
      grant_type: 'authorization_code'
    }
    const { data } = await axios.post('https://oauth2.googleapis.com/token', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    return data as { access_token: string; id_token: string }
  }

  private async getGoogleUserInfo(access_token: string, id_token: string) {
    const { data } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      params: { access_token, alt: 'json' },
      headers: { Authorization: `Bearer ${id_token}` }
    })
    return data as { id: string; email: string; verified_email: boolean; name: string; picture: string }
  }

  async oauth(code: string) {
    const { access_token, id_token } = await this.getOauthGoogleToken(code)
    const userInfo = await this.getGoogleUserInfo(access_token, id_token)

    if (!userInfo.verified_email) {
      throw new Error(USERS_MESSAGES.GMAIL_NOT_VERIFIED)
    }

    const user = await databaseService.users.findOne({ email: userInfo.email })

    // Nếu đã tồn tại thì login luôn
    if (user) {
      const { access_token: at, refresh_token } = await this.login({
        user_id: user._id.toString(),
        verify: user.verify
      })
      return { access_token: at, refresh_token, newUser: 0, verify: user.verify }
    }

    // Tạo user mới
    const password = Math.random().toString(36).slice(-8)
    const result = await this.register({
      name: userInfo.name,
      email: userInfo.email,
      date_of_birth: new Date().toISOString(),
      password,
      confirm_password: password
    })
    return { ...result, newUser: 1, verify: UserVerifyStatus.Unverified }
  }

  // -------------------- Block User --------------------
  async blockUser(user_id: string, blocked_user_id: string) {
    const uid = new ObjectId(user_id)
    const buid = new ObjectId(blocked_user_id)

    // Insert block record
    await databaseService.blockedUsers.insertOne(
      new BlockedUser({ user_id: uid, blocked_user_id: buid })
    )

    // Automatically remove follow relationships (both directions)
    await databaseService.followers.deleteMany({
      $or: [
        { user_id: uid, followed_user_id: buid },
        { user_id: buid, followed_user_id: uid }
      ]
    })

    return { message: USERS_MESSAGES.BLOCK_SUCCESS }
  }

  async unblockUser(user_id: string, blocked_user_id: string) {
    const uid = new ObjectId(user_id)
    const buid = new ObjectId(blocked_user_id)

    await databaseService.blockedUsers.deleteOne({
      user_id: uid,
      blocked_user_id: buid
    })

    return { message: USERS_MESSAGES.UNBLOCK_SUCCESS }
  }

  async getBlockedUsers(user_id: string) {
    const uid = new ObjectId(user_id)
    const blocked = await databaseService.blockedUsers
      .aggregate([
        { $match: { user_id: uid } },
        {
          $lookup: {
            from: 'users',
            localField: 'blocked_user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: '$user._id',
            name: '$user.name',
            username: '$user.username',
            avatar: '$user.avatar'
          }
        }
      ])
      .toArray()
    return blocked
  }
}

const usersService = new UsersService()
export default usersService
