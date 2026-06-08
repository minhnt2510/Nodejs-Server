import { Router } from 'express'
import { bookmarkTweetController, unbookmarkTweetController } from '~/controllers/bookmarks.controllers'
import { tweetIdValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const bookmarksRouter = Router()

/**
 * @swagger
 * /bookmarks:
 *   post:
 *     tags: [Bookmarks]
 *     summary: Bookmark a tweet
 *     security:
 *       - BearerAuth: []
 */
bookmarksRouter.post(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  tweetIdValidator,
  wrapRequestHandler(bookmarkTweetController)
)

/**
 * @swagger
 * /bookmarks/tweets/{tweet_id}:
 *   delete:
 *     tags: [Bookmarks]
 *     summary: Unbookmark a tweet
 *     security:
 *       - BearerAuth: []
 */
bookmarksRouter.delete(
  '/tweets/:tweet_id',
  accessTokenValidator,
  verifiedUserValidator,
  tweetIdValidator,
  wrapRequestHandler(unbookmarkTweetController)
)

export default bookmarksRouter
