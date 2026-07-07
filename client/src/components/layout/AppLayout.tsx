import { NavLink, Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import { Avatar } from '../ui/Avatar'
import { BrandMark } from '../ui/BrandMark'

const navItems = [
  { to: '/', label: 'Home', icon: 'M4 11.5 12 4l8 7.5V21a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z' },
  { to: '/search', label: 'Search', icon: 'm21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z' },
  { to: '/chat', label: 'Messages', icon: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-5 4V6.5Z' }
]

function Icon({ path }: { path: string }) {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AppLayout() {
  const { user, isVerified, logout } = useAuth()
  const { unreadCount } = useNotification()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const profilePath = user?.username ? `/${user.username}` : '/profile'
  const isChatPage = location.pathname === '/chat'
  const isChattingOnMobile = isChatPage && searchParams.get('receiver_id')

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-[1320px] grid-cols-1 md:grid-cols-[88px_minmax(0,1fr)] xl:grid-cols-[275px_minmax(0,1fr)_350px]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-twitter-border px-3 py-4 md:flex">
        <NavLink to="/" className="mb-4 w-fit rounded-full p-2 hover:bg-white/5">
          <BrandMark />
        </NavLink>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-5 rounded-full px-4 py-3 text-lg transition hover:bg-white/5 ${
                  isActive ? 'font-black text-twitter-text' : 'font-semibold text-twitter-muted'
                }`
              }
            >
              <div className="relative">
                <Icon path={item.icon} />
                {item.to === '/chat' && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-twitter-blue text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden xl:inline">{item.label}</span>
            </NavLink>
          ))}
          <NavLink
            to={profilePath}
            className={({ isActive }) =>
              `flex items-center gap-5 rounded-full px-4 py-3 text-lg transition hover:bg-white/5 ${
                isActive ? 'font-black text-twitter-text' : 'font-semibold text-twitter-muted'
              }`
            }
          >
            <Avatar src={user?.avatar} name={user?.name} size="sm" />
            <span className="hidden xl:inline">Profile</span>
          </NavLink>
        </nav>

        <NavLink
          to="/"
          className="mt-6 hidden rounded-full bg-twitter-blue px-5 py-3 text-center font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover xl:block"
        >
          Post
        </NavLink>

        <div className="mt-auto hidden rounded-3xl p-3 hover:bg-white/5 xl:block">
          <div className="flex items-center gap-3">
            <Avatar src={user?.avatar} name={user?.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-twitter-text">{user?.name}</p>
              <p className="truncate text-sm text-twitter-muted">@{user?.username}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 w-full rounded-full border border-twitter-border px-4 py-2 text-sm font-bold text-twitter-muted transition hover:border-rose-400/40 hover:text-rose-200"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className={`relative border-r border-twitter-border ${isChatPage ? '' : 'pb-16 md:pb-0'}`}>
        {!isVerified ? (
          <div className="border-b border-amber-300/20 bg-amber-300/10 px-5 py-3 text-sm text-amber-100">
            Your account is not verified yet.{' '}
            <NavLink to="/verify-email" className="font-bold text-amber-50 underline">
              Verify email
            </NavLink>{' '}
            to post, search, and chat.
          </div>
        ) : null}
        <Outlet />
      </main>

      <aside className="sticky top-0 hidden h-screen overflow-y-auto px-5 py-4 xl:block">
        <NavLink
          to="/search"
          className="flex rounded-full bg-twitter-surface px-5 py-3 text-sm text-twitter-muted transition hover:bg-twitter-elevated"
        >
          Search Twitter Social
        </NavLink>
        <section className="mt-4 rounded-3xl bg-twitter-surface p-5">
          <h2 className="text-xl font-black">Backend status</h2>
          <p className="mt-2 text-sm leading-6 text-twitter-muted">
            Connected routes: auth, feed, tweet detail, media upload, follow, search, likes, bookmarks, and chat.
          </p>
        </section>
      </aside>

      <nav className={`fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-twitter-border bg-twitter-bg/95 px-2 py-2 backdrop-blur md:hidden ${
        isChattingOnMobile ? 'hidden' : ''
      }`}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-2xl px-5 py-3 ${isActive ? 'text-twitter-blue' : 'text-twitter-muted'}`
            }
            aria-label={item.label}
          >
            <div className="relative">
              <Icon path={item.icon} />
              {item.to === '/chat' && unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1 flex size-4 items-center justify-center rounded-full bg-twitter-blue text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
          </NavLink>
        ))}
        <NavLink
          to={profilePath}
          className={({ isActive }) =>
            `rounded-2xl px-5 py-3 ${isActive ? 'text-twitter-blue' : 'text-twitter-muted'}`
          }
          aria-label="Profile"
        >
          <Avatar src={user?.avatar} name={user?.name} size="sm" />
        </NavLink>
      </nav>
    </div>
  )
}
