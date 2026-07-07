import { Redis } from '@upstash/redis'
import { envConfig } from '~/constants/config'

// Upstash Redis client — dùng HTTP, không cần kết nối persistent
let redis: Redis | null = null

function getRedis(): Redis | null {
  if (!envConfig.upstashRedisRestUrl || !envConfig.upstashRedisRestToken) {
    return null
  }
  if (!redis) {
    redis = new Redis({
      url: envConfig.upstashRedisRestUrl,
      token: envConfig.upstashRedisRestToken
    })
  }
  return redis
}

const DEFAULT_TTL = {
  user: 300,      // 5 phút
  tweet: 30,      // 30 giây
  search: 120,    // 2 phút
  profile: 300    // 5 phút
} as const

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis()
  if (!client) return null
  try {
    return await client.get<T>(key)
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: any, ttl: number): Promise<void> {
  const client = getRedis()
  if (!client) return
  try {
    await client.setex(key, ttl, JSON.stringify(value))
  } catch {
    // Cache failure is non-critical
  }
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedis()
  if (!client) return
  try {
    await client.del(key)
  } catch {
    // ignore
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const client = getRedis()
  if (!client) return
  try {
    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      await client.del(...keys)
    }
  } catch {
    // ignore
  }
}

export function cacheKey(type: 'user', id: string): string
export function cacheKey(type: 'tweet', id: string): string
export function cacheKey(type: 'profile', username: string): string
export function cacheKey(type: 'search', query: string): string
export function cacheKey(type: 'feed', userId: string): string
export function cacheKey(type: string, id: string): string {
  return `twitter:${type}:${id}`
}

export function getTTL(type: keyof typeof DEFAULT_TTL): number {
  return DEFAULT_TTL[type]
}

export { DEFAULT_TTL }
