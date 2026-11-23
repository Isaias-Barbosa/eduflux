CREATE TABLE `student_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`student_id` text NOT NULL,
	`assignment_id` text,
	`occurrence_date` text NOT NULL,
	`type` text DEFAULT 'pedagogica' NOT NULL,
	`severity` text DEFAULT 'baixa' NOT NULL,
	`description` text NOT NULL,
	`recorded_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignment_id`) REFERENCES `teacher_assignments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`recorded_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `student_occurrences_school_id_idx` ON `student_occurrences` (`school_id`);--> statement-breakpoint
CREATE INDEX `student_occurrences_student_id_idx` ON `student_occurrences` (`student_id`);--> statement-breakpoint
CREATE TABLE `student_transfer_records` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`student_id` text NOT NULL,
	`destination_school` text DEFAULT '' NOT NULL,
	`transfer_date` text NOT NULL,
	`reason` text,
	`note` text,
	`history_snapshot` text,
	`history_issued_at` integer,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `student_transfer_records_school_id_idx` ON `student_transfer_records` (`school_id`);--> statement-breakpoint
CREATE INDEX `student_transfer_records_student_id_idx` ON `student_transfer_records` (`student_id`);--> statement-breakpoint
CREATE TABLE `teacher_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`classroom_id` text NOT NULL,
	`discipline` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_assignments_unique_idx` ON `teacher_assignments` (`teacher_id`,`classroom_id`,`discipline`);--> statement-breakpoint
CREATE INDEX `teacher_assignments_school_id_idx` ON `teacher_assignments` (`school_id`);--> statement-breakpoint
CREATE INDEX `teacher_assignments_teacher_id_idx` ON `teacher_assignments` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `teacher_assignments_classroom_id_idx` ON `teacher_assignments` (`classroom_id`);--> statement-breakpoint
CREATE TABLE `teacher_students` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`assignment_id` text NOT NULL,
	`student_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignment_id`) REFERENCES `teacher_assignments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_students_unique_idx` ON `teacher_students` (`assignment_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `teacher_students_school_id_idx` ON `teacher_students` (`school_id`);--> statement-breakpoint
CREATE INDEX `teacher_students_student_id_idx` ON `teacher_students` (`student_id`);--> statement-breakpoint
ALTER TABLE `schools` ADD `passing_grade` real DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE `schools` ADD `bimesters` integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE `schools` ADD `min_frequency` real DEFAULT 75 NOT NULL;--> statement-breakpoint
ALTER TABLE `schools` ADD `rotation_model` text DEFAULT 'alunos' NOT NULL;--> statement-breakpoint
ALTER TABLE `schools` ADD `enabled_modules` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `student_assessments` ADD `bimester` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `student_assessments` ADD `weight` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `student_assessments` ADD `assessment_type` text DEFAULT 'avaliacao' NOT NULL;--> statement-breakpoint
CREATE INDEX `student_assessments_bimester_idx` ON `student_assessments` (`school_id`,`bimester`);--> statement-breakpoint
UPDATE `schools` SET `enabled_modules` = CASE `segment`
  WHEN 'infantil' THEN '["turmas","criancas","diario","desenvolvimento","eventos","comunicados"]'
  WHEN 'fundamental' THEN '["turmas","alunos","disciplinas","notas","frequencia","calendario","comunicados"]'
  WHEN 'medio' THEN '["turmas","alunos","disciplinas","notas","frequencia","preparacao","calendario","comunicados"]'
  ELSE '[]' END;--> statement-breakpoint
INSERT INTO `teacher_assignments` (`id`, `school_id`, `teacher_id`, `classroom_id`, `discipline`, `created_at`)
SELECT lower(hex(randomblob(16))), `school_id`, `id`, `classroom_id`, `discipline`, unixepoch() * 1000
FROM `teachers` WHERE `classroom_id` IS NOT NULL;--> statement-breakpoint
INSERT INTO `teacher_students` (`id`, `school_id`, `assignment_id`, `student_id`, `created_at`)
SELECT lower(hex(randomblob(16))), `ta`.`school_id`, `ta`.`id`, `s`.`id`, unixepoch() * 1000
FROM `teacher_assignments` `ta`
INNER JOIN `students` `s` ON `s`.`school_id` = `ta`.`school_id` AND `s`.`classroom_id` = `ta`.`classroom_id`;