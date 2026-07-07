import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { ObjectId } from 'mongodb'
import { UserVerifyStatus } from '~/constants/enums'
import { HTTP_STATUS } from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import {
  ChangePasswordReqBody,
  FollowReqBody,
  ForgotPasswordReqBody,
  GetProfileReqParams,
  LoginReqBody,
  LogoutReqBody,
  RefreshTokenReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  SearchUsersQuery,
  TokenPayload,
  UnfollowReqParams,
  UpdateMeReqBody,
  VerifyEmailReqBody,
  VerifyForgotPasswordReqBody,
  BlockReqBody,
  UnblockReqParams
} from '~/models/requests/User.requests'
import { envConfig } from '~/constants/config'
import databaseService from '~/services/database.services'
import usersService from '~/services/users.services'
import { activeSockets, getIo } from '~/utils/socket'


export const loginController = async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response) => {
  const { user } = req
  const user_id = (user as any)._id as ObjectId
  const result = await usersService.login({ user_id: user_id.toString(), verify: (user as any).verify })
  return res.json({ message: USERS_MESSAGES.LOGIN_SUCCESS, result })
}

export const oauthController = async (req: Request, res: Response) => {
  const { code } = req.query
  const result = await usersService.oauth(code as string)
  const urlRedirect = `${envConfig.clientRedirectCallback}?access_token=${result.access_token}&refresh_token=${result.refresh_token}&new_user=${result.newUser}&verify=${result.verify}`
  return res.redirect(urlRedirect)
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterReqBody>, res: Response) => {
  const result = await usersService.register(req.body)
  return res.json({ message: USERS_MESSAGES.REGISTER_SUCCESS, result })
}

export const logoutController = async (req: Request<ParamsDictionary, any, LogoutReqBody>, res: Response) => {
  const { refresh_token } = req.body
  const result = await usersService.logout(refresh_token)
  return res.json(result)
}

export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenReqBody>,
  res: Response
) => {
  const { refresh_token } = req.body
  const { user_id, verify, exp } = req.decoded_refresh_token as TokenPayload
  const result = await usersService.refreshToken({ user_id, verify, refresh_token, exp })
  return res.json({ message: USERS_MESSAGES.REFRESH_TOKEN_SUCCESS, result })
}

export const verifyEmailController = async (req: Request<ParamsDictionary, any, VerifyEmailReqBody>, res: Response) => {
  const { user_id } = req.decoded_email_verify_token as TokenPayload
  const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ message: USERS_MESSAGES.USER_NOT_FOUND })
  }
  if (user.email_verify_token === '') {
    return res.json({ message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE })
  }
  const result = await usersService.verifyEmail(user_id)
  return res.json({ message: USERS_MESSAGES.EMAIL_VERIFY_SUCCESS, result })
}

export const resendVerifyEmailController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ message: USERS_MESSAGES.USER_NOT_FOUND })
  }
  if (user.verify === UserVerifyStatus.Verified) {
    return res.json({ message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE })
  }
  const result = await usersService.resendVerifyEmail(user_id, user.email)
  return res.json(result)
}

export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordReqBody>,
  res: Response
) => {
  const { _id, verify, email } = req.user as any
  const result = await usersService.forgotPassword({ user_id: (_id as ObjectId).toString(), verify, email })
  return res.json(result)
}

export const verifyForgotPasswordController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordReqBody>,
  res: Response
) => {
  return res.json({ message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_SUCCESS })
}

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response
) => {
  const { user_id } = req.decoded_forgot_password_token as TokenPayload
  const { password } = req.body
  const result = await usersService.resetPassword(user_id, password)
  return res.json(result)
}

export const getMeController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const user = await usersService.getMe(user_id)
  return res.json({ message: USERS_MESSAGES.GET_ME_SUCCESS, result: user })
}

export const getFollowingController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const following = await usersService.getFollowing(user_id)
  return res.json({ message: 'Get following success', result: following })
}

export const getContactsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const contacts = await usersService.getContacts(user_id)
  return res.json({ message: 'Get contacts success', result: contacts })
}

export const getFollowingOfUserController = async (req: Request, res: Response) => {
  const { user_id } = req.params
  const following = await usersService.getFollowing(user_id)
  return res.json({ message: 'Get following success', result: following })
}

export const getFollowersOfUserController = async (req: Request, res: Response) => {
  const { user_id } = req.params
  const followers = await usersService.getFollowers(user_id)
  return res.json({ message: 'Get followers success', result: followers })
}

export const updateMeController = async (req: Request<ParamsDictionary, any, UpdateMeReqBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { body } = req
  const user = await usersService.updateMe(user_id, body)
  return res.json({ message: USERS_MESSAGES.UPDATE_ME_SUCCESS, result: user })
}

export const getProfileController = async (req: Request<GetProfileReqParams>, res: Response) => {
  const { username } = req.params
  const viewer_id = req.decoded_authorization?.user_id
  const user = await usersService.getProfile(username, viewer_id)
  if (!user) {
    throw new ErrorWithStatus({ message: USERS_MESSAGES.USER_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND })
  }
  return res.json({ message: USERS_MESSAGES.GET_PROFILE_SUCCESS, result: user })
}

export const searchUsersController = async (
  req: Request<ParamsDictionary, unknown, unknown, SearchUsersQuery>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const limit = Number(req.query.limit)
  const page = Number(req.query.page)
  const { users, total } = await usersService.searchUsers({
    user_id,
    q: req.query.q,
    limit,
    page
  })

  return res.json({
    message: 'Search users successfully',
    result: {
      users,
      limit,
      page,
      total_page: Math.ceil(total / limit)
    }
  })
}

export const followController = async (req: Request<ParamsDictionary, any, FollowReqBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { followed_user_id } = req.body
  const result = await usersService.follow(user_id, followed_user_id)
  return res.json(result)
}

export const unfollowController = async (req: Request<UnfollowReqParams>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { user_id: followed_user_id } = req.params
  const result = await usersService.unfollow(user_id, followed_user_id)
  return res.json(result)
}

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { password } = req.body
  const result = await usersService.changePassword(user_id, password)
  return res.json(result)
}

export const blockController = async (req: Request<ParamsDictionary, any, BlockReqBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { blocked_user_id } = req.body
  const result = await usersService.blockUser(user_id, blocked_user_id)

  const io = getIo()
  if (io) {
    const receiverSocketId = activeSockets[blocked_user_id]
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('block_status_changed', {
        blocker_id: user_id,
        blocked_id: blocked_user_id,
        is_blocked: true
      })
    }
  }

  return res.json(result)
}

export const unblockController = async (req: Request<UnblockReqParams>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { user_id: blocked_user_id } = req.params
  const result = await usersService.unblockUser(user_id, blocked_user_id)

  const io = getIo()
  if (io) {
    const receiverSocketId = activeSockets[blocked_user_id]
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('block_status_changed', {
        blocker_id: user_id,
        blocked_id: blocked_user_id,
        is_blocked: false
      })
    }
  }

  return res.json(result)
}

export const getBlockedUsersController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await usersService.getBlockedUsers(user_id)
  return res.json({
    message: 'Get blocked users success',
    result
  })
}

