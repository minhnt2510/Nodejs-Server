import { Request, Response } from 'express'
import { SEARCH_MESSAGES } from '~/constants/messages'
import { SearchQuery } from '~/models/requests/Search.requests'
import { TokenPayload } from '~/models/requests/User.requests'
import searchService from '~/services/search.services'

export const searchController = async (req: Request<any, any, any, SearchQuery>, res: Response) => {
  const limit = Number(req.query.limit)
  const page = Number(req.query.page)
  const { user_id } = req.decoded_authorization as TokenPayload
  const { tweets, total } = await searchService.search({
    limit,
    page,
    content: req.query.content,
    media_type: req.query.media_type,
    people_follow: req.query.people_follow,
    user_id
  })
  return res.json({
    message: SEARCH_MESSAGES.SEARCH_SUCCESS,
    result: { tweets, limit, page, total_page: Math.ceil(total / limit) }
  })
}
