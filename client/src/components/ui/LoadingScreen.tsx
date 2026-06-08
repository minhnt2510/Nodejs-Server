import { BrandMark } from './BrandMark'

export function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <BrandMark className="mx-auto mb-5 animate-pulse" />
        <div className="mx-auto size-10 animate-spin rounded-full border-2 border-twitter-border border-t-twitter-blue" />
        <p className="mt-4 text-sm font-medium text-twitter-muted">Loading Twitter Social...</p>
      </div>
    </main>
  )
}
