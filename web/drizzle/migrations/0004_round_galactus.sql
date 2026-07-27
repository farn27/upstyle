CREATE TABLE `pos_cash_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shift_id` int NOT NULL,
	`type` enum('CASH_IN','CASH_OUT') NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `pos_cash_tx_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`method` varchar(50) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `pos_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_return_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`return_id` int NOT NULL,
	`order_item_id` int NOT NULL,
	`product_id` varchar(50),
	`qty_returned` int NOT NULL,
	`refund_amount` decimal(15,2) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `pos_return_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_returns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`return_number` varchar(50) NOT NULL,
	`order_id` int NOT NULL,
	`unit_id` int NOT NULL,
	`handled_by` varchar(50),
	`total_refund` decimal(15,2) NOT NULL,
	`reason` text,
	`status` enum('COMPLETED','PENDING') DEFAULT 'COMPLETED',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `pos_returns_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_returns_return_number_unique` UNIQUE(`return_number`)
);
--> statement-breakpoint
ALTER TABLE `pos_order_items` MODIFY COLUMN `cost_total` decimal(15,2);--> statement-breakpoint
ALTER TABLE `pos_orders` MODIFY COLUMN `status` enum('PENDING','PAID','CANCELLED','REFUNDED') DEFAULT 'PAID';--> statement-breakpoint
ALTER TABLE `pos_shifts` MODIFY COLUMN `modal_awal` decimal(15,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `pos_shifts` MODIFY COLUMN `kas_akhir` decimal(15,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `pos_order_items` ADD `variant_id` int;--> statement-breakpoint
ALTER TABLE `pos_orders` ADD `amount_paid` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `pos_orders` ADD `change_amount` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `pos_orders` ADD `voucher_id` int;--> statement-breakpoint
ALTER TABLE `pos_shifts` ADD `kas_akhir_aktual` decimal(15,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `pos_shifts` ADD `selisih` decimal(15,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `pos_shifts` ADD `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `pos_cash_transactions` ADD CONSTRAINT `pos_cash_transactions_shift_id_pos_shifts_id_fk` FOREIGN KEY (`shift_id`) REFERENCES `pos_shifts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_payments` ADD CONSTRAINT `pos_payments_order_id_pos_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `pos_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_return_items` ADD CONSTRAINT `pos_return_items_return_id_pos_returns_id_fk` FOREIGN KEY (`return_id`) REFERENCES `pos_returns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_return_items` ADD CONSTRAINT `pos_return_items_order_item_id_pos_order_items_id_fk` FOREIGN KEY (`order_item_id`) REFERENCES `pos_order_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_returns` ADD CONSTRAINT `pos_returns_order_id_pos_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `pos_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_returns` ADD CONSTRAINT `pos_returns_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_pos_cash_tx_shift` ON `pos_cash_transactions` (`shift_id`);--> statement-breakpoint
CREATE INDEX `idx_pos_payments_order` ON `pos_payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_pos_return_items_return` ON `pos_return_items` (`return_id`);--> statement-breakpoint
CREATE INDEX `idx_pos_returns_order` ON `pos_returns` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_pos_returns_unit` ON `pos_returns` (`unit_id`);--> statement-breakpoint
ALTER TABLE `pos_shifts` ADD CONSTRAINT `pos_shifts_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_shifts` ADD CONSTRAINT `pos_shifts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;