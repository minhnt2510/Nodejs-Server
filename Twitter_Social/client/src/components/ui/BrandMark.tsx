interface BrandMarkProps {
  className?: string
}

export function BrandMark({ className = '' }: BrandMarkProps) {
  return (
    <span
      className={`inline-flex size-11 items-center justify-center rounded-2xl bg-twitter-blue text-2xl font-black text-white shadow-lg shadow-twitter-blue/25 ${className}`}
    >
      X
    </span>
  )
}
