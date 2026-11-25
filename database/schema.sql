-- =============================================================================
-- SewaIn+ Database Schema for TiDB Cloud (MySQL-compatible)
-- Database: sewain_db (dedicated project database, separate from sys & test)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `sewain_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `sewain_db`;

-- -----------------------------------------------------------------------------
-- 1. Users Table (Accounts: Admin Butik & Penyewa)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `avatar_initials` VARCHAR(10) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Items Table (Catalog: Kebaya Wisuda, Gaun Pesta, Jas Pria, High Heels, Pantofel)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `items` (
  `id` VARCHAR(100) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` ENUM('Kebaya Wisuda', 'Gaun Pesta', 'Jas Pria', 'High Heels', 'Sepatu Pantofel') NOT NULL,
  `location` VARCHAR(120) NOT NULL,
  `price_per_day` INT NOT NULL,
  `deposit` INT NOT NULL DEFAULT 0,
  `rating` DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
  `review_count` INT NOT NULL DEFAULT 0,
  `status` ENUM('Tersedia', 'Sedang Disewa') NOT NULL DEFAULT 'Tersedia',
  `sizes_json` JSON NOT NULL,
  `colors_json` JSON NULL,
  `image_url` VARCHAR(500) NOT NULL,
  `gallery_json` JSON NOT NULL,
  `description` TEXT NOT NULL,
  `specs_json` JSON NOT NULL,
  `owner_json` JSON NOT NULL,
  `created_at` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_items_category` (`category`),
  KEY `idx_items_location` (`location`),
  KEY `idx_items_status` (`status`),
  KEY `idx_items_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Bookings Table (Rental Transactions, Payment & Identity Guarantee)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NULL,
  `item_id` VARCHAR(100) NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `item_category` VARCHAR(64) NOT NULL,
  `item_location` VARCHAR(120) NOT NULL,
  `item_image_url` VARCHAR(500) NOT NULL,
  `owner_name` VARCHAR(150) NOT NULL,
  `renter_name` VARCHAR(150) NOT NULL,
  `renter_phone` VARCHAR(50) NOT NULL,
  `selected_size` VARCHAR(32) NOT NULL,
  `selected_color` VARCHAR(64) NULL,
  `start_date` CHAR(10) NOT NULL,
  `end_date` CHAR(10) NOT NULL,
  `duration_days` INT NOT NULL,
  `price_per_day` INT NOT NULL,
  `subtotal` INT NOT NULL,
  `deposit` INT NOT NULL DEFAULT 0,
  `delivery_option` ENUM('ambil_sendiri', 'kurir_antar') NOT NULL DEFAULT 'ambil_sendiri',
  `delivery_fee` INT NOT NULL DEFAULT 0,
  `total_price` INT NOT NULL,
  `status` ENUM('aktif', 'selesai', 'dibatalkan') NOT NULL DEFAULT 'aktif',
  `payment_method` ENUM('cash', 'transfer_bca', 'transfer_mandiri', 'qris', 'gopay') NOT NULL DEFAULT 'transfer_bca',
  `payment_status` ENUM('belum_bayar', 'bayar_ditempat', 'terverifikasi') NOT NULL DEFAULT 'belum_bayar',
  `payment_channel` VARCHAR(64) NULL,
  `payment_reference` VARCHAR(100) NULL,
  `payment_paid_at` VARCHAR(40) NULL,
  `guarantee_type` ENUM('ktp', 'sim', 'ktm', 'kk_paspor') NOT NULL DEFAULT 'ktp',
  `guarantee_number` VARCHAR(100) NULL,
  `guarantee_status` ENUM('menunggu_serah', 'dititipkan', 'dikembalikan') NOT NULL DEFAULT 'menunggu_serah',
  `deposit_status` ENUM('ditahan', 'menunggu_pengembalian', 'dikembalikan', 'dipotong') NOT NULL DEFAULT 'ditahan',
  `deposit_refund_method` VARCHAR(40) NULL,
  `deposit_refund_account` VARCHAR(191) NULL,
  `deposit_refund_amount` INT NULL,
  `deposit_deduction` INT NOT NULL DEFAULT 0,
  `deposit_refund_reference` VARCHAR(100) NULL,
  `deposit_refund_note` TEXT NULL,
  `deposit_refunded_at` VARCHAR(40) NULL,
  `notes` TEXT NULL,
  `created_at` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bookings_user_id` (`user_id`),
  KEY `idx_bookings_item_id` (`item_id`),
  KEY `idx_bookings_status_dates` (`status`, `start_date`, `end_date`),
  KEY `idx_bookings_created_at` (`created_at`),
  CONSTRAINT `fk_bookings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Notifications Table (In-App Notifications for Admin & Penyewa)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NULL,
  `recipient_role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `type` VARCHAR(40) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `booking_id` VARCHAR(64) NULL,
  `action_url` VARCHAR(255) NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`, `is_read`, `created_at`),
  KEY `idx_notifications_role` (`recipient_role`, `is_read`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
