import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import mysql, { type Pool, type PoolOptions, type RowDataPacket } from 'mysql2/promise'
import type { StoredUser, UserRole } from '#shared/types/auth'
import type {
  BookingRecord,
  BookingStatus,
  DeliveryOption,
  DepositRefundMethod,
  DepositStatus,
  GuaranteeStatus,
  GuaranteeType,
  HandoverStatus,
  ItemColorVariant,
  ItemOwner,
  ItemSpec,
  ItemStatus,
  NotificationRecord,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  RentalCategory,
  RentalItem,
} from '#shared/types/rental'
import { createSeedData, getTodayDateIso } from './store'

interface TidbConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  caPath: string
}

interface UserRow extends RowDataPacket {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  avatar_initials: string
  password_hash: string
  created_at: string
}

interface ItemRow extends RowDataPacket {
  id: string
  name: string
  category: RentalCategory
  location: string
  price_per_day: number
  deposit: number
  rating: number | string
  review_count: number
  status: ItemStatus
  sizes_json: unknown
  colors_json: unknown
  image_url: string
  gallery_json: unknown
  description: string
  specs_json: unknown
  owner_json: unknown
  created_at: string
}

interface BookingRow extends RowDataPacket {
  id: string
  user_id: string | null
  item_id: string
  item_name: string
  item_category: RentalCategory
  item_location: string
  item_image_url: string
  owner_name: string
  renter_name: string
  renter_phone: string
  selected_size: string
  selected_color: string | null
  start_date: string
  end_date: string
  duration_days: number
  price_per_day: number
  subtotal: number
  deposit: number
  delivery_option: DeliveryOption
  delivery_fee: number
  total_price: number
  status: BookingStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  payment_channel: string | null
  payment_reference: string | null
  payment_paid_at: string | null
  guarantee_type: GuaranteeType
  guarantee_number: string | null
  guarantee_status: GuaranteeStatus
  handover_status: HandoverStatus | null
  handover_recipient: string | null
  handover_confirmed_at: string | null
  deposit_status: DepositStatus | null
  deposit_refund_method: DepositRefundMethod | null
  deposit_refund_account: string | null
  deposit_refund_amount: number | null
  deposit_deduction: number | null
  deposit_refund_reference: string | null
  deposit_refund_note: string | null
  deposit_refunded_at: string | null
  notes: string | null
  created_at: string
}

interface NotificationRow extends RowDataPacket {
  id: string
  user_id: string | null
  recipient_role: UserRole
  type: NotificationType
  title: string
  message: string
  booking_id: string | null
  action_url: string | null
  is_read: number
  created_at: string
}

function getTidbConfig(): TidbConfig {
  const host = (process.env.TIDB_HOST || '').trim()
  const port = Number((process.env.TIDB_PORT || '4000').trim())
  const user = (process.env.TIDB_USER || '').trim()
  const password = (process.env.TIDB_PASSWORD || '').trim()
  const database = (process.env.TIDB_DATABASE || 'sewain_db').trim().replace(/[^a-zA-Z0-9_]/g, '')
  const caPath = (process.env.TIDB_CA_PATH || '').trim()

  if (!host || !user || !password || !database) {
    const missing = [
      !host ? 'TIDB_HOST' : null,
      !user ? 'TIDB_USER' : null,
      !password ? 'TIDB_PASSWORD' : null,
      !database ? 'TIDB_DATABASE' : null,
    ].filter(Boolean)
    throw new Error(
      `Konfigurasi TiDB belum lengkap (${missing.join(', ')} belum diatur di environment variables).`,
    )
  }

  return { host, port, user, password, database, caPath }
}

function buildSslOptions(caPath: string): PoolOptions['ssl'] {
  if (caPath && existsSync(caPath)) {
    return {
      minVersion: 'TLSv1.2',
      ca: readFileSync(caPath, 'utf-8'),
      rejectUnauthorized: true,
    }
  }
  return {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  }
}

function parseJsonColumn<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T
    }
    catch {
      return fallback
    }
  }
  return raw as T
}

function mapUserRow(row: UserRow): StoredUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    avatarInitials: row.avatar_initials,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  }
}

function mapItemRow(row: ItemRow): RentalItem {
  const colors = parseJsonColumn<ItemColorVariant[] | null>(row.colors_json, null)
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    location: row.location,
    pricePerDay: Number(row.price_per_day),
    deposit: Number(row.deposit),
    rating: Number(row.rating),
    reviewCount: Number(row.review_count),
    status: row.status,
    sizes: parseJsonColumn<string[]>(row.sizes_json, ['All Size']),
    ...(colors && colors.length > 0 ? { colors } : {}),
    imageUrl: row.image_url,
    gallery: parseJsonColumn<string[]>(row.gallery_json, [row.image_url]),
    description: row.description,
    specs: parseJsonColumn<ItemSpec[]>(row.specs_json, []),
    owner: parseJsonColumn<ItemOwner>(row.owner_json, {
      name: 'Seruni Atelier',
      city: row.location,
      verified: true,
      joinedYear: 2024,
      responseRate: 100,
      totalRentals: 1,
      avatarInitials: 'SW',
    }),
    createdAt: row.created_at,
  }
}

function mapBookingRow(row: BookingRow): BookingRecord {
  return {
    id: row.id,
    ...(row.user_id ? { userId: row.user_id } : {}),
    itemId: row.item_id,
    itemName: row.item_name,
    itemCategory: row.item_category,
    itemLocation: row.item_location,
    itemImageUrl: row.item_image_url,
    ownerName: row.owner_name,
    renterName: row.renter_name,
    renterPhone: row.renter_phone,
    selectedSize: row.selected_size,
    ...(row.selected_color ? { selectedColor: row.selected_color } : {}),
    startDate: row.start_date,
    endDate: row.end_date,
    durationDays: Number(row.duration_days),
    pricePerDay: Number(row.price_per_day),
    subtotal: Number(row.subtotal),
    deposit: Number(row.deposit),
    deliveryOption: row.delivery_option,
    deliveryFee: Number(row.delivery_fee),
    totalPrice: Number(row.total_price),
    status: row.status,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    ...(row.payment_channel ? { paymentChannel: row.payment_channel } : {}),
    ...(row.payment_reference ? { paymentReference: row.payment_reference } : {}),
    ...(row.payment_paid_at ? { paymentPaidAt: row.payment_paid_at } : {}),
    guaranteeType: row.guarantee_type,
    ...(row.guarantee_number ? { guaranteeNumber: row.guarantee_number } : {}),
    guaranteeStatus: row.guarantee_status,
    handoverStatus: row.handover_status ?? 'belum_diterima',
    ...(row.handover_recipient ? { handoverRecipient: row.handover_recipient } : {}),
    ...(row.handover_confirmed_at ? { handoverConfirmedAt: row.handover_confirmed_at } : {}),
    depositStatus: row.deposit_status ?? (row.status === 'selesai' ? 'dikembalikan' : 'ditahan'),
    ...(row.deposit_refund_method ? { depositRefundMethod: row.deposit_refund_method } : {}),
    ...(row.deposit_refund_account ? { depositRefundAccount: row.deposit_refund_account } : {}),
    ...(row.deposit_refund_amount !== null && row.deposit_refund_amount !== undefined
      ? { depositRefundAmount: Number(row.deposit_refund_amount) }
      : {}),
    depositDeduction: Number(row.deposit_deduction ?? 0),
    ...(row.deposit_refund_reference ? { depositRefundReference: row.deposit_refund_reference } : {}),
    ...(row.deposit_refund_note ? { depositRefundNote: row.deposit_refund_note } : {}),
    ...(row.deposit_refunded_at ? { depositRefundedAt: row.deposit_refunded_at } : {}),
    ...(row.notes ? { notes: row.notes } : {}),
    createdAt: row.created_at,
  }
}

function mapNotificationRow(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    ...(row.user_id ? { userId: row.user_id } : {}),
    recipientRole: row.recipient_role,
    type: row.type,
    title: row.title,
    message: row.message,
    ...(row.booking_id ? { bookingId: row.booking_id } : {}),
    ...(row.action_url ? { actionUrl: row.action_url } : {}),
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  }
}

let poolInstance: Pool | null = null
let initPromise: Promise<Pool> | null = null

async function initializeSchemaAndSeed(): Promise<Pool> {
  const cfg = getTidbConfig()
  const ssl = buildSslOptions(cfg.caPath)

  const createAppPool = () =>
    mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      ssl,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      decimalNumbers: true,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 20000,
    })

  // Fast-path for Vercel Serverless cold starts: if DB, tables, deposit columns, and data already exist,
  // skip all DDL/migration round-trips and connect in 1 query.
  let pool = createAppPool()
  try {
    const [probeRows] = await pool.query<RowDataPacket[]>(
      `SELECT
        (SELECT COUNT(*) FROM users) AS users_cnt,
        (SELECT COUNT(*) FROM items) AS items_cnt,
        (SELECT deposit_status FROM bookings LIMIT 1) AS dep_col,
        (SELECT handover_status FROM bookings LIMIT 1) AS handover_col,
        (SELECT COUNT(*) FROM notifications) AS notif_cnt,
        (SELECT COUNT(*) FROM uploaded_files) AS files_cnt`,
    )
    const usersCnt = Number(probeRows[0]?.users_cnt || 0)
    const itemsCnt = Number(probeRows[0]?.items_cnt || 0)
    if (usersCnt > 0 && itemsCnt > 0) {
      poolInstance = pool
      return pool
    }
  }
  catch {
    // Database, table, or deposit_* columns missing — fall back to full bootstrap below
    await pool.end().catch(() => {})

    // Step 1: Ensure dedicated project database (e.g. sewain_db) exists outside sys & test
    const bootstrapConn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      ssl,
      connectTimeout: 20000,
    })
    try {
      await bootstrapConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      )
    }
    finally {
      await bootstrapConn.end()
    }

    // Step 2: Recreate pooled connection bound to sewain_db
    pool = createAppPool()
  }

  // Step 3: Create tables if not exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) NOT NULL,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(191) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      avatar_initials VARCHAR(10) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at VARCHAR(40) NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      category ENUM('Kebaya Wisuda', 'Gaun Pesta', 'Jas Pria', 'High Heels', 'Sepatu Pantofel') NOT NULL,
      location VARCHAR(120) NOT NULL,
      price_per_day INT NOT NULL,
      deposit INT NOT NULL DEFAULT 0,
      rating DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
      review_count INT NOT NULL DEFAULT 0,
      status ENUM('Tersedia', 'Sedang Disewa') NOT NULL DEFAULT 'Tersedia',
      sizes_json JSON NOT NULL,
      colors_json JSON NULL,
      image_url VARCHAR(500) NOT NULL,
      gallery_json JSON NOT NULL,
      description TEXT NOT NULL,
      specs_json JSON NOT NULL,
      owner_json JSON NOT NULL,
      created_at VARCHAR(40) NOT NULL,
      PRIMARY KEY (id),
      KEY idx_items_category (category),
      KEY idx_items_location (location),
      KEY idx_items_status (status),
      KEY idx_items_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NULL,
      item_id VARCHAR(100) NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      item_category VARCHAR(64) NOT NULL,
      item_location VARCHAR(120) NOT NULL,
      item_image_url VARCHAR(500) NOT NULL,
      owner_name VARCHAR(150) NOT NULL,
      renter_name VARCHAR(150) NOT NULL,
      renter_phone VARCHAR(50) NOT NULL,
      selected_size VARCHAR(32) NOT NULL,
      selected_color VARCHAR(64) NULL,
      start_date CHAR(10) NOT NULL,
      end_date CHAR(10) NOT NULL,
      duration_days INT NOT NULL,
      price_per_day INT NOT NULL,
      subtotal INT NOT NULL,
      deposit INT NOT NULL DEFAULT 0,
      delivery_option ENUM('ambil_sendiri', 'kurir_antar') NOT NULL DEFAULT 'ambil_sendiri',
      delivery_fee INT NOT NULL DEFAULT 0,
      total_price INT NOT NULL,
      status ENUM('aktif', 'selesai', 'dibatalkan') NOT NULL DEFAULT 'aktif',
      payment_method ENUM('cash', 'transfer_bca', 'transfer_mandiri', 'qris', 'gopay') NOT NULL DEFAULT 'transfer_bca',
      payment_status ENUM('belum_bayar', 'bayar_ditempat', 'terverifikasi') NOT NULL DEFAULT 'belum_bayar',
      payment_channel VARCHAR(64) NULL,
      payment_reference VARCHAR(100) NULL,
      payment_paid_at VARCHAR(40) NULL,
      guarantee_type ENUM('ktp', 'sim', 'ktm', 'kk_paspor') NOT NULL DEFAULT 'ktp',
      guarantee_number VARCHAR(100) NULL,
      guarantee_status ENUM('menunggu_serah', 'dititipkan', 'dikembalikan') NOT NULL DEFAULT 'menunggu_serah',
      handover_status ENUM('belum_diterima', 'diterima') NOT NULL DEFAULT 'belum_diterima',
      handover_recipient VARCHAR(150) NULL,
      handover_confirmed_at VARCHAR(40) NULL,
      deposit_status ENUM('ditahan', 'menunggu_pengembalian', 'dikembalikan', 'dipotong') NOT NULL DEFAULT 'ditahan',
      deposit_refund_method VARCHAR(40) NULL,
      deposit_refund_account VARCHAR(191) NULL,
      deposit_refund_amount INT NULL,
      deposit_deduction INT NOT NULL DEFAULT 0,
      deposit_refund_reference VARCHAR(100) NULL,
      deposit_refund_note TEXT NULL,
      deposit_refunded_at VARCHAR(40) NULL,
      notes TEXT NULL,
      created_at VARCHAR(40) NOT NULL,
      PRIMARY KEY (id),
      KEY idx_bookings_user_id (user_id),
      KEY idx_bookings_item_id (item_id),
      KEY idx_bookings_status_dates (status, start_date, end_date),
      KEY idx_bookings_created_at (created_at),
      CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // Ensure deposit refund columns exist on pre-existing bookings tables in TiDB
  const depositAlterStmts = [
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS handover_status ENUM('belum_diterima', 'diterima') NOT NULL DEFAULT 'belum_diterima'`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS handover_recipient VARCHAR(150) NULL`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS handover_confirmed_at VARCHAR(40) NULL`,
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
    await pool.query(stmt)
  }
  await pool.query(
    `UPDATE bookings
     SET deposit_status = 'dikembalikan',
         deposit_refund_amount = deposit,
         deposit_refund_method = COALESCE(deposit_refund_method, 'cash'),
         deposit_refund_note = COALESCE(deposit_refund_note, 'Busana kembali bersih & utuh, deposit dikembalikan 100%'),
         deposit_refunded_at = COALESCE(deposit_refunded_at, created_at)
     WHERE status = 'selesai' AND deposit_status = 'ditahan' AND deposit_refunded_at IS NULL`,
  )

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NULL,
      recipient_role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      type VARCHAR(40) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      booking_id VARCHAR(64) NULL,
      action_url VARCHAR(255) NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at VARCHAR(40) NOT NULL,
      PRIMARY KEY (id),
      KEY idx_notifications_user (user_id, is_read, created_at),
      KEY idx_notifications_role (recipient_role, is_read, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id VARCHAR(80) NOT NULL,
      folder VARCHAR(32) NOT NULL,
      mime_type VARCHAR(64) NOT NULL,
      data_base64 MEDIUMTEXT NOT NULL,
      size_bytes INT NOT NULL,
      created_at VARCHAR(40) NOT NULL,
      PRIMARY KEY (id),
      KEY idx_uploaded_files_folder (folder, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // Step 4: Auto-seed / migrate from local JSON once if tables are empty
  const [userCountRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM users')
  const [itemCountRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM items')
  const userCount = Number(userCountRows[0]?.cnt || 0)
  const itemCount = Number(itemCountRows[0]?.cnt || 0)

  if (userCount === 0 && itemCount === 0) {
    let initialData = createSeedData()
    const legacyPath = resolve(process.cwd(), '.data', 'sewain-db.json')
    if (existsSync(legacyPath)) {
      try {
        const parsed = JSON.parse(readFileSync(legacyPath, 'utf-8')) as {
          users?: StoredUser[]
          items?: RentalItem[]
          bookings?: BookingRecord[]
        }
        if (Array.isArray(parsed.users) && parsed.users.length > 0 && Array.isArray(parsed.items) && parsed.items.length > 0) {
          initialData = {
            users: parsed.users,
            items: parsed.items,
            bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
          }
        }
      }
      catch {
        // Fallback to createSeedData()
      }
    }

    for (const u of initialData.users) {
      await pool.execute(
        `INSERT IGNORE INTO users (id, name, email, phone, role, avatar_initials, password_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.name, u.email.toLowerCase(), u.phone, u.role, u.avatarInitials, u.passwordHash, u.createdAt],
      )
    }

    for (const item of initialData.items) {
      await pool.execute(
        `INSERT IGNORE INTO items (
           id, name, category, location, price_per_day, deposit, rating, review_count,
           status, sizes_json, colors_json, image_url, gallery_json, description,
           specs_json, owner_json, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    const validUserIds = new Set(initialData.users.map(u => u.id))
    for (const b of initialData.bookings) {
      const safeUserId = b.userId && validUserIds.has(b.userId) ? b.userId : null
      await pool.execute(
        `INSERT IGNORE INTO bookings (
           id, user_id, item_id, item_name, item_category, item_location, item_image_url,
           owner_name, renter_name, renter_phone, selected_size, selected_color,
           start_date, end_date, duration_days, price_per_day, subtotal, deposit,
           delivery_option, delivery_fee, total_price, status, payment_method,
           payment_status, payment_channel, payment_reference, payment_paid_at,
           guarantee_type, guarantee_number, guarantee_status, notes, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  poolInstance = pool
  return pool
}

export async function getDbPool(): Promise<Pool> {
  if (poolInstance) return poolInstance
  if (!initPromise) {
    initPromise = initializeSchemaAndSeed().catch((err) => {
      initPromise = null
      throw err
    })
  }
  return initPromise
}

// =============================================================================
// Users Repository
// =============================================================================
export async function findUserById(id: string): Promise<StoredUser | null> {
  const pool = await getDbPool()
  const [rows] = await pool.execute<UserRow[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id])
  return rows[0] ? mapUserRow(rows[0]) : null
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const pool = await getDbPool()
  const [rows] = await pool.execute<UserRow[]>(
    'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
    [email.trim()],
  )
  return rows[0] ? mapUserRow(rows[0]) : null
}

export async function insertUser(user: StoredUser): Promise<void> {
  const pool = await getDbPool()
  await pool.execute(
    `INSERT INTO users (id, name, email, phone, role, avatar_initials, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.name,
      user.email.toLowerCase(),
      user.phone,
      user.role,
      user.avatarInitials,
      user.passwordHash,
      user.createdAt,
    ],
  )
}

// =============================================================================
// Items Repository
// =============================================================================
export async function syncAllItemStatusesInDb(): Promise<void> {
  const pool = await getDbPool()
  const today = getTodayDateIso()
  await pool.execute(
    `UPDATE items i
     SET i.status = CASE
       WHEN EXISTS (
         SELECT 1 FROM bookings b
         WHERE b.item_id = i.id
           AND b.status = 'aktif'
           AND b.start_date <= ?
           AND b.end_date >= ?
       ) THEN 'Sedang Disewa'
       ELSE 'Tersedia'
     END`,
    [today, today],
  )
}

export async function syncItemStatusInDb(itemId: string): Promise<ItemStatus> {
  const pool = await getDbPool()
  const today = getTodayDateIso()
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 FROM bookings
     WHERE item_id = ? AND status = 'aktif' AND start_date <= ? AND end_date >= ?
     LIMIT 1`,
    [itemId, today, today],
  )
  const nextStatus: ItemStatus = rows.length > 0 ? 'Sedang Disewa' : 'Tersedia'
  await pool.execute('UPDATE items SET status = ? WHERE id = ?', [nextStatus, itemId])
  return nextStatus
}

export async function listAllItems(): Promise<RentalItem[]> {
  const pool = await getDbPool()
  const [rows] = await pool.query<ItemRow[]>('SELECT * FROM items ORDER BY created_at DESC')
  return rows.map(mapItemRow)
}

export async function findItemById(id: string): Promise<RentalItem | null> {
  const pool = await getDbPool()
  const [rows] = await pool.execute<ItemRow[]>('SELECT * FROM items WHERE id = ? LIMIT 1', [id])
  return rows[0] ? mapItemRow(rows[0]) : null
}

export async function insertItem(item: RentalItem): Promise<void> {
  const pool = await getDbPool()
  await pool.execute(
    `INSERT INTO items (
       id, name, category, location, price_per_day, deposit, rating, review_count,
       status, sizes_json, colors_json, image_url, gallery_json, description,
       specs_json, owner_json, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

export async function updateItem(item: RentalItem): Promise<void> {
  const pool = await getDbPool()
  await pool.execute(
    `UPDATE items
     SET name = ?, location = ?, price_per_day = ?, deposit = ?, status = ?, sizes_json = ?, image_url = ?, gallery_json = ?
     WHERE id = ?`,
    [
      item.name,
      item.location,
      item.pricePerDay,
      item.deposit,
      item.status,
      JSON.stringify(item.sizes),
      item.imageUrl,
      JSON.stringify(item.gallery),
      item.id,
    ],
  )
}

export async function deleteItemById(id: string): Promise<boolean> {
  const pool = await getDbPool()
  const [result] = await pool.execute<mysql.ResultSetHeader>('DELETE FROM items WHERE id = ?', [id])
  return result.affectedRows > 0
}

// =============================================================================
// Bookings Repository
// =============================================================================
export async function listAllBookings(): Promise<BookingRecord[]> {
  const pool = await getDbPool()
  const [rows] = await pool.query<BookingRow[]>('SELECT * FROM bookings ORDER BY created_at DESC')
  return rows.map(mapBookingRow)
}

export async function listBookingsByUserId(userId: string): Promise<BookingRecord[]> {
  const pool = await getDbPool()
  const [rows] = await pool.execute<BookingRow[]>(
    'SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  )
  return rows.map(mapBookingRow)
}

export async function listActiveBookingsByItemId(itemId: string): Promise<BookingRecord[]> {
  const pool = await getDbPool()
  const [rows] = await pool.execute<BookingRow[]>(
    `SELECT * FROM bookings
     WHERE item_id = ? AND status = 'aktif'
     ORDER BY start_date ASC`,
    [itemId],
  )
  return rows.map(mapBookingRow)
}

export async function listActiveBookings(): Promise<BookingRecord[]> {
  const pool = await getDbPool()
  const [rows] = await pool.query<BookingRow[]>(
    `SELECT * FROM bookings WHERE status = 'aktif'`,
  )
  return rows.map(mapBookingRow)
}

export async function findBookingById(id: string): Promise<BookingRecord | null> {
  const pool = await getDbPool()
  const [rows] = await pool.execute<BookingRow[]>('SELECT * FROM bookings WHERE id = ? LIMIT 1', [id])
  return rows[0] ? mapBookingRow(rows[0]) : null
}

export async function countAllBookings(): Promise<number> {
  const pool = await getDbPool()
  const [rows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM bookings')
  return Number(rows[0]?.cnt || 0)
}

export async function insertBooking(b: BookingRecord): Promise<void> {
  const pool = await getDbPool()
  await pool.execute(
    `INSERT INTO bookings (
       id, user_id, item_id, item_name, item_category, item_location, item_image_url,
       owner_name, renter_name, renter_phone, selected_size, selected_color,
       start_date, end_date, duration_days, price_per_day, subtotal, deposit,
       delivery_option, delivery_fee, total_price, status, payment_method,
       payment_status, payment_channel, payment_reference, payment_paid_at,
       guarantee_type, guarantee_number, guarantee_status,
       handover_status, handover_recipient, handover_confirmed_at,
       deposit_status, deposit_refund_method, deposit_refund_account,
       deposit_refund_amount, deposit_deduction, deposit_refund_reference,
       deposit_refund_note, deposit_refunded_at, notes, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      b.id,
      b.userId ?? null,
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
      b.handoverStatus ?? 'belum_diterima',
      b.handoverRecipient ?? null,
      b.handoverConfirmedAt ?? null,
      b.depositStatus ?? 'ditahan',
      b.depositRefundMethod ?? null,
      b.depositRefundAccount ?? null,
      b.depositRefundAmount ?? null,
      b.depositDeduction ?? 0,
      b.depositRefundReference ?? null,
      b.depositRefundNote ?? null,
      b.depositRefundedAt ?? null,
      b.notes ?? null,
      b.createdAt,
    ],
  )
  await syncItemStatusInDb(b.itemId)
}

export async function updateBooking(b: BookingRecord): Promise<void> {
  const pool = await getDbPool()
  await pool.execute(
    `UPDATE bookings
     SET status = ?,
         payment_method = ?,
         payment_status = ?,
         payment_channel = ?,
         payment_reference = ?,
         payment_paid_at = ?,
         guarantee_type = ?,
         guarantee_number = ?,
         guarantee_status = ?,
         handover_status = ?,
         handover_recipient = ?,
         handover_confirmed_at = ?,
         deposit_status = ?,
         deposit_refund_method = ?,
         deposit_refund_account = ?,
         deposit_refund_amount = ?,
         deposit_deduction = ?,
         deposit_refund_reference = ?,
         deposit_refund_note = ?,
         deposit_refunded_at = ?
     WHERE id = ?`,
    [
      b.status,
      b.paymentMethod,
      b.paymentStatus,
      b.paymentChannel ?? null,
      b.paymentReference ?? null,
      b.paymentPaidAt ?? null,
      b.guaranteeType,
      b.guaranteeNumber ?? null,
      b.guaranteeStatus,
      b.handoverStatus ?? 'belum_diterima',
      b.handoverRecipient ?? null,
      b.handoverConfirmedAt ?? null,
      b.depositStatus ?? 'ditahan',
      b.depositRefundMethod ?? null,
      b.depositRefundAccount ?? null,
      b.depositRefundAmount ?? null,
      b.depositDeduction ?? 0,
      b.depositRefundReference ?? null,
      b.depositRefundNote ?? null,
      b.depositRefundedAt ?? null,
      b.id,
    ],
  )
  await syncItemStatusInDb(b.itemId)
}

// =============================================================================
// Notifications Repository
// =============================================================================
export interface CreateNotificationInput {
  userId?: string
  recipientRole: UserRole
  type: NotificationType
  title: string
  message: string
  bookingId?: string
  actionUrl?: string
}

export async function createNotification(input: CreateNotificationInput): Promise<NotificationRecord> {
  const pool = await getDbPool()
  const record: NotificationRecord = {
    id: `NTF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    ...(input.userId ? { userId: input.userId } : {}),
    recipientRole: input.recipientRole,
    type: input.type,
    title: input.title.slice(0, 200),
    message: input.message,
    ...(input.bookingId ? { bookingId: input.bookingId } : {}),
    ...(input.actionUrl ? { actionUrl: input.actionUrl } : {}),
    isRead: false,
    createdAt: new Date().toISOString(),
  }

  await pool.execute(
    `INSERT INTO notifications (
       id, user_id, recipient_role, type, title, message, booking_id, action_url, is_read, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.userId ?? null,
      record.recipientRole,
      record.type,
      record.title,
      record.message,
      record.bookingId ?? null,
      record.actionUrl ?? null,
      0,
      record.createdAt,
    ],
  )
  return record
}

export async function listNotificationsForUser(
  userId: string,
  role: UserRole,
  limit = 30,
): Promise<{ notifications: NotificationRecord[], unreadCount: number }> {
  const pool = await getDbPool()
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)))

  if (role === 'admin') {
    const [rows] = await pool.query<NotificationRow[]>(
      `SELECT * FROM notifications
       WHERE recipient_role = 'admin' OR user_id = ?
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`,
      [userId],
    )
    const [cntRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM notifications
       WHERE (recipient_role = 'admin' OR user_id = ?) AND is_read = 0`,
      [userId],
    )
    return {
      notifications: rows.map(mapNotificationRow),
      unreadCount: Number(cntRows[0]?.cnt || 0),
    }
  }

  const [rows] = await pool.query<NotificationRow[]>(
    `SELECT * FROM notifications
     WHERE recipient_role = 'user' AND user_id = ?
     ORDER BY created_at DESC
     LIMIT ${safeLimit}`,
    [userId],
  )
  const [cntRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM notifications
     WHERE recipient_role = 'user' AND user_id = ? AND is_read = 0`,
    [userId],
  )
  return {
    notifications: rows.map(mapNotificationRow),
    unreadCount: Number(cntRows[0]?.cnt || 0),
  }
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
  role: UserRole,
): Promise<boolean> {
  const pool = await getDbPool()
  if (role === 'admin') {
    const [result] = await pool.execute<mysql.ResultSetHeader>(
      `UPDATE notifications SET is_read = 1
       WHERE id = ? AND (recipient_role = 'admin' OR user_id = ?)`,
      [notificationId, userId],
    )
    return result.affectedRows > 0
  }
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `UPDATE notifications SET is_read = 1
     WHERE id = ? AND recipient_role = 'user' AND user_id = ?`,
    [notificationId, userId],
  )
  return result.affectedRows > 0
}

export async function markAllNotificationsRead(userId: string, role: UserRole): Promise<number> {
  const pool = await getDbPool()
  if (role === 'admin') {
    const [result] = await pool.execute<mysql.ResultSetHeader>(
      `UPDATE notifications SET is_read = 1
       WHERE (recipient_role = 'admin' OR user_id = ?) AND is_read = 0`,
      [userId],
    )
    return result.affectedRows
  }
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `UPDATE notifications SET is_read = 1
     WHERE recipient_role = 'user' AND user_id = ? AND is_read = 0`,
    [userId],
  )
  return result.affectedRows
}

// =============================================================================
// Uploaded Files Repository (Persistent Image Storage for Vercel Serverless)
// =============================================================================
interface UploadedFileRow extends RowDataPacket {
  id: string
  folder: string
  mime_type: string
  data_base64: string
  size_bytes: number
  created_at: string
}

export async function insertUploadedFile(input: {
  id: string
  folder: string
  mimeType: string
  data: Buffer
}): Promise<void> {
  const pool = await getDbPool()
  await pool.execute(
    `INSERT INTO uploaded_files (id, folder, mime_type, data_base64, size_bytes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.folder,
      input.mimeType,
      input.data.toString('base64'),
      input.data.length,
      new Date().toISOString(),
    ],
  )
}

export async function findUploadedFileById(id: string): Promise<{
  id: string
  mimeType: string
  data: Buffer
} | null> {
  const pool = await getDbPool()
  const [rows] = await pool.execute<UploadedFileRow[]>(
    'SELECT id, mime_type, data_base64 FROM uploaded_files WHERE id = ? LIMIT 1',
    [id],
  )
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    mimeType: row.mime_type,
    data: Buffer.from(row.data_base64, 'base64'),
  }
}

export async function getDbHealthInfo() {
  const pool = await getDbPool()
  const [metaRows] = await pool.query<RowDataPacket[]>('SELECT DATABASE() AS db_name, VERSION() AS db_version')
  const [dbListRows] = await pool.query<RowDataPacket[]>('SHOW DATABASES')
  const [tableRows] = await pool.query<RowDataPacket[]>('SHOW TABLES')
  const [uCnt] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM users')
  const [iCnt] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM items')
  const [bCnt] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM bookings')
  const [nCnt] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM notifications')

  return {
    connected: true,
    database: String(metaRows[0]?.db_name || ''),
    version: String(metaRows[0]?.db_version || ''),
    databases: dbListRows.map(r => String(Object.values(r)[0])),
    tables: tableRows.map(r => String(Object.values(r)[0])),
    counts: {
      users: Number(uCnt[0]?.cnt || 0),
      items: Number(iCnt[0]?.cnt || 0),
      bookings: Number(bCnt[0]?.cnt || 0),
      notifications: Number(nCnt[0]?.cnt || 0),
    },
  }
}
