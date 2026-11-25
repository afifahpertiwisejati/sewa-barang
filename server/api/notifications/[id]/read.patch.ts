import { requireAuthUser } from '../../../utils/auth'
import { markNotificationRead } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID notifikasi tidak valid.' })
  }

  const updated = await markNotificationRead(id, user.id, user.role)
  return { ok: true, updated }
})
