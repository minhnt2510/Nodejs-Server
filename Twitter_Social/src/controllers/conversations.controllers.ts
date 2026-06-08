import { Request, Response } from 'express'
import { CONVERSATIONS_MESSAGES } from '~/constants/messages'
import { TokenPayload } from '~/models/requests/User.requests'
import conversationsService from '~/services/conversations.services'

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
      conversations,
      limit,
      page,
      total_page: Math.ceil(total / limit)
    }
  })
}
