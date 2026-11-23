ALTER TABLE `schools` ADD `legal_name` text;--> statement-breakpoint
ALTER TABLE `schools` ADD `inep_code` text;--> statement-breakpoint
ALTER TABLE `schools` ADD `founded_year` integer;--> statement-breakpoint
ALTER TABLE `schools` ADD `pedagogical_coordinator` text;--> statement-breakpoint
ALTER TABLE `schools` ADD `secretary_name` text;--> statement-breakpoint
ALTER TABLE `schools` ADD `shifts` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `schools` ADD `classrooms` integer;--> statement-breakpoint
ALTER TABLE `schools` ADD `facilities` text DEFAULT '[]' NOT NULL;