import type { NotificationsListResponse } from '#shared/types/rental'
import { requireAuthUser } from '../../utils/auth'
import { listNotificationsForUser } from '../../utils/db'

export default defineEventHandler(async (event): Promise<NotificationsListResponse> => {
  const user = await requireAuthUser(event)
  const query = getQuery(event)
  const rawLimit = Number(query.limit ?? 30)
  const limit = Number.isFinite(rawLimit) ? rawLimit : 30

  return await listNotificationsForUser(user.id, user.role, limit)
})
