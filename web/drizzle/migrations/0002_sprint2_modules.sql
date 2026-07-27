-- Sprint 2: Sales, Marketing, Customer Service, E-Commerce tables
-- Run: mysql -u root < 0002_sprint2_modules.sql

-- ─── SALES ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `sales_targets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_id` int NOT NULL,
  `user_id` int NOT NULL,
  `target_amount` decimal(15,2) NOT NULL,
  `period_month` tinyint NOT NULL,
  `period_year` int NOT NULL,
  `komisi_percent` decimal(5,2) DEFAULT '0.00',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_targets_unit` (`unit_id`),
  CONSTRAINT `fk_st_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_st_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `quotations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_number` varchar(100) NOT NULL UNIQUE,
  `unit_id` int NOT NULL,
  `customer_id` int DEFAULT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `status` enum('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED') DEFAULT 'DRAFT',
  `valid_until` date NOT NULL,
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_quotations_unit` (`unit_id`),
  CONSTRAINT `fk_q_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_q_customer` FOREIGN KEY (`customer_id`) REFERENCES `crm_contacts`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `quotation_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_id` int NOT NULL,
  `product_id` varchar(50) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL DEFAULT '',
  `qty` int NOT NULL,
  `price` decimal(15,2) NOT NULL,
  `total` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_qi_quotation` (`quotation_id`),
  CONSTRAINT `fk_qi_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sales_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(100) NOT NULL UNIQUE,
  `unit_id` int NOT NULL,
  `customer_id` int DEFAULT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `status` enum('DRAFT','PENDING','PROCESSING','SHIPPED','CLOSED','CANCELLED') DEFAULT 'PENDING',
  `notes` text,
  `receivable_id` int DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_so_unit` (`unit_id`),
  CONSTRAINT `fk_so_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_so_customer` FOREIGN KEY (`customer_id`) REFERENCES `crm_contacts`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sales_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sales_order_id` int NOT NULL,
  `product_id` varchar(50) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL DEFAULT '',
  `qty` int NOT NULL,
  `price` decimal(15,2) NOT NULL,
  `total` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_soi_order` (`sales_order_id`),
  CONSTRAINT `fk_soi_order` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sales_commissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_id` int NOT NULL,
  `sales_order_id` int NOT NULL,
  `user_id` int NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `status` enum('UNPAID','PAID') DEFAULT 'UNPAID',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sc_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── MARKETING ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `marketing_campaigns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_id` int NOT NULL,
  `name` varchar(150) NOT NULL,
  `type` enum('EMAIL','WA','AD_TRACKER') NOT NULL,
  `status` enum('DRAFT','SCHEDULED','ACTIVE','COMPLETED') DEFAULT 'DRAFT',
  `budget` decimal(15,2) DEFAULT '0.00',
  `compose_subject` varchar(255) DEFAULT NULL,
  `compose_text` text,
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mc_unit` (`unit_id`),
  CONSTRAINT `fk_mc_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ad_trackers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_id` int NOT NULL,
  `platform` varchar(50) NOT NULL,
  `spend_amount` decimal(15,2) NOT NULL,
  `impressions` int DEFAULT 0,
  `clicks` int DEFAULT 0,
  `conversions` int DEFAULT 0,
  `tracking_date` date NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_at_unit` (`unit_id`),
  CONSTRAINT `fk_at_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `landing_pages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_id` int NOT NULL,
  `page_slug` varchar(100) NOT NULL UNIQUE,
  `title` varchar(200) NOT NULL,
  `content_json` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lp_unit` (`unit_id`),
  CONSTRAINT `fk_lp_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `marketing_leads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `landing_page_id` int DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `notes` text,
  `is_transferred_to_crm` tinyint(1) DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ml_lp` FOREIGN KEY (`landing_page_id`) REFERENCES `landing_pages`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `vouchers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_id` int NOT NULL,
  `code` varchar(50) NOT NULL UNIQUE,
  `discount_type` enum('PERCENTAGE','FIXED') NOT NULL,
  `discount_value` decimal(15,2) NOT NULL,
  `max_usage` int DEFAULT 0,
  `current_usage` int DEFAULT 0,
  `min_purchase` decimal(15,2) DEFAULT '0.00',
  `valid_from` date NOT NULL,
  `valid_until` date NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_v_unit` (`unit_id`),
  CONSTRAINT `fk_v_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── CUSTOMER SERVICE ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_id` int NOT NULL,
  `customer_id` int DEFAULT NULL,
  `ticket_number` varchar(50) NOT NULL UNIQUE,
  `subject` varchar(200) NOT NULL,
  `description` text,
  `priority` enum('LOW','MEDIUM','HIGH','URGENT') DEFAULT 'MEDIUM',
  `status` enum('OPEN','IN_PROGRESS','RESOLVED','CLOSED') DEFAULT 'OPEN',
  `assigned_to` int DEFAULT NULL,
  `last_response_at` timestamp NULL DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stk_unit` (`unit_id`),
  CONSTRAINT `fk_stk_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stk_customer` FOREIGN KEY (`customer_id`) REFERENCES `crm_contacts`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_stk_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `support_ticket_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `sender_type` enum('STAFF','CUSTOMER') NOT NULL,
  `sender_id` int NOT NULL,
  `message` text NOT NULL,
  `media_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stm_ticket` (`ticket_id`),
  CONSTRAINT `fk_stm_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `support_inbox_channels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_id` int NOT NULL,
  `platform` enum('WHATSAPP','EMAIL','INSTAGRAM') NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `api_config_json` json DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sic_unit` (`unit_id`),
  CONSTRAINT `fk_sic_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `knowledge_base` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_id` int NOT NULL,
  `category` varchar(100) NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text NOT NULL,
  `views` int DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kb_unit` (`unit_id`),
  CONSTRAINT `fk_kb_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── E-COMMERCE ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `ecommerce_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_id` int NOT NULL,
  `storefront_name` varchar(150) NOT NULL,
  `description` text,
  `logo_url` varchar(255) DEFAULT NULL,
  `domain_slug` varchar(100) NOT NULL UNIQUE,
  `payment_config_json` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_es_unit` (`unit_id`),
  CONSTRAINT `fk_es_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ecommerce_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_id` int NOT NULL,
  `order_number` varchar(100) NOT NULL UNIQUE,
  `customer_name` varchar(255) NOT NULL,
  `customer_email` varchar(150) DEFAULT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `shipping_address` text,
  `subtotal` decimal(15,2) NOT NULL,
  `discount_amount` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) NOT NULL,
  `payment_status` enum('PENDING','PAID','FAILED','EXPIRED') DEFAULT 'PENDING',
  `shipping_status` enum('PENDING','PROCESSING','SHIPPED','DELIVERED') DEFAULT 'PENDING',
  `transaction_id` varchar(150) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_eo_unit` (`unit_id`),
  CONSTRAINT `fk_eo_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ecommerce_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ecommerce_order_id` int NOT NULL,
  `product_id` varchar(50) DEFAULT NULL,
  `variant_id` varchar(50) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `qty` int NOT NULL,
  `price` decimal(15,2) NOT NULL,
  `total` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_eoi_order` (`ecommerce_order_id`),
  CONSTRAINT `fk_eoi_order` FOREIGN KEY (`ecommerce_order_id`) REFERENCES `ecommerce_orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
