import { Link, useNavigate } from 'react-router-dom'
import type { MouseEvent } from 'react'
import type { Tweet } from '../../types'
import { MediaType } from '../../types'
import { formatCount, formatRelativeTime } from '../../utils/format'
import { Avatar } from '../ui/Avatar'

interface TweetCardProps {
  tweet: Tweet
  liked?: boolean
  bookmarked?: boolean
  onLike?: (tweet: Tweet) => void
  onBookmark?: (tweet: Tweet) => void
  onRetweet?: (tweet: Tweet) => void
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

export function TweetCard({ tweet, liked, bookmarked, onLike, onBookmark, onRetweet }: TweetCardProps) {
  const navigate = useNavigate()
  const author = tweet.user
  const authorName = author?.name || 'Twitter Social User'
  const username = author?.username || String(tweet.user_id).slice(-8)
  const tweetPath = `/tweet/${tweet._id}`

  return (
    <article
      onClick={() => navigate(tweetPath)}
      className="cursor-pointer border-b border-twitter-border px-5 py-4 transition hover:bg-white/[0.025]"
    >
      <div className="flex gap-4">
        <Avatar src={author?.avatar} name={authorName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <Link
              to={`/${username}`}
              onClick={stopClick}
              className="font-black text-twitter-text hover:underline"
            >
              {authorName}
            </Link>
            <span className="text-twitter-muted">@{username}</span>
            <span className="text-twitter-soft">.</span>
            <span className="text-twitter-muted">{formatRelativeTime(tweet.created_at)}</span>
          </div>

          {tweet.content ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-7 text-twitter-text">
              {renderContent(tweet.content)}
            </p>
          ) : (
            <p className="mt-2 text-sm font-semibold text-twitter-muted">Retweeted</p>
          )}

          {tweet.medias?.length ? (
            <div className={`mt-3 grid gap-1 overflow-hidden rounded-3xl ${tweet.medias.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {tweet.medias.map((media) =>
                media.type === MediaType.Image ? (
                  <img
                    key={media.url}
                    src={media.url}
                    alt=""
                    loading="lazy"
                    className="h-64 w-full object-cover"
                    onClick={stopClick}
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

          <div className="mt-3 grid grid-cols-4 text-sm font-semibold text-twitter-muted">
            <span className="rounded-full px-2 py-2 transition hover:bg-twitter-blue/10 hover:text-twitter-blue">
              Replies {formatCount(tweet.comment_count)}
            </span>
            <button
              type="button"
              onClick={(event) => {
                stopClick(event)
                onRetweet?.(tweet)
              }}
              className="rounded-full px-2 py-2 text-left transition hover:bg-emerald-400/10 hover:text-emerald-300"
            >
              Repost {formatCount(tweet.retweet_count)}
            </button>
            <button
              type="button"
              onClick={(event) => {
                stopClick(event)
                onLike?.(tweet)
              }}
              className={`rounded-full px-2 py-2 text-left transition hover:bg-rose-400/10 hover:text-rose-300 ${
                liked ? 'text-rose-300' : ''
              }`}
            >
              Like {formatCount(tweet.likes)}
            </button>
            <button
              type="button"
              onClick={(event) => {
                stopClick(event)
                onBookmark?.(tweet)
              }}
              className={`rounded-full px-2 py-2 text-left transition hover:bg-twitter-blue/10 hover:text-twitter-blue ${
                bookmarked ? 'text-twitter-blue' : ''
              }`}
            >
              Save {formatCount(tweet.bookmarks)}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
