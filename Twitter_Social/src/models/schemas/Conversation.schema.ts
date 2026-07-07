import { ObjectId } from 'mongodb'
import { Media } from '~/models/requests/Tweet.requests'

export interface MessageReaction {
  user_id: ObjectId
  emoji: string
}

interface ConversationType {
  _id?: ObjectId
  sender_id: ObjectId
  receiver_id: ObjectId
  content: string
  medias?: Media[]
  is_deleted?: boolean
  reactions?: MessageReaction[]
  created_at?: Date
  updated_at?: Date
}

export class Conversation {
  _id: ObjectId
  sender_id: ObjectId
  receiver_id: ObjectId
  content: string
  medias: Media[]
  is_deleted: boolean
  reactions: MessageReaction[]
  created_at: Date
  updated_at: Date

  constructor({ _id, sender_id, receiver_id, content, medias, is_deleted, reactions, created_at, updated_at }: ConversationType) {
    const date = new Date()
    this._id = _id || new ObjectId()
    this.sender_id = sender_id
    this.receiver_id = receiver_id
    this.content = content
    this.medias = medias || []
    this.is_deleted = is_deleted || false
    this.reactions = reactions || []
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}

