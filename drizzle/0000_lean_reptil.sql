CREATE TABLE `manpower` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` text NOT NULL,
	`name` text NOT NULL,
	`contractor` text NOT NULL,
	`trade` text NOT NULL,
	`skill_level` text NOT NULL,
	`shift` text NOT NULL,
	`phone` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `manpower_employee_id_unique` ON `manpower` (`employee_id`);--> statement-breakpoint
CREATE TABLE `work_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`area` text NOT NULL,
	`manpower_id` integer,
	`scheduled_date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`instructions` text,
	`status` text DEFAULT 'Not started' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`manpower_id`) REFERENCES `manpower`(`id`) ON UPDATE no action ON DELETE no action
);
