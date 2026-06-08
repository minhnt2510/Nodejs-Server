import type { ApiResponse, CreateTweetPayload, PaginatedTweets, Tweet } from '../types'
import { http } from '../lib/http'

function readResult<T>(response: ApiResponse<T>) {
  if (!response.result) {
    throw new Error(response.message || 'Empty API response')
  }
  return response.result
}

export const tweetsApi = {
  async createTweet(payload: CreateTweetPayload) {
    const { data } = await http.post<ApiResponse<Tweet>>('/tweets', payload)
    return readResult(data)
  },

  async getNewFeeds(page = 1, limit = 10) {
    const { data } = await http.get<ApiResponse<PaginatedTweets>>('/tweets/new-feeds', {
      params: { page, limit }
    })
    return readResult(data)
  },

  async getTweet(tweetId: string) {
    const { data } = await http.get<ApiResponse<Tweet>>(`/tweets/${tweetId}`)
    return readResult(data)
  },

  async getTweetChildren(tweetId: string, tweetType: number, page = 1, limit = 10) {
    const { data } = await http.get<ApiResponse<PaginatedTweets>>(`/tweets/${tweetId}/children`, {
      params: { tweet_type: tweetType, page, limit }
    })
    return readResult(data)
  }
}
