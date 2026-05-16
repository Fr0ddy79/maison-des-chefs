CREATE TABLE `chef_availability` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chef_id` integer NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chef_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chef_blocked_dates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chef_id` integer NOT NULL,
	`date` text NOT NULL,
	`reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chef_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chef_verification_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chef_id` integer NOT NULL,
	`identity_full_name` text,
	`identity_phone_verified` integer DEFAULT false NOT NULL,
	`identity_government_id_url` text,
	`experience_years` integer,
	`experience_past_employment` text DEFAULT '[]' NOT NULL,
	`experience_cuisine_training` text DEFAULT '[]' NOT NULL,
	`safety_food_safety_cert` text,
	`safety_cert_expiry_date` text,
	`safety_cert_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_at` integer,
	`reviewed_at` integer,
	`reviewed_by` integer,
	`review_notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chef_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `updated_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `chef_profiles` ADD `whatsapp_number` text;--> statement-breakpoint
ALTER TABLE `chef_profiles` ADD `verification_badges` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `chef_profiles` ADD `lead_response_tutorial_dismissed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `lead_expired_sent_at` integer;--> statement-breakpoint
ALTER TABLE `services` ADD `is_published` integer DEFAULT true NOT NULL;