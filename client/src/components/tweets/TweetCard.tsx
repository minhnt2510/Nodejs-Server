import { useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { Tweet } from '../../types'
import { MediaType, TweetType } from '../../types'
import { formatCount, formatRelativeTime } from '../../utils/format'
import { Avatar } from '../ui/Avatar'
import { ImageModal } from '../ui/ImageModal'
import { AvatarModal } from '../ui/AvatarModal'

interface TweetCardProps {
  tweet: Tweet
  liked?: boolean
  bookmarked?: boolean
  onLike?: (tweet: Tweet) => void
  onBookmark?: (tweet: Tweet) => void
  onRetweet?: (tweet: Tweet) => void
  onUpdate?: (tweet: Tweet, content: string) => Promise<void>
  onDelete?: (tweet: Tweet) => Promise<void>
}

function renderContent(content: string) {
  return content.split(/(#[A-Za-z0-9_]+)/g).map((part, index) => {
    if (part.startsWith('#')) {
      return (
        <span key={`${part}-${index}`} className="font-semibold text-twitter-blue">
          {part}
        </span>
      )
    }

    return <span key={`${part}-${index}`}>{part}</span>
  })
}

function stopClick(event: MouseEvent) {
  event.stopPropagation()
}

export function TweetCard({
  tweet,
  liked = tweet.is_liked,
  bookmarked = tweet.is_bookmarked,
  onLike,
  onBookmark,
  onRetweet,
  onUpdate,
  onDelete
}: TweetCardProps) {
  const { user, isVerified } = useAuth()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(tweet.content)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState('')
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const author = tweet.user
  const authorName = author?.name || 'Twitter Social User'
  const username = author?.username || String(tweet.user_id).slice(-8)
  const tweetPath = `/tweet/${tweet._id}`
  const isOwner = user?._id === tweet.user_id

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!onUpdate || !editContent.trim()) return

    setIsSubmitting(true)
    try {
      await onUpdate(tweet, editContent.trim())
      setIsEditing(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteTweet = async (event: MouseEvent) => {
    stopClick(event)
    if (!onDelete || !window.confirm('Delete this item? This action cannot be undone.')) return

    setIsSubmitting(true)
    try {
      await onDelete(tweet)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <article
      onClick={() => navigate(tweetPath)}
      className="cursor-pointer border-b border-twitter-border px-5 py-4 transition hover:bg-white/[0.025]"
    >
      <div className="flex gap-4">
        <div
          onClick={(e) => {
            stopClick(e)
            if (author) setIsAvatarModalOpen(true)
          }}
          className="cursor-pointer transition hover:scale-[1.05]"
        >
          <Avatar src={author?.avatar} name={authorName} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <Link to={`/${username}`} onClick={stopClick} className="font-black text-twitter-text hover:underline">
              {authorName}
            </Link>
            <span className="text-twitter-muted">@{username}</span>
            <span className="text-twitter-soft">.</span>
            <span className="text-twitter-muted">{formatRelativeTime(tweet.created_at)}</span>
            {isOwner ? (
              <div className="relative ml-auto">
                <button
                  type="button"
                  onClick={(event) => {
                    stopClick(event)
                    setOpenMenu((current) => !current)
                  }}
                  disabled={isSubmitting}
                  aria-label="Post actions"
                  aria-expanded={openMenu}
                  className="rounded-full p-2 text-twitter-muted transition hover:bg-twitter-blue/10 hover:text-twitter-blue disabled:opacity-50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
                    />
                  </svg>
                </button>

                {openMenu ? (
                  <div
                    onClick={stopClick}
                    className="absolute right-0 top-8 z-50 w-40 overflow-hidden rounded-xl border border-twitter-border bg-twitter-panel shadow-xl"
                  >
                    {tweet.type !== TweetType.Retweet && onUpdate ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          stopClick(event)
                          setOpenMenu(false)
                          setEditContent(tweet.content)
                          setIsEditing((current) => !current)
                        }}
                        className="block w-full px-4 py-3 text-left text-sm font-bold text-twitter-blue transition hover:bg-twitter-blue/10"
                      >
                        Edit
                      </button>
                    ) : null}

                    {onDelete ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          deleteTweet(event)
                          setOpenMenu(false)
                        }}
                        disabled={isSubmitting}
                        className="block w-full px-4 py-3 text-left text-sm font-bold text-rose-400 transition hover:bg-rose-400/10 disabled:opacity-50"
                      >
                        {tweet.type === TweetType.Retweet ? 'Remove repost' : 'Delete'}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {isEditing ? (
            <form onSubmit={submitEdit} onClick={stopClick} className="mt-3 space-y-3">
              <textarea
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
                className="min-h-24 w-full resize-none rounded-2xl border border-twitter-border bg-twitter-bg px-4 py-3 text-twitter-text outline-none focus:border-twitter-blue"
                maxLength={280}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    stopClick(event)
                    setIsEditing(false)
                  }}
                  className="rounded-full border border-twitter-border px-4 py-2 text-sm font-bold text-twitter-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !editContent.trim()}
                  className="rounded-full bg-twitter-blue px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          ) : tweet.content ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-7 text-twitter-text">
              {renderContent(tweet.content)}
            </p>
          ) : (
            <p className="mt-2 text-sm font-semibold text-twitter-muted">Retweeted</p>
          )}

          {tweet.medias?.length ? (
            <div
              className={`mt-3 grid gap-1 overflow-hidden rounded-3xl ${
                tweet.medias.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
              }`}
            >
              {tweet.medias.map((media) =>
                media.type === MediaType.Image ? (
                  <img
                    key={media.url}
                    src={media.url}
                    alt=""
                    loading="lazy"
                    className={`w-full cursor-pointer bg-black/10 transition hover:brightness-95 ${
                      tweet.medias.length === 1 ? 'max-h-[450px] object-contain' : 'h-64 object-cover'
                    }`}
                    onClick={(event) => {
                      stopClick(event)
                      setSelectedImageUrl(media.url)
                      setIsImageModalOpen(true)
                    }}
                  />
                ) : media.type === MediaType.Video ? (
                  <video
                    key={media.url}
                    src={media.url}
                    controls
                    className="h-64 w-full bg-black object-cover"
                    onClick={stopClick}
                  />
                ) : (
                  <a
                    key={media.url}
                    href={media.url}
                    onClick={stopClick}
                    className="flex h-40 items-center justify-center bg-twitter-elevated p-4 text-center text-sm font-bold text-twitter-blue"
                  >
                    Open HLS video
                  </a>
                )
              )}
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-5 text-sm font-semibold">
            <div className="flex items-center gap-2 rounded-full py-1.5 transition text-twitter-muted hover:text-twitter-blue">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-xs">{formatCount(tweet.comment_count)}</span>
            </div>
            <button
              type="button"
              onClick={(event) => {
                stopClick(event)
                onRetweet?.(tweet)
              }}
              className={`flex items-center gap-2 rounded-full py-1.5 transition text-left hover:text-emerald-400 ${
                tweet.viewer_repost_id ? 'text-emerald-400' : 'text-twitter-muted'
              }`}
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span className="text-xs">{formatCount(tweet.retweet_count)}</span>
            </button>
            <button
              type="button"
              onClick={(event) => {
                stopClick(event)
                onLike?.(tweet)
              }}
              className={`flex items-center gap-2 rounded-full py-1.5 transition text-left hover:text-rose-400 ${
                liked ? 'text-rose-400' : 'text-twitter-muted'
              }`}
            >
              <svg className="size-5" fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-xs">{formatCount(tweet.likes)}</span>
            </button>
            <button
              type="button"
              onClick={(event) => {
                stopClick(event)
                onBookmark?.(tweet)
              }}
              className={`flex items-center gap-2 rounded-full py-1.5 transition text-left hover:text-twitter-blue ${
                bookmarked ? 'text-twitter-blue' : 'text-twitter-muted'
              }`}
            >
              <svg className="size-5" fill={bookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="text-xs">{formatCount(tweet.bookmarks)}</span>
            </button>
            <button
              type="button"
              onClick={(event) => {
                stopClick(event)
                const url = `${window.location.origin}/tweet/${tweet._id}`
                navigator.clipboard.writeText(url).catch(() => {})
              }}
              className="flex items-center justify-center gap-2 rounded-full py-1.5 text-twitter-muted transition hover:text-twitter-blue"
              title="Copy link"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isImageModalOpen && (
        <ImageModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          src={selectedImageUrl}
        />
      )}

      {isAvatarModalOpen && author && (
        <AvatarModal
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          user={author}
          currentUser={user}
          isVerified={isVerified}
        />
      )}
    </article>
  )
}
