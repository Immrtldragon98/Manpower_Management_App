CREATE TABLE `attendance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`manpower_id` integer NOT NULL,
	`attendance_date` text NOT NULL,
	`requested_at` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`reviewed_at` text,
	`reviewed_by` text,
	FOREIGN KEY (`manpower_id`) REFERENCES `manpower`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_worker_date_unique` ON `attendance` (`manpower_id`,`attendance_date`);--> statement-breakpoint
ALTER TABLE `manpower` ADD `pin_salt` text;--> statement-breakpoint
ALTER TABLE `manpower` ADD `pin_hash` text;