import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { Express } from 'express'
import path from 'path'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Twitter Social API',
      version: '1.0.0',
      description:
        'REST API cho ứng dụng Twitter Clone - Node.js TypeScript MongoDB. Bao gồm Auth, Users, Tweets, Bookmarks, Likes, Media, Search, Conversations.'
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development server' }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    tags: [
      { name: 'Users', description: 'Auth & User management' },
      { name: 'Tweets', description: 'Tweet CRUD & feeds' },
      { name: 'Bookmarks', description: 'Bookmark tweets' },
      { name: 'Likes', description: 'Like/unlike tweets' },
      { name: 'Medias', description: 'File upload & streaming' },
      { name: 'Search', description: 'Full-text search' },
      { name: 'Conversations', description: 'Private messages' }
    ]
  },
  apis: [path.resolve('src/routes/*.ts')]
}

const openapiSpecification = swaggerJsdoc(options)

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification))
}
