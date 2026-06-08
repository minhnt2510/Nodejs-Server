import { ObjectId } from 'mongodb'
import { MediaQueryType, MediaType, PeopleFollow, TweetType } from '~/constants/enums'
import { SearchQuery } from '~/models/requests/Search.requests'
import databaseService from './database.services'

class SearchService {
  async search({
    limit,
    page,
    content,
    media_type,
    people_follow,
    user_id
  }: {
    limit: number
    page: number
    content: string
    media_type?: MediaQueryType
    people_follow?: PeopleFollow
    user_id: string
  }) {
    const $match: any = {
      $text: { $search: content }
    }

    if (media_type) {
      if (media_type === MediaQueryType.Image) {
        $match['medias.type'] = MediaType.Image
      } else if (media_type === MediaQueryType.Video) {
        $match['medias.type'] = { $in: [MediaType.Video, MediaType.HLS] }
      }
    }

    if (people_follow === PeopleFollow.Following) {
      const user_id_obj = new ObjectId(user_id)
      const followed_user_ids = await databaseService.followers
        .find({ user_id: user_id_obj }, { projection: { followed_user_id: 1, _id: 0 } })
        .toArray()
      const ids = followed_user_ids.map((item) => item.followed_user_id)
      ids.push(user_id_obj)
      $match['user_id'] = { $in: ids }
    }

    const [tweets, total] = await Promise.all([
      databaseService.tweets
        .aggregate([
          { $match },
          { $sort: { created_at: -1 } },
          { $skip: limit * (page - 1) },
          { $limit: limit },
          { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
          { $unwind: { path: '$user' } },
          { $lookup: { from: 'hashtags', localField: 'hashtags', foreignField: '_id', as: 'hashtags' } },
          { $lookup: { from: 'users', localField: 'mentions', foreignField: '_id', as: 'mentions' } },
          {
            $addFields: {
              mentions: {
                $map: {
                  input: '$mentions',
                  as: 'mention',
                  in: { _id: '$$mention._id', name: '$$mention.name', username: '$$mention.username', email: '$$mention.email' }
                }
              }
            }
          },
          { $lookup: { from: 'bookmarks', localField: '_id', foreignField: 'tweet_id', as: 'bookmarks' } },
          { $lookup: { from: 'likes', localField: '_id', foreignField: 'tweet_id', as: 'likes' } },
          {
            $lookup: { from: 'tweets', localField: '_id', foreignField: 'parent_id', as: 'tweet_children' }
          },
          {
            $addFields: {
              bookmarks: { $size: '$bookmarks' },
              likes: { $size: '$likes' },
              retweet_count: {
                $size: { $filter: { input: '$tweet_children', as: 'item', cond: { $eq: ['$$item.type', TweetType.Retweet] } } }
              },
              comment_count: {
                $size: { $filter: { input: '$tweet_children', as: 'item', cond: { $eq: ['$$item.type', TweetType.Comment] } } }
              },
              quote_count: {
                $size: { $filter: { input: '$tweet_children', as: 'item', cond: { $eq: ['$$item.type', TweetType.QuoteTweet] } } }
              }
            }
          },
          {
            $project: {
              tweet_children: 0,
              user: { password: 0, email_verify_token: 0, forgot_password_token: 0, twitter_circle: 0 }
            }
          }
        ])
        .toArray(),
      databaseService.tweets
        .aggregate([{ $match }, { $count: 'total' }])
        .toArray()
    ])

    const tweet_ids = tweets.map((tweet) => (tweet as any)._id as ObjectId)
    const inc = user_id ? { user_views: 1 } : { guest_views: 1 }
    await databaseService.tweets.updateMany(
      { _id: { $in: tweet_ids } },
      { $inc: inc, $currentDate: { updated_at: true } }
    )

    return { tweets, total: total[0]?.total || 0 }
  }
}

const searchService = new SearchService()
export default searchService
