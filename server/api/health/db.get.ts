import { getDbHealthInfo } from '../../utils/db'

export default defineEventHandler(async () => {
  return await getDbHealthInfo()
})
