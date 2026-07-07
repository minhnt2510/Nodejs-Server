const MAX_DIMENSION = 1920
const QUALITY = 0.8
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function resizeImage(file: File): Promise<File> {
  // Nếu file nhỏ hơn 1MB và là ảnh nhỏ, không cần resize
  if (file.size < 1024 * 1024) return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && file.size < MAX_FILE_SIZE) {
        resolve(file)
        return
      }

      // Tính tỷ lệ resize
      if (width > MAX_DIMENSION) {
        height = Math.round((height * MAX_DIMENSION) / width)
        width = MAX_DIMENSION
      }
      if (height > MAX_DIMENSION) {
        width = Math.round((width * MAX_DIMENSION) / height)
        height = MAX_DIMENSION
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const resized = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(resized)
        },
        'image/jpeg',
        QUALITY
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export async function resizeImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(resizeImage))
}
