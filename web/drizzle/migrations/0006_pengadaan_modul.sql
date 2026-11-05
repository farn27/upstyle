CREATE TABLE `purchase_invoice_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_id` int NOT NULL,
	`po_item_id` int NOT NULL,
	`product_id` varchar(50) NOT NULL,
	`qty` int NOT NULL,
	`unit_price` decimal(15,2) NOT NULL,
	CONSTRAINT `purchase_invoice_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`po_id` int NOT NULL,
	`supplier_id` int NOT NULL,
	`payable_id` int NOT NULL,
	`journal_id` int,
	`nomor_faktur` varchar(50) NOT NULL,
	`tanggal` date NOT NULL,
	`jatuh_tempo` date NOT NULL,
	`subtotal` decimal(15,2) NOT NULL,
	`diskon` decimal(15,2) DEFAULT '0',
	`ongkir` decimal(15,2) DEFAULT '0',
	`ppn` decimal(15,2) DEFAULT '0',
	`total` decimal(15,2) NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `purchase_invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_purchase_invoices_faktur` UNIQUE(`unit_id`,`supplier_id`,`nomor_faktur`)
);
--> statement-breakpoint
CREATE TABLE `purchase_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`payable_id` int NOT NULL,
	`journal_id` int,
	`trx_id` int,
	`kas_coa_id` int,
	`nominal` decimal(15,2) NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `purchase_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_receipt_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receipt_id` int NOT NULL,
	`po_item_id` int NOT NULL,
	`product_id` varchar(50) NOT NULL,
	`qty` int NOT NULL,
	CONSTRAINT `purchase_receipt_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`po_id` int NOT NULL,
	`nomor` varchar(50) NOT NULL,
	`tanggal` date NOT NULL,
	`no_surat_jalan` varchar(100),
	`catatan` text,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `purchase_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_purchase_receipts_nomor` UNIQUE(`unit_id`,`nomor`)
);
--> statement-breakpoint
CREATE TABLE `purchase_return_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`return_id` int NOT NULL,
	`po_item_id` int NOT NULL,
	`product_id` varchar(50) NOT NULL,
	`qty` int NOT NULL,
	CONSTRAINT `purchase_return_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_returns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`po_id` int NOT NULL,
	`nomor` varchar(50) NOT NULL,
	`tanggal` date NOT NULL,
	`alasan` varchar(255),
	`nilai_potong_hutang` decimal(15,2) DEFAULT '0',
	`journal_id` int,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `purchase_returns_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_purchase_returns_nomor` UNIQUE(`unit_id`,`nomor`)
);
--> statement-breakpoint
ALTER TABLE `suppliers` MODIFY COLUMN `kontak` varchar(1000);--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD `qty_invoiced` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD `qty_returned` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `diskon` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `ongkir` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `ppn_persen` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `alasan_batal` varchar(255);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `term_pembayaran` int DEFAULT 30;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `is_active` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `contact_id` int;--> statement-breakpoint
ALTER TABLE `purchase_invoice_items` ADD CONSTRAINT `purchase_invoice_items_invoice_id_purchase_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `purchase_invoices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_invoices` ADD CONSTRAINT `purchase_invoices_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_invoices` ADD CONSTRAINT `purchase_invoices_po_id_purchase_orders_id_fk` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_invoices` ADD CONSTRAINT `purchase_invoices_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_invoices` ADD CONSTRAINT `purchase_invoices_payable_id_payables_id_fk` FOREIGN KEY (`payable_id`) REFERENCES `payables`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_invoices` ADD CONSTRAINT `purchase_invoices_journal_id_journal_entries_id_fk` FOREIGN KEY (`journal_id`) REFERENCES `journal_entries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_invoices` ADD CONSTRAINT `purchase_invoices_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_payments` ADD CONSTRAINT `purchase_payments_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_payments` ADD CONSTRAINT `purchase_payments_payable_id_payables_id_fk` FOREIGN KEY (`payable_id`) REFERENCES `payables`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_payments` ADD CONSTRAINT `purchase_payments_journal_id_journal_entries_id_fk` FOREIGN KEY (`journal_id`) REFERENCES `journal_entries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_payments` ADD CONSTRAINT `purchase_payments_kas_coa_id_chart_of_accounts_id_fk` FOREIGN KEY (`kas_coa_id`) REFERENCES `chart_of_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_payments` ADD CONSTRAINT `purchase_payments_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_receipt_items` ADD CONSTRAINT `purchase_receipt_items_receipt_id_purchase_receipts_id_fk` FOREIGN KEY (`receipt_id`) REFERENCES `purchase_receipts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_receipts` ADD CONSTRAINT `purchase_receipts_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_receipts` ADD CONSTRAINT `purchase_receipts_po_id_purchase_orders_id_fk` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_receipts` ADD CONSTRAINT `purchase_receipts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_return_items` ADD CONSTRAINT `purchase_return_items_return_id_purchase_returns_id_fk` FOREIGN KEY (`return_id`) REFERENCES `purchase_returns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_po_id_purchase_orders_id_fk` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_journal_id_journal_entries_id_fk` FOREIGN KEY (`journal_id`) REFERENCES `journal_entries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_purchase_invoice_items_invoice` ON `purchase_invoice_items` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_invoices_po` ON `purchase_invoices` (`po_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_payments_payable` ON `purchase_payments` (`payable_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_receipt_items_receipt` ON `purchase_receipt_items` (`receipt_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_receipts_po` ON `purchase_receipts` (`po_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_return_items_return` ON `purchase_return_items` (`return_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_returns_po` ON `purchase_returns` (`po_id`);--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_contact_id_accounting_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `accounting_contacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_purchase_order_items_po` ON `purchase_order_items` (`po_id`);--> statement-breakpoint
-- PO yang sudah diterima lewat app mobile: stoknya sudah masuk dan sudah dicatat sebagai pengeluaran tunai.
-- Tandai sudah diterima & sudah ditagih supaya tidak bisa diterima/ditagih lagi dari web.
UPDATE `purchase_order_items` i JOIN `purchase_orders` p ON p.`id` = i.`po_id` SET i.`qty_received` = i.`qty_ordered`, i.`qty_invoiced` = i.`qty_ordered` WHERE p.`status` = 'RECEIVED';
