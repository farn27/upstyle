ALTER TABLE `employee_kpi` ADD CONSTRAINT `employee_kpi_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `riwayat_aksi` ADD CONSTRAINT `riwayat_aksi_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `riwayat_aksi` ADD CONSTRAINT `riwayat_aksi_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_logs` ADD CONSTRAINT `stock_logs_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_opname` ADD CONSTRAINT `stock_opname_unit_id_unit_bisnis_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_opname` ADD CONSTRAINT `stock_opname_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_opname` ADD CONSTRAINT `stock_opname_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_company_id_unit_bisnis_id_fk` FOREIGN KEY (`company_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_stock` ADD CONSTRAINT `warehouse_stock_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_stock` ADD CONSTRAINT `warehouse_stock_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_budget_items_unit` ON `budget_items` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_employee_history_emp` ON `employee_history` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_employee_kpi_emp` ON `employee_kpi` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_knowledge_base_unit` ON `knowledge_base` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_product_batches_product` ON `product_batches` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_orders_unit` ON `purchase_orders` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_orders_created_by` ON `purchase_orders` (`created_by`);--> statement-breakpoint
CREATE INDEX `idx_quotation_items_product` ON `quotation_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_order_items_product` ON `sales_order_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_targets_unit` ON `sales_targets` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_targets_user` ON `sales_targets` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_stock_opname_unit` ON `stock_opname` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_stock_opname_created_by` ON `stock_opname` (`created_by`);--> statement-breakpoint
CREATE INDEX `idx_vouchers_unit` ON `vouchers` (`unit_id`);--> statement-breakpoint
CREATE INDEX `idx_warehouse_stock_product` ON `warehouse_stock` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_warehouses_unit` ON `warehouses` (`unit_id`);