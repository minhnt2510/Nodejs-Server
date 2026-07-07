import { ObjectId } from 'mongodb'
import { MediaQueryType, MediaType, PeopleFollow, TweetAudience } from '~/constants/enums'
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
    const user_id_obj = new ObjectId(user_id)

    // ── Bước 1: Build $match stage ─────────────────────────────────────────────
    // Bài 178: default_language:'none' → không bỏ stop words, hỗ trợ tiếng Việt
    const $match: any = {
      $text: { $search: content }
    }

    // Bài 180: Lọc theo loại media
    if (media_type === MediaQueryType.Image) {
      $match['medias.type'] = MediaType.Image
    } else if (media_type === MediaQueryType.Video) {
      // HLS (= 2) cũng được coi là video đã encode
      $match['medias.type'] = { $in: [MediaType.Video, MediaType.HLS] }
    }

    // Tối ưu: Lọc audience – chỉ lấy tweet public (Everyone) khi search mọi người
    // Tránh trả về tweet TwitterCircle của người lạ
    if (people_follow !== PeopleFollow.Following) {
      $match['audience'] = TweetAudience.Everyone
    }

    // ── Bước 2: Xác định pipeline lookup cho people_follow ──────────────────────
    // Bài 181: Lọc tweet từ người ta follow
    // Tối ưu: Dùng $lookup trong aggregation pipeline thay vì pre-query riêng
    // → chỉ 1 DB roundtrip thay vì 2
    const followedLookupStages =
      people_follow === PeopleFollow.Following
        ? [
            // Join collection followers để lấy danh sách người mình follow
            {
              $lookup: {
                from: 'followers',
                let: { tweet_owner: '$user_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$user_id', user_id_obj] },
                          { $eq: ['$followed_user_id', '$$tweet_owner'] }
                        ]
                      }
                    }
                  }
                ],
                as: 'follow_check'
              }
            },
            // Chỉ giữ tweet của người mình follow HOẶC của chính mình
            {
              $match: {
                $or: [
                  { 'follow_check.0': { $exists: true } }, // là người mình follow
                  { user_id: user_id_obj } //                hoặc chính mình
                ]
              }
            },
            // Bỏ field tạm
            { $project: { follow_check: 0 } }
          ]
        : []

    // ── Bước 3: Bài 177 – Phân trang song song với Promise.all ─────────────────
    // Tối ưu view count: dùng $addFields để cộng 1 vào views NGAY LÚC trả data
    // thay vì updateMany sau → client nhận số view chính xác ngay lập tức
    const [tweets, total] = await Promise.all([
      databaseService.tweets
        .aggregate([
          { $match },
          // Thêm relevance score để sort theo độ liên quan
          { $addFields: { search_score: { $meta: 'textScore' } } },
          ...followedLookupStages,
          // Sort: ưu tiên relevance score, sau đó mới sort theo thời gian
          { $sort: { search_score: { $meta: 'textScore' }, created_at: -1 } },
          { $skip: limit * (page - 1) },
          { $limit: limit },
          // Enrichment: join users, hashtags, mentions, bookmarks, likes, tweet_children
          ...getTweetEnrichmentStages(user_id),
          // Tối ưu: cộng +1 view ngay trong pipeline → data trả về đã là số mới
          {
            $addFields: {
              user_views: { $add: ['$user_views', 1] },
              updated_at: '$$NOW'
            }
          },
          // Bỏ field tạm search_score khỏi response
          { $project: { search_score: 0 } }
        ])
        .toArray(),

      databaseService.tweets
        .aggregate([
          { $match },
          ...followedLookupStages,
          { $count: 'total' }
        ])
        .toArray()
    ])

    // ── Bước 4: Persist view count vào DB (fire-and-forget, không await) ────────
    // Tối ưu: không chặn response, increment chạy nền
    const tweet_ids = tweets.map((tweet) => (tweet as any)._id as ObjectId)
    if (tweet_ids.length > 0) {
      // Không await → trả response ngay, DB update nền
      databaseService.tweets
        .updateMany(
          { _id: { $in: tweet_ids } },
          { $inc: { user_views: 1 }, $currentDate: { updated_at: true } }
        )
        .catch((err) => console.error('[SearchService] updateMany views error:', err))
    }

    return {
      tweets,
      total: total[0]?.total ?? 0
    }
  }
}

const searchService = new SearchService()
export default searchService
