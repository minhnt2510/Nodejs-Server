import { Router } from 'express'
import { likeTweetController, unlikeTweetController } from '~/controllers/likes.controllers'
import { tweetIdValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const likesRouter = Router()

/**
 * @swagger
 * /likes:
 *   post:
 *     tags: [Likes]
 *     summary: Like a tweet
 *     security:
 *       - BearerAuth: []
 */
likesRouter.post(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  tweetIdValidator,
  wrapRequestHandler(likeTweetController)
)

/**
 * @swagger
 * /likes/tweets/{tweet_id}:
 *   delete:
 *     tags: [Likes]
 *     summary: Unlike a tweet
 *     security:
 *       - BearerAuth: []
 */
likesRouter.delete(
  '/tweets/:tweet_id',
  accessTokenValidator,
  verifiedUserValidator,
  tweetIdValidator,
  wrapRequestHandler(unlikeTweetController)
)

export default likesRouter
