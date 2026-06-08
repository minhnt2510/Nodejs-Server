import { Router } from 'express'
import {
  uploadImageController,
  uploadVideoController,
  uploadVideoHLSController,
  videoStatusController
} from '~/controllers/medias.controllers'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const mediasRouter = Router()

/**
 * @swagger
 * /medias/upload-image:
 *   post:
 *     tags: [Medias]
 *     summary: Upload image (single or multiple, max 4)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: array
 *                 items: { type: string, format: binary }
 */
mediasRouter.post('/upload-image', accessTokenValidator, verifiedUserValidator, wrapRequestHandler(uploadImageController))

/**
 * @swagger
 * /medias/upload-video:
 *   post:
 *     tags: [Medias]
 *     summary: Upload video (max 50MB)
 *     security:
 *       - BearerAuth: []
 */
mediasRouter.post('/upload-video', accessTokenValidator, verifiedUserValidator, wrapRequestHandler(uploadVideoController))

/**
 * @swagger
 * /medias/upload-video-hls:
 *   post:
 *     tags: [Medias]
 *     summary: Upload video and encode to HLS
 *     security:
 *       - BearerAuth: []
 */
mediasRouter.post(
  '/upload-video-hls',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(uploadVideoHLSController)
)

/**
 * @swagger
 * /medias/video-status/{id}:
 *   get:
 *     tags: [Medias]
 *     summary: Get HLS video encode status
 *     security:
 *       - BearerAuth: []
 */
mediasRouter.get(
  '/video-status/:id',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(videoStatusController)
)

export default mediasRouter
