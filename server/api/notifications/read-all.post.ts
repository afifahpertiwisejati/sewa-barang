import { requireAuthUser } from '../../utils/auth'
import { markAllNotificationsRead } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const markedCount = await markAllNotificationsRead(user.id, user.role)
  return { ok: true, markedCount }
})
