import { Router } from 'express'
import {
  changePasswordController,
  followController,
  forgotPasswordController,
  getMeController,
  getProfileController,
  loginController,
  logoutController,
  oauthController,
  refreshTokenController,
  registerController,
  resendVerifyEmailController,
  resetPasswordController,
  unfollowController,
  updateMeController,
  verifyEmailController,
  verifyForgotPasswordController
} from '~/controllers/users.controllers'
import {
  accessTokenValidator,
  changePasswordValidator,
  emailVerifyTokenValidator,
  filterMiddleware,
  followValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  unfollowValidator,
  updateMeValidator,
  verifiedUserValidator,
  verifyForgotPasswordTokenValidator
} from '~/middlewares/users.middlewares'
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
 * /users/{username}:
 *   get:
 *     tags: [Users]
 *     summary: Get user profile by username
 */
usersRouter.get('/:username', wrapRequestHandler(getProfileController))

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

export default usersRouter
