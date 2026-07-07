import { ObjectId } from 'mongodb'
import { UserVerifyStatus } from '~/constants/enums'
import { envConfig } from '~/constants/config'
import { USERS_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { RegisterReqBody, TokenPayload, UpdateMeReqBody } from '~/models/requests/User.requests'
import { User } from '~/models/schemas/User.schema'
import databaseService from './database.services'
import { cacheGet, cacheSet, cacheDel, cacheKey, getTTL } from '~/utils/cache'
import { hashPassword } from '~/utils/crypto'
import { signToken, verifyToken } from '~/utils/jwt'
import { sendForgotPasswordEmail, sendVerifyEmail } from '~/utils/email'

class UsersService {
  // -------------------- JWT helpers --------------------
  private signAccessToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: { user_id, verify },
      privateKey: envConfig.jwtSecretAccessToken,
      options: { expiresIn: envConfig.accessTokenExpiresIn }
    })
  }

  private signRefreshToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: { user_id, verify },
      privateKey: envConfig.jwtSecretRefreshToken,
      options: { expiresIn: envConfig.refreshTokenExpiresIn }
    })
  }

  private signEmailVerifyToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: { user_id, verify },
      privateKey: envConfig.jwtSecretEmailVerifyToken,
      options: { expiresIn: envConfig.emailVerifyTokenExpiresIn }
    })
  }

  private signForgotPasswordToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: { user_id, verify },
      privateKey: envConfig.jwtSecretForgotPasswordToken,
      options: { expiresIn: envConfig.forgotPasswordTokenExpiresIn }
    })
  }

  // -------------------- Auth --------------------
  private async checkEmailExist(email: string) {
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
        email_verify_token,
        date_of_birth: new Date(payload.date_of_birth),
        password: hashPassword(payload.password)
      })
    )

    // Fire and forget email verification
    sendVerifyEmail(payload.email, email_verify_token)

    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken({ user_id: user_id.toString(), verify: UserVerifyStatus.Unverified }),
      this.signRefreshToken({ user_id: user_id.toString(), verify: UserVerifyStatus.Unverified })
    ])

    await databaseService.refreshTokens.insertOne({
      token: refresh_token,
      user_id: new ObjectId(user_id),
      created_at: new Date(),
      exp: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000) // 100 days
    })

    return { access_token, refresh_token }
  }

  async login({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken({ user_id, verify }),
      this.signRefreshToken({ user_id, verify })
    ])

    await databaseService.refreshTokens.insertOne({
      token: refresh_token,
      user_id: new ObjectId(user_id),
      created_at: new Date(),
      exp: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000) // 100 days
    })

    return { access_token, refresh_token }
  }

  async refreshToken({
    user_id,
    verify,
    refresh_token
  }: {
    user_id: string
    verify: UserVerifyStatus
    refresh_token: string
  }) {
    const [access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken({ user_id, verify }),
      this.signRefreshToken({ user_id, verify })
    ])

    await databaseService.refreshTokens.deleteOne({ token: refresh_token })
    await databaseService.refreshTokens.insertOne({
      token: new_refresh_token,
      user_id: new ObjectId(user_id),
      created_at: new Date(),
      exp: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000)
    })

    return { access_token, refresh_token: new_refresh_token }
  }

  async logout(refresh_token: string) {
    await databaseService.refreshTokens.deleteOne({ token: refresh_token })
    return { message: USERS_MESSAGES.LOGOUT_SUCCESS }
  }

  async oauth(user_id: string) {
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken({ user_id, verify: UserVerifyStatus.Verified }),
      this.signRefreshToken({ user_id, verify: UserVerifyStatus.Verified })
    ])

    await databaseService.refreshTokens.insertOne({
      token: refresh_token,
      user_id: new ObjectId(user_id),
      created_at: new Date(),
      exp: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000)
    })

    return { access_token, refresh_token }
  }

  // -------------------- Email verification --------------------
  async verifyEmail(user_id: string) {
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: { email_verify_token: '', verify: UserVerifyStatus.Verified },
        $currentDate: { updated_at: true }
      }
    )
    await cacheDel(cacheKey('user', user_id))
    return { message: USERS_MESSAGES.VERIFY_EMAIL_SUCCESS }
  }

  async resendVerifyEmail(user_id: string, email: string) {
    const email_verify_token = await this.signEmailVerifyToken({ user_id, verify: UserVerifyStatus.Unverified })
    await sendVerifyEmail(email, email_verify_token)
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      { $set: { email_verify_token }, $currentDate: { updated_at: true } }
    )
    return { message: USERS_MESSAGES.RESEND_VERIFY_EMAIL_SUCCESS }
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
    await cacheDel(cacheKey('user', user_id))
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
    // Invalidate cache
    await cacheDel(cacheKey('user', user_id))
    if (user) {
      await cacheSet(cacheKey('user', user_id), user, getTTL('user'))
    }
    return user
  }

  async getProfile(username: string) {
    const cacheKeyStr = cacheKey('profile', username)
    const cached = await cacheGet<any>(cacheKeyStr)
    if (cached) return cached

    const user = await databaseService.users.findOne(
      { username },
      { projection: { password: 0, email_verify_token: 0, forgot_password_token: 0 } }
    )
    if (user) await cacheSet(cacheKeyStr, user, getTTL('profile'))
    return user
  }

  // -------------------- Follow --------------------
  async follow(user_id: string, followed_user_id: string) {
    const follower = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    if (follower) {
      return { message: USERS_MESSAGES.FOLLOWED }
    }
    await databaseService.followers.insertOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id),
      created_at: new Date()
    })
    await cacheDel(cacheKey('user', user_id))
    return { message: USERS_MESSAGES.FOLLOW_SUCCESS }
  }

  async unfollow(user_id: string, followed_user_id: string) {
    const follower = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    if (!follower) {
      return { message: USERS_MESSAGES.ALREADY_UNFOLLOWED }
    }
    await databaseService.followers.deleteOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    await cacheDel(cacheKey('user', user_id))
    return { message: USERS_MESSAGES.UNFOLLOW_SUCCESS }
  }

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

  // -------------------- Contacts (for chat sidebar) --------------------
  async getContacts(user_id: string) {
    const userIdObj = new ObjectId(user_id)

    const [following, followers] = await Promise.all([
      databaseService.followers
        .aggregate([
          { $match: { user_id: userIdObj } },
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
        .toArray(),
      databaseService.followers
        .aggregate([
          { $match: { followed_user_id: userIdObj } },
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
    ])

    // Dedup by _id
    const contactMap = new Map<string, any>()
    for (const user of [...following, ...followers]) {
      if (!contactMap.has(user._id.toString()) && user._id.toString() !== user_id) {
        contactMap.set(user._id.toString(), { ...user, _id: user._id.toString() })
      }
    }
    return Array.from(contactMap.values())
  }

  // -------------------- Block / Unblock --------------------
  async blockUser(user_id: string, blocked_user_id: string) {
    await databaseService.blockedUsers.updateOne(
      { user_id: new ObjectId(user_id), blocked_user_id: new ObjectId(blocked_user_id) },
      { $set: { user_id: new ObjectId(user_id), blocked_user_id: new ObjectId(blocked_user_id) } },
      { upsert: true }
    )
    return { message: USERS_MESSAGES.BLOCK_SUCCESS }
  }

  async unblockUser(user_id: string, blocked_user_id: string) {
    await databaseService.blockedUsers.deleteOne({
      user_id: new ObjectId(user_id),
      blocked_user_id: new ObjectId(blocked_user_id)
    })
    return { message: USERS_MESSAGES.UNBLOCK_SUCCESS }
  }

  async getBlockedUsers(user_id: string) {
    const blocked = await databaseService.blockedUsers
      .aggregate([
        { $match: { user_id: new ObjectId(user_id) } },
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

  // -------------------- Change Password --------------------
  async changePassword(user_id: string, old_password: string, new_password: string) {
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
    if (!user) {
      throw new ErrorWithStatus({ message: USERS_MESSAGES.USER_NOT_FOUND, status: 404 })
    }
    if (user.password !== hashPassword(old_password)) {
      throw new ErrorWithStatus({ message: USERS_MESSAGES.OLD_PASSWORD_IS_INCORRECT, status: 400 })
    }
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      { $set: { password: hashPassword(new_password) }, $currentDate: { updated_at: true } }
    )
    await cacheDel(cacheKey('user', user_id))
    return { message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS }
  }
}

const usersService = new UsersService()
export default usersService
