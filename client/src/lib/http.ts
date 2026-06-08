import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse, AuthResponse } from '../types'
import { authStorage } from './storage'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface ApiErrorPayload {
  message?: string
  errors?: Record<string, { msg?: string } | string>
}

interface RetryRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

let refreshRequest: Promise<AuthResponse | null> | null = null

http.interceptors.request.use((config) => {
  const accessToken = authStorage.getAccessToken()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const originalRequest = error.config as RetryRequestConfig | undefined

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = authStorage.getRefreshToken()
    if (!refreshToken) {
      authStorage.clearTokens()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    refreshRequest ??= axios
      .post<ApiResponse<AuthResponse>>(`${API_BASE_URL}/users/refresh-token`, {
        refresh_token: refreshToken
      })
      .then((response) => response.data.result ?? null)
      .finally(() => {
        refreshRequest = null
      })

    const tokens = await refreshRequest
    if (!tokens) {
      authStorage.clearTokens()
      return Promise.reject(error)
    }

    authStorage.setTokens(tokens)
    originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`
    return http(originalRequest)
  }
)

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const data = error.response?.data
    const firstError = data?.errors ? Object.values(data.errors)[0] : undefined

    if (typeof firstError === 'string') return firstError
    if (firstError?.msg) return firstError.msg
    if (data?.message) return data.message
    if (error.message) return error.message
  }

  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}
