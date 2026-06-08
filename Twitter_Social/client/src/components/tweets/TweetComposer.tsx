import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { mediasApi } from '../../apis/medias'
import { tweetsApi } from '../../apis/tweets'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/http'
import type { Tweet } from '../../types'
import { TweetAudience, TweetType } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Alert } from '../ui/Alert'

interface TweetComposerProps {
  onCreated: (tweet: Tweet) => void
}

interface ImagePreview {
  file: File
  previewUrl: string
}

const MAX_IMAGES = 4
const MAX_IMAGE_SIZE = 300 * 1024

function extractHashtags(content: string) {
  const matches = content.matchAll(/#([A-Za-z0-9_]+)/g)
  return Array.from(new Set(Array.from(matches, (match) => match[1].toLowerCase())))
}

export function TweetComposer({ onCreated }: TweetComposerProps) {
  const { user, isVerified } = useAuth()
  const [content, setContent] = useState('')
  const [images, setImages] = useState<ImagePreview[]>([])
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSelectImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setError('')

    if (images.length + files.length > MAX_IMAGES) {
      setError(`You can upload up to ${MAX_IMAGES} images.`)
      event.target.value = ''
      return
    }

    const invalidFile = files.find((file) => file.size > MAX_IMAGE_SIZE)
    if (invalidFile) {
      setError(`${invalidFile.name} is too large. Backend accepts images up to 300KB.`)
      event.target.value = ''
      return
    }

    setImages((current) => [
      ...current,
      ...files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file)
      }))
    ])
    event.target.value = ''
  }

  const removeImage = (previewUrl: string) => {
    setImages((current) => {
      const target = current.find((image) => image.previewUrl === previewUrl)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((image) => image.previewUrl !== previewUrl)
    })
  }

  const clearImages = () => {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    setImages([])
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isVerified) {
      setError('Please verify your email before posting.')
      return
    }
    if (!content.trim() && images.length === 0) return

    setError('')
    setIsSubmitting(true)

    try {
      const medias = images.length ? await mediasApi.uploadImages(images.map((image) => image.file)) : []
      const tweet = await tweetsApi.createTweet({
        type: TweetType.Tweet,
        audience: TweetAudience.Everyone,
        content: content.trim(),
        parent_id: null,
        hashtags: extractHashtags(content),
        mentions: [],
        medias
      })

      onCreated({
        ...tweet,
        user: user ?? undefined,
        hashtags: tweet.hashtags ?? [],
        mentions: tweet.mentions ?? [],
        bookmarks: tweet.bookmarks ?? 0,
        likes: tweet.likes ?? 0,
        retweet_count: tweet.retweet_count ?? 0,
        comment_count: tweet.comment_count ?? 0,
        quote_count: tweet.quote_count ?? 0
      })
      setContent('')
      clearImages()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="border-b border-twitter-border p-5">
      <div className="flex gap-4">
        <Avatar src={user?.avatar} name={user?.name} />
        <div className="min-w-0 flex-1">
          {error ? <Alert type="error">{error}</Alert> : null}
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={!isVerified || isSubmitting}
            className="mt-2 min-h-28 w-full resize-none bg-transparent text-xl text-twitter-text outline-none placeholder:text-twitter-soft disabled:opacity-60"
            placeholder={isVerified ? 'What is happening?' : 'Verify your email to post'}
            maxLength={280}
          />

          {images.length ? (
            <div className="mt-3 grid grid-cols-2 gap-2 overflow-hidden rounded-3xl">
              {images.map((image) => (
                <div key={image.previewUrl} className="group relative">
                  <img src={image.previewUrl} alt="" className="h-40 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(image.previewUrl)}
                    className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-sm font-bold text-white opacity-0 transition group-hover:opacity-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between border-t border-twitter-border pt-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-twitter-blue transition hover:bg-twitter-blue/10">
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={onSelectImages}
                disabled={!isVerified || isSubmitting}
              />
              Add images
            </label>

            <div className="flex items-center gap-3">
              <span className="text-sm text-twitter-muted">{content.length}/280</span>
              <button
                type="submit"
                disabled={!isVerified || isSubmitting || (!content.trim() && images.length === 0)}
                className="rounded-full bg-twitter-blue px-5 py-2 font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
