import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/layout/AuthShell'
import { Alert } from '../components/ui/Alert'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/http'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('2000-01-01')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verifyLink, setVerifyLink] = useState('')

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const verifyToken = await register({
        name,
        email,
        password,
        confirm_password: confirmPassword,
        date_of_birth: new Date(dateOfBirth).toISOString()
      })
      if (verifyToken) {
        setVerifyLink(`${window.location.origin}/verify-email?token=${verifyToken}`)
      } else {
        navigate('/verify-email', { replace: true })
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Join the timeline"
      title={verifyLink ? 'Verify your email' : 'Create your account'}
      description={
        verifyLink
          ? 'Tap the link below to verify your account. Most features are unlocked after verification.'
          : 'Create an account and verify via the link shown after registration. Passwords must be strong.'
      }
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-twitter-blue hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {verifyLink ? (
        <div className="space-y-4">
          <Alert type="success">Account created! Verify your email by tapping the link below.</Alert>
          <a
            href={verifyLink}
            className="block rounded-full bg-twitter-blue px-5 py-3 text-center font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover"
          >
            Verify my email
          </a>
          <p className="break-all rounded-2xl border border-twitter-border bg-twitter-bg/70 p-4 text-sm leading-6 text-twitter-muted">
            Verification link: <a href={verifyLink} className="font-semibold text-twitter-blue hover:underline">{verifyLink}</a>
          </p>
        </div>
      ) : (
      <form className="space-y-4" onSubmit={onSubmit}>
        {error ? <Alert type="error">{error}</Alert> : null}

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-twitter-muted">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-twitter-border bg-twitter-bg px-4 py-3 text-twitter-text outline-none transition focus:border-twitter-blue focus:ring-4 focus:ring-twitter-blue/10"
            placeholder="Nguyen Minh"
            required
          />
        </label>

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

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-twitter-muted">Date of birth</span>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            className="w-full rounded-2xl border border-twitter-border bg-twitter-bg px-4 py-3 text-twitter-text outline-none transition focus:border-twitter-blue focus:ring-4 focus:ring-twitter-blue/10"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-twitter-muted">Password</span>
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
          disabled={isSubmitting}
          className="w-full rounded-full bg-twitter-blue px-5 py-3 font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      )}
    </AuthShell>
  )
}
