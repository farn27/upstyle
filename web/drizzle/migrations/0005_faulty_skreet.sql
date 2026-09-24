CREATE TABLE `marketplace_integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int,
	`platform` varchar(50) NOT NULL,
	`partner_id` varchar(100),
	`partner_key` text,
	`shop_id` varchar(100),
	`access_token` text,
	`refresh_token` text,
	`token_expires_at` timestamp,
	`is_active` tinyint DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp,
	CONSTRAINT `marketplace_integrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_plan_seed_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plan_id` int NOT NULL,
	`unit_id` int NOT NULL,
	`module` varchar(50) NOT NULL,
	`records_created` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `bp_seed_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`unit_id` int,
	`nama_bisnis` varchar(255) NOT NULL,
	`kategori` varchar(100) NOT NULL,
	`deskripsi` text,
	`visi` text,
	`misi` text,
	`target_pasar` text,
	`problem_solving` text,
	`target_usia` varchar(100),
	`target_lokasi` varchar(255),
	`nilai_utama` text,
	`keunggulan` text,
	`kompetitor_utama` text,
	`model_pendapatan` varchar(50),
	`estimasi_harga` decimal(15,2),
	`estimasi_volume_per_bulan` int,
	`proyeksi_revenue_per_bulan` decimal(15,2),
	`modal_awal` decimal(15,2),
	`biaya_operasional_per_bulan` decimal(15,2),
	`break_even_point` int,
	`roi_estimasi` decimal(5,2),
	`channel_penjualan` json,
	`platform_online` json,
	`canvas_json` json,
	`ai_summary` text,
	`status` enum('DRAFT','COMPLETE','APPLIED') DEFAULT 'DRAFT',
	`current_step` int DEFAULT 1,
	`is_seeded` tinyint DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `abc_categories` MODIFY COLUMN `jenis` varchar(50) DEFAULT 'keluar';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(20) DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `pos_customers` ADD `crm_contact_id` int;--> statement-breakpoint
ALTER TABLE `pos_orders` ADD `order_type` enum('DINE_IN','TAKEAWAY','DELIVERY') DEFAULT 'TAKEAWAY';--> statement-breakpoint
ALTER TABLE `pos_orders` ADD `table_number` varchar(20);--> statement-breakpoint
ALTER TABLE `pos_orders` ADD `queue_number` varchar(20);--> statement-breakpoint
ALTER TABLE `pos_orders` ADD `fulfillment_status` enum('PENDING','PREPARING','READY','COMPLETED') DEFAULT 'COMPLETED';--> statement-breakpoint
ALTER TABLE `products` ADD `show_in_pos` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `unit_bisnis` ADD `pos_shortage_threshold` decimal(15,2) DEFAULT '25000.00';--> statement-breakpoint
ALTER TABLE `unit_bisnis` ADD `pos_feature_override` json;--> statement-breakpoint
ALTER TABLE `marketplace_integrations` ADD CONSTRAINT `marketplace_integrations_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `business_plan_seed_logs` ADD CONSTRAINT `business_plan_seed_logs_plan_id_business_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `business_plans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `business_plans` ADD CONSTRAINT `business_plans_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `business_plans` ADD CONSTRAINT `business_plans_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_bp_seed_plan` ON `business_plan_seed_logs` (`plan_id`);--> statement-breakpoint
CREATE INDEX `idx_bp_user` ON `business_plans` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_bp_unit` ON `business_plans` (`unit_id`);--> statement-breakpoint
ALTER TABLE `pos_customers` ADD CONSTRAINT `pos_customers_crm_contact_id_crm_contacts_id_fk` FOREIGN KEY (`crm_contact_id`) REFERENCES `crm_contacts`(`id`) ON DELETE set null ON UPDATE no action;