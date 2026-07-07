import { Server as HttpServer } from 'http'
import { ObjectId } from 'mongodb'
import { Server } from 'socket.io'
import { envConfig } from '~/constants/config'
import { UserVerifyStatus } from '~/constants/enums'
import { HTTP_STATUS } from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import { TokenPayload } from '~/models/requests/User.requests'
import { Conversation } from '~/models/schemas/Conversation.schema'
import databaseService from '~/services/database.services'
import { verifyToken } from '~/utils/jwt'

let ioInstance: Server | null = null
export const activeSockets: Record<string, string> = {}

export const getIo = () => ioInstance

const initSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*'
    }
  })
  ioInstance = io

  // Middleware xác thực socket
  io.use(async (socket, next) => {
    const { Authorization } = socket.handshake.auth
    const access_token = Authorization?.split(' ')[1]
    try {
      const decoded_authorization = await verifyToken({
        token: access_token,
        secretOrPublicKey: envConfig.jwtSecretAccessToken
      })
      const { verify } = decoded_authorization
      if (verify !== UserVerifyStatus.Verified) {
        throw new ErrorWithStatus({ message: 'User not verified', status: HTTP_STATUS.FORBIDDEN })
      }
      socket.handshake.auth.decoded_authorization = decoded_authorization
      socket.handshake.auth.access_token = access_token
      next()
    } catch (error) {
      next({ message: 'Unauthorized', name: 'UnauthorizedError', data: error } as Error)
    }
  })

  io.on('connection', (socket) => {
    const { user_id } = socket.handshake.auth.decoded_authorization as TokenPayload
    activeSockets[user_id] = socket.id
    console.log(`User ${user_id} connected (socket: ${socket.id})`)

    // Nhận tin nhắn và forward đến receiver
    socket.on('send_message', async (data) => {
      const { receiver_id, sender_id, content } = data.payload

      // Check block status
      const isBlocked = await databaseService.blockedUsers.findOne({
        $or: [
          { user_id: new ObjectId(sender_id), blocked_user_id: new ObjectId(receiver_id) },
          { user_id: new ObjectId(receiver_id), blocked_user_id: new ObjectId(sender_id) }
        ]
      })

      if (isBlocked) {
        socket.emit('send_message_error', {
          message: 'You cannot send messages to this user'
        })
        return
      }

      const receiver_socket_id = activeSockets[receiver_id]

      // Lưu vào DB
      const conversation = new Conversation({
        sender_id: new ObjectId(sender_id),
        receiver_id: new ObjectId(receiver_id),
        content: content
      })
      const result = await databaseService.conversations.insertOne(conversation)
      conversation._id = result.insertedId

      if (receiver_socket_id) {
        socket.to(receiver_socket_id).emit('receive_message', {
          payload: conversation
        })
      }
    })

    // Xóa tin nhắn (thu hồi)
    socket.on('delete_message', async (data) => {
      const { message_id, receiver_id } = data
      const messageObjectId = new ObjectId(message_id)

      const updateResult = await databaseService.conversations.updateOne(
        {
          _id: messageObjectId,
          sender_id: new ObjectId(user_id) // Chỉ người gửi mới được xóa
        },
        {
          $set: {
            is_deleted: true,
            content: 'Tin nhắn đã bị thu hồi',
            updated_at: new Date()
          }
        }
      )

      if (updateResult.modifiedCount > 0) {
        const receiver_socket_id = activeSockets[receiver_id]
        socket.emit('message_deleted', { message_id })
        if (receiver_socket_id) {
          socket.to(receiver_socket_id).emit('message_deleted', { message_id })
        }
      }
    })

    // Thả cảm xúc emoji
    socket.on('react_message', async (data) => {
      const { message_id, receiver_id, emoji } = data
      const messageObjectId = new ObjectId(message_id)
      const uid = new ObjectId(user_id)

      const message = await databaseService.conversations.findOne({ _id: messageObjectId })
      if (!message) return

      const updatedReactions = [...(message.reactions || [])]
      const existingReactionIndex = updatedReactions.findIndex((r) => r.user_id.toString() === user_id)

      if (emoji) {
        if (existingReactionIndex > -1) {
          updatedReactions[existingReactionIndex].emoji = emoji
        } else {
          updatedReactions.push({ user_id: uid, emoji })
        }
      } else {
        if (existingReactionIndex > -1) {
          updatedReactions.splice(existingReactionIndex, 1)
        }
      }

      const updateResult = await databaseService.conversations.updateOne(
        { _id: messageObjectId },
        {
          $set: {
            reactions: updatedReactions,
            updated_at: new Date()
          }
        }
      )

      if (updateResult.modifiedCount > 0 || updateResult.matchedCount > 0) {
        const receiver_socket_id = activeSockets[receiver_id]
        socket.emit('message_reacted', { message_id, reactions: updatedReactions })
        if (receiver_socket_id) {
          socket.to(receiver_socket_id).emit('message_reacted', { message_id, reactions: updatedReactions })
        }
      }
    })

    socket.on('disconnect', () => {
      delete activeSockets[user_id]
      console.log(`User ${user_id} disconnected`)
    })
  })

  return io
}

export default initSocket
