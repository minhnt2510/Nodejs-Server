import { checkSchema } from 'express-validator'
import { MediaQueryType, PeopleFollow } from '~/constants/enums'
import { SEARCH_MESSAGES } from '~/constants/messages'
import { validate } from '~/utils/validation'

/**
 * Bài 182: searchValidator
 *
 * Validator cho tính năng search nâng cao.
 * Kiểm tra toàn bộ query params được gửi lên từ client.
 *
 * - content      : bắt buộc, không được rỗng
 * - media_type   : tuỳ chọn, chỉ nhận 'image' | 'video'  (Bài 180)
 * - people_follow: tuỳ chọn, chỉ nhận '0' | '1'          (Bài 181)
 *
 * Lưu ý Bài 178 & 179:
 *   Khi gửi từ khoá có dấu tiếng Việt hoặc ký tự đặc biệt,
 *   client PHẢI encodeURIComponent(content) trước khi gắn vào URL.
 *   Phía server KHÔNG cần decode thủ công vì Express tự xử lý.
 *   Index MongoDB được tạo với { default_language: 'none' }
 *   để hỗ trợ tìm kiếm tiếng Việt không dấu / có dấu.
 */
export const searchValidator = validate(
  checkSchema(
    {
      content: {
        isString: {
          errorMessage: SEARCH_MESSAGES.CONTENT_MUST_BE_A_NON_EMPTY_STRING
        },
        notEmpty: {
          errorMessage: SEARCH_MESSAGES.CONTENT_MUST_BE_A_NON_EMPTY_STRING
        },
        trim: true
      },
      media_type: {
        optional: true,
        isIn: {
          options: [Object.values(MediaQueryType)],
          errorMessage: SEARCH_MESSAGES.MEDIA_TYPE_MUST_BE_IMAGE_OR_VIDEO
        }
      },
      people_follow: {
        optional: true,
        isIn: {
          options: [Object.values(PeopleFollow)],
          errorMessage: SEARCH_MESSAGES.PEOPLE_FOLLOW_MUST_BE_0_OR_1
        }
      }
    },
    ['query']
  )
)
