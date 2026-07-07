import { Request, Response } from 'express'
import { CONVERSATIONS_MESSAGES } from '~/constants/messages'
import { TokenPayload } from '~/models/requests/User.requests'
import conversationsService from '~/services/conversations.services'
import databaseService from '~/services/database.services'
import { ObjectId } from 'mongodb'

export const getConversationsController = async (req: Request, res: Response) => {
  const { receiver_id } = req.params
  const limit = Number(req.query.limit)
  const page = Number(req.query.page)
  const { user_id: sender_id } = req.decoded_authorization as TokenPayload

  const { conversations, total } = await conversationsService.getConversations({
    sender_id,
    receiver_id,
    limit,
    page
  })

  return res.json({
    message: CONVERSATIONS_MESSAGES.GET_CONVERSATIONS_SUCCESS,
    result: {
      conversations: conversations.filter((c: any) => {
        const deletedFor = (c as any).deleted_for || []
        return !deletedFor.includes(sender_id)
      }),
      limit,
      page,
      total_page: Math.ceil(total / limit)
    }
  })
}

export const deleteConversationController = async (req: Request, res: Response) => {
  const { receiver_id } = req.params
  const { user_id: sender_id } = req.decoded_authorization as TokenPayload

  // Add sender_id to deleted_for on all messages between both users
  await databaseService.conversations.updateMany(
    {
      $or: [
        { sender_id: new ObjectId(sender_id), receiver_id: new ObjectId(receiver_id) },
        { sender_id: new ObjectId(receiver_id), receiver_id: new ObjectId(sender_id) }
      ]
    },
    {
      $addToSet: { deleted_for: sender_id }
    }
  )

  return res.json({ message: CONVERSATIONS_MESSAGES.DELETE_CONVERSATION_SUCCESS })
}

export const hardDeleteMessageController = async (req: Request, res: Response) => {
  const { message_id } = req.params
  const { user_id: sender_id } = req.decoded_authorization as TokenPayload

  const result = await databaseService.conversations.deleteOne({
    _id: new ObjectId(message_id),
    sender_id: new ObjectId(sender_id)
  })

  if (result.deletedCount === 0) {
    return res.status(404).json({ message: 'Message not found or not yours to delete' })
  }

  return res.json({ message: 'Message permanently deleted' })
}
