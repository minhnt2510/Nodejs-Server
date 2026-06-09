import React, { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { authApi } from '../apis/auth'
import { mediasApi } from '../apis/medias'
import { socialApi } from '../apis/social'
import { tweetsApi } from '../apis/tweets'
import { TweetCard } from '../components/tweets/TweetCard'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/http'
import type { Tweet, UpdateProfilePayload, User } from '../types'
import { TweetAudience, TweetType } from '../types'

const PAGE_SIZE = 10
const MAX_PROFILE_IMAGE_SIZE = 300 * 1024 // 300 KB

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
    if (!value || (profile && value === profile[key])) return
    payload[key] = value
  })

  return payload
}

function updateTweetCount(tweet: Tweet, key: 'likes' | 'bookmarks' | 'retweet_count', delta: number) {
  return {
    ...tweet,
    [key]: Math.max(0, (tweet[key] ?? 0) + delta)
  }
}

export function ProfilePage() {
  const { username = '' } = useParams()
  const navigate = useNavigate()
  const { user, isVerified, refreshUser } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [profileTweets, setProfileTweets] = useState<Tweet[]>([])
  const [form, setForm] = useState<UpdateProfilePayload>({})
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const avatarPreviewRef = useRef<string | null>(null)
  const coverPreviewRef = useRef<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isTweetsLoading, setIsTweetsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [error, setError] = useState('')
  const [tweetError, setTweetError] = useState('')
  const [status, setStatus] = useState('')
  // State riêng cho follow action để tránh xung đột với error profile
  const [followStatus, setFollowStatus] = useState('')
  const [followError, setFollowError] = useState('')

  const isOwnProfile = user?._id === profile?._id

  // Cleanup object URLs khi component unmount hoặc preview thay đổi
  useEffect(() => {
    return () => {
      if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current)
      if (coverPreviewRef.current) URL.revokeObjectURL(coverPreviewRef.current)
    }
  }, [])

  const replaceTweet = (tweetId: string, updater: (tweet: Tweet) => Tweet) => {
    setProfileTweets((current) => current.map((tweet) => (tweet._id === tweetId ? updater(tweet) : tweet)))
  }

  const removeTweetIds = (tweetIds: string[]) => {
    setProfileTweets((current) => current.filter((tweet) => !tweetIds.includes(tweet._id)))
  }

  const loadTweets = async (profileId: string, nextPage = 1, replace = false) => {
    setTweetError('')
    setIsTweetsLoading(true)
    try {
      const result = await tweetsApi.getUserTweets(profileId, nextPage, PAGE_SIZE)
      setProfileTweets((current) => (replace ? result.tweets : [...current, ...result.tweets]))
      setPage(result.page)
      setTotalPage(result.total_page)
    } catch (err) {
      setTweetError(getErrorMessage(err))
    } finally {
      setIsTweetsLoading(false)
    }
  }

  useEffect(() => {
    if (!username) return

    queueMicrotask(async () => {
      setIsLoading(true)
      setError('')
      setTweetError('')
      setProfileTweets([])
      try {
        const result = await authApi.getProfile(username)
        setProfile(result)
        setIsFollowing(Boolean(result.is_following))
        setForm({
          name: result.name,
          bio: result.bio,
          location: result.location,
          website: result.website,
          username: result.username,
          avatar: result.avatar,
          cover_photo: result.cover_photo
        })
        await loadTweets(result._id, 1, true)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setIsLoading(false)
      }
    })
  }, [username])

  const displayUsername = profile?.username || username
  const coverStyle = profile?.cover_photo ? { backgroundImage: `url(${profile.cover_photo})` } : undefined

  const onFollow = async () => {
    if (!profile) return
    setFollowError('')
    setFollowStatus('')
    setIsSubmitting(true)

    try {
      const message = isFollowing ? await authApi.unfollow(profile._id) : await authApi.follow(profile._id)
      setIsFollowing((current) => {
        const next = !current
        setProfile((prev) => {
          if (!prev) return prev
          const delta = next ? 1 : -1
          return {
            ...prev,
            followers_count: Math.max(0, (prev.followers_count ?? 0) + delta)
          }
        })
        return next
      })
      setFollowStatus(message)
      // Tự ẩn thông báo sau 3 giây
      setTimeout(() => setFollowStatus(''), 3000)
    } catch (err) {
      setFollowError(getErrorMessage(err))
      setTimeout(() => setFollowError(''), 4000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectProfileImage =
    (
      setter: (file: File | null) => void,
      previewSetter: (url: string | null) => void,
      previewRef: React.MutableRefObject<string | null>
    ) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null
      setError('')
      if (!file) {
        setter(null)
        return
      }
      if (!file.type.startsWith('image/')) {
        event.target.value = ''
        setError('Please choose an image file.')
        return
      }
      if (file.size > MAX_PROFILE_IMAGE_SIZE) {
        event.target.value = ''
        setError('Profile images must be 300 KB or smaller.')
        return
      }
      // Revoke cũ trước khi tạo mới
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
      const url = URL.createObjectURL(file)
      previewRef.current = url
      previewSetter(url)
      setter(file)
    }

  const onSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return

    setError('')
    setStatus('')
    setIsSubmitting(true)

    try {
      const nextForm = { ...form }
      if (avatarFile) {
        const [avatar] = await mediasApi.uploadImages([avatarFile])
        nextForm.avatar = avatar.url
      }
      if (coverFile) {
        const [cover] = await mediasApi.uploadImages([coverFile])
        nextForm.cover_photo = cover.url
      }

      const payload = compactProfilePayload(profile, nextForm)
      if (!Object.keys(payload).length) {
        setIsEditing(false)
        return
      }

      const updated = await authApi.updateMe(payload)
      setProfile(updated)
      setForm(nextForm)
      setAvatarFile(null)
      setCoverFile(null)
      // Cleanup previews
      if (avatarPreviewRef.current) { URL.revokeObjectURL(avatarPreviewRef.current); avatarPreviewRef.current = null }
      if (coverPreviewRef.current) { URL.revokeObjectURL(coverPreviewRef.current); coverPreviewRef.current = null }
      setAvatarPreview(null)
      setCoverPreview(null)
      setIsEditing(false)
      setStatus('Profile updated successfully.')
      await refreshUser()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const onLike = async (tweet: Tweet) => {
    setTweetError('')
    try {
      if (tweet.is_liked) {
        await socialApi.unlikeTweet(tweet._id)
        replaceTweet(tweet._id, (item) => ({ ...updateTweetCount(item, 'likes', -1), is_liked: false }))
      } else {
        await socialApi.likeTweet(tweet._id)
        replaceTweet(tweet._id, (item) => ({ ...updateTweetCount(item, 'likes', 1), is_liked: true }))
      }
    } catch (err) {
      setTweetError(getErrorMessage(err))
    }
  }

  const onBookmark = async (tweet: Tweet) => {
    setTweetError('')
    try {
      if (tweet.is_bookmarked) {
        await socialApi.unbookmarkTweet(tweet._id)
        replaceTweet(tweet._id, (item) => ({ ...updateTweetCount(item, 'bookmarks', -1), is_bookmarked: false }))
      } else {
        await socialApi.bookmarkTweet(tweet._id)
        replaceTweet(tweet._id, (item) => ({ ...updateTweetCount(item, 'bookmarks', 1), is_bookmarked: true }))
      }
    } catch (err) {
      setTweetError(getErrorMessage(err))
    }
  }

  const onRetweet = async (tweet: Tweet) => {
    setTweetError('')
    try {
      if (tweet.viewer_repost_id) {
        const result = await tweetsApi.deleteTweet(tweet.viewer_repost_id)
        removeTweetIds(result.deleted_tweet_ids)
        replaceTweet(tweet._id, (item) => ({
          ...updateTweetCount(item, 'retweet_count', -1),
          viewer_repost_id: null
        }))
      } else {
        const repost = await tweetsApi.createTweet({
          type: TweetType.Retweet,
          audience: TweetAudience.Everyone,
          content: '',
          parent_id: tweet._id,
          hashtags: [],
          mentions: [],
          medias: []
        })
        replaceTweet(tweet._id, (item) => ({
          ...updateTweetCount(item, 'retweet_count', 1),
          viewer_repost_id: repost._id
        }))
        if (isOwnProfile) {
          setProfileTweets((current) => [repost, ...current])
        }
      }
    } catch (err) {
      setTweetError(getErrorMessage(err))
    }
  }

  const onUpdateTweet = async (tweet: Tweet, content: string) => {
    setTweetError('')
    try {
      const updated = await tweetsApi.updateTweet(tweet._id, {
        content,
        hashtags: Array.from(
          new Set(Array.from(content.matchAll(/#([A-Za-z0-9_]+)/g), (match) => match[1].toLowerCase()))
        ),
        mentions: tweet.mentions.map((mention) => mention._id),
        medias: tweet.medias,
        audience: tweet.audience
      })
      replaceTweet(tweet._id, () => updated)
    } catch (err) {
      setTweetError(getErrorMessage(err))
      throw err
    }
  }

  const onDeleteTweet = async (tweet: Tweet) => {
    setTweetError('')
    try {
      const result = await tweetsApi.deleteTweet(tweet._id)
      removeTweetIds(result.deleted_tweet_ids)
    } catch (err) {
      setTweetError(getErrorMessage(err))
      throw err
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
            className="relative h-48 overflow-hidden bg-gradient-to-br from-twitter-blue via-sky-500 to-violet-600 bg-cover bg-center"
            style={coverPreview ? { backgroundImage: `url(${coverPreview})` } : coverStyle}
          >
            {coverPreview && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">Preview</span>
              </div>
            )}
          </div>

          <div className="px-5 pb-5">
            <div className="-mt-14 flex items-end justify-between">
              <div className="relative">
                <Avatar
                  src={avatarPreview || profile.avatar}
                  name={profile.name}
                  size="xl"
                  className="border-4 border-twitter-bg"
                />
                {avatarPreview && (
                  <span className="absolute bottom-0 right-0 rounded-full bg-twitter-blue px-2 py-0.5 text-[10px] font-bold text-white shadow">
                    Preview
                  </span>
                )}
              </div>
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
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    {user && (
                      <button
                        type="button"
                        onClick={() => navigate(`/chat?receiver_id=${profile._id}`, { state: { receiverInfo: profile } })}
                        className="flex items-center gap-1.5 rounded-full border border-twitter-border px-4 py-2 text-sm font-black text-twitter-text transition hover:bg-white/5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Message
                      </button>
                    )}
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
                      {isSubmitting ? '...' : isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                  {/* Thông báo follow ngay dưới nút */}
                  {followStatus && (
                    <span className="animate-fade-in rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                      ✓ {followStatus}
                    </span>
                  )}
                  {followError && (
                    <span className="animate-fade-in rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-400">
                      {followError}
                    </span>
                  )}
                </div>
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
              <div className="mt-3 flex gap-5 text-sm">
                <span>
                  <strong className="font-extrabold text-twitter-text">{profile.following_count ?? 0}</strong>{' '}
                  <span className="text-twitter-muted">Following</span>
                </span>
                <span>
                  <strong className="font-extrabold text-twitter-text">{profile.followers_count ?? 0}</strong>{' '}
                  <span className="text-twitter-muted">Followers</span>
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {status ? <Alert type="success">{status}</Alert> : null}
              {error ? <Alert type="error">{error}</Alert> : null}
            </div>

            {isEditing ? (
              <form
                onSubmit={onSaveProfile}
                className="mt-6 space-y-4 rounded-[2rem] border border-twitter-border bg-twitter-surface/50 p-5"
              >
                {(
                  [
                    ['name', 'Name'],
                    ['username', 'Username'],
                    ['bio', 'Bio'],
                    ['location', 'Location'],
                    ['website', 'Website']
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block cursor-pointer rounded-2xl border border-dashed border-twitter-border p-4 transition hover:border-twitter-blue/50">
                    <span className="mb-2 block text-sm font-semibold text-twitter-muted">Avatar image</span>
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="mb-3 h-20 w-20 rounded-full object-cover ring-2 ring-twitter-blue"
                      />
                    ) : null}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={selectProfileImage(setAvatarFile, setAvatarPreview, avatarPreviewRef)}
                      className="block w-full text-sm text-twitter-muted file:mr-3 file:rounded-full file:border-0 file:bg-twitter-blue file:px-4 file:py-2 file:font-bold file:text-white"
                    />
                    <span className="mt-2 block truncate text-xs text-twitter-soft">
                      {avatarFile?.name || 'Maximum 300 KB'}
                    </span>
                  </label>
                  <label className="block cursor-pointer rounded-2xl border border-dashed border-twitter-border p-4 transition hover:border-twitter-blue/50">
                    <span className="mb-2 block text-sm font-semibold text-twitter-muted">Cover image</span>
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="mb-3 h-20 w-full rounded-xl object-cover ring-2 ring-twitter-blue"
                      />
                    ) : null}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={selectProfileImage(setCoverFile, setCoverPreview, coverPreviewRef)}
                      className="block w-full text-sm text-twitter-muted file:mr-3 file:rounded-full file:border-0 file:bg-twitter-blue file:px-4 file:py-2 file:font-bold file:text-white"
                    />
                    <span className="mt-2 block truncate text-xs text-twitter-soft">
                      {coverFile?.name || 'Maximum 300 KB'}
                    </span>
                  </label>
                </div>

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

          <div className="border-t border-twitter-border">
            <div className="border-b border-twitter-border px-5 py-3 text-sm font-black text-twitter-text">Posts</div>

            {tweetError ? (
              <div className="p-5">
                <Alert type="error">{tweetError}</Alert>
              </div>
            ) : null}

            {profileTweets.length ? (
              profileTweets.map((tweet) => (
                <TweetCard
                  key={tweet._id}
                  tweet={tweet}
                  onLike={onLike}
                  onBookmark={onBookmark}
                  onRetweet={onRetweet}
                  onUpdate={onUpdateTweet}
                  onDelete={onDeleteTweet}
                />
              ))
            ) : !isTweetsLoading && !tweetError ? (
              <div className="p-8 text-center text-sm text-twitter-muted">No posts yet.</div>
            ) : null}

            <div className="p-5">
              {page < totalPage ? (
                <button
                  type="button"
                  onClick={() => void loadTweets(profile._id, page + 1)}
                  disabled={isTweetsLoading}
                  className="w-full rounded-full border border-twitter-border px-5 py-3 font-black text-twitter-text transition hover:bg-white/5 disabled:opacity-60"
                >
                  {isTweetsLoading ? 'Loading...' : 'Load more'}
                </button>
              ) : isTweetsLoading ? (
                <div className="mx-auto size-9 animate-spin rounded-full border-2 border-twitter-border border-t-twitter-blue" />
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}
