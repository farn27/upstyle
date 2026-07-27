CREATE TABLE `abc_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nama_kategori` varchar(100) NOT NULL,
	`abc_level` enum('A','B','C') DEFAULT 'C',
	`deskripsi` text,
	`jenis` text DEFAULT ('keluar'),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `abc_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accounting_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`nama_kontak` varchar(150) NOT NULL,
	`tipe_kontak` enum('CUSTOMER','SUPPLIER','BOTH') DEFAULT 'CUSTOMER',
	`email` varchar(100),
	`telepon` varchar(30),
	`alamat` text,
	`npwp` varchar(30),
	`limit_kredit` decimal(15,2) DEFAULT '0',
	`term_pembayaran` int DEFAULT 30,
	`is_active` tinyint DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `accounting_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ad_trackers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`platform` varchar(50) NOT NULL,
	`spend_amount` decimal(15,2) NOT NULL,
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`conversions` int DEFAULT 0,
	`tracking_date` date NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `ad_trackers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `approval_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_id` int,
	`approver_id` varchar(50),
	`action` enum('APPROVE','REJECT'),
	`note` text,
	`created_at` timestamp DEFAULT (now()),
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
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
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
CREATE TABLE `budget_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`coa_id` int NOT NULL,
	`tahun` int NOT NULL,
	`bulan` int NOT NULL,
	`nominal` decimal(15,2) NOT NULL,
	`keterangan` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `budget_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chart_of_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`kode_akun` varchar(20) NOT NULL,
	`nama_akun` varchar(150) NOT NULL,
	`tipe_akun` enum('ASET_LANCAR','ASET_TETAP','LIABILITAS_LANCAR','LIABILITAS_JANGKA_PANJANG','EKUITAS','PENDAPATAN','HPP','BEBAN_OPERASIONAL','BEBAN_LAINNYA','PENDAPATAN_LAINNYA') NOT NULL,
	`normal_balance` enum('DEBIT','KREDIT') NOT NULL,
	`is_active` tinyint DEFAULT 1,
	`parent_id` int,
	`deskripsi` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `chart_of_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `closing_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`user_id` varchar(50) NOT NULL,
	`period_start` date NOT NULL,
	`period_end` date NOT NULL,
	`status` enum('DRAFT','CLOSED') DEFAULT 'DRAFT',
	`laba_rugi_periode` decimal(15,2),
	`keterangan` text,
	`closed_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `closing_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`owner_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_id` int NOT NULL,
	`unit_id` int NOT NULL,
	`kontak_id` int,
	`tipe` enum('Call','WA','Meeting','Email','Task') NOT NULL,
	`catatan` text,
	`tanggal` timestamp DEFAULT (now()),
	CONSTRAINT `crm_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_id` int NOT NULL,
	`unit_id` int NOT NULL,
	`nama` varchar(150) NOT NULL,
	`alamat` text,
	`industri` varchar(100),
	`tags` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `crm_companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_id` int NOT NULL,
	`unit_id` int NOT NULL,
	`nama` varchar(150) NOT NULL,
	`telepon` varchar(30),
	`email` varchar(100),
	`perusahaan` varchar(150),
	`company_id` int,
	`stage` varchar(50) DEFAULT 'lead',
	`sumber` varchar(80) DEFAULT 'manual',
	`tags` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `crm_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_deals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_id` int NOT NULL,
	`unit_id` int NOT NULL,
	`kontak_id` int,
	`company_id` int,
	`nama_deal` varchar(200) NOT NULL,
	`nilai` decimal(15,2) DEFAULT '0.00',
	`stage` varchar(50) DEFAULT 'prospek',
	`sales_owner_id` int,
	`status` enum('open','won','lost','stagnant') DEFAULT 'open',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `crm_deals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_id` int NOT NULL,
	`unit_id` int NOT NULL,
	`kontak_id` int,
	`deal_id` int,
	`deskripsi` text NOT NULL,
	`deadline` datetime,
	`status` enum('pending','done') DEFAULT 'pending',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `crm_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int,
	`name` varchar(100),
	CONSTRAINT `departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ecommerce_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ecommerce_order_id` int NOT NULL,
	`product_id` varchar(50),
	`variant_id` varchar(50),
	`qty` int NOT NULL,
	`price` decimal(15,2) NOT NULL,
	`total` decimal(15,2) NOT NULL,
	CONSTRAINT `ecommerce_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ecommerce_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`order_number` varchar(100) NOT NULL,
	`customer_name` varchar(255) NOT NULL,
	`customer_email` varchar(150),
	`customer_phone` varchar(50),
	`shipping_address` text,
	`subtotal` decimal(15,2) NOT NULL,
	`discount_amount` decimal(15,2) DEFAULT '0.00',
	`total_amount` decimal(15,2) NOT NULL,
	`payment_status` enum('PENDING','PAID','FAILED','EXPIRED') DEFAULT 'PENDING',
	`shipping_status` enum('PENDING','PROCESSING','SHIPPED','DELIVERED') DEFAULT 'PENDING',
	`transaction_id` varchar(150),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `ecommerce_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `ecommerce_orders_order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `ecommerce_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`storefront_name` varchar(150) NOT NULL,
	`description` text,
	`logo_url` varchar(255),
	`domain_slug` varchar(100) NOT NULL,
	`payment_config_json` json,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `ecommerce_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `ecommerce_settings_domain_slug_unique` UNIQUE(`domain_slug`)
);
--> statement-breakpoint
CREATE TABLE `employee_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`document_type` enum('KTP','NPWP','Contract','CV','Sertifikat','Lainnya') NOT NULL,
	`file_path` varchar(255) NOT NULL,
	`file_name` varchar(100),
	`uploaded_at` timestamp DEFAULT (now()),
	CONSTRAINT `employee_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int,
	`old_position` varchar(50),
	`new_position` varchar(50),
	`change_date` timestamp DEFAULT (now()),
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
	`created_at` timestamp DEFAULT (now()),
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
	`pin` varchar(255),
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `slug` UNIQUE(`slug`),
	CONSTRAINT `user_id` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `fixed_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`nama_aset` varchar(150) NOT NULL,
	`kategori` enum('TANAH','BANGUNAN','KENDARAAN','MESIN','INVENTARIS','LAINNYA') DEFAULT 'LAINNYA',
	`nilai_perolehan` decimal(15,2) NOT NULL,
	`tanggal_perolehan` date NOT NULL,
	`umur_ekonomis` int NOT NULL,
	`metode_penyusutan` enum('GARIS_LURUS','SALDO_MENURUN') DEFAULT 'GARIS_LURUS',
	`nilai_sisa` decimal(15,2) DEFAULT '0',
	`akumulasi_penyusutan` decimal(15,2) DEFAULT '0',
	`nilai_buku` decimal(15,2),
	`status` enum('AKTIF','DIJUAL','DINONAKTIFKAN') DEFAULT 'AKTIF',
	`coa_id` int,
	`keterangan` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `fixed_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`user_id` varchar(50) NOT NULL,
	`tanggal` date NOT NULL,
	`nomor_jurnal` varchar(50),
	`referensi` varchar(100),
	`memo` text,
	`status` enum('DRAFT','POSTED','REVERSED') DEFAULT 'POSTED',
	`total_debit` decimal(15,2) DEFAULT '0',
	`total_kredit` decimal(15,2) DEFAULT '0',
	`source_type` varchar(30),
	`source_id` varchar(50),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `journal_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_entry_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`journal_id` int NOT NULL,
	`coa_id` int NOT NULL,
	`keterangan` varchar(255),
	`debit` decimal(15,2) DEFAULT '0',
	`kredit` decimal(15,2) DEFAULT '0',
	`contact_id` int,
	CONSTRAINT `journal_entry_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kategori_produk` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int,
	`nama_kategori` varchar(100) NOT NULL,
	CONSTRAINT `kategori_produk_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_kategori_unit` UNIQUE(`unit_id`,`nama_kategori`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_base` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`category` varchar(100) NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`views` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `knowledge_base_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `landing_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`page_slug` varchar(100) NOT NULL,
	`title` varchar(200) NOT NULL,
	`content_json` json,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `landing_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `landing_pages_page_slug_unique` UNIQUE(`page_slug`)
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
CREATE TABLE `marketing_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`type` enum('EMAIL','WA','AD_TRACKER') NOT NULL,
	`status` enum('DRAFT','SCHEDULED','ACTIVE','COMPLETED') DEFAULT 'DRAFT',
	`budget` decimal(15,2) DEFAULT '0.00',
	`compose_subject` varchar(255),
	`compose_text` text,
	`scheduled_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `marketing_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`landing_page_id` int,
	`first_name` varchar(100),
	`last_name` varchar(100),
	`email` varchar(100),
	`phone` varchar(30),
	`notes` text,
	`is_transferred_to_crm` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `marketing_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`contact_id` int NOT NULL,
	`journal_id` int,
	`nomor_faktur` varchar(50) NOT NULL,
	`tanggal` date NOT NULL,
	`jatuh_tempo` date NOT NULL,
	`nominal` decimal(15,2) NOT NULL,
	`sudah_dibayar` decimal(15,2) DEFAULT '0',
	`status` enum('BELUM_BAYAR','SEBAGIAN','LUNAS') DEFAULT 'BELUM_BAYAR',
	`keterangan` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `payables_id` PRIMARY KEY(`id`)
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
CREATE TABLE `pos_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`nama_customer` varchar(255) NOT NULL,
	`email` varchar(150),
	`telepon` varchar(50),
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` varchar(50),
	`product_name` varchar(255) NOT NULL,
	`sku` varchar(100),
	`qty` int NOT NULL,
	`price` decimal(15,2) NOT NULL,
	`total` decimal(15,2) NOT NULL,
	`cost_total` decimal(15,2) DEFAULT '0.00',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `pos_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(100) NOT NULL,
	`unit_id` int NOT NULL,
	`customer_id` int,
	`created_by` int NOT NULL,
	`cashier_id` int,
	`subtotal` decimal(15,2) NOT NULL,
	`discount` decimal(15,2) DEFAULT '0.00',
	`total` decimal(15,2) NOT NULL,
	`payment_method` varchar(50) DEFAULT 'CASH',
	`status` enum('PENDING','PAID','CANCELLED') DEFAULT 'PAID',
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_orders_order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `product_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` varchar(50) NOT NULL,
	`warehouse_id` int NOT NULL,
	`batch_number` varchar(100),
	`expiry_date` timestamp,
	`stock` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `product_batches_id` PRIMARY KEY(`id`)
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
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(50) NOT NULL,
	`sku` varchar(50),
	`slug` varchar(255) NOT NULL,
	`nama` varchar(255) NOT NULL,
	`barcode` varchar(100),
	`user_id` int NOT NULL,
	`unit_id` int NOT NULL,
	`kategori_id` int,
	`supplier_id` int,
	`status` enum('active','draft','archived') DEFAULT 'active',
	`metadata` json,
	`video_url` varchar(255),
	`weight_grams` int DEFAULT 0,
	`length_cm` int DEFAULT 0,
	`width_cm` int DEFAULT 0,
	`height_cm` int DEFAULT 0,
	`foto` longtext,
	`harga_beli` decimal(15,2) NOT NULL,
	`harga_jual` decimal(15,2) NOT NULL,
	`stok` int DEFAULT 0,
	`min_stok` int DEFAULT 5,
	`deleted_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`has_variant` tinyint DEFAULT 0,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `sku` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`po_id` int NOT NULL,
	`product_id` varchar(50) NOT NULL,
	`qty_ordered` int NOT NULL,
	`qty_received` int DEFAULT 0,
	`unit_price` decimal(15,2) NOT NULL,
	`total_price` decimal(15,2) NOT NULL,
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`po_number` varchar(50) NOT NULL,
	`unit_id` int NOT NULL,
	`supplier_id` int NOT NULL,
	`created_by` int NOT NULL,
	`status` varchar(20) DEFAULT 'DRAFT',
	`total_amount` decimal(15,2) NOT NULL,
	`expected_date` timestamp,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_po_number_unique` UNIQUE(`po_number`)
);
--> statement-breakpoint
CREATE TABLE `quotation_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotation_id` int NOT NULL,
	`product_id` varchar(50),
	`qty` int NOT NULL,
	`price` decimal(15,2) NOT NULL,
	`total` decimal(15,2) NOT NULL,
	CONSTRAINT `quotation_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotation_number` varchar(100) NOT NULL,
	`unit_id` int NOT NULL,
	`customer_id` int,
	`total_amount` decimal(15,2) NOT NULL,
	`status` enum('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED') DEFAULT 'DRAFT',
	`valid_until` date NOT NULL,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `quotations_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotations_quotation_number_unique` UNIQUE(`quotation_number`)
);
--> statement-breakpoint
CREATE TABLE `receivables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`contact_id` int NOT NULL,
	`journal_id` int,
	`nomor_invoice` varchar(50) NOT NULL,
	`tanggal` date NOT NULL,
	`jatuh_tempo` date NOT NULL,
	`nominal` decimal(15,2) NOT NULL,
	`sudah_dibayar` decimal(15,2) DEFAULT '0',
	`status` enum('BELUM_BAYAR','SEBAGIAN','LUNAS','MACET') DEFAULT 'BELUM_BAYAR',
	`keterangan` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `receivables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `riwayat_aksi` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`unit_id` int NOT NULL,
	`pesan` text NOT NULL,
	`tipe` enum('success','error','info') DEFAULT 'success',
	`waktu` datetime DEFAULT (CURRENT_TIMESTAMP),
	`is_read` tinyint DEFAULT 0,
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
CREATE TABLE `sales_commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`sales_order_id` int NOT NULL,
	`user_id` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`status` enum('UNPAID','PAID') DEFAULT 'UNPAID',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sales_commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sales_order_id` int NOT NULL,
	`product_id` varchar(50),
	`qty` int NOT NULL,
	`price` decimal(15,2) NOT NULL,
	`total` decimal(15,2) NOT NULL,
	CONSTRAINT `sales_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(100) NOT NULL,
	`unit_id` int NOT NULL,
	`customer_id` int,
	`total_amount` decimal(15,2) NOT NULL,
	`status` enum('DRAFT','PENDING','PROCESSING','SHIPPED','CLOSED','CANCELLED') DEFAULT 'PENDING',
	`notes` text,
	`receivable_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sales_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_orders_order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `sales_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`user_id` int NOT NULL,
	`target_amount` decimal(15,2) NOT NULL,
	`period_month` tinyint NOT NULL,
	`period_year` int NOT NULL,
	`komisi_percent` decimal(5,2) DEFAULT '0.00',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sales_targets_id` PRIMARY KEY(`id`)
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
CREATE TABLE `social_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`platform` varchar(50) NOT NULL,
	`caption` text NOT NULL,
	`image_url` varchar(255),
	`scheduled_at` datetime,
	`status` varchar(20) DEFAULT 'draft',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `social_posts_id` PRIMARY KEY(`id`)
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
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `stock_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_opname` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`warehouse_id` int NOT NULL,
	`created_by` int NOT NULL,
	`status` varchar(20) DEFAULT 'DRAFT',
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `stock_opname_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_opname_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opname_id` int NOT NULL,
	`product_id` varchar(50) NOT NULL,
	`system_stock` int NOT NULL,
	`actual_stock` int NOT NULL,
	`difference` int NOT NULL,
	`notes` varchar(255),
	CONSTRAINT `stock_opname_items_id` PRIMARY KEY(`id`)
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
CREATE TABLE `support_inbox_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`platform` enum('WHATSAPP','EMAIL','INSTAGRAM') NOT NULL,
	`is_active` boolean DEFAULT true,
	`api_config_json` json,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `support_inbox_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_ticket_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_id` int NOT NULL,
	`sender_type` enum('STAFF','CUSTOMER') NOT NULL,
	`sender_id` int NOT NULL,
	`message` text NOT NULL,
	`media_url` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `support_ticket_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`customer_id` int,
	`ticket_number` varchar(50) NOT NULL,
	`subject` varchar(200) NOT NULL,
	`description` text,
	`priority` enum('LOW','MEDIUM','HIGH','URGENT') DEFAULT 'MEDIUM',
	`status` enum('OPEN','IN_PROGRESS','RESOLVED','CLOSED') DEFAULT 'OPEN',
	`assigned_to` int,
	`last_response_at` timestamp,
	`resolved_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_tickets_ticket_number_unique` UNIQUE(`ticket_number`)
);
--> statement-breakpoint
CREATE TABLE `tax_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`nama_pajak` varchar(100) NOT NULL,
	`persentase` decimal(5,2) NOT NULL,
	`tipe` enum('PPN','PPH','LAINNYA') DEFAULT 'PPN',
	`is_default` tinyint DEFAULT 0,
	`is_active` tinyint DEFAULT 1,
	`coa_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `tax_rates_id` PRIMARY KEY(`id`)
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
	`created_at` timestamp DEFAULT (now()),
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
	`is_cabang` tinyint DEFAULT 0,
	`cabang_dari` int,
	`telepon` varchar(20),
	`email` varchar(100),
	`login_slug` varchar(50),
	`is_portal_active` tinyint DEFAULT 1,
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`email_verified_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `email` UNIQUE(`email`),
	CONSTRAINT `google_id` UNIQUE(`google_id`)
);
--> statement-breakpoint
CREATE TABLE `vouchers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`discount_type` enum('PERCENTAGE','FIXED') NOT NULL,
	`discount_value` decimal(15,2) NOT NULL,
	`max_usage` int DEFAULT 0,
	`current_usage` int DEFAULT 0,
	`min_purchase` decimal(15,2) DEFAULT '0.00',
	`valid_from` date NOT NULL,
	`valid_until` date NOT NULL,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `vouchers_id` PRIMARY KEY(`id`),
	CONSTRAINT `vouchers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `warehouse_stock` (
	`id` int AUTO_INCREMENT NOT NULL,
	`warehouse_id` int NOT NULL,
	`product_id` varchar(50) NOT NULL,
	`stock` int DEFAULT 0,
	`last_updated` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warehouse_stock_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`address` text,
	`is_default` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `warehouses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`domain_slug` varchar(100) NOT NULL,
	`theme` varchar(50) DEFAULT 'modern',
	`color_primary` varchar(10) DEFAULT '#4F46E5',
	`hero_title` varchar(255),
	`hero_subtitle` text,
	`about_us` text,
	`contact_phone` varchar(30),
	`contact_email` varchar(100),
	`contact_address` text,
	`facebook_url` varchar(255),
	`instagram_url` varchar(255),
	`is_published` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `website_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `website_settings_domain_slug_unique` UNIQUE(`domain_slug`)
);
--> statement-breakpoint
ALTER TABLE `ad_trackers` ADD CONSTRAINT `ad_trackers_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `approval_logs` ADD CONSTRAINT `approval_logs_request_id_approval_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `approval_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_activities` ADD CONSTRAINT `crm_activities_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_activities` ADD CONSTRAINT `crm_activities_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_activities` ADD CONSTRAINT `crm_activities_kontak_id_crm_contacts_id_fk` FOREIGN KEY (`kontak_id`) REFERENCES `crm_contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_companies` ADD CONSTRAINT `crm_companies_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_companies` ADD CONSTRAINT `crm_companies_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contacts` ADD CONSTRAINT `crm_contacts_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contacts` ADD CONSTRAINT `crm_contacts_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_contacts` ADD CONSTRAINT `crm_contacts_company_id_crm_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_deals` ADD CONSTRAINT `crm_deals_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_deals` ADD CONSTRAINT `crm_deals_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_deals` ADD CONSTRAINT `crm_deals_kontak_id_crm_contacts_id_fk` FOREIGN KEY (`kontak_id`) REFERENCES `crm_contacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_deals` ADD CONSTRAINT `crm_deals_company_id_crm_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_deals` ADD CONSTRAINT `crm_deals_sales_owner_id_users_id_fk` FOREIGN KEY (`sales_owner_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_kontak_id_crm_contacts_id_fk` FOREIGN KEY (`kontak_id`) REFERENCES `crm_contacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_deal_id_crm_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `crm_deals`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `departments` ADD CONSTRAINT `departments_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ecommerce_order_items` ADD CONSTRAINT `ecommerce_order_items_ecommerce_order_id_ecommerce_orders_id_fk` FOREIGN KEY (`ecommerce_order_id`) REFERENCES `ecommerce_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ecommerce_order_items` ADD CONSTRAINT `ecommerce_order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ecommerce_order_items` ADD CONSTRAINT `ecommerce_order_items_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ecommerce_orders` ADD CONSTRAINT `ecommerce_orders_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ecommerce_settings` ADD CONSTRAINT `ecommerce_settings_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_documents` ADD CONSTRAINT `employee_documents_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kategori_produk` ADD CONSTRAINT `kategori_produk_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_base` ADD CONSTRAINT `knowledge_base_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD CONSTRAINT `landing_pages_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketing_campaigns` ADD CONSTRAINT `marketing_campaigns_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketing_leads` ADD CONSTRAINT `marketing_leads_landing_page_id_landing_pages_id_fk` FOREIGN KEY (`landing_page_id`) REFERENCES `landing_pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payrolls` ADD CONSTRAINT `payrolls_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_customers` ADD CONSTRAINT `pos_customers_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_order_items` ADD CONSTRAINT `pos_order_items_order_id_pos_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `pos_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_order_items` ADD CONSTRAINT `pos_order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_orders` ADD CONSTRAINT `pos_orders_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_orders` ADD CONSTRAINT `pos_orders_customer_id_pos_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `pos_customers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_kategori_id_kategori_produk_id_fk` FOREIGN KEY (`kategori_id`) REFERENCES `kategori_produk`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_quotation_id_quotations_id_fk` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_customer_id_crm_contacts_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `crm_contacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `salary_components` ADD CONSTRAINT `salary_components_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_commissions` ADD CONSTRAINT `sales_commissions_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_commissions` ADD CONSTRAINT `sales_commissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_order_items` ADD CONSTRAINT `sales_order_items_sales_order_id_sales_orders_id_fk` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_order_items` ADD CONSTRAINT `sales_order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_customer_id_crm_contacts_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `crm_contacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_targets` ADD CONSTRAINT `sales_targets_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_targets` ADD CONSTRAINT `sales_targets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `social_posts` ADD CONSTRAINT `social_posts_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_logs` ADD CONSTRAINT `stock_logs_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_inbox_channels` ADD CONSTRAINT `support_inbox_channels_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_ticket_messages` ADD CONSTRAINT `support_ticket_messages_ticket_id_support_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_customer_id_crm_contacts_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `crm_contacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaksi` ADD CONSTRAINT `transaksi_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaksi` ADD CONSTRAINT `transaksi_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaksi` ADD CONSTRAINT `transaksi_abc_category_id_abc_categories_id_fk` FOREIGN KEY (`abc_category_id`) REFERENCES `abc_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unit_bisnis` ADD CONSTRAINT `unit_bisnis_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unit_bisnis` ADD CONSTRAINT `fk_cabang_dari` FOREIGN KEY (`cabang_dari`) REFERENCES `unit_bisnis`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vouchers` ADD CONSTRAINT `vouchers_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `website_settings` ADD CONSTRAINT `website_settings_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `request_id` ON `approval_logs` (`request_id`);--> statement-breakpoint
CREATE INDEX `employee_id` ON `attendance` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_activities_owner` ON `crm_activities` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_activities_unit` ON `crm_activities` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_activities_kontak` ON `crm_activities` (`kontak_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_companies_unit` ON `crm_companies` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_contacts_owner` ON `crm_contacts` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_contacts_unit` ON `crm_contacts` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_deals_owner` ON `crm_deals` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_deals_unit` ON `crm_deals` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_tasks_owner` ON `crm_tasks` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_tasks_unit` ON `crm_tasks` (`unit_id`);--> statement-breakpoint
CREATE INDEX `unit_id` ON `departments` (`unit_id`);--> statement-breakpoint
CREATE INDEX `employee_id` ON `employee_documents` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_manager` ON `employees` (`manager_id`);--> statement-breakpoint
CREATE INDEX `employee_id` ON `leave_requests` (`employee_id`);--> statement-breakpoint
CREATE INDEX `employee_id` ON `payrolls` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_pos_customers_unit` ON `pos_customers` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_pos_order_items_order` ON `pos_order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_pos_orders_unit` ON `pos_orders` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_pos_orders_customer` ON `pos_orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_unit_log` ON `riwayat_aksi` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_user_waktu` ON `riwayat_aksi` (`user_id`,`waktu`);--> statement-breakpoint
CREATE INDEX `employee_id` ON `salary_components` (`employee_id`);--> statement-breakpoint
CREATE INDEX `company_id` ON `shifts` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_product` ON `stock_logs` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_unit` ON `stock_logs` (`unit_id`);