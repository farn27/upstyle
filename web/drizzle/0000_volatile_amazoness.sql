-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `abc_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama_kategori` varchar(100) NOT NULL,
	`abc_level` enum('A','B','C') DEFAULT 'C',
	`deskripsi` text,
	`created_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `abc_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `approval_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_id` int,
	`approver_id` varchar(50),
	`action` enum('APPROVE','REJECT'),
	`note` text,
	`created_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `approval_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `approval_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`module` varchar(50) NOT NULL,
	`reference_id` varchar(50),
	`requester_id` varchar(50),
	`unit_id` int,
	`action_type` enum('CREATE','UPDATE','DELETE') NOT NULL,
	`data_before` json,
	`data_after` json,
	`current_level` int DEFAULT 1,
	`max_level` int DEFAULT 1,
	`status` enum('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
	`note` text,
	`created_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `approval_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int,
	`check_in` datetime,
	`check_out` datetime,
	`status` enum('present','late','absent','on_leave'),
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`owner_id` int,
	`created_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int,
	`name` varchar(100),
	CONSTRAINT `departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`document_type` enum('KTP','NPWP','Contract','CV','Sertifikat','Lainnya') NOT NULL,
	`file_path` varchar(255) NOT NULL,
	`file_name` varchar(100),
	`uploaded_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `employee_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int,
	`old_position` varchar(50),
	`new_position` varchar(50),
	`change_date` timestamp DEFAULT (CURRENT_TIMESTAMP),
	`reason` text,
	CONSTRAINT `employee_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_kpi` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int,
	`period_month` tinyint,
	`period_year` int,
	`score` decimal(5,2),
	`notes` text,
	`created_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `employee_kpi_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int,
	`user_id` int,
	`manager_id` int,
	`full_name` varchar(100),
	`slug` varchar(255),
	`position` varchar(100),
	`job_grade` varchar(20),
	`salary` decimal(15,2),
	`joined_at` date,
	`join_date` date,
	`status` enum('active','inactive') DEFAULT 'active',
	`email` varchar(100),
	`phone` varchar(20),
	`id_number` varchar(30),
	`division` varchar(100),
	`placement_location` varchar(100),
	`employment_status` varchar(50),
	`bank_name` varchar(100),
	`bank_account_number` varchar(50),
	`tax_id` varchar(50),
	`address` text,
	`contract_start` date,
	`contract_end` date,
	`employee_id_card` varchar(50),
	`emergency_contact` varchar(100),
	`emergency_relation` varchar(100),
	`blood_type` varchar(5),
	`role` varchar(100) DEFAULT 'employee',
	`password` varchar(255),
	`pin` varchar(10),
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `slug` UNIQUE(`slug`),
	CONSTRAINT `user_id` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `kategori_produk` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama_kategori` varchar(100) NOT NULL,
	CONSTRAINT `kategori_produk_id` PRIMARY KEY(`id`),
	CONSTRAINT `nama_kategori` UNIQUE(`nama_kategori`),
	CONSTRAINT `nama_kategori_2` UNIQUE(`nama_kategori`),
	CONSTRAINT `nama_kategori_3` UNIQUE(`nama_kategori`)
);
--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int,
	`type` enum('leave','overtime'),
	`start_date` datetime,
	`end_date` datetime,
	`reason` text,
	`status` enum('pending','approved','rejected') DEFAULT 'pending',
	`approved_by` int,
	CONSTRAINT `leave_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payrolls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int,
	`period_month` tinyint,
	`period_year` int,
	`basic_salary` decimal(15,2),
	`allowances` decimal(15,2) DEFAULT '0.00',
	`deductions` decimal(15,2) DEFAULT '0.00',
	`net_salary` decimal(15,2),
	`payment_status` enum('unpaid','paid') DEFAULT 'unpaid',
	CONSTRAINT `payrolls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` varchar(50) NOT NULL,
	`product_id` varchar(50) NOT NULL,
	`nama_variasi` varchar(255) NOT NULL,
	`sku` varchar(100),
	`harga_beli` decimal(15,2) DEFAULT '0.00',
	`harga_jual` decimal(15,2) DEFAULT '0.00',
	`stok` int DEFAULT 0,
	`min_stok` int DEFAULT 0,
	`created_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(50) NOT NULL,
	`sku` varchar(50),
	`user_id` int NOT NULL,
	`unit_id` int NOT NULL,
	`kategori_id` int,
	`metadata` json,
	`supplier_id` int,
	`nama` varchar(255) NOT NULL,
	`foto` longtext,
	`harga_beli` decimal(15,2) NOT NULL,
	`harga_jual` decimal(15,2) NOT NULL,
	`stok` int DEFAULT 0,
	`min_stok` int DEFAULT 5,
	`created_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
	`has_variant` tinyint(1) DEFAULT 0,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `sku` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `riwayat_aksi` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`unit_id` int NOT NULL,
	`pesan` text NOT NULL,
	`tipe` enum('success','error','info') DEFAULT 'success',
	`waktu` datetime DEFAULT (CURRENT_TIMESTAMP),
	`is_read` tinyint(1) DEFAULT 0,
	`link` varchar(255),
	`kategori` varchar(50),
	CONSTRAINT `riwayat_aksi_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_name` varchar(50) NOT NULL,
	`description` text,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salary_components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int,
	`name` varchar(100),
	`amount` decimal(15,2),
	`type` enum('addition','deduction'),
	CONSTRAINT `salary_components_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int,
	`shift_name` varchar(50),
	`start_time` time,
	`end_time` time,
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_logs` (
	`id` varchar(50) NOT NULL,
	`product_id` varchar(50),
	`user_id` varchar(50) NOT NULL,
	`unit_id` int NOT NULL,
	`stok_awal` int NOT NULL DEFAULT 0,
	`perubahan` int NOT NULL DEFAULT 0,
	`stok_akhir` int NOT NULL DEFAULT 0,
	`alasan` enum('MASUK','KELUAR','PENJUALAN','OPNAME','RUSAK','RETUR','ADJUSTMENT') NOT NULL,
	`keterangan` text,
	`created_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `stock_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`nama_supplier` varchar(150) NOT NULL,
	`kontak` varchar(50),
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transaksi` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`user_id` int NOT NULL,
	`kategori_trx` enum('MASUK','KELUAR') NOT NULL,
	`nominal` decimal(15,2) NOT NULL,
	`keterangan` text,
	`tanggal` datetime DEFAULT (CURRENT_TIMESTAMP),
	`product_id` varchar(50),
	`qty` int DEFAULT 1,
	`hpp_total` decimal(15,2) DEFAULT '0.00',
	`metode_bayar` varchar(100) DEFAULT 'KAS',
	`abc_category_id` int,
	`total_harga` decimal(15,2) NOT NULL,
	`created_at` timestamp DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `transaksi_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `unit_bisnis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`nama_unit` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`alamat` text,
	`modal_awal` decimal(15,2) DEFAULT '0.00',
	`kategori` varchar(50),
	`is_cabang` tinyint(1) DEFAULT 0,
	`cabang_dari` int,
	`telepon` varchar(20),
	`email` varchar(100),
	`login_slug` varchar(50),
	`is_portal_active` tinyint(1) DEFAULT 1,
	CONSTRAINT `unit_bisnis_id` PRIMARY KEY(`id`),
	CONSTRAINT `login_slug` UNIQUE(`login_slug`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(50) NOT NULL,
	`email` varchar(100) NOT NULL,
	`password` varchar(255),
	`google_id` varchar(255),
	`avatar_url` text,
	`role` varchar(20) DEFAULT 'admin',
	`company_id` int,
	`created_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `email` UNIQUE(`email`),
	CONSTRAINT `google_id` UNIQUE(`google_id`)
);
--> statement-breakpoint
ALTER TABLE `approval_logs` ADD CONSTRAINT `approval_logs_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `approval_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `departments` ADD CONSTRAINT `departments_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_documents` ADD CONSTRAINT `fk_docs_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `fk_unit_payroll` FOREIGN KEY (`company_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payrolls` ADD CONSTRAINT `payrolls_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `fk_product_variant` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `fk_prod_kat` FOREIGN KEY (`kategori_id`) REFERENCES `kategori_produk`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `fk_prod_sup` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `fk_prod_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `fk_prod_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `salary_components` ADD CONSTRAINT `salary_components_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_logs` ADD CONSTRAINT `fk_stock_product_relasi` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `fk_sup_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaksi` ADD CONSTRAINT `fk_trans_abc` FOREIGN KEY (`abc_category_id`) REFERENCES `abc_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaksi` ADD CONSTRAINT `fk_trans_prod` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaksi` ADD CONSTRAINT `fk_trans_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unit_bisnis` ADD CONSTRAINT `fk_cabang_dari` FOREIGN KEY (`cabang_dari`) REFERENCES `unit_bisnis`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unit_bisnis` ADD CONSTRAINT `fk_unit_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `request_id` ON `approval_logs` (`request_id`);--> statement-breakpoint
CREATE INDEX `employee_id` ON `attendance` (`employee_id`);--> statement-breakpoint
CREATE INDEX `unit_id` ON `departments` (`unit_id`);--> statement-breakpoint
CREATE INDEX `employee_id` ON `employee_documents` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_manager` ON `employees` (`manager_id`);--> statement-breakpoint
CREATE INDEX `idx_kategori_global` ON `kategori_produk` (`nama_kategori`);--> statement-breakpoint
CREATE INDEX `employee_id` ON `leave_requests` (`employee_id`);--> statement-breakpoint
CREATE INDEX `employee_id` ON `payrolls` (`employee_id`);--> statement-breakpoint
CREATE INDEX `fk_unit_log` ON `riwayat_aksi` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_user_waktu` ON `riwayat_aksi` (`user_id`,`waktu`);--> statement-breakpoint
CREATE INDEX `user_id` ON `riwayat_aksi` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_id_2` ON `riwayat_aksi` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_id_3` ON `riwayat_aksi` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_id_4` ON `riwayat_aksi` (`user_id`);--> statement-breakpoint
CREATE INDEX `employee_id` ON `salary_components` (`employee_id`);--> statement-breakpoint
CREATE INDEX `company_id` ON `shifts` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_product` ON `stock_logs` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_unit` ON `stock_logs` (`unit_id`);
*/