import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { BOOKMARKS_MESSAGES } from '~/constants/messages'
import { TokenPayload } from '~/models/requests/User.requests'
import bookmarksService from '~/services/bookmarks.services'

export const bookmarkTweetController = async (req: Request<ParamsDictionary, any, { tweet_id: string }>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await bookmarksService.bookmarkTweet(user_id, req.body.tweet_id)
  return res.json({ message: BOOKMARKS_MESSAGES.BOOKMARK_SUCCESSFULLY, result })
}

export const unbookmarkTweetController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await bookmarksService.unbookmarkTweet(user_id, req.params.tweet_id)
  return res.json({ message: BOOKMARKS_MESSAGES.UNBOOKMARK_SUCCESSFULLY, result })
}
