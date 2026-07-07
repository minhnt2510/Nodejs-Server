import { Router } from 'express'
import {
  changePasswordController,
  followController,
  forgotPasswordController,
  getContactsController,
  getFollowingController,
  getFollowingOfUserController,
  getFollowersOfUserController,
  getMeController,
  getProfileController,
  loginController,
  logoutController,
  oauthController,
  refreshTokenController,
  registerController,
  resendVerifyEmailController,
  resetPasswordController,
  searchUsersController,
  unfollowController,
  updateMeController,
  verifyEmailController,
  verifyForgotPasswordController,
  blockController,
  unblockController,
  getBlockedUsersController
} from '~/controllers/users.controllers'
import {
  accessTokenValidator,
  changePasswordValidator,
  emailVerifyTokenValidator,
  filterMiddleware,
  followValidator,
  forgotPasswordValidator,
  isUserLoggedInValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  searchUsersValidator,
  unfollowValidator,
  updateMeValidator,
  verifiedUserValidator,
  verifyForgotPasswordTokenValidator,
  blockValidator,
  unblockValidator
} from '~/middlewares/users.middlewares'
import { paginationValidator } from '~/middlewares/tweets.middlewares'
import { UpdateMeReqBody } from '~/models/requests/User.requests'
import { wrapRequestHandler } from '~/utils/handlers'

const usersRouter = Router()

/**
 * @swagger
 * /users/login:
 *   post:
 *     tags: [Users]
 *     summary: Login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login success
 */
usersRouter.post('/login', loginValidator, wrapRequestHandler(loginController))

/**
 * @swagger
 * /users/oauth/google:
 *   get:
 *     tags: [Users]
 *     summary: Login with Google OAuth
 *     parameters:
 *       - in: query
 *         name: code
 *         schema: { type: string }
 *     responses:
 *       302:
 *         description: Redirect to client
 */
usersRouter.get('/oauth/google', wrapRequestHandler(oauthController))

/**
 * @swagger
 * /users/register:
 *   post:
 *     tags: [Users]
 *     summary: Register new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               confirm_password: { type: string }
 *               date_of_birth: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Register success
 */
usersRouter.post('/register', registerValidator, wrapRequestHandler(registerController))

/**
 * @swagger
 * /users/logout:
 *   post:
 *     tags: [Users]
 *     summary: Logout
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token: { type: string }
 *     responses:
 *       200:
 *         description: Logout success
 */
usersRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapRequestHandler(logoutController))

/**
 * @swagger
 * /users/refresh-token:
 *   post:
 *     tags: [Users]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token: { type: string }
 *     responses:
 *       200:
 *         description: Refresh token success
 */
usersRouter.post('/refresh-token', refreshTokenValidator, wrapRequestHandler(refreshTokenController))

/**
 * @swagger
 * /users/verify-email:
 *   post:
 *     tags: [Users]
 *     summary: Verify user email
 */
usersRouter.post('/verify-email', emailVerifyTokenValidator, wrapRequestHandler(verifyEmailController))

/**
 * @swagger
 * /users/resend-verify-email:
 *   post:
 *     tags: [Users]
 *     summary: Resend email verification
 *     security:
 *       - BearerAuth: []
 */
usersRouter.post('/resend-verify-email', accessTokenValidator, wrapRequestHandler(resendVerifyEmailController))

/**
 * @swagger
 * /users/forgot-password:
 *   post:
 *     tags: [Users]
 *     summary: Request forgot password email
 */
usersRouter.post('/forgot-password', forgotPasswordValidator, wrapRequestHandler(forgotPasswordController))

/**
 * @swagger
 * /users/verify-forgot-password:
 *   post:
 *     tags: [Users]
 *     summary: Verify forgot password token
 */
usersRouter.post(
  '/verify-forgot-password',
  verifyForgotPasswordTokenValidator,
  wrapRequestHandler(verifyForgotPasswordController)
)

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     tags: [Users]
 *     summary: Reset password with token
 */
usersRouter.post('/reset-password', resetPasswordValidator, wrapRequestHandler(resetPasswordController))

/**
 * @swagger
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     security:
 *       - BearerAuth: []
 */
usersRouter.get('/me', accessTokenValidator, wrapRequestHandler(getMeController))

/**
 * @swagger
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update current user profile
 *     security:
 *       - BearerAuth: []
 */
usersRouter.patch(
  '/me',
  accessTokenValidator,
  verifiedUserValidator,
  updateMeValidator,
  filterMiddleware<UpdateMeReqBody>(['name', 'date_of_birth', 'bio', 'location', 'website', 'username', 'avatar', 'cover_photo']),
  wrapRequestHandler(updateMeController)
)

/**
 * @swagger
 * /users/search:
 *   get:
 *     tags: [Users]
 *     summary: Search users by name or username
 *     security:
 *       - BearerAuth: []
 */
usersRouter.get(
  '/search',
  accessTokenValidator,
  verifiedUserValidator,
  searchUsersValidator,
  paginationValidator,
  wrapRequestHandler(searchUsersController as any)
)

/**
 * @swagger
 * /users/{username}:
 *   get:
 *     tags: [Users]
 *     summary: Get user profile by username
 */
/** GET /users/following – danh sách đang follow */
usersRouter.get('/following', accessTokenValidator, wrapRequestHandler(getFollowingController))

/** GET /users/contacts – following + followers (deduped, dùng cho chat) */
usersRouter.get('/contacts', accessTokenValidator, wrapRequestHandler(getContactsController))

/** GET /users/:user_id/following – danh sách user đó đang follow */
usersRouter.get(
  '/:user_id/following',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getFollowingOfUserController)
)

/** GET /users/:user_id/followers – danh sách user follow user đó */
usersRouter.get(
  '/:user_id/followers',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getFollowersOfUserController)
)

usersRouter.get('/:username', isUserLoggedInValidator(accessTokenValidator), wrapRequestHandler(getProfileController))

/**
 * @swagger
 * /users/follow:
 *   post:
 *     tags: [Users]
 *     summary: Follow a user
 *     security:
 *       - BearerAuth: []
 */
usersRouter.post(
  '/follow',
  accessTokenValidator,
  verifiedUserValidator,
  followValidator,
  wrapRequestHandler(followController)
)

/**
 * @swagger
 * /users/follow/{user_id}:
 *   delete:
 *     tags: [Users]
 *     summary: Unfollow a user
 *     security:
 *       - BearerAuth: []
 */
usersRouter.delete(
  '/follow/:user_id',
  accessTokenValidator,
  verifiedUserValidator,
  unfollowValidator,
  wrapRequestHandler(unfollowController)
)

/**
 * @swagger
 * /users/change-password:
 *   put:
 *     tags: [Users]
 *     summary: Change password
 *     security:
 *       - BearerAuth: []
 */
usersRouter.put(
  '/change-password',
  accessTokenValidator,
  verifiedUserValidator,
  changePasswordValidator,
  wrapRequestHandler(changePasswordController)
)

/**
 * @swagger
 * /users/block:
 *   post:
 *     tags: [Users]
 *     summary: Block a user
 *     security:
 *       - BearerAuth: []
 */
usersRouter.post(
  '/block',
  accessTokenValidator,
  verifiedUserValidator,
  blockValidator,
  wrapRequestHandler(blockController)
)

/**
 * @swagger
 * /users/block/{user_id}:
 *   delete:
 *     tags: [Users]
 *     summary: Unblock a user
 *     security:
 *       - BearerAuth: []
 */
usersRouter.delete(
  '/block/:user_id',
  accessTokenValidator,
  verifiedUserValidator,
  unblockValidator,
  wrapRequestHandler(unblockController)
)

/**
 * @swagger
 * /users/blocked:
 *   get:
 *     tags: [Users]
 *     summary: Get blocked users
 *     security:
 *       - BearerAuth: []
 */
usersRouter.get(
  '/blocked',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(getBlockedUsersController)
)


export default usersRouter
