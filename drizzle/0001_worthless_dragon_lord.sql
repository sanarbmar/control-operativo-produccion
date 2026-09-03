CREATE TABLE `daily_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workDate` bigint NOT NULL,
	`employeeId` int NOT NULL,
	`area` enum('produccion','ventas','administracion') NOT NULL,
	`taskCatalogId` int NOT NULL,
	`variantId` int,
	`status` enum('pendiente','en_proceso','completada') NOT NULL DEFAULT 'pendiente',
	`targetQuantity` decimal(12,2),
	`completedQuantity` decimal(12,2),
	`unit` varchar(50) NOT NULL DEFAULT 'unidades',
	`startAt` bigint,
	`endAt` bigint,
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`area` enum('produccion','ventas','administracion') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `task_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`area` enum('produccion','ventas','administracion') NOT NULL DEFAULT 'produccion',
	`unit` varchar(50) NOT NULL DEFAULT 'unidades',
	`usesQuantity` boolean NOT NULL DEFAULT true,
	`hasVariants` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `task_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `task_catalog_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `task_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskCatalogId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `task_variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `task_variant_task_name_unique` UNIQUE(`taskCatalogId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD CONSTRAINT `daily_tasks_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD CONSTRAINT `daily_tasks_taskCatalogId_task_catalog_id_fk` FOREIGN KEY (`taskCatalogId`) REFERENCES `task_catalog`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD CONSTRAINT `daily_tasks_variantId_task_variants_id_fk` FOREIGN KEY (`variantId`) REFERENCES `task_variants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_tasks` ADD CONSTRAINT `daily_tasks_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_variants` ADD CONSTRAINT `task_variants_taskCatalogId_task_catalog_id_fk` FOREIGN KEY (`taskCatalogId`) REFERENCES `task_catalog`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `daily_tasks_work_date_idx` ON `daily_tasks` (`workDate`);--> statement-breakpoint
CREATE INDEX `daily_tasks_employee_idx` ON `daily_tasks` (`employeeId`);--> statement-breakpoint
CREATE INDEX `daily_tasks_area_idx` ON `daily_tasks` (`area`);--> statement-breakpoint
CREATE INDEX `daily_tasks_status_idx` ON `daily_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `employees_area_idx` ON `employees` (`area`);--> statement-breakpoint
CREATE INDEX `task_catalog_area_idx` ON `task_catalog` (`area`);--> statement-breakpoint
CREATE INDEX `task_variants_task_idx` ON `task_variants` (`taskCatalogId`);