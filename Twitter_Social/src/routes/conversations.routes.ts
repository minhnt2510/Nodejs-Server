import { Router } from 'express'
import {
  getConversationsController,
  deleteConversationController
} from '~/controllers/conversations.controllers'
import { paginationValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const conversationsRouter = Router()

/**
 * @swagger
 * /conversations/receivers/{receiver_id}:
 *   get:
 *     tags: [Conversations]
 *     summary: Get conversation messages with a user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: receiver_id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 */
conversationsRouter.get(
  '/receivers/:receiver_id',
  accessTokenValidator,
  verifiedUserValidator,
  paginationValidator,
  wrapRequestHandler(getConversationsController)
)

/**
 * DELETE /conversations/receivers/:receiver_id
 * Delete entire conversation (hide messages from your view)
 */
conversationsRouter.delete(
  '/receivers/:receiver_id',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(deleteConversationController)
)

export default conversationsRouter
