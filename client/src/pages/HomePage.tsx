import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

function updateTweetCount(tweet: Tweet, key: 'likes' | 'bookmarks' | 'retweet_count', delta: number) {
  return {
    ...tweet,
    [key]: Math.max(0, (tweet[key] ?? 0) + delta)
  }
}

export function HomePage() {
  const { isVerified } = useAuth()
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [page, setPage] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const replaceTweet = (tweetId: string, updater: (tweet: Tweet) => Tweet) => {
    setTweets((current) => current.map((tweet) => (tweet._id === tweetId ? updater(tweet) : tweet)))
  }

  const removeTweetIds = (tweetIds: string[]) => {
    setTweets((current) => current.filter((tweet) => !tweetIds.includes(tweet._id)))
  }

  const loadFeed = useCallback(
    async (nextPage = 1, replace = false) => {
      if (!isVerified) return

      setError('')
      setIsLoading(true)
      try {
        const result = await tweetsApi.getNewFeeds(nextPage, PAGE_SIZE)
        setTweets((current) => (replace ? result.tweets : [...current, ...result.tweets]))
        setPage(result.page)
        setTotalPage(result.total_page)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setIsLoading(false)
      }
    },
    [isVerified]
  )

  useEffect(() => {
    queueMicrotask(() => void loadFeed(1, true))
  }, [loadFeed])

  const onCreated = (tweet: Tweet) => {
    setTweets((current) => [tweet, ...current])
  }

  const onLike = async (tweet: Tweet) => {
    const isLiked = Boolean(tweet.is_liked)
    setError('')

    try {
      if (isLiked) {
        await socialApi.unlikeTweet(tweet._id)
        replaceTweet(tweet._id, (item) => ({ ...updateTweetCount(item, 'likes', -1), is_liked: false }))
      } else {
        await socialApi.likeTweet(tweet._id)
        replaceTweet(tweet._id, (item) => ({ ...updateTweetCount(item, 'likes', 1), is_liked: true }))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const onBookmark = async (tweet: Tweet) => {
    const isBookmarked = Boolean(tweet.is_bookmarked)
    setError('')

    try {
      if (isBookmarked) {
        await socialApi.unbookmarkTweet(tweet._id)
        replaceTweet(tweet._id, (item) => ({ ...updateTweetCount(item, 'bookmarks', -1), is_bookmarked: false }))
      } else {
        await socialApi.bookmarkTweet(tweet._id)
        replaceTweet(tweet._id, (item) => ({ ...updateTweetCount(item, 'bookmarks', 1), is_bookmarked: true }))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const onRetweet = async (tweet: Tweet) => {
    setError('')

    try {
      if (tweet.viewer_repost_id) {
        await tweetsApi.deleteTweet(tweet.viewer_repost_id)
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
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const onUpdateTweet = async (tweet: Tweet, content: string) => {
    setError('')
    try {
      const updated = await tweetsApi.updateTweet(tweet._id, {
        content,
        hashtags: Array.from(new Set(Array.from(content.matchAll(/#([A-Za-z0-9_]+)/g), (match) => match[1].toLowerCase()))),
        mentions: tweet.mentions.map((mention) => mention._id),
        medias: tweet.medias,
        audience: tweet.audience
      })
      replaceTweet(tweet._id, () => updated)
    } catch (err) {
      setError(getErrorMessage(err))
      throw err
    }
  }

  const onDeleteTweet = async (tweet: Tweet) => {
    setError('')
    try {
      const result = await tweetsApi.deleteTweet(tweet._id)
      removeTweetIds(result.deleted_tweet_ids)
    } catch (err) {
      setError(getErrorMessage(err))
      throw err
    }
  }

  return (
    <section className="animate-fade-in">
      <header className="sticky top-0 z-20 border-b border-twitter-border bg-twitter-bg/80 px-5 py-4 backdrop-blur-xl">
        <h1 className="text-xl font-black">Home</h1>
      </header>

      {!isVerified ? (
        <div className="p-5">
          <Alert type="info">
            Verify your email before loading the feed. Backend protects `/tweets/new-feeds`, posting, search, and chat.
          </Alert>
          <Link
            to="/verify-email"
            className="mt-4 inline-flex rounded-full bg-twitter-blue px-5 py-2 text-sm font-black text-white transition hover:bg-twitter-blue-hover"
          >
            Verify email
          </Link>
        </div>
      ) : (
        <>
          <TweetComposer onCreated={onCreated} />

          {error ? (
            <div className="p-5">
              <Alert type="error">{error}</Alert>
            </div>
          ) : null}

          {tweets.length ? (
            <div>
              {tweets.map((tweet) => (
                <TweetCard
                  key={tweet._id}
                  tweet={tweet}
                  onLike={onLike}
                  onBookmark={onBookmark}
                  onRetweet={onRetweet}
                  onUpdate={onUpdateTweet}
                  onDelete={onDeleteTweet}
                />
              ))}
            </div>
          ) : !isLoading ? (
            <div className="p-8 text-center text-sm leading-6 text-twitter-muted">
              No tweets yet. Follow users or create the first post.
            </div>
          ) : null}

          <div className="p-5">
            {page < totalPage ? (
              <button
                type="button"
                onClick={() => void loadFeed(page + 1)}
                disabled={isLoading}
                className="w-full rounded-full border border-twitter-border px-5 py-3 font-black text-twitter-text transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Loading...' : 'Load more'}
              </button>
            ) : tweets.length && !isLoading ? (
              <p className="text-center text-sm text-twitter-muted">You reached the end of the timeline.</p>
            ) : isLoading ? (
              <div className="mx-auto size-9 animate-spin rounded-full border-2 border-twitter-border border-t-twitter-blue" />
            ) : null}
          </div>
        </>
      )}
    </section>
  )
}
