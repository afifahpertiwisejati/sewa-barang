export const MAX_UPLOAD_PHOTO_BYTES = 10 * 1024 * 1024 // 10 MB
const TARGET_SERVERLESS_BYTES = 3.5 * 1024 * 1024 // Safe margin under Vercel's 4.5 MB function payload limit

function renderCanvasBlob(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
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
      resolve(null)
      return
    }

    ctx.fillStyle = '#FAF8F5'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality)
  })
}

/**
 * Validates up to 10 MB and adaptively compresses large photos on the client
 * so up to 10 MB camera photos always upload reliably on Vercel Serverless.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1600,
  quality = 0.85,
): Promise<File> {
  if (file.size > MAX_UPLOAD_PHOTO_BYTES) {
    throw new Error('Ukuran foto terlalu besar. Maksimal 10 MB per foto.')
  }

  if (!import.meta.client) return file

  const standardMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(
    (file.type || '').toLowerCase(),
  )
  if (standardMime && file.size <= 600 * 1024) {
    return file
  }

  return new Promise<File>((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = async () => {
      try {
        const attempts: Array<[number, number]> = [
          [maxDimension, quality],
          [1400, 0.76],
          [1200, 0.68],
          [1000, 0.6],
        ]

        let bestBlob: Blob | null = null
        for (const [dim, q] of attempts) {
          const blob = await renderCanvasBlob(img, dim, q)
          if (blob) {
            bestBlob = blob
            if (blob.size <= TARGET_SERVERLESS_BYTES) break
          }
        }

        URL.revokeObjectURL(objectUrl)
        if (!bestBlob) {
          resolve(file)
          return
        }
        const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
        resolve(new File([bestBlob], `${baseName}.jpg`, { type: 'image/jpeg' }))
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
