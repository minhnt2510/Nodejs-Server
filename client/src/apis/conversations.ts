import type { ApiResponse, PaginatedConversations } from '../types'
import { http } from '../lib/http'

function readResult<T>(response: ApiResponse<T>) {
  if (!response.result) {
    throw new Error(response.message || 'Empty API response')
  }
  return response.result
}

export const conversationsApi = {
  async getConversations(receiverId: string, page = 1, limit = 20) {
    const { data } = await http.get<ApiResponse<PaginatedConversations>>(`/conversations/receivers/${receiverId}`, {
      params: { page, limit }
    })
    return readResult(data)
  },

  async deleteConversation(receiverId: string) {
    const { data } = await http.delete<ApiResponse>(`/conversations/receivers/${receiverId}`)
    return data.message
  }
}
