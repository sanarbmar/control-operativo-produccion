ALTER TABLE `daily_tasks` ADD `targetDurationMinutes` int;--> statement-breakpoint
ALTER TABLE `task_catalog` ADD `defaultTargetQuantity` decimal(12,2);--> statement-breakpoint
ALTER TABLE `task_catalog` ADD `defaultTargetMinutes` int;