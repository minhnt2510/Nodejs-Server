import { Router } from 'express'
import {
  createTweetController,
  deleteTweetController,
  getNewFeedsController,
  getTweetChildrenController,
  getTweetController,
  getUserTweetsController,
  updateTweetController
} from '~/controllers/tweets.controllers'
import {
  audienceValidator,
  createTweetValidator,
  getTweetChildrenValidator,
  paginationValidator,
  tweetIdValidator,
  updateTweetValidator,
  userIdParamValidator
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
 * /tweets/users/{user_id}:
 *   get:
 *     tags: [Tweets]
 *     summary: Get tweets created by a user
 */
tweetsRouter.get(
  '/users/:user_id',
  accessTokenValidator,
  verifiedUserValidator,
  userIdParamValidator,
  paginationValidator,
  wrapRequestHandler(getUserTweetsController as any)
)

/**
 * @swagger
 * /tweets/{tweet_id}:
 *   patch:
 *     tags: [Tweets]
 *     summary: Update an owned tweet
 */
tweetsRouter.patch(
  '/:tweet_id',
  accessTokenValidator,
  verifiedUserValidator,
  tweetIdValidator,
  updateTweetValidator,
  wrapRequestHandler(updateTweetController)
)

/**
 * @swagger
 * /tweets/{tweet_id}:
 *   delete:
 *     tags: [Tweets]
 *     summary: Delete an owned tweet, reply, quote, or repost
 */
tweetsRouter.delete(
  '/:tweet_id',
  accessTokenValidator,
  verifiedUserValidator,
  tweetIdValidator,
  wrapRequestHandler(deleteTweetController)
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
  isUserLoggedInValidator(accessTokenValidator),
  isUserLoggedInValidator(verifiedUserValidator),
  tweetIdValidator,
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
  isUserLoggedInValidator(accessTokenValidator),
  isUserLoggedInValidator(verifiedUserValidator),
  tweetIdValidator,
  audienceValidator,
  paginationValidator,
  getTweetChildrenValidator,
  wrapRequestHandler(getTweetChildrenController as any)
)

export default tweetsRouter
