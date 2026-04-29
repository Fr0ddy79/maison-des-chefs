CREATE TABLE `abandoned_bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`booking_id` integer NOT NULL,
	`detected_at` integer NOT NULL,
	`email_sent` integer DEFAULT false NOT NULL,
	`sms_sent` integer DEFAULT false NOT NULL,
	`recovered` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `abandoned_bookings_booking_id_unique` ON `abandoned_bookings` (`booking_id`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer NOT NULL,
	`diner_id` integer,
	`chef_id` integer NOT NULL,
	`event_date` text NOT NULL,
	`guest_count` integer NOT NULL,
	`total_price` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`guest_email` text,
	`guest_token_hash` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`access_token` text,
	`access_token_expires_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`diner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chef_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chef_onboarding_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chef_id` integer NOT NULL,
	`current_step` integer DEFAULT 1 NOT NULL,
	`step1_data` text,
	`step2_data` text,
	`step3_data` text,
	`step4_completed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`chef_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chef_onboarding_state_chef_id_unique` ON `chef_onboarding_state` (`chef_id`);--> statement-breakpoint
CREATE TABLE `chef_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`bio` text,
	`cuisine_types` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`price_per_person` real DEFAULT 0 NOT NULL,
	`available` integer DEFAULT true NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`profile_completed_at` integer,
	`onboarding_started_at` integer,
	`onboarding_completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `diner_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`cuisines` text DEFAULT '[]' NOT NULL,
	`dietary_restrictions` text DEFAULT '[]' NOT NULL,
	`spice_tolerance` text DEFAULT 'medium' NOT NULL,
	`default_party_size` integer DEFAULT 2 NOT NULL,
	`default_delivery` integer DEFAULT true NOT NULL,
	`default_location` text DEFAULT '' NOT NULL,
	`wizard_completion_status` text DEFAULT 'none' NOT NULL,
	`wizard_completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `diner_preferences_user_id_unique` ON `diner_preferences` (`user_id`);--> statement-breakpoint
CREATE TABLE `diner_wizard_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`event` text NOT NULL,
	`step` integer,
	`session_id` text,
	`event_data` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer NOT NULL,
	`chef_id` integer NOT NULL,
	`client_name` text,
	`email` text NOT NULL,
	`phone` text,
	`event_date` text,
	`guest_count` integer DEFAULT 0 NOT NULL,
	`message` text,
	`status` text DEFAULT 'new' NOT NULL,
	`price_estimate_sent_at` integer,
	`first_response_at` integer,
	`first_chef_action_at` integer,
	`response_within_sla` integer DEFAULT false NOT NULL,
	`sla_escalated` integer DEFAULT false NOT NULL,
	`sla_escalated_at` integer,
	`inquiry_confirm_sent_at` integer,
	`quote_amount` real,
	`quote_message` text,
	`quote_sent_at` integer,
	`quote_reminder_sent_at` integer,
	`chef_note` text DEFAULT '' NOT NULL,
	`access_token` text,
	`access_token_expires_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chef_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_unique` ON `refresh_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chef_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price_per_person` real NOT NULL,
	`min_guests` integer DEFAULT 1 NOT NULL,
	`max_guests` integer DEFAULT 10 NOT NULL,
	`dietary_tags` text DEFAULT '[]' NOT NULL,
	`category` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`blocked_dates` text DEFAULT '[]' NOT NULL,
	`is_onboarding_service` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chef_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'diner' NOT NULL,
	`has_completed_onboarding` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);