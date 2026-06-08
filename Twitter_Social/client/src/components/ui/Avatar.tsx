interface AvatarProps {
  src?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'size-9 text-sm',
  md: 'size-12 text-base',
  lg: 'size-16 text-xl',
  xl: 'size-28 text-4xl'
}

export function Avatar({ src, name = 'User', size = 'md', className = '' }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || 'U'

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white/5 ${className}`}
      />
    )
  }

  return (
    <span
      className={`${sizeClasses[size]} inline-flex shrink-0 items-center justify-center rounded-full bg-twitter-blue/15 font-bold text-twitter-blue ring-2 ring-white/5 ${className}`}
    >
      {initial}
    </span>
  )
}
