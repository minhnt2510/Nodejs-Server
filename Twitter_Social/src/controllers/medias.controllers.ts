import { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { MEDIAS_MESSAGES } from '~/constants/messages'
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'
import { sendFileFromS3 } from '~/utils/s3'
import mediasService from '~/services/medias.services'

export const uploadImageController = async (req: Request, res: Response) => {
  const result = await mediasService.uploadImage(req)
  return res.json({ message: MEDIAS_MESSAGES.UPLOAD_SUCCESS, result })
}

export const uploadVideoController = async (req: Request, res: Response) => {
  const result = await mediasService.uploadVideo(req)
  return res.json({ message: MEDIAS_MESSAGES.UPLOAD_SUCCESS, result })
}

export const uploadVideoHLSController = async (req: Request, res: Response) => {
  const result = await mediasService.uploadVideoHLS(req)
  return res.json({ message: MEDIAS_MESSAGES.UPLOAD_SUCCESS, result })
}

export const videoStatusController = async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await mediasService.getVideoStatus(id)
  return res.json({ message: MEDIAS_MESSAGES.GET_VIDEO_STATUS_SUCCESS, result })
}

export const serveImageController = (req: Request, res: Response) => {
  const { name } = req.params
  return res.sendFile(path.resolve(UPLOAD_IMAGE_DIR, name), (err) => {
    if (err) {
      res.status((err as any).status).send('Not found')
    }
  })
}

export const serveVideoStreamController = async (req: Request, res: Response) => {
  const range = req.headers.range
  if (!range) {
    return res.status(400).send('Requires Range header')
  }
  const { name } = req.params
  const videoPath = path.resolve(UPLOAD_VIDEO_DIR, name)
  const videoSize = fs.statSync(videoPath).size
  const chunkSize = 10 ** 6 // 1MB
  const start = Number(range.replace(/\D/g, ''))
  const end = Math.min(start + chunkSize, videoSize - 1)
  const contentLength = end - start + 1
  const mime = (await import('mime')).default
  const contentType = mime.getType(videoPath) || 'video/mp4'

  const headers = {
    'Content-Range': `bytes ${start}-${end}/${videoSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': contentLength,
    'Content-Type': contentType
  }
  res.writeHead(206, headers)
  const videoStream = fs.createReadStream(videoPath, { start, end })
  videoStream.pipe(res)
}

export const serveM3u8Controller = (req: Request, res: Response) => {
  const { id } = req.params
  // Try S3 first
  sendFileFromS3(res, `videos-hls/${id}/master.m3u8`).catch(() => {
    return res.sendFile(path.resolve(UPLOAD_VIDEO_DIR, id, 'master.m3u8'), (err) => {
      if (err) res.status((err as any).status).send('Not found')
    })
  })
}

export const serveSegmentController = (req: Request, res: Response) => {
  const { id, v, segment } = req.params
  // Try S3 first
  sendFileFromS3(res, `videos-hls/${id}/${v}/${segment}`).catch(() => {
    return res.sendFile(path.resolve(UPLOAD_VIDEO_DIR, id, v, segment), (err) => {
      if (err) res.status((err as any).status).send('Not found')
    })
  })
}
