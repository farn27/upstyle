CREATE TABLE `pos_shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`user_id` int NOT NULL,
	`waktu_buka` datetime NOT NULL,
	`waktu_tutup` datetime,
	`modal_awal` decimal(15,2) DEFAULT '0',
	`kas_akhir` decimal(15,2),
	`status` enum('OPEN','CLOSED') DEFAULT 'OPEN',
	`catatan` text,
	CONSTRAINT `pos_shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_pos_shifts_unit` ON `pos_shifts` (`unit_id`);