import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { mediasApi } from '../../apis/medias'
import { tweetsApi } from '../../apis/tweets'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/http'
import type { Media, Tweet, TweetTypeValue } from '../../types'
import { TweetAudience, TweetType } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Alert } from '../ui/Alert'

interface TweetComposerProps {
  onCreated: (tweet: Tweet) => void
  parentId?: string | null
  tweetType?: TweetTypeValue
  placeholder?: string
  submitLabel?: string
}

interface ImagePreview {
  file: File
  previewUrl: string
}

const MAX_MEDIA_ITEMS = 4
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50 MB

function extractHashtags(content: string) {
  const matches = content.matchAll(/#([A-Za-z0-9_]+)/g)
  return Array.from(new Set(Array.from(matches, (match) => match[1].toLowerCase())))
}

export function TweetComposer({
  onCreated,
  parentId = null,
  tweetType = TweetType.Tweet,
  placeholder = 'What is happening?',
  submitLabel = 'Post'
}: TweetComposerProps) {
  const { user, isVerified } = useAuth()
  const [content, setContent] = useState('')
  const [images, setImages] = useState<ImagePreview[]>([])
  const [videoFile, setVideoFile] = useState<{ file: File; previewUrl: string } | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const videoInputRef = useRef<HTMLInputElement | null>(null)

  const onSelectImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setError('')

    if (images.length + files.length > MAX_MEDIA_ITEMS) {
      setError(`You can upload up to ${MAX_MEDIA_ITEMS} media items.`)
      event.target.value = ''
      return
    }

    const invalidFile = files.find((file) => file.size > MAX_IMAGE_SIZE)
    if (invalidFile) {
      setError(`${invalidFile.name} quá lớn. Tối đa 5 MB mỗi ảnh.`)
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

  const onSelectVideo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError('')
    if (!file) return

    if (videoFile) {
      setError('Chỉ được chọn 1 video.')
      event.target.value = ''
      return
    }

    if (images.length >= MAX_MEDIA_ITEMS) {
      setError(`You can upload up to ${MAX_MEDIA_ITEMS} media items.`)
      event.target.value = ''
      return
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setError(`Video quá lớn. Tối đa 50 MB.`)
      event.target.value = ''
      return
    }

    setVideoFile({ file, previewUrl: URL.createObjectURL(file) })
    event.target.value = ''
  }

  const removeImage = (previewUrl: string) => {
    setImages((current) => {
      const target = current.find((image) => image.previewUrl === previewUrl)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((image) => image.previewUrl !== previewUrl)
    })
  }

  const removeVideo = () => {
    if (videoFile) {
      URL.revokeObjectURL(videoFile.previewUrl)
      setVideoFile(null)
    }
  }

  const clearMedia = () => {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    setImages([])
    if (videoFile) {
      URL.revokeObjectURL(videoFile.previewUrl)
      setVideoFile(null)
    }
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isVerified) {
      setError('Please verify your email before posting.')
      return
    }
    if (!content.trim() && images.length === 0 && !videoFile) return

    setError('')
    setIsSubmitting(true)

    try {
      let medias: Media[] = []
      if (images.length) {
        const uploadedImages = await mediasApi.uploadImages(images.map((image) => image.file))
        medias.push(...uploadedImages)
      }
      if (videoFile) {
        const uploadedVideos = await mediasApi.uploadVideo(videoFile.file)
        medias.push(...uploadedVideos)
      }

      const tweet = await tweetsApi.createTweet({
        type: tweetType,
        audience: TweetAudience.Everyone,
        content: content.trim(),
        parent_id: parentId,
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
        quote_count: tweet.quote_count ?? 0,
        is_liked: false,
        is_bookmarked: false,
        viewer_repost_id: null
      })
      setContent('')
      clearMedia()
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
            placeholder={isVerified ? placeholder : 'Verify your email to post'}
            maxLength={280}
          />

          {images.length || videoFile ? (
            <div className="mt-3 grid grid-cols-2 gap-2 overflow-hidden rounded-3xl">
              {images.map((image) => (
                <div key={image.previewUrl} className="group relative bg-black/20 rounded-2xl overflow-hidden border border-twitter-border/40">
                  <img src={image.previewUrl} alt="" className="h-40 w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => removeImage(image.previewUrl)}
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 md:opacity-0 md:group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {videoFile && (
                <div className="group relative bg-black/20 rounded-2xl overflow-hidden border border-twitter-border/40">
                  <video src={videoFile.previewUrl} className="h-40 w-full object-contain" preload="metadata" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="truncate text-xs text-white">{videoFile.file.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 md:opacity-0 md:group-hover:opacity-100"
                    aria-label="Remove video"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between border-t border-twitter-border pt-4">
            <div className="flex items-center gap-1">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-twitter-blue transition hover:bg-twitter-blue/10">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={onSelectImages}
                  disabled={!isVerified || isSubmitting}
                />
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Images
              </label>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={!isVerified || isSubmitting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-twitter-blue transition hover:bg-twitter-blue/10 disabled:opacity-50"
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo"
                  className="hidden"
                  onChange={onSelectVideo}
                  disabled={!isVerified || isSubmitting}
                />
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Video
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-twitter-muted">{content.length}/280</span>
              <button
                type="submit"
                disabled={!isVerified || isSubmitting || (!content.trim() && images.length === 0 && !videoFile)}
                className="rounded-full bg-twitter-blue px-5 py-2 font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : submitLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
