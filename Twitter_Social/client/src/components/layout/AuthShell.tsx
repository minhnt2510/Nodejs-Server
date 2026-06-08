import { Link } from 'react-router-dom'
import { BrandMark } from '../ui/BrandMark'

interface AuthShellProps {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="glass-card animate-slide-up w-full max-w-md rounded-[2rem] p-7 sm:p-9">
        <Link to="/" className="mx-auto mb-8 block w-fit">
          <BrandMark />
        </Link>
        <p className="text-center text-xs font-black uppercase tracking-[0.28em] text-twitter-blue">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-center text-3xl font-black tracking-tight text-twitter-text">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-twitter-muted">
          {description}
        </p>
        <div className="mt-8">{children}</div>
        {footer ? <div className="mt-7 text-center text-sm text-twitter-muted">{footer}</div> : null}
      </section>
    </main>
  )
}
