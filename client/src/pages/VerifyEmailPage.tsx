import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../components/layout/AuthShell'
import { Alert } from '../components/ui/Alert'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/http'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || searchParams.get('email_verify_token') || ''
  const { isAuthenticated, isVerified, resendVerifyEmail, verifyEmail } = useAuth()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return

    queueMicrotask(() => {
      setIsSubmitting(true)
      verifyEmail(token)
        .then(() => setStatus('Your email has been verified. You can now post, search, and chat.'))
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setIsSubmitting(false))
    })
  }, [token, verifyEmail])

  const onResend = async () => {
    setError('')
    setStatus('')
    setIsSubmitting(true)

    try {
      const message = await resendVerifyEmail()
      setStatus(message)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Email verification"
      title={isVerified ? 'Email verified' : 'Verify your email'}
      description="Most backend features require a verified account. Check the verification link sent after registration."
      footer={
        <Link to="/" className="font-bold text-twitter-blue hover:underline">
          Back to timeline
        </Link>
      }
    >
      <div className="space-y-4">
        {isVerified ? <Alert type="success">Your account is verified.</Alert> : null}
        {status ? <Alert type="success">{status}</Alert> : null}
        {error ? <Alert type="error">{error}</Alert> : null}
        {isSubmitting ? <Alert>Working with the backend...</Alert> : null}

        {!token && !isVerified ? (
          <div className="rounded-3xl border border-twitter-border bg-twitter-bg/70 p-4 text-sm leading-6 text-twitter-muted">
            {isAuthenticated ? (
              <>
                Did not receive the email? Send a fresh verification link.
                <button
                  type="button"
                  onClick={onResend}
                  disabled={isSubmitting}
                  className="mt-4 w-full rounded-full bg-twitter-blue px-5 py-3 font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Resend verification email
                </button>
              </>
            ) : (
              <>
                Open this page from the verification email or sign in first to request another link.
                <Link
                  to="/login"
                  className="mt-4 block rounded-full bg-twitter-blue px-5 py-3 text-center font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        ) : null}
      </div>
    </AuthShell>
  )
}
