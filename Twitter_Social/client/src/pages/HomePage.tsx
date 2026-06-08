import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Avatar } from '../components/ui/Avatar'

export function HomePage() {
  const { user, isVerified } = useAuth()

  return (
    <section className="animate-fade-in">
      <header className="sticky top-0 z-20 border-b border-twitter-border bg-twitter-bg/80 px-5 py-4 backdrop-blur-xl">
        <h1 className="text-xl font-black">Home</h1>
      </header>

      <div className="border-b border-twitter-border p-5">
        <div className="flex gap-4">
          <Avatar src={user?.avatar} name={user?.name} />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-twitter-text">Hello, {user?.name}</p>
            <p className="mt-2 text-sm leading-6 text-twitter-muted">
              Feed, composer, media upload, likes, and bookmarks will be wired in the next frontend commit.
            </p>
            {!isVerified ? (
              <Link
                to="/verify-email"
                className="mt-4 inline-flex rounded-full bg-twitter-blue px-5 py-2 text-sm font-black text-white transition hover:bg-twitter-blue-hover"
              >
                Verify email first
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
