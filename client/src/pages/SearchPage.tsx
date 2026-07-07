import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../apis/auth'
import { searchApi } from '../apis/search'
import { socialApi } from '../apis/social'
import { tweetsApi } from '../apis/tweets'
import { TweetCard } from '../components/tweets/TweetCard'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/http'
import type { Tweet, User } from '../types'
import { TweetAudience, TweetType } from '../types'

const PAGE_SIZE = 10

type SearchMode = 'tweets' | 'people'
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
  const [mode, setMode] = useState<SearchMode>('tweets')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('')
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>('0')
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [users, setUsers] = useState<User[]>([])
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

  const runSearch = async (nextPage = 1, replace = true, content = submittedQuery || query) => {
    if (!content.trim()) return
    if (!isVerified) {
      setError('Please verify your email before searching.')
      return
    }

    setError('')
    setIsLoading(true)
    try {
      if (mode === 'people') {
        const result = await authApi.searchUsers(content.trim(), nextPage, PAGE_SIZE)
        setUsers((current) => (replace ? result.users : [...current, ...result.users]))
        setTweets([])
        setPage(result.page)
        setTotalPage(result.total_page)
      } else {
        const result = await searchApi.searchTweets({
          content: content.trim(),
          page: nextPage,
          limit: PAGE_SIZE,
          media_type: mediaFilter || undefined,
          people_follow: peopleFilter
        })
        setTweets((current) => (replace ? result.tweets : [...current, ...result.tweets]))
        setUsers([])
        setPage(result.page)
        setTotalPage(result.total_page)
      }
      setSubmittedQuery(content.trim())
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

  const changeMode = (nextMode: SearchMode) => {
    setMode(nextMode)
    setTweets([])
    setUsers([])
    setSubmittedQuery('')
    setPage(1)
    setTotalPage(1)
    setError('')
  }

  const onFollow = async (target: User) => {
    setError('')
    try {
      if (target.is_following) {
        await authApi.unfollow(target._id)
      } else {
        await authApi.follow(target._id)
      }
      setUsers((current) =>
        current.map((user) =>
          user._id === target._id ? { ...user, is_following: !user.is_following } : user
        )
      )
    } catch (err) {
      setError(getErrorMessage(err))
    }
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
        <h1 className="text-xl font-black">Search</h1>
      </header>

      <div className="grid grid-cols-2 border-b border-twitter-border">
        {(['tweets', 'people'] as SearchMode[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => changeMode(item)}
            className={`border-b-2 px-5 py-4 text-sm font-black capitalize transition ${
              mode === item
                ? 'border-twitter-blue text-twitter-text'
                : 'border-transparent text-twitter-muted hover:bg-white/5'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4 border-b border-twitter-border p-5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-full border border-twitter-border bg-twitter-surface px-5 py-3 text-twitter-text outline-none transition focus:border-twitter-blue focus:ring-4 focus:ring-twitter-blue/10"
          placeholder={mode === 'people' ? 'Search by name or username' : 'Search tweets'}
          required
        />

        {mode === 'tweets' ? (
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
        ) : null}

        <button
          type="submit"
          disabled={isLoading || !isVerified}
          className="rounded-full bg-twitter-blue px-5 py-3 font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Searching...' : `Search ${mode}`}
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

      {mode === 'people' && users.length ? (
        <div>
          {users.map((target) => (
            <article key={target._id} className="flex gap-4 border-b border-twitter-border p-5">
              <Link to={`/${target.username}`}>
                <Avatar src={target.avatar} name={target.name} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/${target.username}`} className="font-black text-twitter-text hover:underline">
                  {target.name}
                </Link>
                <p className="text-sm text-twitter-muted">@{target.username}</p>
                {target.bio ? <p className="mt-2 text-sm leading-6 text-twitter-text">{target.bio}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={`/chat?receiver_id=${target._id}`}
                    state={{ receiverInfo: target }}
                    className="rounded-full border border-twitter-border px-4 py-2 text-sm font-black text-twitter-text transition hover:bg-white/5"
                  >
                    Message
                  </Link>
                  <button
                    type="button"
                    onClick={() => void onFollow(target)}
                    className={`rounded-full px-4 py-2 text-sm font-black transition ${
                      target.is_following
                        ? 'border border-twitter-border text-twitter-text hover:bg-white/5'
                        : 'bg-twitter-text text-twitter-bg hover:bg-white'
                    }`}
                  >
                    {target.is_following ? 'Following' : 'Follow'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : mode === 'tweets' && tweets.length ? (
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
      ) : submittedQuery && !isLoading ? (
        <div className="p-8 text-center text-sm text-twitter-muted">No {mode} matched your search.</div>
      ) : (
        <div className="p-8 text-center text-sm leading-6 text-twitter-muted">
          {mode === 'people'
            ? 'Find another account, then follow, view profile, or start a message.'
            : 'Search tweet content through the backend text index.'}
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
