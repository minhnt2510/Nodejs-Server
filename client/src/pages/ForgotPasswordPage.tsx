import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { authApi } from '../apis/auth'
import { AuthShell } from '../components/layout/AuthShell'
import { Alert } from '../components/ui/Alert'
import { getErrorMessage } from '../lib/http'

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || searchParams.get('forgot_password_token') || ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return

    authApi
      .verifyForgotPasswordToken(token)
      .then((message) => setStatus(message))
      .catch((err) => setError(getErrorMessage(err)))
  }, [token])

  const onRequestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setStatus('')
    setIsSubmitting(true)

    // Timeout 15 giây — tránh "Sending..." vô thời hạn khi server chậm
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false)
      setStatus('Email reset đã được gửi nếu địa chỉ tồn tại trong hệ thống. Vui lòng kiểm tra hộp thư.')
    }, 15_000)

    try {
      const message = await authApi.forgotPassword(email)
      clearTimeout(timeoutId)
      setStatus(message)
    } catch (err) {
      clearTimeout(timeoutId)
      // Server có thể trả 500 nhưng email vẫn được gửi (fire-and-forget)
      setStatus('Email reset đã được gửi nếu địa chỉ tồn tại trong hệ thống. Vui lòng kiểm tra hộp thư.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setStatus('')
    setIsSubmitting(true)

    try {
      const message = await authApi.resetPassword({
        forgot_password_token: token,
        password,
        confirm_password: confirmPassword
      })
      setStatus(message)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title={token ? 'Reset your password' : 'Forgot your password?'}
      description={
        token
          ? 'Choose a new strong password for your Twitter Social account.'
          : 'Enter your email and the backend will send a reset link.'
      }
      footer={
        <Link to="/login" className="font-bold text-twitter-blue hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="space-y-4">
        {status ? (
          <div className="space-y-3">
            <Alert type="success">{status}</Alert>
            {!token && (
              <div className="rounded-2xl border border-twitter-border bg-twitter-bg/50 p-4 text-xs text-twitter-muted space-y-3">
                <div>
                  <span className="font-bold text-twitter-text block mb-1">🔑 Hướng dẫn lấy lại mật khẩu:</span>
                  Hãy kiểm tra xem địa chỉ email của bạn đã chính xác chưa. Nếu chính xác, vui lòng click vào liên kết được gửi trong email để đặt lại mật khẩu mới.
                </div>
                <hr className="border-twitter-border" />
                <div>
                  <span className="font-bold text-yellow-600 dark:text-yellow-500 block mb-1">💡 Hướng dẫn cho Tester:</span>
                  Nếu bạn đang thử nghiệm và không nhận được email (do tài khoản AWS SES Sandbox hạn chế gửi thư), bạn vẫn có thể lấy link đặt lại mật khẩu bằng cách kiểm tra <strong>màn hình Logs trên Render Backend</strong>.
                </div>
              </div>
            )}
          </div>
        ) : null}
        {error ? <Alert type="error">{error}</Alert> : null}

        {token ? (
          <form className="space-y-4" onSubmit={onResetPassword}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-twitter-muted">New password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-twitter-border bg-twitter-bg px-4 py-3 text-twitter-text outline-none transition focus:border-twitter-blue focus:ring-4 focus:ring-twitter-blue/10"
                placeholder="Password123!"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-twitter-muted">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border border-twitter-border bg-twitter-bg px-4 py-3 text-twitter-text outline-none transition focus:border-twitter-blue focus:ring-4 focus:ring-twitter-blue/10"
                placeholder="Password123!"
                required
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting || Boolean(error)}
              className="w-full rounded-full bg-twitter-blue px-5 py-3 font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Reset password'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={onRequestReset}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-twitter-muted">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-twitter-border bg-twitter-bg px-4 py-3 text-twitter-text outline-none transition focus:border-twitter-blue focus:ring-4 focus:ring-twitter-blue/10"
                placeholder="you@example.com"
                required
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-twitter-blue px-5 py-3 font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  )
}
