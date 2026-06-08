import { Router } from 'express'
import {
  createTweetController,
  getNewFeedsController,
  getTweetChildrenController,
  getTweetController
} from '~/controllers/tweets.controllers'
import {
  audienceValidator,
  createTweetValidator,
  getTweetChildrenValidator,
  paginationValidator,
  tweetIdValidator
} from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, isUserLoggedInValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const tweetsRouter = Router()

/**
 * @swagger
 * /tweets:
 *   post:
 *     tags: [Tweets]
 *     summary: Create a new tweet
 *     security:
 *       - BearerAuth: []
 */
tweetsRouter.post(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  createTweetValidator,
  wrapRequestHandler(createTweetController)
)

/**
 * @swagger
 * /tweets/new-feeds:
 *   get:
 *     tags: [Tweets]
 *     summary: Get new feeds
 *     security:
 *       - BearerAuth: []
 */
tweetsRouter.get(
  '/new-feeds',
  accessTokenValidator,
  verifiedUserValidator,
  paginationValidator,
  wrapRequestHandler(getNewFeedsController as any)
)

/**
 * @swagger
 * /tweets/{tweet_id}:
 *   get:
 *     tags: [Tweets]
 *     summary: Get tweet detail
 */
tweetsRouter.get(
  '/:tweet_id',
  tweetIdValidator,
  isUserLoggedInValidator(accessTokenValidator),
  isUserLoggedInValidator(verifiedUserValidator),
  audienceValidator,
  wrapRequestHandler(getTweetController)
)

/**
 * @swagger
 * /tweets/{tweet_id}/children:
 *   get:
 *     tags: [Tweets]
 *     summary: Get tweet children (retweet, comment, quote)
 */
tweetsRouter.get(
  '/:tweet_id/children',
  tweetIdValidator,
  isUserLoggedInValidator(accessTokenValidator),
  isUserLoggedInValidator(verifiedUserValidator),
  audienceValidator,
  paginationValidator,
  getTweetChildrenValidator,
  wrapRequestHandler(getTweetChildrenController as any)
)

export default tweetsRouter
