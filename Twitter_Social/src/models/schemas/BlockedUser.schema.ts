import { ObjectId } from 'mongodb'

interface BlockedUserType {
  _id?: ObjectId
  user_id: ObjectId
  blocked_user_id: ObjectId
  created_at?: Date
}

export class BlockedUser {
  _id: ObjectId
  user_id: ObjectId
  blocked_user_id: ObjectId
  created_at: Date

  constructor({ _id, user_id, blocked_user_id, created_at }: BlockedUserType) {
    this._id = _id || new ObjectId()
    this.user_id = user_id
    this.blocked_user_id = blocked_user_id
    this.created_at = created_at || new Date()
  }
}
