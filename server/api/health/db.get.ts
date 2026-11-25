import { getDbHealthInfo } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    return await getDbHealthInfo()
  }
  catch (err) {
    setResponseStatus(event, 500)
    const errorObj = err as { code?: string, message?: string }
    const missingEnv = ['TIDB_HOST', 'TIDB_USER', 'TIDB_PASSWORD', 'TIDB_DATABASE'].filter(
      key => !(process.env[key] || '').trim(),
    )
    return {
      connected: false,
      code: errorObj?.code || 'DB_ERROR',
      message: errorObj?.message || 'Gagal terhubung ke database TiDB.',
      missingEnv,
    }
  }
})
