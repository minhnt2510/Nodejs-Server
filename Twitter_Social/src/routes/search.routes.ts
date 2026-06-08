import { Router } from 'express'
import { searchController } from '~/controllers/search.controllers'
import { searchValidator } from '~/middlewares/search.middlewares'
import { paginationValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const searchRouter = Router()

/**
 * @swagger
 * /search:
 *   get:
 *     tags: [Search]
 *     summary: Search tweets by content
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: content
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: media_type
 *         schema: { type: string, enum: [image, video] }
 *       - in: query
 *         name: people_follow
 *         schema: { type: string, enum: ["0", "1"] }
 */
searchRouter.get(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  searchValidator,
  paginationValidator,
  wrapRequestHandler(searchController as any)
)

export default searchRouter
