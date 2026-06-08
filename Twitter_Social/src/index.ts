import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'

import { envConfig } from '~/constants/config'
import { defaultErrorHandler } from '~/middlewares/error.middlewares'
import databaseService from '~/services/database.services'
import { initFolder } from '~/utils/file'
import { setupSwagger } from '~/utils/swagger'
import initSocket from '~/utils/socket'

import usersRouter from '~/routes/users.routes'
import tweetsRouter from '~/routes/tweets.routes'
import bookmarksRouter from '~/routes/bookmarks.routes'
import likesRouter from '~/routes/likes.routes'
import mediasRouter from '~/routes/medias.routes'
import staticRouter from '~/routes/static.routes'
import searchRouter from '~/routes/search.routes'
import conversationsRouter from '~/routes/conversations.routes'

// ── App setup ────────────────────────────────────────────────────────────────
const app = express()
const httpServer = createServer(app)

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet())
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
})
app.use(limiter)

// ── Parsers ───────────────────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Static public folder ─────────────────────────────────────────────────────
app.use(express.static(path.resolve('public')))

// ── Swagger ───────────────────────────────────────────────────────────────────
setupSwagger(app)

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/users', usersRouter)
app.use('/tweets', tweetsRouter)
app.use('/bookmarks', bookmarksRouter)
app.use('/likes', likesRouter)
app.use('/medias', mediasRouter)
app.use('/static', staticRouter)
app.use('/search', searchRouter)
app.use('/conversations', conversationsRouter)

// ── Error handler ────────────────────────────────────────────────────────────
app.use(defaultErrorHandler)

// ── Bootstrap ────────────────────────────────────────────────────────────────
const bootstrap = async () => {
  // Tạo upload folders
  initFolder()

  // Kết nối DB
  await databaseService.connect()

  // Khởi động Socket.io
  initSocket(httpServer)

  const port = envConfig.port
  httpServer.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`)
    console.log(`📚 Swagger docs: http://localhost:${port}/api-docs`)
    console.log(`💬 Chat demo:    http://localhost:${port}`)
  })
}

bootstrap().catch(console.error)
