import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { authApi } from '../apis/auth'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/http'
import type { UpdateProfilePayload, User } from '../types'

function formatJoinDate(value?: string) {
  if (!value) return 'Recently joined'
  return `Joined ${new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(value))}`
}

function compactProfilePayload(profile: User | null, form: UpdateProfilePayload) {
  const payload: UpdateProfilePayload = {}
  const keys: Array<keyof UpdateProfilePayload> = [
    'name',
    'bio',
    'location',
    'website',
    'username',
    'avatar',
    'cover_photo'
  ]

  keys.forEach((key) => {
    const value = form[key]?.trim()
    if (!value) return
    if (profile && value === profile[key]) return
    payload[key] = value
  })

  return payload
}

export function ProfilePage() {
  const { username = '' } = useParams()
  const { user, isVerified, refreshUser } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [form, setForm] = useState<UpdateProfilePayload>({})
  const [isEditing, setIsEditing] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const isOwnProfile = user?._id === profile?._id

  useEffect(() => {
    if (!username) return

    queueMicrotask(() => {
      setIsLoading(true)
      setError('')
      authApi
        .getProfile(username)
        .then((result) => {
          setProfile(result)
          setForm({
            name: result.name,
            bio: result.bio,
            location: result.location,
            website: result.website,
            username: result.username,
            avatar: result.avatar,
            cover_photo: result.cover_photo
          })
        })
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setIsLoading(false))
    })
  }, [username])

  const displayUsername = profile?.username || username
  const coverStyle = profile?.cover_photo ? { backgroundImage: `url(${profile.cover_photo})` } : undefined

  const onFollow = async () => {
    if (!profile) return
    setError('')
    setStatus('')
    setIsSubmitting(true)

    try {
      const message = isFollowing ? await authApi.unfollow(profile._id) : await authApi.follow(profile._id)
      setIsFollowing((current) => !current)
      setStatus(message)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return

    const payload = compactProfilePayload(profile, form)
    if (!Object.keys(payload).length) {
      setIsEditing(false)
      return
    }

    setError('')
    setStatus('')
    setIsSubmitting(true)

    try {
      const updated = await authApi.updateMe(payload)
      setProfile(updated)
      setIsEditing(false)
      setStatus('Profile updated successfully.')
      await refreshUser()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="animate-fade-in">
      <header className="sticky top-0 z-20 border-b border-twitter-border bg-twitter-bg/80 px-5 py-4 backdrop-blur-xl">
        <h1 className="text-xl font-black">{profile?.name || 'Profile'}</h1>
        <p className="text-sm text-twitter-muted">@{displayUsername}</p>
      </header>

      {isLoading ? (
        <div className="p-8 text-center text-sm text-twitter-muted">Loading profile...</div>
      ) : error && !profile ? (
        <div className="p-5">
          <Alert type="error">{error}</Alert>
        </div>
      ) : profile ? (
        <>
          <div
            className="h-48 bg-gradient-to-br from-twitter-blue via-sky-500 to-violet-600 bg-cover bg-center"
            style={coverStyle}
          />

          <div className="px-5 pb-5">
            <div className="-mt-14 flex items-end justify-between">
              <Avatar src={profile.avatar} name={profile.name} size="xl" className="border-4 border-twitter-bg" />
              {isOwnProfile ? (
                isVerified ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing((current) => !current)}
                    className="rounded-full border border-twitter-border px-5 py-2 text-sm font-black text-twitter-text transition hover:bg-white/5"
                  >
                    {isEditing ? 'Cancel' : 'Edit profile'}
                  </button>
                ) : (
                  <Link
                    to="/verify-email"
                    className="rounded-full border border-twitter-border px-5 py-2 text-sm font-black text-twitter-text transition hover:bg-white/5"
                  >
                    Verify to edit
                  </Link>
                )
              ) : (
                <button
                  type="button"
                  onClick={onFollow}
                  disabled={!isVerified || isSubmitting}
                  className={`rounded-full px-5 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isFollowing
                      ? 'border border-twitter-border text-twitter-text hover:bg-white/5'
                      : 'bg-twitter-text text-twitter-bg hover:bg-white'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            <div className="mt-4">
              <h2 className="text-2xl font-black">{profile.name}</h2>
              <p className="text-twitter-muted">@{displayUsername}</p>
              {profile.bio ? <p className="mt-4 whitespace-pre-wrap leading-7 text-twitter-text">{profile.bio}</p> : null}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-twitter-muted">
                {profile.location ? <span>{profile.location}</span> : null}
                {profile.website ? (
                  <a href={profile.website} target="_blank" rel="noreferrer" className="text-twitter-blue hover:underline">
                    {profile.website}
                  </a>
                ) : null}
                <span>{formatJoinDate(profile.created_at)}</span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {status ? <Alert type="success">{status}</Alert> : null}
              {error ? <Alert type="error">{error}</Alert> : null}
            </div>

            {isEditing ? (
              <form onSubmit={onSaveProfile} className="mt-6 space-y-4 rounded-[2rem] border border-twitter-border bg-twitter-surface/50 p-5">
                {(
                  [
                    ['name', 'Name'],
                    ['username', 'Username'],
                    ['bio', 'Bio'],
                    ['location', 'Location'],
                    ['website', 'Website'],
                    ['avatar', 'Avatar URL'],
                    ['cover_photo', 'Cover URL']
                  ] as Array<[keyof UpdateProfilePayload, string]>
                ).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-2 block text-sm font-semibold text-twitter-muted">{label}</span>
                    {key === 'bio' ? (
                      <textarea
                        value={form[key] || ''}
                        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                        className="min-h-24 w-full resize-none rounded-2xl border border-twitter-border bg-twitter-bg px-4 py-3 text-twitter-text outline-none transition focus:border-twitter-blue focus:ring-4 focus:ring-twitter-blue/10"
                      />
                    ) : (
                      <input
                        value={form[key] || ''}
                        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                        className="w-full rounded-2xl border border-twitter-border bg-twitter-bg px-4 py-3 text-twitter-text outline-none transition focus:border-twitter-blue focus:ring-4 focus:ring-twitter-blue/10"
                      />
                    )}
                  </label>
                ))}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-twitter-blue px-5 py-3 font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : 'Save profile'}
                </button>
              </form>
            ) : null}
          </div>

          <div className="border-t border-twitter-border p-8 text-center text-sm leading-6 text-twitter-muted">
            User tweet listing is not exposed by the current backend routes yet. The profile page is wired to user and follow APIs.
          </div>
        </>
      ) : null}
    </section>
  )
}
