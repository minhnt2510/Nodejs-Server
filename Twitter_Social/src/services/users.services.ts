import { ObjectId } from 'mongodb'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import { envConfig } from '~/constants/config'
import { USERS_MESSAGES } from '~/constants/messages'
import { RegisterReqBody, UpdateMeReqBody } from '~/models/requests/User.requests'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import User from '~/models/schemas/User.schema'
import { Follower } from '~/models/schemas/Follower.schema'
import databaseService from './database.services'
import { hashPassword } from '~/utils/crypto'
import { signToken, verifyToken } from '~/utils/jwt'
import { sendForgotPasswordEmail, sendVerifyEmail } from '~/utils/email'
import axios from 'axios'

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
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({ user_id, token: refresh_token, iat, exp })
    )
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

    return { access_token, refresh_token }
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
    return { access_token, refresh_token }
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
    return { message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD }
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
    const user = await databaseService.users.findOne(
      { _id: new ObjectId(user_id) },
      { projection: { password: 0, email_verify_token: 0, forgot_password_token: 0 } }
    )
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
    return user
  }

  async getProfile(username: string) {
    const user = await databaseService.users.findOne(
      { username },
      {
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0,
          verify: 0,
          created_at: 0,
          updated_at: 0
        }
      }
    )
    return user
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
}

const usersService = new UsersService()
export default usersService
