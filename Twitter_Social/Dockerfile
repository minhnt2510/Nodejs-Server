# ── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Cài ffmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Upload folders
RUN mkdir -p uploads/images/temp uploads/videos/temp uploads/videos public logs

EXPOSE 3000

CMD ["node", "dist/index.js"]
