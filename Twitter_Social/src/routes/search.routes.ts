import { Router } from 'express'
import { searchController } from '~/controllers/search.controllers'
import { searchValidator } from '~/middlewares/search.middlewares'
import { paginationValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const searchRouter = Router()

/**
 * @swagger
 * /search:
 *   get:
 *     tags: [Search]
 *     summary: Tìm kiếm tweet theo nội dung (nâng cao)
 *     description: |
 *       Full-text search tweet dùng MongoDB $text index.
 *       Kết quả được sort theo **relevance score** (TextScore) trước, sau đó mới theo thời gian.
 *
 *       **Lưu ý encoding (Bài 179):**
 *       Nếu `content` có dấu tiếng Việt / ký tự đặc biệt, hãy nhập thẳng vào
 *       Params tab trên Postman (tự encode) hoặc dùng `encodeURIComponent()` thủ công.
 *       Express tự decode phía server — không cần xử lý thêm.
 *
 *       **Bài 178 – Fix tìm không được một số từ:**
 *       Index tạo với `default_language:'none'` — không bỏ stop words, hỗ trợ tiếng Việt.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: content
 *         required: true
 *         schema: { type: string }
 *         example: "hello world"
 *         description: Từ khoá tìm kiếm
 *       - in: query
 *         name: limit
 *         required: true
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *         example: 10
 *       - in: query
 *         name: page
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *         example: 1
 *       - in: query
 *         name: media_type
 *         required: false
 *         schema: { type: string, enum: [image, video] }
 *         description: Bài 180 – Lọc tweet có chứa image hoặc video
 *       - in: query
 *         name: people_follow
 *         required: false
 *         schema: { type: string, enum: ["0", "1"] }
 *         description: Bài 181 – "0" mọi người, "1" chỉ người đang follow
 *     responses:
 *       200:
 *         description: Search thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Search success }
 *                 result:
 *                   type: object
 *                   properties:
 *                     tweets: { type: array, items: { type: object } }
 *                     limit: { type: integer }
 *                     page: { type: integer }
 *                     total: { type: integer }
 *                     total_page: { type: integer }
 */
searchRouter.get(
  '/',
  accessTokenValidator,
  verifiedUserValidator,
  searchValidator,
  paginationValidator,
  wrapRequestHandler(searchController as any)
)

export default searchRouter
