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

const initSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*'
    }
  })

  // Map user_id → socket_id
  const users: Record<string, string> = {}

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
    users[user_id] = socket.id
    console.log(`User ${user_id} connected (socket: ${socket.id})`)

    // Nhận tin nhắn và forward đến receiver
    socket.on('send_message', async (data) => {
      const { receiver_id, sender_id, content } = data.payload
      const receiver_socket_id = users[receiver_id]

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

    socket.on('disconnect', () => {
      delete users[user_id]
      console.log(`User ${user_id} disconnected`)
    })
  })

  return io
}

export default initSocket
