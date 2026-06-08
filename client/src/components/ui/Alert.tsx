interface AlertProps {
  type?: 'info' | 'success' | 'error'
  children: React.ReactNode
}

const alertClasses = {
  info: 'border-twitter-blue/25 bg-twitter-blue/10 text-sky-100',
  success: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  error: 'border-rose-400/25 bg-rose-400/10 text-rose-100'
}

export function Alert({ type = 'info', children }: AlertProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${alertClasses[type]}`}>
      {children}
    </div>
  )
}
