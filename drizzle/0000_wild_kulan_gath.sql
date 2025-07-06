CREATE TABLE `execution_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`mission_id` text,
	`plan_id` text,
	`task_id` text,
	`level` text DEFAULT 'info' NOT NULL,
	`message` text NOT NULL,
	`data` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `knowledge_base` (
	`id` text PRIMARY KEY NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`summary` text,
	`tags` text,
	`embedding` text,
	`last_indexed` integer NOT NULL,
	`created_at` integer NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `missions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`mission_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`estimated_duration` integer,
	`actual_duration` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`metadata` text,
	FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reflections` (
	`id` text PRIMARY KEY NOT NULL,
	`mission_id` text,
	`plan_id` text,
	`task_id` text,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`insights` text,
	`recommendations` text,
	`confidence` real,
	`created_at` integer NOT NULL,
	`metadata` text,
	FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`parent_task_id` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`tool_name` text,
	`tool_params` text,
	`dependencies` text,
	`estimated_duration` integer,
	`actual_duration` integer,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`result` text,
	`metadata` text,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tool_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text,
	`tool_name` text NOT NULL,
	`parameters` text,
	`result` text,
	`success` integer NOT NULL,
	`duration` integer,
	`error_message` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
