CREATE TABLE `daily_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workDate` integer NOT NULL,
	`employeeId` integer NOT NULL,
	`area` text NOT NULL,
	`taskCatalogId` integer NOT NULL,
	`variantId` integer,
	`status` text DEFAULT 'pendiente' NOT NULL,
	`targetQuantity` text,
	`targetDurationMinutes` integer,
	`completedQuantity` text,
	`unit` text(50) DEFAULT 'unidades' NOT NULL,
	`startAt` integer,
	`endAt` integer,
	`notes` text,
	`createdByUserId` integer,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`taskCatalogId`) REFERENCES `task_catalog`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`variantId`) REFERENCES `task_variants`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `daily_tasks_work_date_idx` ON `daily_tasks` (`workDate`);--> statement-breakpoint
CREATE INDEX `daily_tasks_employee_idx` ON `daily_tasks` (`employeeId`);--> statement-breakpoint
CREATE INDEX `daily_tasks_area_idx` ON `daily_tasks` (`area`);--> statement-breakpoint
CREATE INDEX `daily_tasks_status_idx` ON `daily_tasks` (`status`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(120) NOT NULL,
	`area` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_name_unique` ON `employees` (`name`);--> statement-breakpoint
CREATE INDEX `employees_area_idx` ON `employees` (`area`);--> statement-breakpoint
CREATE TABLE `task_catalog` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(180) NOT NULL,
	`area` text DEFAULT 'produccion' NOT NULL,
	`unit` text(50) DEFAULT 'unidades' NOT NULL,
	`usesQuantity` integer DEFAULT true NOT NULL,
	`hasVariants` integer DEFAULT false NOT NULL,
	`defaultTargetQuantity` text,
	`defaultTargetMinutes` integer,
	`isActive` integer DEFAULT true NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_catalog_name_unique` ON `task_catalog` (`name`);--> statement-breakpoint
CREATE INDEX `task_catalog_area_idx` ON `task_catalog` (`area`);--> statement-breakpoint
CREATE TABLE `task_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`taskCatalogId` integer NOT NULL,
	`name` text(100) NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`taskCatalogId`) REFERENCES `task_catalog`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_variant_task_name_unique` ON `task_variants` (`taskCatalogId`,`name`);--> statement-breakpoint
CREATE INDEX `task_variants_task_idx` ON `task_variants` (`taskCatalogId`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`email` text(320) NOT NULL,
	`passwordHash` text(255) NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`lastSignedIn` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);