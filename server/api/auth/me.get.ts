import type { AuthResponse } from '#shared/types/auth'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event): Promise<AuthResponse> => {
  return {
    user: await getAuthUser(event),
  }
})
