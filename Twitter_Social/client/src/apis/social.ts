import type { ApiResponse } from '../types'
import { http } from '../lib/http'

export const socialApi = {
  async likeTweet(tweetId: string) {
    const { data } = await http.post<ApiResponse>('/likes', { tweet_id: tweetId })
    return data.message
  },

  async unlikeTweet(tweetId: string) {
    const { data } = await http.delete<ApiResponse>(`/likes/tweets/${tweetId}`)
    return data.message
  },

  async bookmarkTweet(tweetId: string) {
    const { data } = await http.post<ApiResponse>('/bookmarks', { tweet_id: tweetId })
    return data.message
  },

  async unbookmarkTweet(tweetId: string) {
    const { data } = await http.delete<ApiResponse>(`/bookmarks/tweets/${tweetId}`)
    return data.message
  }
}
