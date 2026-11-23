CREATE TABLE `enrollment_sequences` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`year` integer NOT NULL,
	`last_number` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_sequences_school_year_idx` ON `enrollment_sequences` (`school_id`,`year`);--> statement-breakpoint
CREATE TABLE `student_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`student_id` text NOT NULL,
	`discipline` text NOT NULL,
	`assessment` text NOT NULL,
	`grade` real NOT NULL,
	`presence` text DEFAULT 'presente' NOT NULL,
	`recorded_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `student_assessments_school_id_idx` ON `student_assessments` (`school_id`);--> statement-breakpoint
CREATE INDEX `student_assessments_student_id_idx` ON `student_assessments` (`student_id`);--> statement-breakpoint
CREATE TABLE `student_update_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`student_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pendente' NOT NULL,
	`payload` text NOT NULL,
	`note` text,
	`review_note` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `student_update_requests_school_id_idx` ON `student_update_requests` (`school_id`);--> statement-breakpoint
CREATE INDEX `student_update_requests_student_id_idx` ON `student_update_requests` (`student_id`);--> statement-breakpoint
CREATE INDEX `student_update_requests_user_id_idx` ON `student_update_requests` (`user_id`);--> statement-breakpoint
ALTER TABLE `students` ADD `guardian_user_id` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `students` ADD `enrollment_number` text;--> statement-breakpoint
ALTER TABLE `students` ADD `birth_date` text;--> statement-breakpoint
ALTER TABLE `students` ADD `cpf` text;--> statement-breakpoint
ALTER TABLE `students` ADD `sex` text;--> statement-breakpoint
ALTER TABLE `students` ADD `birth_city` text;--> statement-breakpoint
ALTER TABLE `students` ADD `birth_state` text;--> statement-breakpoint
ALTER TABLE `students` ADD `race_color` text;--> statement-breakpoint
ALTER TABLE `students` ADD `mother_name` text;--> statement-breakpoint
ALTER TABLE `students` ADD `father_name` text;--> statement-breakpoint
ALTER TABLE `students` ADD `guardian_name` text;--> statement-breakpoint
ALTER TABLE `students` ADD `guardian_cpf` text;--> statement-breakpoint
ALTER TABLE `students` ADD `emergency_phone` text;--> statement-breakpoint
ALTER TABLE `students` ADD `emergency_phone_2` text;--> statement-breakpoint
ALTER TABLE `students` ADD `zip_code` text;--> statement-breakpoint
ALTER TABLE `students` ADD `street` text;--> statement-breakpoint
ALTER TABLE `students` ADD `number` text;--> statement-breakpoint
ALTER TABLE `students` ADD `complement` text;--> statement-breakpoint
ALTER TABLE `students` ADD `neighborhood` text;--> statement-breakpoint
ALTER TABLE `students` ADD `city` text;--> statement-breakpoint
ALTER TABLE `students` ADD `state` text;--> statement-breakpoint
ALTER TABLE `students` ADD `grade` text;--> statement-breakpoint
ALTER TABLE `students` ADD `shift` text;--> statement-breakpoint
ALTER TABLE `students` ADD `birth_certificate_status` text DEFAULT 'pendente' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `school_history_status` text DEFAULT 'pendente' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `residence_proof_status` text DEFAULT 'pendente' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `docs_status` text DEFAULT 'pendente' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `docs_validated_by` text;--> statement-breakpoint
ALTER TABLE `students` ADD `docs_validated_at` integer;--> statement-breakpoint
ALTER TABLE `students` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `students` SET `updated_at` = unixepoch() * 1000 WHERE `updated_at` = 0;--> statement-breakpoint
CREATE INDEX `students_guardian_user_id_idx` ON `students` (`guardian_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `students_school_enrollment_idx` ON `students` (`school_id`,`enrollment_number`);--> statement-breakpoint
UPDATE `students` SET `status` = 'transferido' WHERE `status` = 'inativo';--> statement-breakpoint
UPDATE `students`
SET `enrollment_number` = strftime('%Y','now') || printf('%04d', (
  SELECT COUNT(*) FROM `students` `s2`
  WHERE `s2`.`school_id` = `students`.`school_id` AND `s2`.rowid <= `students`.rowid
))
WHERE `enrollment_number` IS NULL;--> statement-breakpoint
INSERT INTO `enrollment_sequences` (`id`, `school_id`, `year`, `last_number`)
SELECT lower(hex(randomblob(16))), `school_id`, CAST(strftime('%Y','now') AS INTEGER), MAX(CAST(substr(`enrollment_number`, 5) AS INTEGER))
FROM `students`
WHERE `enrollment_number` IS NOT NULL
GROUP BY `school_id`;