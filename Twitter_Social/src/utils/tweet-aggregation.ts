import { Document, ObjectId } from 'mongodb'
import { TweetType } from '~/constants/enums'

export const getTweetEnrichmentStages = (viewer_id?: string): Document[] => {
  const viewer = viewer_id ? new ObjectId(viewer_id) : null

  return [
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
    { $lookup: { from: 'bookmarks', localField: '_id', foreignField: 'tweet_id', as: 'bookmark_docs' } },
    { $lookup: { from: 'likes', localField: '_id', foreignField: 'tweet_id', as: 'like_docs' } },
    { $lookup: { from: 'tweets', localField: '_id', foreignField: 'parent_id', as: 'tweet_children' } },
    {
      $addFields: {
        bookmarks: { $size: '$bookmark_docs' },
        likes: { $size: '$like_docs' },
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
        },
        views: { $add: ['$guest_views', '$user_views'] },
        is_liked: viewer ? { $in: [viewer, '$like_docs.user_id'] } : false,
        is_bookmarked: viewer ? { $in: [viewer, '$bookmark_docs.user_id'] } : false,
        viewer_repost_id: viewer
          ? {
              $arrayElemAt: [
                {
                  $map: {
                    input: {
                      $filter: {
                        input: '$tweet_children',
                        as: 'item',
                        cond: {
                          $and: [
                            { $eq: ['$$item.type', TweetType.Retweet] },
                            { $eq: ['$$item.user_id', viewer] }
                          ]
                        }
                      }
                    },
                    as: 'repost',
                    in: '$$repost._id'
                  }
                },
                0
              ]
            }
          : null
      }
    },
    {
      $project: {
        bookmark_docs: 0,
        like_docs: 0,
        tweet_children: 0,
        user: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0,
          twitter_circle: 0
        }
      }
    }
  ]
}
