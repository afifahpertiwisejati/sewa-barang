/**
 * Automatically resizes and compresses large photos (e.g. 5-12 MB smartphone camera photos)
 * on the client before uploading so uploads are fast and never exceed Vercel's payload limit.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1400,
  quality = 0.84,
): Promise<File> {
  if (!import.meta.client) return file

  // Small already-supported files (< 600 KB) can be uploaded directly
  const standardMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(
    (file.type || '').toLowerCase(),
  )
  if (standardMime && file.size <= 600 * 1024) {
    return file
  }

  return new Promise<File>((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      try {
        let { width, height } = img
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          }
          else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(objectUrl)
          resolve(file)
          return
        }

        // Fill warm white background in case PNG has transparency
        ctx.fillStyle = '#FAF8F5'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl)
            if (!blob) {
              resolve(file)
              return
            }
            const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
            resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }))
          },
          'image/jpeg',
          quality,
        )
      }
      catch {
        URL.revokeObjectURL(objectUrl)
        resolve(file)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    img.src = objectUrl
  })
}
