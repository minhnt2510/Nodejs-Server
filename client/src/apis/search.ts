import type { ApiResponse, PaginatedTweets } from '../types'
import { http } from '../lib/http'

export interface SearchTweetsParams {
  content: string
  page?: number
  limit?: number
  media_type?: 'image' | 'video'
  people_follow?: '0' | '1'
}

function readResult<T>(response: ApiResponse<T>) {
  if (!response.result) {
    throw new Error(response.message || 'Empty API response')
  }
  return response.result
}

export const searchApi = {
  async searchTweets(params: SearchTweetsParams) {
    const { data } = await http.get<ApiResponse<PaginatedTweets>>('/search', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        content: params.content,
        media_type: params.media_type || undefined,
        people_follow: params.people_follow || undefined
      }
    })
    return readResult(data)
  }
}
