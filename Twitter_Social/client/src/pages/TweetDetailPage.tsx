import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
  const { isVerified } = useAuth()
  const [tweet, setTweet] = useState<Tweet | null>(null)
  const [replies, setReplies] = useState<Tweet[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
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
    const isLiked = likedIds.has(item._id)
    setError('')

    try {
      if (isLiked) {
        await socialApi.unlikeTweet(item._id)
        setLikedIds((current) => {
          const next = new Set(current)
          next.delete(item._id)
          return next
        })
        replaceTweet(item._id, (current) => updateTweetCount(current, 'likes', -1))
      } else {
        await socialApi.likeTweet(item._id)
        setLikedIds((current) => new Set(current).add(item._id))
        replaceTweet(item._id, (current) => updateTweetCount(current, 'likes', 1))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const onBookmark = async (item: Tweet) => {
    const isBookmarked = bookmarkedIds.has(item._id)
    setError('')

    try {
      if (isBookmarked) {
        await socialApi.unbookmarkTweet(item._id)
        setBookmarkedIds((current) => {
          const next = new Set(current)
          next.delete(item._id)
          return next
        })
        replaceTweet(item._id, (current) => updateTweetCount(current, 'bookmarks', -1))
      } else {
        await socialApi.bookmarkTweet(item._id)
        setBookmarkedIds((current) => new Set(current).add(item._id))
        replaceTweet(item._id, (current) => updateTweetCount(current, 'bookmarks', 1))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const onRetweet = async (item: Tweet) => {
    setError('')

    try {
      await tweetsApi.createTweet({
        type: TweetType.Retweet,
        audience: TweetAudience.Everyone,
        content: '',
        parent_id: item._id,
        hashtags: [],
        mentions: [],
        medias: []
      })
      replaceTweet(item._id, (current) => updateTweetCount(current, 'retweet_count', 1))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <section className="animate-fade-in">
      <header className="sticky top-0 z-20 border-b border-twitter-border bg-twitter-bg/80 px-5 py-4 backdrop-blur-xl">
        <Link to="/" className="text-sm font-bold text-twitter-blue hover:underline">
          Back
        </Link>
        <h1 className="mt-1 text-xl font-black">Tweet</h1>
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
            liked={likedIds.has(tweet._id)}
            bookmarked={bookmarkedIds.has(tweet._id)}
            onLike={onLike}
            onBookmark={onBookmark}
            onRetweet={onRetweet}
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
                liked={likedIds.has(reply._id)}
                bookmarked={bookmarkedIds.has(reply._id)}
                onLike={onLike}
                onBookmark={onBookmark}
                onRetweet={onRetweet}
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
