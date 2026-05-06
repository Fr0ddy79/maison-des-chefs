CREATE TABLE `reviews` (
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
ALTER TABLE `chef_profiles` ADD `photo_url` text;--> statement-breakpoint
ALTER TABLE `chef_profiles` ADD `signature_dishes` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `booking_id` integer REFERENCES bookings(id);--> statement-breakpoint
ALTER TABLE `leads` ADD `inquiry_type` text DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `multi_inquiry_id` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `selected_addons` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `stale_lead_reengagement_sent_at` integer;--> statement-breakpoint
ALTER TABLE `services` ADD `photos` text DEFAULT '[]' NOT NULL;