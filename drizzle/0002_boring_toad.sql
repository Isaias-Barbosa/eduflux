CREATE TABLE `classrooms` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`name` text NOT NULL,
	`shift` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classrooms_school_name_idx` ON `classrooms` (`school_id`,`name`);--> statement-breakpoint
CREATE INDEX `classrooms_school_id_idx` ON `classrooms` (`school_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`classroom_id` text,
	`name` text NOT NULL,
	`status` text DEFAULT 'ativo' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `students_school_id_idx` ON `students` (`school_id`);--> statement-breakpoint
CREATE INDEX `students_classroom_id_idx` ON `students` (`classroom_id`);--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`discipline` text DEFAULT '' NOT NULL,
	`classroom_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_school_email_idx` ON `teachers` (`school_id`,`email`);--> statement-breakpoint
CREATE INDEX `teachers_school_id_idx` ON `teachers` (`school_id`);--> statement-breakpoint
CREATE INDEX `teachers_classroom_id_idx` ON `teachers` (`classroom_id`);