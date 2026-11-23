CREATE TABLE `classroom_waitlist` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`classroom_id` text,
	`discipline` text DEFAULT '' NOT NULL,
	`student_id` text NOT NULL,
	`school_year` integer DEFAULT 2026 NOT NULL,
	`note` text,
	`status` text DEFAULT 'aguardando' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `classroom_waitlist_school_id_idx` ON `classroom_waitlist` (`school_id`);--> statement-breakpoint
CREATE INDEX `classroom_waitlist_classroom_id_idx` ON `classroom_waitlist` (`classroom_id`);--> statement-breakpoint
CREATE INDEX `classroom_waitlist_student_id_idx` ON `classroom_waitlist` (`student_id`);--> statement-breakpoint
CREATE TABLE `physical_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`name` text NOT NULL,
	`square_meters` real,
	`capacity` integer DEFAULT 25 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `physical_rooms_school_name_idx` ON `physical_rooms` (`school_id`,`name`);--> statement-breakpoint
CREATE INDEX `physical_rooms_school_id_idx` ON `physical_rooms` (`school_id`);--> statement-breakpoint
DROP INDEX `classrooms_school_name_idx`;--> statement-breakpoint
ALTER TABLE `classrooms` ADD `school_year` integer DEFAULT 2026 NOT NULL;--> statement-breakpoint
ALTER TABLE `classrooms` ADD `grade` text;--> statement-breakpoint
ALTER TABLE `classrooms` ADD `capacity` integer DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE `classrooms` ADD `physical_room_id` text REFERENCES physical_rooms(id);--> statement-breakpoint
ALTER TABLE `classrooms` ADD `status` text DEFAULT 'aberta' NOT NULL;--> statement-breakpoint
CREATE INDEX `classrooms_physical_room_id_idx` ON `classrooms` (`physical_room_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `classrooms_school_name_idx` ON `classrooms` (`school_id`,`school_year`,`name`);--> statement-breakpoint
ALTER TABLE `teacher_assignments` ADD `capacity` integer DEFAULT 25 NOT NULL;--> statement-breakpoint
-- Padronização dos turnos legados.
UPDATE `classrooms` SET `shift` = CASE `shift` WHEN 'Manhã' THEN 'Matutino' WHEN 'Tarde' THEN 'Vespertino' WHEN 'Noite' THEN 'Noturno' ELSE `shift` END;--> statement-breakpoint
UPDATE `students` SET `shift` = CASE `shift` WHEN 'Manhã' THEN 'Matutino' WHEN 'Tarde' THEN 'Vespertino' WHEN 'Noite' THEN 'Noturno' ELSE `shift` END;--> statement-breakpoint
UPDATE `schools` SET `shifts` = replace(replace(replace(`shifts`, '"Manhã"', '"Matutino"'), '"Tarde"', '"Vespertino"'), '"Noite"', '"Noturno"') WHERE `shifts` IS NOT NULL;--> statement-breakpoint
-- Série/ano derivada do nome das turmas legadas (ex.: "5º Ano A" -> "5º ano").
UPDATE `classrooms` SET `grade` = lower(substr(`name`, 1, instr(`name`, ' ') - 1)) || ' ano' WHERE `grade` IS NULL AND instr(`name`, ' ') > 0;--> statement-breakpoint
-- Cada turma legada passa a ter um espaço físico próprio vinculado.
INSERT INTO `physical_rooms` (`id`, `school_id`, `name`, `capacity`, `created_at`)
  SELECT lower(hex(randomblob(16))), `school_id`, 'Sala ' || `name`, 25, `created_at` FROM `classrooms`;--> statement-breakpoint
UPDATE `classrooms` SET `physical_room_id` = (
  SELECT `pr`.`id` FROM `physical_rooms` `pr`
  WHERE `pr`.`school_id` = `classrooms`.`school_id` AND `pr`.`name` = 'Sala ' || `classrooms`.`name`
) WHERE `physical_room_id` IS NULL;