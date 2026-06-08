import { ObjectId } from 'mongodb'
import { MediaQueryType, MediaType, PeopleFollow } from '~/constants/enums'
import { SearchQuery } from '~/models/requests/Search.requests'
import { getTweetEnrichmentStages } from '~/utils/tweet-aggregation'
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
          ...getTweetEnrichmentStages(user_id)
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
