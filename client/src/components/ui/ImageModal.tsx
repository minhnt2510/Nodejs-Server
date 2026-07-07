
interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  src: string
}

export function ImageModal({ isOpen, onClose, src }: ImageModalProps) {
  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 z-50 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
        aria-label="Close image modal"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image container */}
      <div className="relative flex h-full max-h-[90vh] w-full max-w-5xl items-center justify-center animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <img
          src={src}
          alt="View full size"
          className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
        />
      </div>
    </div>
  )
}
