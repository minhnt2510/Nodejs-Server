import { useState } from 'react'
import type { FormEvent } from 'react'
import { searchApi } from '../apis/search'
import { socialApi } from '../apis/social'
import { tweetsApi } from '../apis/tweets'
import { TweetCard } from '../components/tweets/TweetCard'
import { Alert } from '../components/ui/Alert'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/http'
import type { Tweet } from '../types'
import { TweetAudience, TweetType } from '../types'

const PAGE_SIZE = 10

type MediaFilter = '' | 'image' | 'video'
type PeopleFilter = '0' | '1'

function updateTweetCount(tweet: Tweet, key: 'likes' | 'bookmarks' | 'retweet_count', delta: number) {
  return {
    ...tweet,
    [key]: Math.max(0, (tweet[key] ?? 0) + delta)
  }
}

export function SearchPage() {
  const { isVerified } = useAuth()
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('')
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>('0')
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const replaceTweet = (tweetId: string, updater: (tweet: Tweet) => Tweet) => {
    setTweets((current) => current.map((tweet) => (tweet._id === tweetId ? updater(tweet) : tweet)))
  }

  const runSearch = async (nextPage = 1, replace = true, content = submittedQuery || query) => {
    if (!content.trim()) return
    if (!isVerified) {
      setError('Please verify your email before searching.')
      return
    }

    setError('')
    setIsLoading(true)
    try {
      const result = await searchApi.searchTweets({
        content: content.trim(),
        page: nextPage,
        limit: PAGE_SIZE,
        media_type: mediaFilter || undefined,
        people_follow: peopleFilter
      })
      setSubmittedQuery(content.trim())
      setTweets((current) => (replace ? result.tweets : [...current, ...result.tweets]))
      setPage(result.page)
      setTotalPage(result.total_page)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runSearch(1, true, query)
  }

  const onLike = async (tweet: Tweet) => {
    const isLiked = likedIds.has(tweet._id)
    setError('')

    try {
      if (isLiked) {
        await socialApi.unlikeTweet(tweet._id)
        setLikedIds((current) => {
          const next = new Set(current)
          next.delete(tweet._id)
          return next
        })
        replaceTweet(tweet._id, (item) => updateTweetCount(item, 'likes', -1))
      } else {
        await socialApi.likeTweet(tweet._id)
        setLikedIds((current) => new Set(current).add(tweet._id))
        replaceTweet(tweet._id, (item) => updateTweetCount(item, 'likes', 1))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const onBookmark = async (tweet: Tweet) => {
    const isBookmarked = bookmarkedIds.has(tweet._id)
    setError('')

    try {
      if (isBookmarked) {
        await socialApi.unbookmarkTweet(tweet._id)
        setBookmarkedIds((current) => {
          const next = new Set(current)
          next.delete(tweet._id)
          return next
        })
        replaceTweet(tweet._id, (item) => updateTweetCount(item, 'bookmarks', -1))
      } else {
        await socialApi.bookmarkTweet(tweet._id)
        setBookmarkedIds((current) => new Set(current).add(tweet._id))
        replaceTweet(tweet._id, (item) => updateTweetCount(item, 'bookmarks', 1))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const onRetweet = async (tweet: Tweet) => {
    setError('')

    try {
      await tweetsApi.createTweet({
        type: TweetType.Retweet,
        audience: TweetAudience.Everyone,
        content: '',
        parent_id: tweet._id,
        hashtags: [],
        mentions: [],
        medias: []
      })
      replaceTweet(tweet._id, (item) => updateTweetCount(item, 'retweet_count', 1))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <section className="animate-fade-in">
      <header className="sticky top-0 z-20 border-b border-twitter-border bg-twitter-bg/80 px-5 py-4 backdrop-blur-xl">
        <h1 className="text-xl font-black">Search</h1>
      </header>

      <form onSubmit={onSubmit} className="space-y-4 border-b border-twitter-border p-5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-full border border-twitter-border bg-twitter-surface px-5 py-3 text-twitter-text outline-none transition focus:border-twitter-blue focus:ring-4 focus:ring-twitter-blue/10"
          placeholder="Search tweets"
          required
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={mediaFilter}
            onChange={(event) => setMediaFilter(event.target.value as MediaFilter)}
            className="rounded-2xl border border-twitter-border bg-twitter-bg px-4 py-3 text-sm font-semibold text-twitter-text outline-none"
          >
            <option value="">All media</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>

          <select
            value={peopleFilter}
            onChange={(event) => setPeopleFilter(event.target.value as PeopleFilter)}
            className="rounded-2xl border border-twitter-border bg-twitter-bg px-4 py-3 text-sm font-semibold text-twitter-text outline-none"
          >
            <option value="0">From anyone</option>
            <option value="1">People you follow</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading || !isVerified}
          className="rounded-full bg-twitter-blue px-5 py-3 font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {!isVerified ? (
        <div className="p-5">
          <Alert type="info">Search is protected by the backend. Verify your email to use it.</Alert>
        </div>
      ) : null}

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
              liked={likedIds.has(tweet._id)}
              bookmarked={bookmarkedIds.has(tweet._id)}
              onLike={onLike}
              onBookmark={onBookmark}
              onRetweet={onRetweet}
            />
          ))}
        </div>
      ) : submittedQuery && !isLoading ? (
        <div className="p-8 text-center text-sm text-twitter-muted">No tweets matched your search.</div>
      ) : (
        <div className="p-8 text-center text-sm leading-6 text-twitter-muted">
          Search uses MongoDB text index through the backend `/search` route.
        </div>
      )}

      {page < totalPage ? (
        <div className="p-5">
          <button
            type="button"
            onClick={() => void runSearch(page + 1, false)}
            disabled={isLoading}
            className="w-full rounded-full border border-twitter-border px-5 py-3 font-black text-twitter-text transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Loading...' : 'Load more results'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
