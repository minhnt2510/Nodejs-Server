import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../components/layout/AuthShell'
import { Alert } from '../components/ui/Alert'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/http'

export function OAuthRedirectPage() {
  const { storeTokens } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    queueMicrotask(() => {
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')

      if (!accessToken || !refreshToken) {
        setError('Missing OAuth tokens from backend redirect.')
        return
      }

      storeTokens({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => navigate('/', { replace: true }))
        .catch((err) => setError(getErrorMessage(err)))
    })
  }, [navigate, searchParams, storeTokens])

  return (
    <AuthShell
      eyebrow="OAuth"
      title="Finishing sign in"
      description="Twitter Social is receiving tokens from the backend OAuth callback."
      footer={
        <Link to="/login" className="font-bold text-twitter-blue hover:underline">
          Back to sign in
        </Link>
      }
    >
      {error ? (
        <Alert type="error">{error}</Alert>
      ) : (
        <div className="rounded-3xl border border-twitter-border bg-twitter-bg/70 p-5 text-center text-sm text-twitter-muted">
          Completing OAuth sign in...
        </div>
      )}
    </AuthShell>
  )
}
