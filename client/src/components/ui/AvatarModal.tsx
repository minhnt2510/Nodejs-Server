import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { tweetsApi } from '../../apis/tweets'
import { searchApi } from '../../apis/search'
import { socialApi } from '../../apis/social'
import type { Tweet, User } from '../../types'
import { MediaType, TweetAudience, TweetType } from '../../types'
import { Avatar } from './Avatar'
import { Alert } from './Alert'
import { formatRelativeTime } from '../../utils/format'
import { getErrorMessage } from '../../lib/http'

interface AvatarModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  currentUser: User | null
  isVerified: boolean
}

export function AvatarModal({ isOpen, onClose, user, currentUser, isVerified }: AvatarModalProps) {
  const [avatarTweet, setAvatarTweet] = useState<Tweet | null>(null)
  const [comments, setComments] = useState<Tweet[]>([])
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !user.avatar) return

    const loadAvatarTweet = async () => {
      setIsLoading(true)
      setError('')
      setAvatarTweet(null)
      setComments([])
      setIsLiked(false)
      setLikeCount(0)

      try {
        // 1. Search for a tweet by the user containing the avatar URL
        let tweet: Tweet | undefined
        
        try {
          const searchRes = await searchApi.searchTweets({
            content: '#avatar',
            limit: 30
          })
          tweet = searchRes.tweets.find(
            (t) => t.user_id === user._id && t.medias.some((m) => m.url === user.avatar)
          )
        } catch (err) {
          console.error('Failed to search avatar hashtag', err)
        }

        if (!tweet) {
          try {
            const userTweetsRes = await tweetsApi.getUserTweets(user._id, 1, 20)
            tweet = userTweetsRes.tweets.find((t) => t.medias.some((m) => m.url === user.avatar))
          } catch (err) {
            console.error('Failed to load user tweets', err)
          }
        }

        if (tweet) {
          setAvatarTweet(tweet)
          setIsLiked(Boolean(tweet.is_liked))
          setLikeCount(tweet.likes ?? 0)

          // Load comments
          const commentsRes = await tweetsApi.getTweetChildren(tweet._id, TweetType.Comment, 1, 50)
          setComments(commentsRes.tweets)
        }
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setIsLoading(false)
      }
    }

    void loadAvatarTweet()
  }, [isOpen, user._id, user.avatar])

  const handleEnableInteractions = async () => {
    if (!user.avatar || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      const tweet = await tweetsApi.createTweet({
        type: TweetType.Tweet,
        audience: TweetAudience.Everyone,
        content: 'Updated profile picture #avatar',
        parent_id: null,
        hashtags: ['avatar'],
        mentions: [],
        medias: [{ url: user.avatar, type: MediaType.Image }]
      })

      setAvatarTweet({
        ...tweet,
        user,
        likes: 0,
        comment_count: 0,
        is_liked: false
      })
      setIsLiked(false)
      setLikeCount(0)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLike = async () => {
    if (!avatarTweet || !isVerified) return
    try {
      if (isLiked) {
        await socialApi.unlikeTweet(avatarTweet._id)
        setIsLiked(false)
        setLikeCount((prev) => Math.max(0, prev - 1))
      } else {
        await socialApi.likeTweet(avatarTweet._id)
        setIsLiked(true)
        setLikeCount((prev) => prev + 1)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleComment = async (e: FormEvent) => {
    e.preventDefault()
    if (!avatarTweet || !newComment.trim() || !isVerified || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      const reply = await tweetsApi.createTweet({
        type: TweetType.Comment,
        audience: TweetAudience.Everyone,
        content: newComment.trim(),
        parent_id: avatarTweet._id,
        hashtags: [],
        mentions: [],
        medias: []
      })

      setComments((prev) => [
        {
          ...reply,
          user: currentUser ?? undefined
        },
        ...prev
      ])
      setNewComment('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (comment: Tweet) => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await tweetsApi.deleteTweet(comment._id)
      setComments((prev) => prev.filter((c) => c._id !== comment._id))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (!isOpen) return null

  const isOwnAvatar = currentUser?._id === user._id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in">
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 z-50 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
        aria-label="Close modal"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex h-full max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-twitter-border bg-twitter-panel shadow-2xl md:flex-row animate-slide-up">
        {/* Left: Avatar view */}
        <div className="relative flex flex-1 items-center justify-center bg-black/40 p-4">
          <img
            src={user.avatar}
            alt={user.name}
            className="max-h-full max-w-full rounded-2xl object-contain shadow-lg"
          />
        </div>

        {/* Right: Comments & Likes */}
        <div className="flex h-1/2 flex-col border-t border-twitter-border bg-twitter-bg md:h-full md:w-[360px] md:border-l md:border-t-0 shrink-0">
          {/* Header */}
          <div className="border-b border-twitter-border p-4">
            <div className="flex items-center gap-3">
              <Avatar src={user.avatar} name={user.name} size="sm" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-black text-twitter-text">{user.name}</h3>
                <p className="truncate text-xs text-twitter-muted">@{user.username}</p>
              </div>
            </div>
          </div>

          {/* Interactive content area */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            {error && (
              <div className="mb-4">
                <Alert type="error">{error}</Alert>
              </div>
            )}

            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="size-6 animate-spin rounded-full border-2 border-twitter-border border-t-twitter-blue" />
              </div>
            ) : !avatarTweet ? (
              <div className="flex h-full flex-col items-center justify-center py-6 text-center">
                <p className="text-sm text-twitter-muted">This avatar has no likes or comments yet.</p>
                {isOwnAvatar && isVerified && (
                  <button
                    type="button"
                    onClick={handleEnableInteractions}
                    disabled={isSubmitting}
                    className="mt-4 rounded-full bg-twitter-blue px-5 py-2 text-sm font-black text-white shadow-lg transition hover:bg-twitter-blue-hover disabled:opacity-50"
                  >
                    {isSubmitting ? 'Enabling...' : 'Enable Likes & Comments'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Like section */}
                <div className="flex items-center gap-4 border-b border-twitter-border pb-3">
                  <button
                    type="button"
                    onClick={handleLike}
                    disabled={!isVerified}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition ${
                      isLiked
                        ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                        : 'text-twitter-muted hover:bg-white/5 hover:text-twitter-text'
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-5"
                      fill={isLiked ? 'currentColor' : 'none'}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    <span className="text-sm font-bold">{likeCount}</span>
                  </button>
                  <span className="text-xs text-twitter-muted">Likes</span>
                </div>

                {/* Comments List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-twitter-muted">
                    Comments ({comments.length})
                  </h4>
                  {comments.length === 0 ? (
                    <p className="text-center text-xs text-twitter-muted py-4">No comments yet. Say something!</p>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment._id} className="flex gap-2 text-sm leading-5">
                          <Avatar src={comment.user?.avatar} name={comment.user?.name} size="sm" className="shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-bold text-twitter-text">
                                {comment.user?.name || 'User'}
                              </span>
                              <span className="text-[10px] text-twitter-muted">
                                {formatRelativeTime(comment.created_at)}
                              </span>
                              {currentUser?._id === comment.user_id && (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteComment(comment)}
                                  className="ml-auto text-[10px] text-rose-400 hover:underline"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                            <p className="text-twitter-muted break-words text-xs mt-0.5">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Comment form at bottom */}
          {avatarTweet && isVerified && (
            <form onSubmit={handleComment} className="border-t border-twitter-border p-3 bg-twitter-surface/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Add a comment..."
                  className="min-w-0 flex-1 rounded-full border border-twitter-border bg-twitter-surface px-4 py-2 text-xs text-twitter-text outline-none transition focus:border-twitter-blue"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="rounded-full bg-twitter-blue px-4 py-2 text-xs font-black text-white hover:bg-twitter-blue-hover disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
