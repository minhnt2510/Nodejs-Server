import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { socialApi } from '../apis/social'
import { tweetsApi } from '../apis/tweets'
import { TweetCard } from '../components/tweets/TweetCard'
import { TweetComposer } from '../components/tweets/TweetComposer'
import { Alert } from '../components/ui/Alert'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/http'
import type { Tweet } from '../types'
import { TweetAudience, TweetType } from '../types'

const PAGE_SIZE = 10

function updateTweetCount(tweet: Tweet, key: 'likes' | 'bookmarks' | 'retweet_count' | 'comment_count', delta: number) {
  return {
    ...tweet,
    [key]: Math.max(0, (tweet[key] ?? 0) + delta)
  }
}

export function TweetDetailPage() {
  const { tweetId = '' } = useParams()
  const navigate = useNavigate()
  const { isVerified } = useAuth()
  const [tweet, setTweet] = useState<Tweet | null>(null)
  const [replies, setReplies] = useState<Tweet[]>([])
  const [page, setPage] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const replaceTweet = (targetId: string, updater: (item: Tweet) => Tweet) => {
    setTweet((current) => (current?._id === targetId ? updater(current) : current))
    setReplies((current) => current.map((item) => (item._id === targetId ? updater(item) : item)))
  }

  const loadReplies = useCallback(
    async (nextPage = 1, replace = false) => {
      if (!tweetId || !isVerified) return

      setError('')
      setIsLoading(true)
      try {
        const [tweetResult, repliesResult] =
          nextPage === 1
            ? await Promise.all([
                tweetsApi.getTweet(tweetId),
                tweetsApi.getTweetChildren(tweetId, TweetType.Comment, nextPage, PAGE_SIZE)
              ])
            : [null, await tweetsApi.getTweetChildren(tweetId, TweetType.Comment, nextPage, PAGE_SIZE)]

        if (tweetResult) setTweet(tweetResult)
        setReplies((current) => (replace ? repliesResult.tweets : [...current, ...repliesResult.tweets]))
        setPage(repliesResult.page)
        setTotalPage(repliesResult.total_page)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setIsLoading(false)
      }
    },
    [isVerified, tweetId]
  )

  useEffect(() => {
    queueMicrotask(() => void loadReplies(1, true))
  }, [loadReplies])

  const onReplyCreated = (reply: Tweet) => {
    setReplies((current) => [reply, ...current])
    if (tweet) {
      setTweet(updateTweetCount(tweet, 'comment_count', 1))
    }
  }

  const onLike = async (item: Tweet) => {
    const isLiked = Boolean(item.is_liked)
    setError('')

    try {
      if (isLiked) {
        await socialApi.unlikeTweet(item._id)
        replaceTweet(item._id, (current) => ({ ...updateTweetCount(current, 'likes', -1), is_liked: false }))
      } else {
        await socialApi.likeTweet(item._id)
        replaceTweet(item._id, (current) => ({ ...updateTweetCount(current, 'likes', 1), is_liked: true }))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const onBookmark = async (item: Tweet) => {
    const isBookmarked = Boolean(item.is_bookmarked)
    setError('')

    try {
      if (isBookmarked) {
        await socialApi.unbookmarkTweet(item._id)
        replaceTweet(item._id, (current) => ({ ...updateTweetCount(current, 'bookmarks', -1), is_bookmarked: false }))
      } else {
        await socialApi.bookmarkTweet(item._id)
        replaceTweet(item._id, (current) => ({ ...updateTweetCount(current, 'bookmarks', 1), is_bookmarked: true }))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const onRetweet = async (item: Tweet) => {
    setError('')

    try {
      if (item.viewer_repost_id) {
        await tweetsApi.deleteTweet(item.viewer_repost_id)
        replaceTweet(item._id, (current) => ({
          ...updateTweetCount(current, 'retweet_count', -1),
          viewer_repost_id: null
        }))
      } else {
        const repost = await tweetsApi.createTweet({
          type: TweetType.Retweet,
          audience: TweetAudience.Everyone,
          content: '',
          parent_id: item._id,
          hashtags: [],
          mentions: [],
          medias: []
        })
        replaceTweet(item._id, (current) => ({
          ...updateTweetCount(current, 'retweet_count', 1),
          viewer_repost_id: repost._id
        }))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const onUpdateTweet = async (item: Tweet, content: string) => {
    setError('')
    try {
      const updated = await tweetsApi.updateTweet(item._id, {
        content,
        hashtags: Array.from(new Set(Array.from(content.matchAll(/#([A-Za-z0-9_]+)/g), (match) => match[1].toLowerCase()))),
        mentions: item.mentions.map((mention) => mention._id),
        medias: item.medias,
        audience: item.audience
      })
      replaceTweet(item._id, () => updated)
    } catch (err) {
      setError(getErrorMessage(err))
      throw err
    }
  }

  const onDeleteTweet = async (item: Tweet) => {
    setError('')
    try {
      const result = await tweetsApi.deleteTweet(item._id)
      if (result.deleted_tweet_ids.includes(tweetId)) {
        navigate('/', { replace: true })
        return
      }
      setReplies((current) => current.filter((reply) => !result.deleted_tweet_ids.includes(reply._id)))
      setTweet((current) => (current ? updateTweetCount(current, 'comment_count', -1) : current))
    } catch (err) {
      setError(getErrorMessage(err))
      throw err
    }
  }

  return (
    <section className="animate-fade-in">
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-twitter-border bg-twitter-bg/80 px-5 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full p-2 text-twitter-text transition hover:bg-white/5"
          aria-label="Back"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-black leading-tight">Tweet</h1>
        </div>
      </header>

      {!isVerified ? (
        <div className="p-5">
          <Alert type="info">Verify your email to load tweet detail while signed in.</Alert>
        </div>
      ) : null}

      {error ? (
        <div className="p-5">
          <Alert type="error">{error}</Alert>
        </div>
      ) : null}

      {tweet ? (
        <>
          <TweetCard
            tweet={tweet}
            onLike={onLike}
            onBookmark={onBookmark}
            onRetweet={onRetweet}
            onUpdate={onUpdateTweet}
            onDelete={onDeleteTweet}
          />

          <TweetComposer
            parentId={tweet._id}
            tweetType={TweetType.Comment}
            placeholder="Post your reply"
            submitLabel="Reply"
            onCreated={onReplyCreated}
          />

          <div>
            {replies.map((reply) => (
              <TweetCard
                key={reply._id}
                tweet={reply}
                onLike={onLike}
                onBookmark={onBookmark}
                onRetweet={onRetweet}
                onUpdate={onUpdateTweet}
                onDelete={onDeleteTweet}
              />
            ))}
          </div>

          <div className="p-5">
            {page < totalPage ? (
              <button
                type="button"
                onClick={() => void loadReplies(page + 1)}
                disabled={isLoading}
                className="w-full rounded-full border border-twitter-border px-5 py-3 font-black text-twitter-text transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Loading...' : 'Load more replies'}
              </button>
            ) : replies.length ? (
              <p className="text-center text-sm text-twitter-muted">No more replies.</p>
            ) : (
              <p className="text-center text-sm text-twitter-muted">No replies yet.</p>
            )}
          </div>
        </>
      ) : isLoading ? (
        <div className="p-8 text-center text-sm text-twitter-muted">Loading tweet...</div>
      ) : null}
    </section>
  )
}
