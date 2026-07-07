import { Query } from 'express-serve-static-core'
import { MediaQueryType, PeopleFollow } from '~/constants/enums'

/**
 * Bài 176: Thiết kế route search
 * Query params cho search API:
 * - content: từ khoá tìm kiếm (bắt buộc)
 * - limit: số tweet mỗi trang (1-100)
 * - page: trang hiện tại (>= 1)
 * - media_type: lọc theo loại media (image | video)  — Bài 180
 * - people_follow: lọc từ người follow (0 = mọi người | 1 = chỉ người follow) — Bài 181
 */
export interface SearchQuery extends Query {
  content: string
  limit: string
  page: string
  media_type?: MediaQueryType
  people_follow?: PeopleFollow
}
