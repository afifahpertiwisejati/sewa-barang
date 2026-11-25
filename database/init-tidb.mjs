import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import mysql from 'mysql2/promise'

const host = process.env.TIDB_HOST
const port = Number(process.env.TIDB_PORT || 4000)
const user = process.env.TIDB_USER
const password = process.env.TIDB_PASSWORD
const database = (process.env.TIDB_DATABASE || 'sewain_db').replace(/[^a-zA-Z0-9_]/g, '')
const caPath = process.env.TIDB_CA_PATH || ''

if (!host || !user || !password || !database) {
  console.error('ERROR: Pastikan TIDB_HOST, TIDB_USER, TIDB_PASSWORD, dan TIDB_DATABASE diisi di .env')
  process.exit(1)
}

if (database.toLowerCase() === 'sys' || database.toLowerCase() === 'test') {
  console.error(`ERROR: Database tidak boleh 'sys' atau 'test' (diterima: '${database}')`)
  process.exit(1)
}

const ssl = caPath && existsSync(caPath)
  ? { minVersion: 'TLSv1.2', ca: readFileSync(caPath, 'utf-8'), rejectUnauthorized: true }
  : { minVersion: 'TLSv1.2', rejectUnauthorized: true }

async function main() {
  console.log(`Connecting to TiDB Cloud: ${host}:${port} as ${user} ...`)
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    ssl,
    connectTimeout: 20000,
    multipleStatements: true,
  })

  try {
    // 1. Create dedicated database (separate from sys & test)
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
    await conn.query(`USE \`${database}\``)
    console.log(`Database \`${database}\` siap digunakan.`)

    // 2. Execute schema.sql statements
    const schemaPath = resolve(process.cwd(), 'database', 'schema.sql')
    const schemaSql = readFileSync(schemaPath, 'utf-8')
      .replace(/`sewain_db`/g, `\`${database}\``)
    await conn.query(schemaSql)

    const depositAlterStmts = [
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_status ENUM('ditahan', 'menunggu_pengembalian', 'dikembalikan', 'dipotong') NOT NULL DEFAULT 'ditahan'`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_refund_method VARCHAR(40) NULL`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_refund_account VARCHAR(191) NULL`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_refund_amount INT NULL`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_deduction INT NOT NULL DEFAULT 0`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_refund_reference VARCHAR(100) NULL`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_refund_note TEXT NULL`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_refunded_at VARCHAR(40) NULL`,
    ]
    for (const stmt of depositAlterStmts) {
      await conn.query(stmt)
    }
    console.log('Tabel users, items, dan bookings (termasuk kolom pengembalian deposit) berhasil diverifikasi.')

    // 3. Migrate existing local JSON data into TiDB ONLY if database is empty
    const [[existingItems]] = await conn.query('SELECT COUNT(*) AS cnt FROM items')
    const [[existingUsers]] = await conn.query('SELECT COUNT(*) AS cnt FROM users')
    const legacyPath = resolve(process.cwd(), '.data', 'sewain-db.json')
    if (Number(existingItems.cnt) === 0 && Number(existingUsers.cnt) === 0 && existsSync(legacyPath)) {
      const parsed = JSON.parse(readFileSync(legacyPath, 'utf-8'))
      const users = Array.isArray(parsed.users) ? parsed.users : []
      const items = Array.isArray(parsed.items) ? parsed.items : []
      const bookings = Array.isArray(parsed.bookings) ? parsed.bookings : []

      console.log(`Memigrasikan data lokal (.data/sewain-db.json): ${users.length} users, ${items.length} items, ${bookings.length} bookings ...`)

      for (const u of users) {
        await conn.execute(
          `INSERT INTO users (id, name, email, phone, role, avatar_initials, password_hash, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             phone = VALUES(phone),
             role = VALUES(role),
             avatar_initials = VALUES(avatar_initials)`,
          [u.id, u.name, u.email.toLowerCase(), u.phone, u.role, u.avatarInitials, u.passwordHash, u.createdAt],
        )
      }

      for (const item of items) {
        await conn.execute(
          `INSERT INTO items (
             id, name, category, location, price_per_day, deposit, rating, review_count,
             status, sizes_json, colors_json, image_url, gallery_json, description,
             specs_json, owner_json, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             category = VALUES(category),
             location = VALUES(location),
             price_per_day = VALUES(price_per_day),
             deposit = VALUES(deposit),
             rating = VALUES(rating),
             review_count = VALUES(review_count),
             status = VALUES(status),
             sizes_json = VALUES(sizes_json),
             colors_json = VALUES(colors_json),
             image_url = VALUES(image_url),
             gallery_json = VALUES(gallery_json),
             description = VALUES(description),
             specs_json = VALUES(specs_json),
             owner_json = VALUES(owner_json)`,
          [
            item.id,
            item.name,
            item.category,
            item.location,
            item.pricePerDay,
            item.deposit,
            item.rating,
            item.reviewCount,
            item.status,
            JSON.stringify(item.sizes),
            item.colors ? JSON.stringify(item.colors) : null,
            item.imageUrl,
            JSON.stringify(item.gallery),
            item.description,
            JSON.stringify(item.specs),
            JSON.stringify(item.owner),
            item.createdAt,
          ],
        )
      }

      const validUserIds = new Set(users.map(u => u.id))
      for (const b of bookings) {
        const safeUserId = b.userId && validUserIds.has(b.userId) ? b.userId : null
        await conn.execute(
          `INSERT INTO bookings (
             id, user_id, item_id, item_name, item_category, item_location, item_image_url,
             owner_name, renter_name, renter_phone, selected_size, selected_color,
             start_date, end_date, duration_days, price_per_day, subtotal, deposit,
             delivery_option, delivery_fee, total_price, status, payment_method,
             payment_status, payment_channel, payment_reference, payment_paid_at,
             guarantee_type, guarantee_number, guarantee_status, notes, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             status = VALUES(status),
             payment_method = VALUES(payment_method),
             payment_status = VALUES(payment_status),
             payment_channel = VALUES(payment_channel),
             payment_reference = VALUES(payment_reference),
             payment_paid_at = VALUES(payment_paid_at),
             guarantee_type = VALUES(guarantee_type),
             guarantee_number = VALUES(guarantee_number),
             guarantee_status = VALUES(guarantee_status)`,
          [
            b.id,
            safeUserId,
            b.itemId,
            b.itemName,
            b.itemCategory,
            b.itemLocation,
            b.itemImageUrl,
            b.ownerName,
            b.renterName,
            b.renterPhone,
            b.selectedSize,
            b.selectedColor ?? null,
            b.startDate,
            b.endDate,
            b.durationDays,
            b.pricePerDay,
            b.subtotal,
            b.deposit,
            b.deliveryOption,
            b.deliveryFee,
            b.totalPrice,
            b.status,
            b.paymentMethod,
            b.paymentStatus,
            b.paymentChannel ?? null,
            b.paymentReference ?? null,
            b.paymentPaidAt ?? null,
            b.guaranteeType,
            b.guaranteeNumber ?? null,
            b.guaranteeStatus,
            b.notes ?? null,
            b.createdAt,
          ],
        )
      }
    }

    // 4. Print verification summary
    const [dbs] = await conn.query('SHOW DATABASES')
    const [tables] = await conn.query('SHOW TABLES')
    const [[uCnt]] = await conn.query('SELECT COUNT(*) AS cnt FROM users')
    const [[iCnt]] = await conn.query('SELECT COUNT(*) AS cnt FROM items')
    const [[bCnt]] = await conn.query('SELECT COUNT(*) AS cnt FROM bookings')
    const [[ver]] = await conn.query('SELECT DATABASE() AS db, VERSION() AS version')

    console.log('\n=== VERIFIKASI TiDB CLOUD ===')
    console.log('Active DB :', ver.db)
    console.log('Version   :', ver.version)
    console.log('Databases :', dbs.map(r => Object.values(r)[0]).join(', '))
    console.log('Tables    :', tables.map(r => Object.values(r)[0]).join(', '))
    console.log(`Row counts: users=${uCnt.cnt}, items=${iCnt.cnt}, bookings=${bCnt.cnt}`)
  }
  finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error('TiDB Init Error:', err)
  process.exit(1)
})
