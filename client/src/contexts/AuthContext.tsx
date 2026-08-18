import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { authApi } from '../apis/auth'
import { authStorage } from '../lib/storage'
import type { AuthTokens } from '../lib/storage'
import type { User } from '../types'
import { UserVerifyStatus } from '../types'
import type { LoginPayload, RegisterPayload } from '../apis/auth'

interface AuthContextValue {
  user: User | null
  isBootstrapping: boolean
  isAuthenticated: boolean
  isVerified: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<string | null>
  logout: () => Promise<void>
  refreshUser: () => Promise<User | null>
  storeTokens: (tokens: AuthTokens) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resendVerifyEmail: () => Promise<string>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const refreshUser = useCallback(async () => {
    const tokens = authStorage.getTokens()
    if (!tokens) {
      setUser(null)
      return null
    }

    const me = await authApi.getMe()
    setUser(me)
    return me
  }, [])

  const storeTokens = useCallback(
    async (tokens: AuthTokens) => {
      authStorage.setTokens(tokens)
      await refreshUser()
    },
    [refreshUser]
  )

  const login = useCallback(
    async (payload: LoginPayload) => {
      const tokens = await authApi.login(payload)
      await storeTokens(tokens)
    },
    [storeTokens]
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const tokens = await authApi.register(payload)
      await storeTokens(tokens)
      if (tokens.email_verify_token) {
        authStorage.setPendingVerifyToken(tokens.email_verify_token)
      }
      return tokens.email_verify_token ?? null
    },
    [storeTokens]
  )

  const logout = useCallback(async () => {
    const refreshToken = authStorage.getRefreshToken()
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken)
      }
    } finally {
      authStorage.clearTokens()
      setUser(null)
    }
  }, [])

  const verifyEmail = useCallback(
    async (token: string) => {
      const tokens = await authApi.verifyEmail(token)
      await storeTokens(tokens)
      authStorage.clearPendingVerifyToken()
    },
    [storeTokens]
  )

  const resendVerifyEmail = useCallback(() => authApi.resendVerifyEmail(), [])

  useEffect(() => {
    let mounted = true

    queueMicrotask(() => {
      refreshUser()
        .catch(() => {
          authStorage.clearTokens()
          if (mounted) setUser(null)
        })
        .finally(() => {
          if (mounted) setIsBootstrapping(false)
        })
    })

    return () => {
      mounted = false
    }
  }, [refreshUser])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      isAuthenticated: Boolean(user),
      isVerified: user?.verify === UserVerifyStatus.Verified,
      login,
      register,
      logout,
      refreshUser,
      storeTokens,
      verifyEmail,
      resendVerifyEmail
    }),
    [
      user,
      isBootstrapping,
      login,
      register,
      logout,
      refreshUser,
      storeTokens,
      verifyEmail,
      resendVerifyEmail
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
