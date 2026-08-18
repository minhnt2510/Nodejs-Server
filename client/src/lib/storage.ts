const ACCESS_TOKEN_KEY = 'twitter_social_access_token'
const REFRESH_TOKEN_KEY = 'twitter_social_refresh_token'
const PENDING_VERIFY_TOKEN_KEY = 'twitter_social_pending_verify_token'

export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export const authStorage = {
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  getTokens(): AuthTokens | null {
    const access_token = this.getAccessToken()
    const refresh_token = this.getRefreshToken()
    if (!access_token || !refresh_token) return null
    return { access_token, refresh_token }
  },

  setTokens(tokens: AuthTokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
  },

  clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    this.clearPendingVerifyToken()
  },

  getPendingVerifyToken() {
    return localStorage.getItem(PENDING_VERIFY_TOKEN_KEY)
  },

  setPendingVerifyToken(token: string) {
    localStorage.setItem(PENDING_VERIFY_TOKEN_KEY, token)
  },

  clearPendingVerifyToken() {
    localStorage.removeItem(PENDING_VERIFY_TOKEN_KEY)
  }
}
