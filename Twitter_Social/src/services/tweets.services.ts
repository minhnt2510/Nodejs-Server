import { ObjectId, WithId } from 'mongodb'
import { TweetAudience, TweetType } from '~/constants/enums'
import { HTTP_STATUS } from '~/constants/httpStatus'
import { TWEETS_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { TweetReqBody, UpdateTweetReqBody } from '~/models/requests/Tweet.requests'
import Tweet from '~/models/schemas/Tweet.schema'
import { Hashtag } from '~/models/schemas/Hashtag.schema'
import { getTweetEnrichmentStages } from '~/utils/tweet-aggregation'
import databaseService from './database.services'

class TweetsService {
  private async checkAndCreateHashtags(hashtags: string[]) {
    const hashtagDocuments = await Promise.all(
      hashtags.map((hashtag) =>
        databaseService.hashtags.findOneAndUpdate(
          { name: hashtag },
          { $setOnInsert: new Hashtag({ name: hashtag }) },
          { upsert: true, returnDocument: 'after' }
        )
      )
    )
    return hashtagDocuments.map((hashtag) => (hashtag as WithId<Hashtag>)._id)
  }

  private async getTweetById(tweet_id: ObjectId, viewer_id?: string) {
    const [tweet] = await databaseService.tweets
      .aggregate([
        { $match: { _id: tweet_id } },
        ...getTweetEnrichmentStages(viewer_id)
      ])
      .toArray()
    return tweet
  }

  async createTweet(user_id: string, body: TweetReqBody) {
    const hashtags = await this.checkAndCreateHashtags(body.hashtags)
    const result = await databaseService.tweets.insertOne(
      new Tweet({
        audience: body.audience,
        content: body.content,
        hashtags,
        mentions: body.mentions,
        medias: body.medias,
        parent_id: body.parent_id,
        type: body.type,
        user_id: new ObjectId(user_id)
      })
    )
    return this.getTweetById(result.insertedId, user_id)
  }

  async updateTweet(user_id: string, tweet_id: string, body: UpdateTweetReqBody) {
    const tweet_id_obj = new ObjectId(tweet_id)
    const tweet = await databaseService.tweets.findOne({ _id: tweet_id_obj })
    if (!tweet) {
      throw new ErrorWithStatus({ message: TWEETS_MESSAGES.TWEET_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND })
    }
    if (!tweet.user_id.equals(user_id)) {
      throw new ErrorWithStatus({ message: TWEETS_MESSAGES.TWEET_PERMISSION_DENIED, status: HTTP_STATUS.FORBIDDEN })
    }
    if (tweet.type === TweetType.Retweet) {
      throw new ErrorWithStatus({ message: TWEETS_MESSAGES.RETWEET_CANNOT_BE_UPDATED, status: HTTP_STATUS.BAD_REQUEST })
    }

    const update: Record<string, unknown> = {}
    if (body.content !== undefined) update.content = body.content.trim()
    if (body.audience !== undefined) update.audience = body.audience
    if (body.medias !== undefined) update.medias = body.medias
    if (body.mentions !== undefined) update.mentions = body.mentions.map((item) => new ObjectId(item))
    if (body.hashtags !== undefined) update.hashtags = await this.checkAndCreateHashtags(body.hashtags)

    const next_content = body.content !== undefined ? body.content.trim() : tweet.content
    const next_hashtags = body.hashtags !== undefined ? body.hashtags : tweet.hashtags
    const next_mentions = body.mentions !== undefined ? body.mentions : tweet.mentions
    const next_medias = body.medias !== undefined ? body.medias : tweet.medias
    if (!next_content && next_hashtags.length === 0 && next_mentions.length === 0 && next_medias.length === 0) {
      throw new ErrorWithStatus({
        message: TWEETS_MESSAGES.CONTENT_MUST_BE_A_NON_EMPTY_STRING,
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY
      })
    }

    await databaseService.tweets.updateOne(
      { _id: tweet_id_obj },
      { $set: update, $currentDate: { updated_at: true } }
    )
    return this.getTweetById(tweet_id_obj, user_id)
  }

  async deleteTweet(user_id: string, tweet_id: string) {
    const tweet_id_obj = new ObjectId(tweet_id)
    const tweet = await databaseService.tweets.findOne({ _id: tweet_id_obj })
    if (!tweet) {
      throw new ErrorWithStatus({ message: TWEETS_MESSAGES.TWEET_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND })
    }
    if (!tweet.user_id.equals(user_id)) {
      throw new ErrorWithStatus({ message: TWEETS_MESSAGES.TWEET_PERMISSION_DENIED, status: HTTP_STATUS.FORBIDDEN })
    }

    const [tree] = await databaseService.tweets
      .aggregate<{ descendants: Array<{ _id: ObjectId }> }>([
        { $match: { _id: tweet_id_obj } },
        {
          $graphLookup: {
            from: 'tweets',
            startWith: '$_id',
            connectFromField: '_id',
            connectToField: 'parent_id',
            as: 'descendants'
          }
        },
        { $project: { descendants: 1 } }
      ])
      .toArray()

    const tweet_ids = [tweet_id_obj, ...(tree?.descendants.map((item) => item._id) ?? [])]
    await Promise.all([
      databaseService.likes.deleteMany({ tweet_id: { $in: tweet_ids } }),
      databaseService.bookmarks.deleteMany({ tweet_id: { $in: tweet_ids } }),
      databaseService.tweets.deleteMany({ _id: { $in: tweet_ids } })
    ])

    return { deleted_tweet_ids: tweet_ids.map((item) => item.toString()) }
  }

  async increaseView(tweet_id: string, user_id?: string) {
    const inc = user_id ? { user_views: 1 } : { guest_views: 1 }
    const result = await databaseService.tweets.findOneAndUpdate(
      { _id: new ObjectId(tweet_id) },
      { $inc: inc, $currentDate: { updated_at: true } },
      { returnDocument: 'after', projection: { guest_views: 1, user_views: 1, updated_at: 1 } }
    )
    return result as WithId<Pick<Tweet, 'guest_views' | 'user_views' | 'updated_at'>>
  }

  async getTweetChildren({
    tweet_id,
    tweet_type,
    limit,
    page,
    user_id
  }: {
    tweet_id: string
    tweet_type: TweetType
    limit: number
    page: number
    user_id?: string
  }) {
    const tweets = await databaseService.tweets
      .aggregate([
        {
          $match: {
            parent_id: new ObjectId(tweet_id),
            type: tweet_type
          }
        },
        { $sort: { created_at: -1 } },
        { $skip: limit * (page - 1) },
        { $limit: limit },
        ...getTweetEnrichmentStages(user_id)
      ])
      .toArray()

    const ids = tweets.map((tweet) => (tweet as any)._id as ObjectId)
    const inc = user_id ? { user_views: 1 } : { guest_views: 1 }
    const [, total] = await Promise.all([
      databaseService.tweets.updateMany({ _id: { $in: ids } }, { $inc: inc, $currentDate: { updated_at: true } }),
      databaseService.tweets.countDocuments({ parent_id: new ObjectId(tweet_id), type: tweet_type })
    ])
    return { tweets, total }
  }

  async getNewFeeds({ user_id, limit, page }: { user_id: string; limit: number; page: number }) {
    const user_id_obj = new ObjectId(user_id)
    const followed_user_ids = await databaseService.followers
      .find({ user_id: user_id_obj }, { projection: { followed_user_id: 1, _id: 0 } })
      .toArray()

    const ids = followed_user_ids.map((item) => item.followed_user_id)
    ids.push(user_id_obj) // include own tweets

    const [tweets, total] = await Promise.all([
      databaseService.tweets
        .aggregate([
          {
            $match: {
              user_id: { $in: ids }
            }
          },
          { $sort: { created_at: -1 } },
          { $skip: limit * (page - 1) },
          { $limit: limit },
          ...getTweetEnrichmentStages(user_id)
        ])
        .toArray(),
      databaseService.tweets
        .aggregate([
          { $match: { user_id: { $in: ids } } },
          { $count: 'total' }
        ])
        .toArray()
    ])

    const tweet_ids = tweets.map((tweet) => (tweet as any)._id as ObjectId)
    await databaseService.tweets.updateMany(
      { _id: { $in: tweet_ids } },
      { $inc: { user_views: 1 }, $currentDate: { updated_at: true } }
    )

    return { tweets, total: total[0]?.total || 0 }
  }

  async getUserTweets({
    profile_user_id,
    viewer_id,
    limit,
    page
  }: {
    profile_user_id: string
    viewer_id: string
    limit: number
    page: number
  }) {
    const profile_user_id_obj = new ObjectId(profile_user_id)
    const match =
      profile_user_id === viewer_id
        ? { user_id: profile_user_id_obj }
        : { user_id: profile_user_id_obj, audience: TweetAudience.Everyone }

    const [tweets, total] = await Promise.all([
      databaseService.tweets
        .aggregate([
          { $match: match },
          { $sort: { created_at: -1 } },
          { $skip: limit * (page - 1) },
          { $limit: limit },
          ...getTweetEnrichmentStages(viewer_id)
        ])
        .toArray(),
      databaseService.tweets.countDocuments(match)
    ])

    const tweet_ids = tweets.map((tweet) => tweet._id as ObjectId)
    if (tweet_ids.length) {
      await databaseService.tweets.updateMany(
        { _id: { $in: tweet_ids } },
        {
          $inc: { user_views: 1 },
          $currentDate: { updated_at: true }
        }
      )
    }

    return { tweets, total }
  }
}

const tweetsService = new TweetsService()
export default tweetsService
