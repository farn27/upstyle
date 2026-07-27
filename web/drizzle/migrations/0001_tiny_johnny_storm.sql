ALTER TABLE `employees` DROP INDEX `user_id`;--> statement-breakpoint
ALTER TABLE `employees` DROP FOREIGN KEY `employees_company_id_companies_id_fk`;
--> statement-breakpoint
ALTER TABLE `closing_periods` MODIFY COLUMN `user_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `journal_entries` MODIFY COLUMN `user_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `landing_pages` ADD `template_id` varchar(50);--> statement-breakpoint
ALTER TABLE `accounting_contacts` ADD CONSTRAINT `accounting_contacts_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_coa_id_chart_of_accounts_id_fk` FOREIGN KEY (`coa_id`) REFERENCES `chart_of_accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chart_of_accounts` ADD CONSTRAINT `chart_of_accounts_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `closing_periods` ADD CONSTRAINT `closing_periods_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `closing_periods` ADD CONSTRAINT `closing_periods_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_history` ADD CONSTRAINT `employee_history_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_company_id_unit_bisnis_id_fk` FOREIGN KEY (`company_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fixed_assets` ADD CONSTRAINT `fixed_assets_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fixed_assets` ADD CONSTRAINT `fixed_assets_coa_id_chart_of_accounts_id_fk` FOREIGN KEY (`coa_id`) REFERENCES `chart_of_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_entry_lines` ADD CONSTRAINT `journal_entry_lines_journal_id_journal_entries_id_fk` FOREIGN KEY (`journal_id`) REFERENCES `journal_entries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_entry_lines` ADD CONSTRAINT `journal_entry_lines_coa_id_chart_of_accounts_id_fk` FOREIGN KEY (`coa_id`) REFERENCES `chart_of_accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_entry_lines` ADD CONSTRAINT `journal_entry_lines_contact_id_accounting_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `accounting_contacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payables` ADD CONSTRAINT `payables_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payables` ADD CONSTRAINT `payables_contact_id_accounting_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `accounting_contacts`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payables` ADD CONSTRAINT `payables_journal_id_journal_entries_id_fk` FOREIGN KEY (`journal_id`) REFERENCES `journal_entries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_orders` ADD CONSTRAINT `pos_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_orders` ADD CONSTRAINT `pos_orders_cashier_id_users_id_fk` FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receivables` ADD CONSTRAINT `receivables_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receivables` ADD CONSTRAINT `receivables_contact_id_accounting_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `accounting_contacts`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receivables` ADD CONSTRAINT `receivables_journal_id_journal_entries_id_fk` FOREIGN KEY (`journal_id`) REFERENCES `journal_entries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_commissions` ADD CONSTRAINT `sales_commissions_sales_order_id_sales_orders_id_fk` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_receivable_id_receivables_id_fk` FOREIGN KEY (`receivable_id`) REFERENCES `receivables`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_rates` ADD CONSTRAINT `tax_rates_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_rates` ADD CONSTRAINT `tax_rates_coa_id_chart_of_accounts_id_fk` FOREIGN KEY (`coa_id`) REFERENCES `chart_of_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaksi` ADD CONSTRAINT `transaksi_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_crm_activities_owner_unit` ON `crm_activities` (`owner_id`,`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_activities_tanggal` ON `crm_activities` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_product_unit` ON `stock_logs` (`product_id`,`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `stock_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_transaksi_unit` ON `transaksi` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_transaksi_user` ON `transaksi` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_transaksi_kategori` ON `transaksi` (`kategori_trx`);--> statement-breakpoint
CREATE INDEX `idx_transaksi_unit_kategori` ON `transaksi` (`unit_id`,`kategori_trx`);--> statement-breakpoint
CREATE INDEX `idx_transaksi_tanggal` ON `transaksi` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_transaksi_product` ON `transaksi` (`product_id`);