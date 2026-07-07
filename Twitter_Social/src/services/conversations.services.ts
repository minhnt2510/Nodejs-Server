import { ObjectId } from 'mongodb'
import { Conversation } from '~/models/schemas/Conversation.schema'
import databaseService from './database.services'

class ConversationsService {
  async getConversations({
    sender_id,
    receiver_id,
    limit,
    page
  }: {
    sender_id: string
    receiver_id: string
    limit: number
    page: number
  }) {
    const match = {
      $or: [
        { sender_id: new ObjectId(sender_id), receiver_id: new ObjectId(receiver_id) },
        { sender_id: new ObjectId(receiver_id), receiver_id: new ObjectId(sender_id) }
      ]
    }
    const [conversations, total] = await Promise.all([
      databaseService.conversations
        .find(match)
        .sort({ created_at: -1 })
        .skip(limit * (page - 1))
        .limit(limit)
        .toArray(),
      databaseService.conversations.countDocuments(match)
    ])
    return { conversations, total }
  }

  async deleteConversation({ sender_id, receiver_id }: { sender_id: string; receiver_id: string }) {
    const result = await databaseService.conversations.updateMany(
      {
        sender_id: new ObjectId(sender_id),
        receiver_id: new ObjectId(receiver_id)
      },
      {
        $set: {
          is_deleted: true,
          content: 'Tin nhắn đã bị thu hồi',
          medias: [],
          updated_at: new Date()
        }
      }
    )
    return result
  }
}

const conversationsService = new ConversationsService()
export default conversationsService
