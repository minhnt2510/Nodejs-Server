import { Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'
import { EncodingStatus, MediaType } from '~/constants/enums'
import { Media } from '~/models/requests/Tweet.requests'
import VideoStatus from '~/models/schemas/VideoStatus.schema'
import databaseService from './database.services'
import { handleUploadImage, handleUploadVideo, getNameFromFullname, getFiles } from '~/utils/file'
import { envConfig } from '~/constants/config'
import { uploadFileToS3 } from '~/utils/s3'
import mime from 'mime'

class Queue {
  items: string[]
  encoding: boolean

  constructor() {
    this.items = []
    this.encoding = false
  }

  async enqueue(item: string) {
    this.items.push(item)
    const idName = path.basename(path.dirname(item))
    await databaseService.videoStatus.insertOne(
      new VideoStatus({ name: idName, status: EncodingStatus.Pending })
    )
    this.processEncode()
  }

  async processEncode() {
    if (this.encoding) return
    if (this.items.length > 0) {
      this.encoding = true
      const videoPath = this.items[0]
      const idName = path.basename(path.dirname(videoPath))
      await databaseService.videoStatus.updateOne(
        { name: idName },
        { $set: { status: EncodingStatus.Processing } }
      )
      try {
        await encodeHLSWithMultipleVideoStreams(videoPath)
        this.items.shift()
        await databaseService.videoStatus.updateOne(
          { name: idName },
          { $set: { status: EncodingStatus.Success, updated_at: new Date() } }
        )

        // Upload to S3 if configured
        try {
          const files = getFiles(path.resolve(UPLOAD_VIDEO_DIR, idName))
          await Promise.all(
            files.map((filepath) => {
              const filename = 'videos-hls/' + filepath.replace(path.resolve(UPLOAD_VIDEO_DIR), '').replace(/\\/g, '/')
              return uploadFileToS3({
                filename,
                filepath,
                contentType: mime.getType(filepath) || 'application/octet-stream'
              })
            })
          )
        } catch {
          console.log('S3 not configured, HLS files served locally')
        }

        console.log(`Encode video ${videoPath} success`)
      } catch (error) {
        await databaseService.videoStatus
          .updateOne({ name: idName }, { $set: { status: EncodingStatus.Failed, message: (error as Error).message } })
          .catch(console.error)
        console.error(`Encode video ${videoPath} error`)
        console.error(error)
      }
      this.encoding = false
      this.processEncode()
    }
  }
}

const queue = new Queue()

const encodeHLSWithMultipleVideoStreams = async (inputPath: string) => {
  // Dynamic import to avoid ffmpeg issues when not installed
  try {
    const ffmpeg = (await import('fluent-ffmpeg')).default
    const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg')
    ffmpeg.setFfmpegPath(ffmpegInstaller.path)

    const outputDir = path.dirname(inputPath)
    const basename = path.basename(inputPath, path.extname(inputPath))

    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-profile:v baseline',
          '-level 3.0',
          '-start_number 0',
          '-hls_time 10',
          '-hls_list_size 0',
          '-f hls'
        ])
        .output(path.join(outputDir, 'master.m3u8'))
        .on('progress', (progress) => {
          console.log(`HLS encoding: ${Math.round(progress.percent || 0)}% done`)
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run()
    })
  } catch {
    throw new Error('ffmpeg is not installed. Please install @ffmpeg-installer/ffmpeg')
  }
}

class MediasService {
  async uploadImage(req: Request) {
    const files = await handleUploadImage(req)
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const newName = getNameFromFullname(file.newFilename as string)
        const newFullFilename = `${newName}.jpg`
        const newPath = path.resolve(UPLOAD_IMAGE_DIR, newFullFilename)
        await sharp(file.filepath).jpeg().toFile(newPath)
        fs.unlinkSync(file.filepath)

        const localUrl = `${envConfig.host.includes('localhost') ? `${envConfig.host}:${envConfig.port}` : envConfig.host}/static/image/${newFullFilename}`

        // Chỉ thử S3 khi được bật VÀ credentials đầy đủ
        if (envConfig.useS3 && envConfig.awsAccessKeyId && envConfig.awsSecretAccessKey && envConfig.s3BucketName) {
          try {
            await uploadFileToS3({ filename: 'images/' + newFullFilename, filepath: newPath, contentType: 'image/jpeg' })
            fs.unlinkSync(newPath) // xóa local chỉ khi S3 upload thành công
            return {
              url: `https://${envConfig.s3BucketName}.s3.${envConfig.awsRegion}.amazonaws.com/images/${newFullFilename}`,
              type: MediaType.Image
            }
          } catch (err) {
            console.error('[S3] Image upload failed, fallback to local:', (err as Error).message)
          }
        }

        // Fallback: serve từ local static
        return { url: localUrl, type: MediaType.Image }
      })
    )
    return result
  }

  async uploadVideo(req: Request) {
    const files = await handleUploadVideo(req)
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        // Try S3 upload
        try {
          await uploadFileToS3({
            filename: 'videos/' + file.newFilename,
            filepath: file.filepath,
            contentType: mime.getType(file.filepath) || 'video/mp4'
          })
          return {
            url: `https://${envConfig.s3BucketName}.s3.${envConfig.awsRegion}.amazonaws.com/videos/${file.newFilename}`,
            type: MediaType.Video
          }
        } catch {
          return {
            url: `${envConfig.host.includes('localhost') ? `${envConfig.host}:${envConfig.port}` : envConfig.host}/static/video-stream/${file.newFilename}`,
            type: MediaType.Video
          }
        }
      })
    )
    return result
  }

  async uploadVideoHLS(req: Request) {
    const files = await handleUploadVideo(req)
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const newName = getNameFromFullname(file.newFilename as string)
        queue.enqueue(file.filepath)
        return {
          url: `${envConfig.host.includes('localhost') ? `${envConfig.host}:${envConfig.port}` : envConfig.host}/static/video-hls/${newName}/master.m3u8`,
          type: MediaType.HLS
        }
      })
    )
    return result
  }

  async getVideoStatus(id: string) {
    const data = await databaseService.videoStatus.findOne({ name: id })
    return data
  }
}

const mediasService = new MediasService()
export default mediasService
