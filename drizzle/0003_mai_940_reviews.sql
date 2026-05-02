-- MAI-940: Create reviews table
CREATE TABLE IF NOT EXISTS `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chef_id` integer NOT NULL,
	`service_id` integer NOT NULL,
	`diner_id` integer NOT NULL,
	`booking_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chef_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_booking_id_unique` ON `reviews` (`booking_id`);
--> statement-breakpoint
CREATE INDEX `reviews_service_id_idx` ON `reviews` (`service_id`);
