import type { ApiResponse, AuthResponse, PaginatedUsers, UpdateProfilePayload, User } from '../types'
import { http } from '../lib/http'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload extends LoginPayload {
  name: string
  confirm_password: string
  date_of_birth: string
}

export interface ResetPasswordPayload {
  forgot_password_token: string
  password: string
  confirm_password: string
}

function readResult<T>(response: ApiResponse<T>) {
  if (!response.result) {
    throw new Error(response.message || 'Empty API response')
  }
  return response.result
}

export const authApi = {
  async login(payload: LoginPayload) {
    const { data } = await http.post<ApiResponse<AuthResponse>>('/users/login', payload)
    return readResult(data)
  },

  async register(payload: RegisterPayload) {
    const { data } = await http.post<ApiResponse<AuthResponse>>('/users/register', payload)
    return readResult(data)
  },

  async logout(refreshToken: string) {
    await http.post('/users/logout', { refresh_token: refreshToken })
  },

  async getMe() {
    const { data } = await http.get<ApiResponse<User>>('/users/me')
    return readResult(data)
  },

  async updateMe(payload: UpdateProfilePayload) {
    const { data } = await http.patch<ApiResponse<User>>('/users/me', payload)
    return readResult(data)
  },

  async verifyEmail(emailVerifyToken: string) {
    const { data } = await http.post<ApiResponse<AuthResponse>>('/users/verify-email', {
      email_verify_token: emailVerifyToken
    })
    return readResult(data)
  },

  async resendVerifyEmail() {
    const { data } = await http.post<ApiResponse>('/users/resend-verify-email')
    return data.message
  },

  async forgotPassword(email: string) {
    const { data } = await http.post<ApiResponse<{ forgot_password_token: string }>>('/users/forgot-password', { email })
    return data
  },

  async verifyForgotPasswordToken(forgotPasswordToken: string) {
    const { data } = await http.post<ApiResponse>('/users/verify-forgot-password', {
      forgot_password_token: forgotPasswordToken
    })
    return data.message
  },

  async resetPassword(payload: ResetPasswordPayload) {
    const { data } = await http.post<ApiResponse>('/users/reset-password', payload)
    return data.message
  },

  async getProfile(username: string) {
    const { data } = await http.get<ApiResponse<User>>(`/users/${username}`)
    return readResult(data)
  },

  async searchUsers(q: string, page = 1, limit = 10) {
    const { data } = await http.get<ApiResponse<PaginatedUsers>>('/users/search', {
      params: { q, page, limit }
    })
    return readResult(data)
  },

  async follow(followedUserId: string) {
    const { data } = await http.post<ApiResponse>('/users/follow', {
      followed_user_id: followedUserId
    })
    return data.message
  },

  async unfollow(userId: string) {
    const { data } = await http.delete<ApiResponse>(`/users/follow/${userId}`)
    return data.message
  },

  async getFollowing() {
    const { data } = await http.get<ApiResponse<User[]>>('/users/following')
    return readResult(data)
  },

  async getContacts() {
    const { data } = await http.get<ApiResponse<User[]>>('/users/contacts')
    return readResult(data)
  },

  async getFollowingOfUser(userId: string) {
    const { data } = await http.get<ApiResponse<User[]>>(`/users/${userId}/following`)
    return readResult(data)
  },

  async getFollowersOfUser(userId: string) {
    const { data } = await http.get<ApiResponse<User[]>>(`/users/${userId}/followers`)
    return readResult(data)
  },

  async block(blockedUserId: string) {
    const { data } = await http.post<ApiResponse>('/users/block', {
      blocked_user_id: blockedUserId
    })
    return data.message
  },

  async unblock(userId: string) {
    const { data } = await http.delete<ApiResponse>(`/users/block/${userId}`)
    return data.message
  },

  async getBlockedUsers() {
    const { data } = await http.get<ApiResponse<User[]>>('/users/blocked')
    return readResult(data)
  }
}
