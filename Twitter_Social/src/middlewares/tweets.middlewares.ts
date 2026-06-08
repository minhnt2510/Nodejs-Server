import { Request, Response, NextFunction } from 'express'
import { checkSchema } from 'express-validator'
import { isEmpty } from 'lodash'
import { ObjectId } from 'mongodb'
import { MediaType, TweetAudience, TweetType, UserVerifyStatus } from '~/constants/enums'
import { HTTP_STATUS } from '~/constants/httpStatus'
import { TWEETS_MESSAGES, USERS_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { TokenPayload } from '~/models/requests/User.requests'
import databaseService from '~/services/database.services'
import { validate } from '~/utils/validation'

export const createTweetValidator = validate(
  checkSchema(
    {
      type: {
        isIn: { options: [Object.values(TweetType)], errorMessage: TWEETS_MESSAGES.INVALID_TYPE }
      },
      audience: {
        isIn: { options: [Object.values(TweetAudience)], errorMessage: TWEETS_MESSAGES.INVALID_AUDIENCE }
      },
      parent_id: {
        custom: {
          options: (value, { req }) => {
            const type = req.body.type as TweetType
            if (
              [TweetType.Retweet, TweetType.Comment, TweetType.QuoteTweet].includes(type) &&
              !ObjectId.isValid(value)
            ) {
              throw new Error(TWEETS_MESSAGES.PARENT_ID_MUST_BE_A_VALID_TWEET_ID)
            }
            if (type === TweetType.Tweet && value !== null) {
              throw new Error(TWEETS_MESSAGES.PARENT_ID_MUST_BE_NULL)
            }
            return true
          }
        }
      },
      content: {
        isString: true,
        custom: {
          options: (value, { req }) => {
            const type = req.body.type as TweetType
            const hashtags = req.body.hashtags as string[]
            const mentions = req.body.mentions as string[]
            if (
              [TweetType.Tweet, TweetType.Comment, TweetType.QuoteTweet].includes(type) &&
              isEmpty(hashtags) &&
              isEmpty(mentions) &&
              value === ''
            ) {
              throw new Error(TWEETS_MESSAGES.CONTENT_MUST_BE_A_NON_EMPTY_STRING)
            }
            if (type === TweetType.Retweet && value !== '') {
              throw new Error(TWEETS_MESSAGES.CONTENT_MUST_BE_EMPTY_STRING)
            }
            return true
          }
        }
      },
      hashtags: {
        isArray: true,
        custom: {
          options: (value, { req }) => {
            if (!value.every((item: any) => typeof item === 'string')) {
              throw new Error(TWEETS_MESSAGES.HASHTAGS_MUST_BE_AN_ARRAY_OF_STRING)
            }
            return true
          }
        }
      },
      mentions: {
        isArray: true,
        custom: {
          options: (value, { req }) => {
            if (!value.every((item: any) => ObjectId.isValid(item))) {
              throw new Error(TWEETS_MESSAGES.MENTIONS_MUST_BE_AN_ARRAY_OF_USER_ID)
            }
            return true
          }
        }
      },
      medias: {
        isArray: true,
        custom: {
          options: (value, { req }) => {
            if (
              !value.every((item: any) => {
                return typeof item.url === 'string' && [MediaType.Image, MediaType.Video, MediaType.HLS].includes(item.type)
              })
            ) {
              throw new Error(TWEETS_MESSAGES.MEDIAS_MUST_BE_AN_ARRAY_OF_MEDIA_OBJECT)
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)

export const tweetIdValidator = validate(
  checkSchema(
    {
      tweet_id: {
        custom: {
          options: async (value, { req }) => {
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({ message: TWEETS_MESSAGES.INVALID_TWEET_ID, status: HTTP_STATUS.BAD_REQUEST })
            }
            const [tweet] = await databaseService.tweets
              .aggregate<any>([
                { $match: { _id: new ObjectId(value) } },
                {
                  $lookup: {
                    from: 'hashtags',
                    localField: 'hashtags',
                    foreignField: '_id',
                    as: 'hashtags'
                  }
                },
                {
                  $lookup: {
                    from: 'users',
                    localField: 'mentions',
                    foreignField: '_id',
                    as: 'mentions'
                  }
                },
                {
                  $addFields: {
                    mentions: {
                      $map: {
                        input: '$mentions',
                        as: 'mention',
                        in: {
                          _id: '$$mention._id',
                          name: '$$mention.name',
                          username: '$$mention.username',
                          email: '$$mention.email'
                        }
                      }
                    }
                  }
                },
                {
                  $lookup: {
                    from: 'bookmarks',
                    localField: '_id',
                    foreignField: 'tweet_id',
                    as: 'bookmarks'
                  }
                },
                {
                  $lookup: {
                    from: 'likes',
                    localField: '_id',
                    foreignField: 'tweet_id',
                    as: 'likes'
                  }
                },
                {
                  $lookup: {
                    from: 'tweets',
                    localField: '_id',
                    foreignField: 'parent_id',
                    as: 'tweet_children'
                  }
                },
                {
                  $addFields: {
                    bookmarks: { $size: '$bookmarks' },
                    likes: { $size: '$likes' },
                    retweet_count: {
                      $size: {
                        $filter: {
                          input: '$tweet_children',
                          as: 'item',
                          cond: { $eq: ['$$item.type', TweetType.Retweet] }
                        }
                      }
                    },
                    comment_count: {
                      $size: {
                        $filter: {
                          input: '$tweet_children',
                          as: 'item',
                          cond: { $eq: ['$$item.type', TweetType.Comment] }
                        }
                      }
                    },
                    quote_count: {
                      $size: {
                        $filter: {
                          input: '$tweet_children',
                          as: 'item',
                          cond: { $eq: ['$$item.type', TweetType.QuoteTweet] }
                        }
                      }
                    }
                  }
                },
                { $project: { tweet_children: 0 } }
              ])
              .toArray()
            if (!tweet) {
              throw new ErrorWithStatus({ message: TWEETS_MESSAGES.TWEET_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND })
            }
            ;(req as Request).tweet = tweet
            return true
          }
        }
      }
    },
    ['params', 'body']
  )
)

export const audienceValidator = async (req: Request, res: Response, next: NextFunction) => {
  const tweet = req.tweet as any
  if (tweet.audience === TweetAudience.TwitterCircle) {
    if (!req.decoded_authorization) {
      throw new ErrorWithStatus({ message: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED, status: HTTP_STATUS.UNAUTHORIZED })
    }
    const author = await databaseService.users.findOne({ _id: new ObjectId(tweet.user_id) })
    if (!author || author.verify === UserVerifyStatus.Banned) {
      throw new ErrorWithStatus({ message: USERS_MESSAGES.USER_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND })
    }
    const { user_id } = req.decoded_authorization as TokenPayload
    const isInTwitterCircle = author.twitter_circle?.some((user_circle_id) =>
      user_circle_id.equals(user_id)
    )
    if (!author._id.equals(user_id) && !isInTwitterCircle) {
      throw new ErrorWithStatus({ message: TWEETS_MESSAGES.TWEET_IS_NOT_PUBLIC, status: HTTP_STATUS.FORBIDDEN })
    }
  }
  next()
}

export const getTweetChildrenValidator = validate(
  checkSchema(
    {
      tweet_type: {
        isIn: { options: [Object.values(TweetType)], errorMessage: TWEETS_MESSAGES.INVALID_TYPE }
      }
    },
    ['query']
  )
)

export const paginationValidator = validate(
  checkSchema(
    {
      limit: {
        isNumeric: true,
        custom: {
          options: (value) => {
            const num = Number(value)
            if (num > 100 || num < 1) throw new Error('Limit must be between 1 and 100')
            return true
          }
        }
      },
      page: {
        isNumeric: true,
        custom: {
          options: (value) => {
            const num = Number(value)
            if (num < 1) throw new Error('Page must be >= 1')
            return true
          }
        }
      }
    },
    ['query']
  )
)
