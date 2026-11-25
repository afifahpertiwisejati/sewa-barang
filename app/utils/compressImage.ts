export const MAX_UPLOAD_PHOTO_BYTES = 10 * 1024 * 1024 // 10 MB
const TARGET_UPLOAD_BYTES = 1.2 * 1024 * 1024 // ~1.2 MB for fast & reliable upload on mobile + Vercel
const HARD_SERVERLESS_LIMIT = 4 * 1024 * 1024 // 4 MB safety ceiling below Vercel's 4.5 MB body limit

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

    const timer = setTimeout(() => resolve(null), 8000)
    canvas.toBlob(
      (blob) => {
        clearTimeout(timer)
        resolve(blob)
      },
      'image/jpeg',
      quality,
    )
  })
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    const timer = setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('DECODE_TIMEOUT'))
    }, 8000)

    img.onload = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(objectUrl)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(objectUrl)
      reject(new Error('DECODE_FAILED'))
    }
    img.src = objectUrl
  })
}

/**
 * Validates up to 10 MB and adaptively compresses large photos on the client
 * so camera/gallery photos up to 10 MB upload fast and reliably on Vercel.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1400,
  quality = 0.82,
): Promise<File> {
  if (file.size > MAX_UPLOAD_PHOTO_BYTES) {
    throw new Error('Ukuran foto terlalu besar. Maksimal 10 MB per foto.')
  }

  if (!import.meta.client) return file

  const mime = (file.type || '').toLowerCase()
  const standardMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime)
  if (standardMime && file.size <= 450 * 1024) {
    return file
  }

  try {
    const img = await loadImageFromFile(file)
    const attempts: Array<[number, number]> = [
      [maxDimension, quality],
      [1200, 0.75],
      [1000, 0.68],
      [850, 0.6],
    ]

    let bestBlob: Blob | null = null
    for (const [dim, q] of attempts) {
      const blob = await renderCanvasBlob(img, dim, q)
      if (blob) {
        bestBlob = blob
        if (blob.size <= TARGET_UPLOAD_BYTES) break
      }
    }

    if (bestBlob) {
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
      return new File([bestBlob], `${baseName}.jpg`, { type: 'image/jpeg' })
    }
  }
  catch {
    if (file.size > HARD_SERVERLESS_LIMIT) {
      throw new Error('Format foto tidak dapat dikompresi oleh browser (mis. HEIC). Simpan/ubah ke JPG atau PNG lalu coba lagi.')
    }
  }

  if (file.size > HARD_SERVERLESS_LIMIT) {
    throw new Error('Foto terlalu besar setelah kompresi. Coba gunakan foto JPG/PNG dengan resolusi lebih kecil.')
  }

  return file
}
